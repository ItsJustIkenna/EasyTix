import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb } from "@/db";
import { organizers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

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

    // Get organizer from database
    const [organizer] = await database
      .select()
      .from(organizers)
      .where(eq(organizers.id, organizerId))
      .limit(1);

    if (!organizer) {
      return NextResponse.json(
        { success: false, error: "Organizer not found" },
        { status: 404 }
      );
    }

    let accountId = organizer.stripeAccountId;

    // Create Stripe Connect account if doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: userData.data.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          organizerId: organizer.id,
          businessName: organizer.businessName,
        },
      });

      accountId = account.id;

      // Save account ID to database
      await database
        .update(organizers)
        .set({
          stripeAccountId: accountId,
          updatedAt: new Date(),
        })
        .where(eq(organizers.id, organizerId));
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/organizer/settings?stripe_refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/organizer/settings?stripe_success=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      success: true,
      data: {
        url: accountLink.url,
        accountId,
      },
    });
  } catch (error: any) {
    console.error("Stripe Connect onboarding error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create onboarding link" },
      { status: 500 }
    );
  }
}

// Get Stripe Connect account status
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

    // Get organizer from database
    const [organizer] = await database
      .select()
      .from(organizers)
      .where(eq(organizers.id, organizerId))
      .limit(1);

    if (!organizer || !organizer.stripeAccountId) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
        },
      });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(organizer.stripeAccountId);

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: account.requirements?.currently_due || [],
      },
    });
  } catch (error: any) {
    console.error("Stripe Connect status error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to get account status" },
      { status: 500 }
    );
  }
}
