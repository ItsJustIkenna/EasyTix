import { NextRequest, NextResponse } from "next/server";
import { getDb, closeDb } from "@/db";
import { orders, tickets, events, payments } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

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
      // Fetch all orders for the user with related data
      const userOrders = await db
        .select({
          order: orders,
          event: events,
          payment: payments,
          ticketCount: sql<number>`(
            SELECT COUNT(*)::int
            FROM "Ticket"
            WHERE "Ticket"."orderId" = "Order"."id"
          )`,
        })
        .from(orders)
        .leftJoin(events, eq(orders.eventId, events.id))
        .leftJoin(payments, eq(payments.orderId, orders.id))
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt));

      await closeDb();

      // Format the response
      const formattedOrders = userOrders.map((item) => ({
        id: item.order.id,
        eventId: item.order.eventId,
        eventTitle: item.event?.title,
        eventVenue: item.event?.venue,
        eventStartDate: item.event?.startDate,
        eventCoverImage: item.event?.coverImage,
        status: item.order.status,
        totalAmount: item.order.totalAmount,
        currency: item.order.currency,
        ticketCount: item.ticketCount,
        paymentStatus: item.payment?.status,
        stripePaymentIntentId: item.payment?.stripePaymentIntentId,
        createdAt: item.order.createdAt,
        updatedAt: item.order.updatedAt,
      }));

      // Calculate summary statistics
      const summary = {
        totalOrders: formattedOrders.length,
        totalSpent: formattedOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        totalTickets: formattedOrders.reduce((sum, order) => sum + order.ticketCount, 0),
        completedOrders: formattedOrders.filter(o => o.status === "COMPLETED").length,
      };

      return NextResponse.json({
        orders: formattedOrders,
        summary,
      });
    } catch (error) {
      await closeDb();
      throw error;
    }
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
