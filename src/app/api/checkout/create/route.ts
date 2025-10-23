import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb, closeDb } from "@/db";
import { events, ticketTiers, promoCodes, orders, payments, tickets as ticketsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, tickets, userId, promoCode } = body;

    // Validate request
    if (!eventId || !tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: eventId and tickets array required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User must be authenticated to purchase tickets" },
        { status: 401 }
      );
    }

    // Connect to database
    const { client, db } = await getDb();

    try {
      // Fetch event details
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      if (!event) {
        await closeDb(client);
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      // Fetch ticket tier details and validate quantities
      const tierIds = tickets.map((t: { tierId: string }) => t.tierId);
      const tiers = await db
        .select()
        .from(ticketTiers)
        .where(and(eq(ticketTiers.eventId, eventId)));

      if (tiers.length === 0) {
        await closeDb(client);
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

      // Validate promo code if provided
      if (promoCode) {
        const [validPromoCode] = await db
          .select()
          .from(promoCodes)
          .where(
            and(
              eq(promoCodes.code, promoCode.toUpperCase()),
              eq(promoCodes.eventId, eventId),
              eq(promoCodes.isActive, true)
            )
          )
          .limit(1);

        if (validPromoCode) {
          const now = new Date();
          const validFrom = new Date(validPromoCode.validFrom);
          const validTo = new Date(validPromoCode.validTo);

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
        const tier = tiers.find((t) => t.id === ticket.tierId);

        if (!tier) {
          await closeDb(client);
          return NextResponse.json(
            { error: `Ticket tier ${ticket.tierId} not found` },
            { status: 404 }
          );
        }

        // Check availability
        if (tier.totalQuantity > 0 && tier.soldQuantity + ticket.quantity > tier.totalQuantity) {
          await closeDb(client);
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
        const [promo] = await db
          .select()
          .from(promoCodes)
          .where(eq(promoCodes.id, promoCodeId))
          .limit(1);

        if (promo) {
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
        const tier = tiers.find((t) => t.id === ticket.tierId);
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

      await closeDb(client);

      return NextResponse.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      await closeDb(client);
      throw error;
    }
  } catch (error) {
    console.error("Checkout creation error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
