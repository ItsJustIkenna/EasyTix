import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb } from "@/db";
import { orders, payments, tickets as ticketsTable, ticketTiers, promoCodes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Resend } from "resend";
import QRCode from "qrcode";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const { db: database } = await getDb();

      // Get order ID from metadata
      const orderId = session.metadata?.orderId;
      if (!orderId) {
        console.error("No orderId in session metadata");
        return NextResponse.json(
          { error: "Missing orderId in metadata" },
          { status: 400 }
        );
      }

      // Update order status
      await database
        .update(orders)
        .set({
          status: "COMPLETED",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // Update payment status
      await database
        .update(payments)
        .set({
          status: "COMPLETED",
          stripePaymentIntentId: session.payment_intent as string,
          updatedAt: new Date(),
        })
        .where(eq(payments.orderId, orderId));

      // Get all tickets for this order
      const orderTickets = await database
        .select()
        .from(ticketsTable)
        .where(eq(ticketsTable.orderId, orderId));

      // Update ticket statuses to CONFIRMED and generate QR codes
      for (const ticket of orderTickets) {
        // Generate QR code
        const qrCodeData = JSON.stringify({
          ticketId: ticket.id,
          eventId: ticket.eventId,
          userId: ticket.userId,
        });
        const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData);

        // Update ticket
        await database
          .update(ticketsTable)
          .set({
            status: "CONFIRMED",
            qrCode: qrCodeDataUrl,
            updatedAt: new Date(),
          })
          .where(eq(ticketsTable.id, ticket.id));

        // Increment soldQuantity for ticket tier
        const [tier] = await database
          .select()
          .from(ticketTiers)
          .where(eq(ticketTiers.id, ticket.tierId))
          .limit(1);

        if (tier) {
          await database
            .update(ticketTiers)
            .set({
              soldQuantity: tier.soldQuantity + 1,
              updatedAt: new Date(),
            })
            .where(eq(ticketTiers.id, tier.id));
        }
      }

      // Update promo code usage if applicable
      const promoCodeId = session.metadata?.promoCodeId;
      if (promoCodeId) {
        const [promoCode] = await database
          .select()
          .from(promoCodes)
          .where(eq(promoCodes.id, promoCodeId))
          .limit(1);

        if (promoCode) {
          await database
            .update(promoCodes)
            .set({
              currentUses: promoCode.currentUses + 1,
              updatedAt: new Date(),
            })
            .where(eq(promoCodes.id, promoCodeId));
        }
      }

      // Get order details for email
      const [order] = await database
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        console.error("Order not found:", orderId);
        return NextResponse.json({ received: true });
      }

      // Get updated tickets with QR codes
      const updatedTickets = await database
        .select()
        .from(ticketsTable)
        .where(eq(ticketsTable.orderId, orderId));

      // Get user email
      const userEmail = session.customer_details?.email || session.metadata?.userEmail;
      const eventTitle = session.metadata?.eventTitle || "Event";

      // Send email with tickets
      if (userEmail && updatedTickets.length > 0) {
        try {
          // Create ticket HTML
          const ticketHtml = updatedTickets
            .map(
              (ticket, index) => `
              <div style="margin-bottom: 20px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb;">
                <h3 style="margin: 0 0 10px 0;">Ticket ${index + 1}</h3>
                <p style="margin: 5px 0;"><strong>Ticket ID:</strong> ${ticket.id}</p>
                <p style="margin: 5px 0;"><strong>Price:</strong> $${(ticket.price / 100).toFixed(2)}</p>
                <div style="margin-top: 15px; text-align: center;">
                  <img src="${ticket.qrCode}" alt="QR Code" style="width: 200px; height: 200px;" />
                  <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">Scan this QR code at the event entrance</p>
                </div>
              </div>
            `
            )
            .join("");

          await resend.emails.send({
            from: "EasyTix <onboarding@resend.dev>",
            to: userEmail,
            subject: `Your Tickets for ${eventTitle}`,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { padding: 20px; background-color: #ffffff; }
                    .footer { margin-top: 20px; padding: 15px; background-color: #f3f4f6; text-align: center; font-size: 12px; color: #6b7280; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1 style="margin: 0;">🎟️ Your Tickets are Ready!</h1>
                    </div>
                    <div class="content">
                      <h2>Thank you for your purchase!</h2>
                      <p>Your tickets for <strong>${eventTitle}</strong> are confirmed and ready to use.</p>
                      
                      <div style="margin: 30px 0;">
                        <h3>Order Summary</h3>
                        <p><strong>Order ID:</strong> ${orderId}</p>
                        <p><strong>Total:</strong> $${(order.totalAmount / 100).toFixed(2)}</p>
                        <p><strong>Tickets:</strong> ${updatedTickets.length}</p>
                      </div>

                      <h3>Your Tickets</h3>
                      ${ticketHtml}

                      <div style="margin-top: 30px; padding: 15px; background-color: #eff6ff; border-left: 4px solid #3b82f6;">
                        <p style="margin: 0;"><strong>Important:</strong> Please present your QR code at the event entrance for check-in.</p>
                      </div>
                    </div>
                    <div class="footer">
                      <p>Questions? Contact the event organizer through your EasyTix account.</p>
                      <p>&copy; ${new Date().getFullYear()} EasyTix. All rights reserved.</p>
                    </div>
                  </div>
                </body>
              </html>
            `,
          });

          console.log(`Ticket email sent to ${userEmail} for order ${orderId}`);
        } catch (emailError) {
          console.error("Failed to send ticket email:", emailError);
          // Don't fail the webhook if email fails
        }
      }

      console.log(`Successfully processed checkout for order ${orderId}`);
      return NextResponse.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return NextResponse.json(
        { error: "Webhook processing failed" },
        { status: 500 }
      );
    }
  }

  // Handle refund events
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    console.log("Refund processed:", charge.id);
    // Refund handling is already done through our API
  }

  return NextResponse.json({ received: true });
}
