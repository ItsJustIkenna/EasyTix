import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { promoCodes, events, organizers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export async function POST(
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

    // Verify event ownership
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

    if (event.organizerId !== organizerId) {
      return NextResponse.json(
        { success: false, error: "You do not own this event" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      code,
      discountType,
      discountValue,
      maxUses,
      validFrom,
      validTo,
    } = body;

    // Validate input
    if (!code || !discountType || !discountValue || !validFrom || !validTo) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (discountType === "PERCENTAGE" && (discountValue < 1 || discountValue > 100)) {
      return NextResponse.json(
        { success: false, error: "Percentage discount must be between 1 and 100" },
        { status: 400 }
      );
    }

    if (discountType === "FIXED" && discountValue < 1) {
      return NextResponse.json(
        { success: false, error: "Fixed discount must be greater than 0" },
        { status: 400 }
      );
    }

    // Check if code already exists for this event
    const [existingCode] = await database
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.code, code.toUpperCase()))
      .limit(1);

    if (existingCode) {
      return NextResponse.json(
        { success: false, error: "Promo code already exists" },
        { status: 400 }
      );
    }

    // Create promo code
    const [newPromoCode] = await database
      .insert(promoCodes)
      .values({
        eventId,
        code: code.toUpperCase(),
        discountType,
        discountValue,
        maxUses: maxUses || null,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newPromoCode,
    });
  } catch (error) {
    console.error("Create promo code error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create promo code" },
      { status: 500 }
    );
  }
}

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

    // Verify event ownership
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

    if (event.organizerId !== organizerId) {
      return NextResponse.json(
        { success: false, error: "You do not own this event" },
        { status: 403 }
      );
    }

    // Fetch promo codes for this event
    const codes = await database
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.eventId, eventId))
      .orderBy(promoCodes.createdAt);

    return NextResponse.json({
      success: true,
      data: codes,
    });
  } catch (error) {
    console.error("Get promo codes error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch promo codes" },
      { status: 500 }
    );
  }
}
