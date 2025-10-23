import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, tickets, events, ticketTiers, organizers } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { db: database } = await getDb();

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

    // Get organizer ID
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

    const organizerId = userData.data.organizer.id;

    // Get all organizer's events
    const organizerEvents = await database
      .select({ id: events.id })
      .from(events)
      .where(eq(events.organizerId, organizerId));

    const eventIds = organizerEvents.map((e) => e.id);

    if (eventIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalRevenue: 0,
          totalTicketsSold: 0,
          totalTicketsCheckedIn: 0,
          averageTicketPrice: 0,
          eventCount: 0,
          revenueByEvent: [],
          salesByTier: [],
          recentOrders: [],
        },
      });
    }

    // Calculate total revenue
    const revenueResult = await database
      .select({
        total: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
      .from(orders)
      .where(
        and(
          sql`${orders.eventId} = ANY(${eventIds})`,
          eq(orders.status, "COMPLETED")
        )
      );

    const totalRevenue = Number(revenueResult[0]?.total || 0);

    // Calculate total tickets sold
    const ticketsSoldResult = await database
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .where(sql`${tickets.eventId} = ANY(${eventIds})`);

    const totalTicketsSold = Number(ticketsSoldResult[0]?.count || 0);

    // Calculate total checked-in tickets
    const checkedInResult = await database
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(tickets)
      .where(
        and(
          sql`${tickets.eventId} = ANY(${eventIds})`,
          sql`${tickets.checkedInAt} IS NOT NULL`
        )
      );

    const totalTicketsCheckedIn = Number(checkedInResult[0]?.count || 0);

    // Calculate average ticket price
    const averageTicketPrice =
      totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;

    // Get revenue by event
    const revenueByEvent = await database
      .select({
        eventId: orders.eventId,
        eventTitle: events.title,
        revenue: sql<number>`SUM(${orders.totalAmount})`,
        ticketCount: sql<number>`COUNT(DISTINCT ${tickets.id})`,
      })
      .from(orders)
      .innerJoin(events, eq(orders.eventId, events.id))
      .leftJoin(tickets, eq(tickets.orderId, orders.id))
      .where(
        and(
          sql`${orders.eventId} = ANY(${eventIds})`,
          eq(orders.status, "COMPLETED")
        )
      )
      .groupBy(orders.eventId, events.title)
      .orderBy(desc(sql`SUM(${orders.totalAmount})`))
      .limit(10);

    // Get recent orders
    const recentOrders = await database
      .select({
        id: orders.id,
        totalAmount: orders.totalAmount,
        status: orders.status,
        createdAt: orders.createdAt,
        eventTitle: events.title,
        ticketCount: sql<number>`COUNT(${tickets.id})`,
      })
      .from(orders)
      .innerJoin(events, eq(orders.eventId, events.id))
      .leftJoin(tickets, eq(tickets.orderId, orders.id))
      .where(sql`${orders.eventId} = ANY(${eventIds})`)
      .groupBy(orders.id, events.title)
      .orderBy(desc(orders.createdAt))
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalTicketsSold,
        totalTicketsCheckedIn,
        averageTicketPrice,
        attendanceRate:
          totalTicketsSold > 0
            ? (totalTicketsCheckedIn / totalTicketsSold) * 100
            : 0,
        eventCount: organizerEvents.length,
        revenueByEvent: revenueByEvent.map((r) => ({
          eventId: r.eventId,
          eventTitle: r.eventTitle,
          revenue: Number(r.revenue),
          ticketCount: Number(r.ticketCount),
        })),
        recentOrders: recentOrders.map((o) => ({
          id: o.id,
          totalAmount: o.totalAmount,
          status: o.status,
          createdAt: o.createdAt,
          eventTitle: o.eventTitle,
          ticketCount: Number(o.ticketCount),
        })),
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
