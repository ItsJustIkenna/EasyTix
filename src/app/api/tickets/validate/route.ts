import { NextRequest, NextResponse } from "next/server";
import { getDb, closeDb } from "@/db";
import { tickets, events, ticketTiers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qrData, organizerId } = body;

    if (!qrData) {
      return NextResponse.json(
        { error: "QR code data required" },
        { status: 400 }
      );
    }

    if (!organizerId) {
      return NextResponse.json(
        { error: "Organizer ID required" },
        { status: 401 }
      );
    }

    // Parse QR code data
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid QR code format" },
        { status: 400 }
      );
    }

    const { ticketId, eventId, orderId, tierId } = parsedData;

    if (!ticketId || !eventId) {
      return NextResponse.json(
        { error: "Invalid ticket data" },
        { status: 400 }
      );
    }

    const { client, db } = await getDb();

    try {
      // Verify event belongs to organizer
      const [event] = await db
        .select()
        .from(events)
        .where(and(eq(events.id, eventId), eq(events.organizerId, organizerId)))
        .limit(1);

      if (!event) {
        await closeDb(client);
        return NextResponse.json(
          { error: "Event not found or you don't have permission to scan for this event" },
          { status: 403 }
        );
      }

      // Get ticket with related data
      const [ticket] = await db
        .select({
          ticket: tickets,
          tier: ticketTiers,
          user: users,
        })
        .from(tickets)
        .leftJoin(ticketTiers, eq(tickets.tierId, ticketTiers.id))
        .leftJoin(users, eq(tickets.userId, users.id))
        .where(eq(tickets.id, ticketId))
        .limit(1);

      if (!ticket) {
        await closeDb(client);
        return NextResponse.json(
          { error: "Ticket not found" },
          { status: 404 }
        );
      }

      // Verify ticket belongs to the correct event
      if (ticket.ticket.eventId !== eventId) {
        await closeDb(client);
        return NextResponse.json(
          { error: "Ticket does not belong to this event" },
          { status: 400 }
        );
      }

      // Check if ticket is already checked in
      if (ticket.ticket.checkedInAt) {
        await closeDb(client);
        return NextResponse.json(
          {
            error: "Ticket already scanned",
            valid: false,
            alreadyScanned: true,
            checkedInAt: ticket.ticket.checkedInAt,
            ticket: {
              id: ticket.ticket.id,
              tierName: ticket.tier?.name,
              attendeeName: ticket.ticket.attendeeName || `${ticket.user?.firstName} ${ticket.user?.lastName}`,
              price: ticket.ticket.price,
            },
          },
          { status: 400 }
        );
      }

      // Check ticket status
      if (ticket.ticket.status === "CANCELLED") {
        await closeDb(client);
        return NextResponse.json(
          {
            error: "Ticket has been cancelled",
            valid: false,
            ticket: {
              id: ticket.ticket.id,
              status: ticket.ticket.status,
            },
          },
          { status: 400 }
        );
      }

      if (ticket.ticket.status === "REFUNDED") {
        await closeDb(client);
        return NextResponse.json(
          {
            error: "Ticket has been refunded",
            valid: false,
            ticket: {
              id: ticket.ticket.id,
              status: ticket.ticket.status,
            },
          },
          { status: 400 }
        );
      }

      // Update ticket to mark as checked in
      const [updatedTicket] = await db
        .update(tickets)
        .set({
          checkedInAt: new Date(),
          status: "CHECKED_IN",
        })
        .where(eq(tickets.id, ticketId))
        .returning();

      await closeDb(client);

      // Return success with ticket details
      return NextResponse.json({
        valid: true,
        message: "Ticket validated successfully",
        ticket: {
          id: updatedTicket.id,
          tierName: ticket.tier?.name,
          attendeeName: ticket.ticket.attendeeName || `${ticket.user?.firstName} ${ticket.user?.lastName}`,
          attendeeEmail: ticket.ticket.attendeeEmail || ticket.user?.email,
          price: updatedTicket.price,
          checkedInAt: updatedTicket.checkedInAt,
          orderId: updatedTicket.orderId,
        },
        event: {
          id: event.id,
          title: event.title,
          venue: event.venue,
          startDate: event.startDate,
        },
      });
    } catch (error) {
      await closeDb(client);
      throw error;
    }
  } catch (error) {
    console.error("Ticket validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate ticket" },
      { status: 500 }
    );
  }
}
