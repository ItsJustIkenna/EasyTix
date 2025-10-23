import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb, closeDb } from "@/db";
import { orders, tickets, payments, ticketTiers, events, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { sendTicketEmail } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "payment_intent"],
    });

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    // Extract metadata
    const { userId, eventId, tickets: ticketsData } = session.metadata || {};
    
    if (!userId || !eventId || !ticketsData) {
      return NextResponse.json(
        { error: "Invalid session metadata" },
        { status: 400 }
      );
    }

    const ticketsParsed = JSON.parse(ticketsData);
    const { client, db } = await getDb();

    try {
      // Check if order already exists for this session (prevent duplicate processing)
      const existingPayment = await db
        .select()
        .from(payments)
        .where(eq(payments.stripePaymentIntentId, 
          (session.payment_intent as Stripe.PaymentIntent)?.id || sessionId))
        .limit(1);

      if (existingPayment.length > 0) {
        const [existingOrder] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, existingPayment[0].orderId))
          .limit(1);
          
        await closeDb(client);
        return NextResponse.json({
          orderId: existingOrder.id,
          message: "Order already processed",
        });
      }

      // Create order and tickets in a transaction
      const result = await db.transaction(async (tx) => {
        // Create the order
        const [newOrder] = await tx
          .insert(orders)
          .values({
            userId,
            eventId,
            status: "COMPLETED",
            totalAmount: session.amount_total || 0,
            currency: session.currency?.toUpperCase() || "USD",
          })
          .returning();

        // Create payment record
        const paymentIntent = session.payment_intent as Stripe.PaymentIntent;
        await tx.insert(payments).values({
          orderId: newOrder.id,
          amount: session.amount_total || 0,
          currency: session.currency?.toUpperCase() || "USD",
          status: "COMPLETED",
          stripePaymentIntentId: paymentIntent.id,
        });

        // Create tickets with QR codes
        const createdTickets = [];
        
        for (const ticketData of ticketsParsed) {
          const { tierId, quantity, attendeeInfo } = ticketData;

          // Get tier details for pricing
          const [tier] = await tx
            .select()
            .from(ticketTiers)
            .where(eq(ticketTiers.id, tierId))
            .limit(1);

          if (!tier) {
            throw new Error(`Ticket tier ${tierId} not found`);
          }

          // Create individual tickets
          for (let i = 0; i < quantity; i++) {
            const [ticket] = await tx
              .insert(tickets)
              .values({
                orderId: newOrder.id,
                eventId,
                tierId,
                userId,
                attendeeName: attendeeInfo?.name || null,
                attendeeEmail: attendeeInfo?.email || null,
                attendeePhone: attendeeInfo?.phone || null,
                price: tier.basePrice,
                status: "CONFIRMED",
              })
              .returning();

            // Generate QR code
            const qrData = JSON.stringify({
              ticketId: ticket.id,
              eventId,
              orderId: newOrder.id,
              tierId,
            });

            const qrCodeDataUrl = await QRCode.toDataURL(qrData);

            // Update ticket with QR code
            const [updatedTicket] = await tx
              .update(tickets)
              .set({ qrCode: qrCodeDataUrl })
              .where(eq(tickets.id, ticket.id))
              .returning();

            createdTickets.push(updatedTicket);
          }

          // Update sold quantity for the tier
          await tx
            .update(ticketTiers)
            .set({ 
              soldQuantity: tier.soldQuantity + quantity 
            })
            .where(eq(ticketTiers.id, tierId));
        }

        return { order: newOrder, tickets: createdTickets };
      });

      // Fetch event and user details for email
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      // Fetch tier names for tickets
      const tierIds = ticketsParsed.map((t: any) => t.tierId);
      const tiers = await db
        .select()
        .from(ticketTiers)
        .where(eq(ticketTiers.eventId, eventId));

      const tierMap = new Map(tiers.map((t) => [t.id, t]));

      // Send ticket email
      try {
        await sendTicketEmail({
          orderId: result.order.id,
          eventTitle: event.title,
          eventDate: new Date(event.startDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          eventVenue: event.venue,
          eventAddress: `${event.address}, ${event.city}, ${event.state} ${event.zipCode}`,
          tickets: result.tickets.map((ticket) => ({
            id: ticket.id,
            tierName: tierMap.get(ticket.tierId)?.name || "General Admission",
            price: ticket.price,
            qrCode: ticket.qrCode || "",
            attendeeName: ticket.attendeeName || undefined,
          })),
          totalAmount: result.order.totalAmount,
          buyerEmail: user.email,
          buyerName: user.firstName
            ? `${user.firstName} ${user.lastName || ""}`.trim()
            : undefined,
        });
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
        // Don't fail the whole request if email fails
      }

      await closeDb(client);

      return NextResponse.json({
        orderId: result.order.id,
        ticketCount: result.tickets.length,
        message: "Order created successfully",
      });
    } catch (error) {
      await closeDb(client);
      throw error;
    }
  } catch (error) {
    console.error("Checkout success error:", error);
    return NextResponse.json(
      { error: "Failed to process order" },
      { status: 500 }
    );
  }
}
