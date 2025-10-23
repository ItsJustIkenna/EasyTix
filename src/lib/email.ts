import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface TicketEmailData {
  orderId: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  eventAddress: string;
  tickets: {
    id: string;
    tierName: string;
    price: number;
    qrCode: string;
    attendeeName?: string;
  }[];
  totalAmount: number;
  buyerEmail: string;
  buyerName?: string;
}

export async function sendTicketEmail(data: TicketEmailData) {
  try {
    const { data: emailData, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "EasyTix <onboarding@resend.dev>",
      to: data.buyerEmail,
      subject: `Your Tickets for ${data.eventTitle}`,
      html: generateTicketEmailHTML(data),
    });

    if (error) {
      console.error("Email send error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return emailData;
  } catch (error) {
    console.error("Email service error:", error);
    throw error;
  }
}

function generateTicketEmailHTML(data: TicketEmailData): string {
  const ticketsHTML = data.tickets
    .map(
      (ticket, index) => `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 16px; background-color: #ffffff;">
      <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 18px;">
        Ticket ${index + 1}: ${ticket.tierName}
      </h3>
      ${ticket.attendeeName ? `<p style="margin: 0 0 8px 0; color: #6b7280;">Attendee: ${ticket.attendeeName}</p>` : ""}
      <p style="margin: 0 0 8px 0; color: #6b7280;">Price: $${(ticket.price / 100).toFixed(2)}</p>
      <p style="margin: 0 0 12px 0; color: #6b7280;">Ticket ID: ${ticket.id}</p>
      <div style="text-align: center; padding: 16px; background-color: #f9fafb; border-radius: 4px;">
        <img src="${ticket.qrCode}" alt="Ticket QR Code" style="max-width: 200px; height: auto;" />
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">Scan this QR code at the venue</p>
      </div>
    </div>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Tickets - ${data.eventTitle}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
  
  <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); overflow: hidden;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎉 Your Tickets Are Ready!</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 32px 24px;">
      
      <p style="margin: 0 0 24px 0; font-size: 16px; color: #111827;">
        ${data.buyerName ? `Hi ${data.buyerName},` : "Hello!"}
      </p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151;">
        Thank you for your purchase! Your tickets for <strong>${data.eventTitle}</strong> are attached below. 
        Please save this email or screenshot the QR codes to show at the venue entrance.
      </p>
      
      <!-- Event Details -->
      <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 16px 20px; margin-bottom: 24px; border-radius: 4px;">
        <h2 style="margin: 0 0 12px 0; color: #111827; font-size: 20px;">Event Details</h2>
        <p style="margin: 0 0 8px 0; color: #374151;"><strong>Event:</strong> ${data.eventTitle}</p>
        <p style="margin: 0 0 8px 0; color: #374151;"><strong>Date:</strong> ${data.eventDate}</p>
        <p style="margin: 0 0 8px 0; color: #374151;"><strong>Venue:</strong> ${data.eventVenue}</p>
        <p style="margin: 0; color: #374151;"><strong>Address:</strong> ${data.eventAddress}</p>
      </div>
      
      <!-- Tickets Section -->
      <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px;">Your Tickets (${data.tickets.length})</h2>
      
      ${ticketsHTML}
      
      <!-- Order Summary -->
      <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Order ID: ${data.orderId}</p>
          <p style="margin: 0; color: #111827; font-size: 20px; font-weight: bold;">
            Total: $${(data.totalAmount / 100).toFixed(2)}
          </p>
        </div>
      </div>
      
      <!-- Important Notice -->
      <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin-top: 24px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>⚠️ Important:</strong> Each QR code is unique and can only be scanned once. 
          Please don't share your tickets with anyone unless you're transferring them.
        </p>
      </div>
      
      <!-- Support -->
      <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
          Questions? Contact support or visit our help center.
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          <a href="${process.env.NEXTAUTH_URL}/help" style="color: #667eea; text-decoration: none;">Help Center</a>
        </p>
      </div>
      
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} EasyTix. All rights reserved.
      </p>
      <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
        Bringing fans closer to unforgettable experiences.
      </p>
    </div>
    
  </div>
  
</body>
</html>
  `;
}
