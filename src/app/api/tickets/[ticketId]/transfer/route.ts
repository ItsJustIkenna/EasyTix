import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { tickets, orders, events, ticketTiers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";
import QRCode from "qrcode";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { db: database } = await getDb();
    const ticketId = params.ticketId;
    const body = await request.json();
    const { recipientEmail, recipientName } = body;

    // Validate input
    if (!recipientEmail || !recipientName) {
      return NextResponse.json(
        { success: false, error: "Recipient email and name are required" },
        { status: 400 }
      );
    }

    // Verify email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Verify user authentication
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

    const userId = decoded.userId;

    // Fetch ticket with related data
    const [ticket] = await database
      .select({
        ticket: tickets,
        order: orders,
        event: events,
        tier: ticketTiers,
      })
      .from(tickets)
      .innerJoin(orders, eq(tickets.orderId, orders.id))
      .innerJoin(events, eq(tickets.eventId, events.id))
      .innerJoin(ticketTiers, eq(tickets.tierId, ticketTiers.id))
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Verify ticket ownership
    if (ticket.order.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "You do not own this ticket" },
        { status: 403 }
      );
    }

    // Check if ticket is transferable (must be CONFIRMED status)
    if (ticket.ticket.status !== "CONFIRMED") {
      return NextResponse.json(
        {
          success: false,
          error: `Ticket cannot be transferred. Status: ${ticket.ticket.status}`,
        },
        { status: 400 }
      );
    }

    // Check if event has already passed
    const eventDate = new Date(ticket.event.startDate);
    if (eventDate < new Date()) {
      return NextResponse.json(
        { success: false, error: "Cannot transfer tickets for past events" },
        { status: 400 }
      );
    }

    // Check if ticket has already been checked in
    if (ticket.ticket.checkedInAt) {
      return NextResponse.json(
        { success: false, error: "Cannot transfer tickets that have been checked in" },
        { status: 400 }
      );
    }

    // Generate new QR code with updated attendee info
    const qrData = JSON.stringify({
      ticketId: ticket.ticket.id,
      eventId: ticket.event.id,
      orderId: ticket.order.id,
      tierId: ticket.tier.id,
      attendeeEmail: recipientEmail,
      attendeeName: recipientName,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 300,
    });

    // Update ticket with new owner information
    await database
      .update(tickets)
      .set({
        attendeeEmail: recipientEmail,
        attendeeName: recipientName,
        qrCode: qrCodeDataUrl,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId));

    // Send email to new ticket owner
    try {
      const eventDate = new Date(ticket.event.startDate);
      const formattedDate = eventDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const formattedTime = eventDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      await resend.emails.send({
        from: "EasyTix <onboarding@resend.dev>",
        to: recipientEmail,
        subject: `Ticket Transferred: ${ticket.event.title}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
                .qr-code { text-align: center; margin: 30px 0; padding: 20px; background: white; border-radius: 8px; }
                .qr-code img { max-width: 300px; width: 100%; height: auto; }
                .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                .info-row { margin: 10px 0; }
                .label { font-weight: bold; color: #667eea; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎟️ Ticket Transferred!</h1>
                  <p>You've received a ticket for ${ticket.event.title}</p>
                </div>
                <div class="content">
                  <p>Hi ${recipientName},</p>
                  <p>Great news! A ticket has been transferred to you.</p>
                  
                  <div class="ticket-info">
                    <h2 style="margin-top: 0; color: #667eea;">Event Details</h2>
                    <div class="info-row">
                      <span class="label">Event:</span> ${ticket.event.title}
                    </div>
                    <div class="info-row">
                      <span class="label">Date:</span> ${formattedDate}
                    </div>
                    <div class="info-row">
                      <span class="label">Time:</span> ${formattedTime}
                    </div>
                    <div class="info-row">
                      <span class="label">Venue:</span> ${ticket.event.venue}
                    </div>
                    <div class="info-row">
                      <span class="label">Location:</span> ${ticket.event.address}, ${ticket.event.city}, ${ticket.event.state} ${ticket.event.zipCode}
                    </div>
                    <div class="info-row">
                      <span class="label">Ticket Type:</span> ${ticket.tier.name}
                    </div>
                  </div>

                  <div class="qr-code">
                    <h3 style="margin-top: 0;">Your Ticket QR Code</h3>
                    <p>Show this QR code at the entrance:</p>
                    <img src="${qrCodeDataUrl}" alt="QR Code" />
                    <p style="font-size: 12px; color: #666;">Ticket ID: ${ticketId}</p>
                  </div>

                  <p><strong>Important:</strong> Please save this email or download the QR code. You'll need to present it at the event entrance.</p>
                  
                  <div style="text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" class="button">View Ticket Details</a>
                  </div>
                </div>
                <div class="footer">
                  <p>This ticket was transferred to you via EasyTix</p>
                  <p>If you have any questions, please contact the event organizer</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send transfer email:", emailError);
      // Continue even if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Ticket transferred successfully",
      data: {
        ticketId: ticket.ticket.id,
        newOwner: {
          email: recipientEmail,
          name: recipientName,
        },
      },
    });
  } catch (error) {
    console.error("Transfer ticket error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to transfer ticket" },
      { status: 500 }
    );
  }
}
