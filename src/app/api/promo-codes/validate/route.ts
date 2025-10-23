import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { promoCodes, events } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { toZonedTime } from 'date-fns-tz';

export async function POST(request: NextRequest) {
  try {
    const { db: database } = await getDb();
    const body = await request.json();
    const { code, eventId } = body;

    if (!code || !eventId) {
      return NextResponse.json(
        { success: false, error: "Code and event ID are required" },
        { status: 400 }
      );
    }

    // Get event to access timezone
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

    // Find promo code
    const [promoCode] = await database
      .select()
      .from(promoCodes)
      .where(
        and(
          eq(promoCodes.code, code.toUpperCase()),
          eq(promoCodes.eventId, eventId),
          eq(promoCodes.isActive, true)
        )
      )
      .limit(1);

    if (!promoCode) {
      return NextResponse.json(
        { success: false, error: "Invalid promo code" },
        { status: 404 }
      );
    }

    // Check if code is still valid (date range) using event timezone
    const eventTimezone = event.timezone || 'America/New_York';
    const now = toZonedTime(new Date(), eventTimezone);
    const validFrom = toZonedTime(new Date(promoCode.validFrom), eventTimezone);
    const validTo = toZonedTime(new Date(promoCode.validTo), eventTimezone);

    if (now < validFrom) {
      return NextResponse.json(
        { success: false, error: "Promo code is not yet valid" },
        { status: 400 }
      );
    }

    if (now > validTo) {
      return NextResponse.json(
        { success: false, error: "Promo code has expired" },
        { status: 400 }
      );
    }

    // Check usage limit
    if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
      return NextResponse.json(
        { success: false, error: "Promo code has reached its usage limit" },
        { status: 400 }
      );
    }

    // Return valid promo code
    return NextResponse.json({
      success: true,
      data: {
        id: promoCode.id,
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        remainingUses: promoCode.maxUses
          ? promoCode.maxUses - promoCode.currentUses
          : null,
      },
    });
  } catch (error) {
    console.error("Validate promo code error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate promo code" },
      { status: 500 }
    );
  }
}
