import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb } from "@/db";
import { payouts, organizers, orders, events } from "@/db/schema";
import { eq, and, desc, sum } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

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

    // Fetch user data to get organizer ID
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

    // Get all payouts for this organizer
    const organizerPayouts = await database
      .select()
      .from(payouts)
      .where(eq(payouts.organizerId, organizerId))
      .orderBy(desc(payouts.createdAt));

    // Calculate total earnings from completed orders
    const organizerEvents = await database
      .select({ id: events.id })
      .from(events)
      .where(eq(events.organizerId, organizerId));

    const eventIds = organizerEvents.map((e) => e.id);

    let totalEarnings = 0;
    let totalPaid = 0;
    let totalPending = 0;

    if (eventIds.length > 0) {
      // Calculate total earnings from completed orders
      const completedOrders = await database
        .select({
          total: sum(orders.totalAmount),
        })
        .from(orders)
        .where(
          and(
            eq(orders.status, "COMPLETED"),
            // We need to filter by eventIds, but drizzle doesn't have an in() operator
            // So we'll do this manually
          )
        );

      // Filter by eventIds manually
      const ordersForEvents = await database
        .select()
        .from(orders)
        .where(eq(orders.status, "COMPLETED"));

      totalEarnings = ordersForEvents
        .filter((order) => eventIds.includes(order.eventId))
        .reduce((sum, order) => sum + order.totalAmount, 0);
    }

    // Calculate paid and pending amounts
    totalPaid = organizerPayouts
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + p.amount, 0);

    totalPending = organizerPayouts
      .filter((p) => p.status === "PENDING" || p.status === "SCHEDULED")
      .reduce((sum, p) => sum + p.amount, 0);

    // Get Stripe Connect account status
    const [organizer] = await database
      .select()
      .from(organizers)
      .where(eq(organizers.id, organizerId))
      .limit(1);

    let stripeAccountStatus = null;
    if (organizer?.stripeAccountId) {
      try {
        const account = await stripe.accounts.retrieve(organizer.stripeAccountId);
        stripeAccountStatus = {
          connected: true,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
        };
      } catch (error) {
        console.error("Error fetching Stripe account:", error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        payouts: organizerPayouts,
        summary: {
          totalEarnings,
          totalPaid,
          totalPending,
          availableBalance: totalEarnings - totalPaid - totalPending,
        },
        stripeAccountStatus: stripeAccountStatus || {
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
        },
      },
    });
  } catch (error: any) {
    console.error("Payouts API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch payouts" },
      { status: 500 }
    );
  }
}

// Sync payouts from Stripe (admin/cron job endpoint)
export async function POST(request: NextRequest) {
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

    // Fetch user data to get organizer ID
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

    // Get organizer's Stripe account
    const [organizer] = await database
      .select()
      .from(organizers)
      .where(eq(organizers.id, organizerId))
      .limit(1);

    if (!organizer?.stripeAccountId) {
      return NextResponse.json(
        { success: false, error: "No Stripe account connected" },
        { status: 400 }
      );
    }

    // Fetch payouts from Stripe
    const stripePayouts = await stripe.payouts.list(
      {
        limit: 100,
      },
      {
        stripeAccount: organizer.stripeAccountId,
      }
    );

    // Sync payouts to database
    let syncedCount = 0;
    for (const stripePayout of stripePayouts.data) {
      // Check if payout already exists
      const [existing] = await database
        .select()
        .from(payouts)
        .where(eq(payouts.stripePayoutId, stripePayout.id))
        .limit(1);

      if (!existing) {
        await database.insert(payouts).values({
          organizerId,
          amount: stripePayout.amount,
          currency: stripePayout.currency.toUpperCase(),
          status: stripePayout.status === "paid" ? "PAID" : stripePayout.status === "pending" ? "PENDING" : "FAILED",
          stripePayoutId: stripePayout.id,
          scheduledDate: stripePayout.created ? new Date(stripePayout.created * 1000) : new Date(),
          paidAt: stripePayout.arrival_date ? new Date(stripePayout.arrival_date * 1000) : null,
          failureReason: stripePayout.failure_message || null,
        });
        syncedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `Synced ${syncedCount} new payouts`,
        totalPayouts: stripePayouts.data.length,
      },
    });
  } catch (error: any) {
    console.error("Payout sync error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sync payouts" },
      { status: 500 }
    );
  }
}
