import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db, pool } from "@/db";
import { orders, tickets, refunds, payments, events, organizers, ticketTiers, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import { getOrganizerFromToken } from "@/lib/auth-utils";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const client = await pool.connect();
  
  try {
    const database = db;
    const orderId = params.orderId;

    // Verify authentication
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // Get organizer using shared utility (no internal API call)
    const organizer = await getOrganizerFromToken(token);
    if (!organizer) {
      return NextResponse.json(
        { success: false, error: "Not an organizer" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { reason, amount: refundAmount } = body;

    // Fetch order with related data
    const [order] = await database
      .select({
        order: orders,
        event: events,
        payment: payments,
      })
      .from(orders)
      .innerJoin(events, eq(orders.eventId, events.id))
      .leftJoin(payments, eq(payments.orderId, orders.id))
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.event.organizerId !== organizer.id) {
      return NextResponse.json(
        { success: false, error: "You do not own this event" },
        { status: 403 }
      );
    }

    // Check if order can be refunded
    if (order.order.status === "REFUNDED") {
      return NextResponse.json(
        { success: false, error: "Order has already been refunded" },
        { status: 400 }
      );
    }

    if (order.order.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, error: "Order has been cancelled" },
        { status: 400 }
      );
    }

    if (!order.payment || order.payment.status !== "COMPLETED") {
      return NextResponse.json(
        { success: false, error: "No completed payment found for this order" },
        { status: 400 }
      );
    }

    // Calculate refund amount (default to full order amount)
    const amountToRefund = refundAmount || order.order.totalAmount;

    if (amountToRefund > order.order.totalAmount) {
      return NextResponse.json(
        { success: false, error: "Refund amount exceeds order total" },
        { status: 400 }
      );
    }

    // Start transaction for refund processing
    await client.query("BEGIN");

    try {
      // Process Stripe refund first (before DB changes)
      let stripeRefundId: string | null = null;
      try {
        if (order.payment.stripePaymentIntentId) {
          const refund = await stripe.refunds.create({
            payment_intent: order.payment.stripePaymentIntentId,
            amount: amountToRefund,
            reason: "requested_by_customer",
            metadata: {
              orderId: order.order.id,
              eventId: order.event.id,
              organizerId: order.event.organizerId,
            },
          });
          stripeRefundId = refund.id;
        }
      } catch (stripeError: any) {
        await client.query("ROLLBACK");
        client.release();
        console.error("Stripe refund error:", stripeError);
        return NextResponse.json(
          { success: false, error: `Stripe refund failed: ${stripeError.message}` },
          { status: 500 }
        );
      }

      // Create refund record
      const [refund] = await database
        .insert(refunds)
        .values({
          orderId: order.order.id,
          amount: amountToRefund,
          reason: reason || "Refund requested by organizer",
          status: "COMPLETED",
          stripeRefundId,
          processedBy: decoded.userId,
          processedAt: new Date(),
        })
        .returning();

      // Update order status
      await database
        .update(orders)
        .set({
          status: amountToRefund >= order.order.totalAmount ? "REFUNDED" : "COMPLETED",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // Update payment status
      if (order.payment) {
        await database
          .update(payments)
          .set({
            status: "REFUNDED",
          })
          .where(eq(payments.id, order.payment.id));
      }

      // Get all tickets for this order
      const orderTickets = await database
        .select()
        .from(tickets)
        .where(eq(tickets.orderId, orderId));

      // Update ticket statuses
      await database
        .update(tickets)
        .set({
          status: "REFUNDED",
          updatedAt: new Date(),
        })
        .where(eq(tickets.orderId, orderId));

      // Return tickets to tier inventory (decrement soldQuantity)
      const tierCounts = orderTickets.reduce((acc: Record<string, number>, ticket: any) => {
        acc[ticket.tierId] = (acc[ticket.tierId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      for (const [tierId, count] of Object.entries(tierCounts)) {
        await database
          .update(ticketTiers)
          .set({
            soldQuantity: sql`GREATEST(0, ${ticketTiers.soldQuantity} - ${count})`,
            updatedAt: new Date(),
          })
          .where(eq(ticketTiers.id, tierId));
      }

      // Commit transaction
      await client.query("COMMIT");
      client.release();

      // Send refund confirmation email (outside transaction - non-critical)
      try {
        const [user] = await database
          .select()
          .from(users)
          .where(eq(users.id, order.order.userId))
          .limit(1);

        if (user && user.email) {
          await resend.emails.send({
            from: "EasyTix <onboarding@resend.dev>",
            to: user.email,
            subject: `Refund Processed: ${order.event.title}`,
            html: `
              <!DOCTYPE html>
              <html>
                <body style="font-family: Arial, sans-serif;">
                  <h2>Refund Processed</h2>
                  <p>Your refund for <strong>${order.event.title}</strong> has been processed.</p>
                  <p><strong>Refund Amount:</strong> $${(amountToRefund / 100).toFixed(2)}</p>
                  <p><strong>Reason:</strong> ${reason || "Refund requested by organizer"}</p>
                  <p>The refund will appear in your account within 5-10 business days.</p>
                  <p>If you have any questions, please contact the event organizer.</p>
                </body>
              </html>
            `,
          });
        }
      } catch (emailError) {
        console.error("Failed to send refund email:", emailError);
        // Continue even if email fails
      }

      return NextResponse.json({
        success: true,
        data: {
          refund,
          message: "Refund processed successfully",
        },
      });
    } catch (innerError) {
      await client.query("ROLLBACK");
      client.release();
      
      // Log for manual intervention if Stripe succeeded but DB failed
      console.error("CRITICAL: Refund transaction failed after Stripe refund", {
        orderId,
        error: innerError,
      });
      
      throw innerError;
    }
  } catch (error) {
    console.error("Refund processing error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process refund" },
      { status: 500 }
    );
  }
}
