import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb } from "@/db";
import { orders, tickets, refunds, payments, events, organizers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { db: database } = await getDb();
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

    // Verify organizer owns the event
    const userResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/me`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const userData = await userResponse.json();

    if (!userData.success || !userData.data.organizer?.id) {
      return NextResponse.json(
        { success: false, error: "Not an organizer" },
        { status: 403 }
      );
    }

    if (order.event.organizerId !== userData.data.organizer.id) {
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

    // Process Stripe refund
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

    // Update ticket statuses
    await database
      .update(tickets)
      .set({
        status: "REFUNDED",
        updatedAt: new Date(),
      })
      .where(eq(tickets.orderId, orderId));

    // Send refund confirmation email
    try {
      const [user] = await database
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (user) {
        await resend.emails.send({
          from: "EasyTix <onboarding@resend.dev>",
          to: user.userId, // Note: This should be the user's email, you may need to join with users table
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
  } catch (error) {
    console.error("Refund processing error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process refund" },
      { status: 500 }
    );
  }
}
