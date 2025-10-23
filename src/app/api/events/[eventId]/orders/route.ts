import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, events, tickets, organizers } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { db: database } = await getDb();
    const eventId = params.eventId;

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

    // Fetch event and verify ownership
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

    const [event] = await database
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    if (event.organizerId !== userData.data.organizer.id) {
      return NextResponse.json(
        { success: false, error: "You do not own this event" },
        { status: 403 }
      );
    }

    // Fetch orders for this event with ticket counts
    const eventOrders = await database
      .select({
        id: orders.id,
        userId: orders.userId,
        totalAmount: orders.totalAmount,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.eventId, eventId));

    // Get ticket counts for each order
    const ordersWithTickets = await Promise.all(
      eventOrders.map(async (order) => {
        const [ticketCount] = await database
          .select({ count: count() })
          .from(tickets)
          .where(eq(tickets.orderId, order.id));

        return {
          ...order,
          ticketCount: ticketCount?.count || 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: ordersWithTickets,
    });
  } catch (error: any) {
    console.error("Orders fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
