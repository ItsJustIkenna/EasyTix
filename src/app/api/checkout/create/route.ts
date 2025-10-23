import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db, pool } from "@/db";
import { events, ticketTiers, promoCodes, orders, payments, tickets as ticketsTable } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { checkoutSchema } from "@/lib/validation";
import { toZonedTime } from 'date-fns-tz';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    
    // Validate request with Zod
    const validation = checkoutSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Invalid request data", 
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const { eventId, tickets, userId, promoCode } = validation.data;

    // Start transaction with row-level locks to prevent race conditions
    await client.query("BEGIN");

    try {
      // Fetch event details
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      if (!event) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      // Fetch and LOCK ticket tier rows to prevent concurrent modifications
      const tierIds = tickets.map((t: { tierId: string }) => t.tierId);
      const tierQuery = `
        SELECT id, name, "eventId", "basePrice", "platformMarkup", "platformFee", 
               "totalQuantity", "soldQuantity", "isActive"
        FROM "TicketTier"
        WHERE "eventId" = $1 AND id = ANY($2)
        FOR UPDATE
      `;
      const tierResult = await client.query(tierQuery, [eventId, tierIds]);
      const tiers = tierResult.rows;

      if (tiers.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "No ticket tiers found for this event" },
          { status: 404 }
        );
      }

      // Create line items for Stripe Checkout
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
      let totalAmount = 0;
      let discountAmount = 0;
      let promoCodeId: string | null = null;

      // Validate promo code if provided and lock it
      if (promoCode) {
        const promoQuery = `
          SELECT id, code, "discountType", "discountValue", "maxUses", "currentUses",
                 "validFrom", "validTo", "isActive"
          FROM "PromoCode"
          WHERE code = $1 AND "eventId" = $2 AND "isActive" = true
          FOR UPDATE
        `;
        const promoResult = await client.query(promoQuery, [promoCode.toUpperCase(), eventId]);

        if (promoResult.rows.length > 0) {
          const validPromoCode = promoResult.rows[0];
          const eventTimezone = event.timezone || 'America/New_York';
          const now = toZonedTime(new Date(), eventTimezone);
          const validFrom = toZonedTime(new Date(validPromoCode.validFrom), eventTimezone);
          const validTo = toZonedTime(new Date(validPromoCode.validTo), eventTimezone);

          if (
            now >= validFrom &&
            now <= validTo &&
            (!validPromoCode.maxUses || validPromoCode.currentUses < validPromoCode.maxUses)
          ) {
            promoCodeId = validPromoCode.id;
            // Calculate discount later after we know the total
          }
        }
      }

      for (const ticket of tickets) {
        const tier = tiers.find((t: any) => t.id === ticket.tierId);

        if (!tier) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: `Ticket tier ${ticket.tierId} not found` },
            { status: 404 }
          );
        }

        // Check availability with locked row (prevents race condition)
        if (tier.totalQuantity > 0 && tier.soldQuantity + ticket.quantity > tier.totalQuantity) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: `Not enough tickets available for ${tier.name}` },
            { status: 400 }
          );
        }

        const itemTotal = tier.basePrice * ticket.quantity;
        totalAmount += itemTotal;

        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: `${event.title} - ${tier.name}`,
              description: tier.description || undefined,
              metadata: {
                eventId: event.id,
                tierId: tier.id,
                eventName: event.title,
                tierName: tier.name,
              },
            },
            unit_amount: tier.basePrice, // Stripe expects amount in cents
          },
          quantity: ticket.quantity,
        });
      }

      // Apply promo code discount if valid
      let finalAmount = totalAmount;
      if (promoCodeId) {
        const promoQuery = await client.query(
          `SELECT id, "discountType", "discountValue" FROM "PromoCode" WHERE id = $1`,
          [promoCodeId]
        );

        if (promoQuery.rows.length > 0) {
          const promo = promoQuery.rows[0];
          if (promo.discountType === "PERCENTAGE") {
            discountAmount = Math.floor((totalAmount * promo.discountValue) / 100);
          } else if (promo.discountType === "FIXED") {
            discountAmount = promo.discountValue;
          }
          finalAmount = Math.max(0, totalAmount - discountAmount);
        }
      }

      // If there's a discount, we need to adjust the line items
      if (discountAmount > 0 && finalAmount > 0) {
        // Add discount as a negative line item
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: `Promo Code Discount`,
              description: promoCode ? `Code: ${promoCode.toUpperCase()}` : undefined,
            },
            unit_amount: -discountAmount, // Negative amount for discount
          },
          quantity: 1,
        });
      }

      // Create order record in database
      const [order] = await db
        .insert(orders)
        .values({
          userId,
          eventId,
          status: "PENDING",
          totalAmount: finalAmount,
          currency: "USD",
        })
        .returning();

      // Create payment record
      const [payment] = await db
        .insert(payments)
        .values({
          orderId: order.id,
          amount: finalAmount,
          currency: "USD",
          status: "PENDING",
        })
        .returning();

      // Create ticket records for each ticket
      for (const ticket of tickets) {
        const tier = tiers.find((t: any) => t.id === ticket.tierId);
        if (!tier) continue;

        // Create multiple tickets based on quantity
        for (let i = 0; i < ticket.quantity; i++) {
          await db.insert(ticketsTable).values({
            orderId: order.id,
            eventId,
            tierId: tier.id,
            userId,
            price: tier.basePrice,
            status: "PENDING",
          });
        }
      }

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${process.env.NEXTAUTH_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/events/${eventId}`,
        metadata: {
          userId,
          eventId,
          orderId: order.id,
          eventTitle: event.title,
          userEmail: body.email || "",
          promoCodeId: promoCodeId || "",
          discountAmount: discountAmount.toString(),
        },
        customer_email: body.email || undefined,
      });

      // Commit transaction - capacity is reserved
      await client.query("COMMIT");
      client.release();

      return NextResponse.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (innerError) {
      await client.query("ROLLBACK");
      client.release();
      throw innerError;
    }
  } catch (error) {
    console.error("Checkout creation error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
