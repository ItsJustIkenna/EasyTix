import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { requireOrganizer } from "@/lib/middleware";

async function getDbClient() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  return client;
}

/**
 * GET /api/events
 * Get all published events (public endpoint)
 */
export async function GET(req: NextRequest) {
  const client = await getDbClient();
  
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const city = searchParams.get("city") || "";
    const status = searchParams.get("status") || "PUBLISHED";

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      conditions.push(`e.status = $${paramCount++}`);
      params.push(status);
    }

    if (search) {
      conditions.push(`(e.title ILIKE $${paramCount} OR e.description ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (city) {
      conditions.push(`e.city ILIKE $${paramCount++}`);
      params.push(`%${city}%`);
    }

    if (category) {
      conditions.push(`e.category = $${paramCount++}`);
      params.push(category);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get events with their organizer and ticket tiers
    const eventsQuery = `
      SELECT 
        e.*,
        o.id as organizer_id,
        o."businessName" as organizer_business_name,
        json_agg(
          json_build_object(
            'id', tt.id,
            'name', tt.name,
            'basePrice', tt."basePrice",
            'platformMarkup', tt."platformMarkup",
            'platformFee', tt."platformFee",
            'totalQuantity', tt."totalQuantity",
            'soldQuantity', tt."soldQuantity"
          ) ORDER BY tt."sortOrder"
        ) FILTER (WHERE tt.id IS NOT NULL) as ticket_tiers
      FROM "Event" e
      LEFT JOIN "Organizer" o ON e."organizerId" = o.id
      LEFT JOIN "TicketTier" tt ON e.id = tt."eventId" AND tt."isActive" = true
      ${whereClause}
      GROUP BY e.id, o.id, o."businessName"
      ORDER BY e."startDate" ASC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    params.push(limit, offset);

    const eventsResult = await client.query(eventsQuery, params);

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM "Event" e ${whereClause}`;
    const countResult = await client.query(countQuery, params.slice(0, -2)); // Remove limit and offset params
    const total = parseInt(countResult.rows[0].count);

    // Format the events data
    const events = eventsResult.rows.map(row => ({
      id: row.id,
      organizerId: row.organizerId,
      title: row.title,
      description: row.description,
      venue: row.venue,
      address: row.address,
      city: row.city,
      state: row.state,
      zipCode: row.zipCode,
      startDate: row.startDate,
      endDate: row.endDate,
      timezone: row.timezone,
      category: row.category,
      coverImage: row.coverImage,
      images: row.images,
      isFree: row.isFree,
      currency: row.currency,
      status: row.status,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      organizer: {
        id: row.organizer_id,
        businessName: row.organizer_business_name,
      },
      ticketTiers: row.ticket_tiers || [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        events,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get events error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch events",
      },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}

/**
 * POST /api/events
 * Create a new event (organizer/admin only)
 */
export async function POST(req: NextRequest) {
  // Authenticate and require organizer role
  const authResult = await requireOrganizer(req);
  if (authResult.error) {
    return authResult.error;
  }

  const user = authResult.user!;
  const client = await getDbClient();

  try {
    const body = await req.json();

    const {
      organizerId,
      title,
      description,
      venue,
      address,
      city,
      state,
      zipCode,
      startDate,
      endDate,
      timezone,
      category,
      coverImage,
      images,
      isFree,
      currency,
      ticketTiers,
    } = body;

    console.log('[POST /api/events] Received body:', {
      organizerId,
      title,
      description,
      venue,
      address,
      city,
      state,
      zipCode,
      startDate,
      endDate,
      category,
      ticketTiersCount: ticketTiers?.length
    });

    // Validate required fields
    if (
      !organizerId ||
      !title ||
      !description ||
      !venue ||
      !address ||
      !city ||
      !state ||
      !zipCode ||
      !startDate ||
      !endDate
    ) {
      const missingFields = [];
      if (!organizerId) missingFields.push('organizerId');
      if (!title) missingFields.push('title');
      if (!description) missingFields.push('description');
      if (!venue) missingFields.push('venue');
      if (!address) missingFields.push('address');
      if (!city) missingFields.push('city');
      if (!state) missingFields.push('state');
      if (!zipCode) missingFields.push('zipCode');
      if (!startDate) missingFields.push('startDate');
      if (!endDate) missingFields.push('endDate');
      
      console.log('[POST /api/events] Missing fields:', missingFields);
      
      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Verify user has access to this organizer
    if (user.role !== "ADMIN") {
      const accessCheck = await client.query(
        `SELECT o.id FROM "Organizer" o
         INNER JOIN "_OrganizerToUser" otu ON otu."A" = o.id
         WHERE o.id = $1 AND otu."B" = $2`,
        [organizerId, user.userId]
      );

      if (accessCheck.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "You do not have access to this organizer",
          },
          { status: 403 }
        );
      }
    }

    // Start transaction
    await client.query("BEGIN");

    // Create event
    const eventResult = await client.query(
      `INSERT INTO "Event" (
        id, "organizerId", title, description, venue, address, city, state, "zipCode",
        "startDate", "endDate", timezone, "coverImage", images, "isFree", currency, status,
        "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'DRAFT', NOW(), NOW()
      ) RETURNING *`,
      [
        organizerId,
        title,
        description,
        venue,
        address,
        city,
        state,
        zipCode,
        new Date(startDate),
        new Date(endDate),
        timezone || 'America/New_York',
        coverImage || null,
        images || [],
        isFree || false,
        currency || 'USD',
      ]
    );

    const event = eventResult.rows[0];

    // Create ticket tiers if provided
    let createdTicketTiers: any[] = [];
    if (ticketTiers && ticketTiers.length > 0) {
      for (let i = 0; i < ticketTiers.length; i++) {
        const tier = ticketTiers[i];
        const tierResult = await client.query(
          `INSERT INTO "TicketTier" (
            id, "eventId", name, description, "basePrice", "platformMarkup", "platformFee",
            "totalQuantity", "soldQuantity", "saleStartDate", "saleEndDate", "sortOrder",
            "isActive", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10, true, NOW(), NOW()
          ) RETURNING *`,
          [
            event.id,
            tier.name,
            tier.description || null,
            tier.basePrice,
            tier.platformMarkup || 0,
            tier.platformFee || 0,
            tier.totalQuantity,
            tier.saleStartDate ? new Date(tier.saleStartDate) : null,
            tier.saleEndDate ? new Date(tier.saleEndDate) : null,
            tier.sortOrder || i,
          ]
        );
        createdTicketTiers.push(tierResult.rows[0]);
      }
    }

    // Commit transaction
    await client.query("COMMIT");

    // Get organizer details
    const organizerResult = await client.query(
      'SELECT id, "businessName" FROM "Organizer" WHERE id = $1',
      [organizerId]
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          ...event,
          images: typeof event.images === 'string' ? JSON.parse(event.images) : event.images,
          organizer: organizerResult.rows[0],
          ticketTiers: createdTicketTiers,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create event error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create event",
      },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
