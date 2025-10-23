import { NextRequest, NextResponse } from "next/server";
import { getDb, closeDb } from "@/db";
import { tickets, events, ticketTiers, orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query params (should come from auth middleware in production)
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 401 }
      );
    }

    const { client, db } = await getDb();

    try {
      // Fetch all tickets for the user with related event and tier data
      const userTickets = await db
        .select({
          ticket: tickets,
          event: events,
          tier: ticketTiers,
          order: orders,
        })
        .from(tickets)
        .leftJoin(events, eq(tickets.eventId, events.id))
        .leftJoin(ticketTiers, eq(tickets.tierId, ticketTiers.id))
        .leftJoin(orders, eq(tickets.orderId, orders.id))
        .where(eq(tickets.userId, userId))
        .orderBy(desc(tickets.createdAt));

      await closeDb(client);

      // Group tickets by event
      const ticketsByEvent = userTickets.reduce((acc: any, item) => {
        const eventId = item.event?.id;
        if (!eventId) return acc;

        if (!acc[eventId]) {
          acc[eventId] = {
            event: item.event,
            tickets: [],
          };
        }

        acc[eventId].tickets.push({
          id: item.ticket.id,
          orderId: item.ticket.orderId,
          tierName: item.tier?.name,
          tierDescription: item.tier?.description,
          attendeeName: item.ticket.attendeeName,
          attendeeEmail: item.ticket.attendeeEmail,
          attendeePhone: item.ticket.attendeePhone,
          price: item.ticket.price,
          status: item.ticket.status,
          qrCode: item.ticket.qrCode,
          checkedInAt: item.ticket.checkedInAt,
          createdAt: item.ticket.createdAt,
          orderStatus: item.order?.status,
        });

        return acc;
      }, {});

      // Convert to array and sort by event date
      const ticketsArray = Object.values(ticketsByEvent).sort((a: any, b: any) => {
        return new Date(a.event.startDate).getTime() - new Date(b.event.startDate).getTime();
      });

      return NextResponse.json({
        tickets: ticketsArray,
        total: userTickets.length,
      });
    } catch (error) {
      await closeDb(client);
      throw error;
    }
  } catch (error) {
    console.error("Fetch tickets error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
