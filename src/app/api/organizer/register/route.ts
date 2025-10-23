import { NextRequest, NextResponse } from "next/server";
import {
  hashPassword,
  generateToken,
  sanitizeUser,
  validatePassword,
} from "@/lib/auth";
import { rateLimitAuth } from "@/lib/rate-limit";
import { getDb } from "@/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      businessName,
      businessEmail,
      businessPhone,
      website,
      description,
      address,
      city,
      state,
      zipCode,
    } = body;

    // Rate limiting based on IP address
    const identifier =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "anonymous";
    const rateLimit = await rateLimitAuth(identifier);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many registration attempts. Please try again in 15 minutes.",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimit.reset).toISOString(),
          },
        }
      );
    }

    // Validate required personal fields
    if (!email || !password || !firstName || !lastName || !phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Email, password, first name, last name, and phone are required",
        },
        { status: 400 }
      );
    }

    // Validate required business fields
    if (
      !businessName ||
      !businessEmail ||
      !businessPhone ||
      !description ||
      !address ||
      !city ||
      !state ||
      !zipCode
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "All business information fields are required",
        },
        { status: 400 }
      );
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email format",
        },
        { status: 400 }
      );
    }

    if (!emailRegex.test(businessEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid business email format",
        },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Password does not meet requirements",
          details: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    const { client } = await getDb();

    try {
      // Begin transaction
      await client.query("BEGIN");

      // Check if user already exists
      const existingUsers = await client.query(
        `SELECT id FROM "User" WHERE LOWER(email) = LOWER($1)`,
        [email]
      );

      if (existingUsers.rows.length > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            success: false,
            error: "User with this email already exists",
          },
          { status: 409 }
        );
      }

      // Check if business email already exists
      const existingOrganizers = await client.query(
        `SELECT id FROM "Organizer" WHERE LOWER("businessEmail") = LOWER($1)`,
        [businessEmail]
      );

      if (existingOrganizers.rows.length > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            success: false,
            error: "An organizer with this business email already exists",
          },
          { status: 409 }
        );
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user with ORGANIZER role
      const userResult = await client.query(
        `INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", phone, role, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'ORGANIZER', NOW(), NOW())
         RETURNING id, email, "firstName", "lastName", phone, role, "createdAt", "updatedAt"`,
        [email.toLowerCase(), passwordHash, firstName, lastName, phone]
      );

      const user = userResult.rows[0];

      // Create organizer record
      const organizerResult = await client.query(
        `INSERT INTO "Organizer" (
          id, 
          "businessName", 
          "businessEmail", 
          "businessPhone", 
          website, 
          description, 
          address, 
          city, 
          state, 
          "zipCode", 
          "createdAt", 
          "updatedAt"
        )
        VALUES (
          gen_random_uuid(), 
          $1, 
          $2, 
          $3, 
          $4, 
          $5, 
          $6, 
          $7, 
          $8, 
          $9, 
          NOW(), 
          NOW()
        )
        RETURNING id, "businessName", "businessEmail", "businessPhone", website, description, address, city, state, "zipCode", "createdAt"`,
        [
          businessName,
          businessEmail.toLowerCase(),
          businessPhone,
          website || null,
          description,
          address,
          city,
          state,
          zipCode,
        ]
      );

      const organizer = organizerResult.rows[0];

      // Link user to organizer in the join table
      await client.query(
        `INSERT INTO "_OrganizerToUser" ("A", "B")
         VALUES ($1, $2)`,
        [organizer.id, user.id]
      );

      // Commit transaction
      await client.query("COMMIT");

      // Generate token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Return user, organizer, and token (without password hash)
      return NextResponse.json(
        {
          success: true,
          data: {
            user: {
              ...sanitizeUser(user),
              organizer: {
                id: organizer.id,
                businessName: organizer.businessName,
                businessEmail: organizer.businessEmail,
              },
            },
            token,
          },
        },
        { status: 201 }
      );
    } catch (dbError) {
      // Rollback on any error
      await client.query("ROLLBACK");
      throw dbError;
    }
  } catch (error) {
    console.error("Organizer registration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred during registration",
      },
      { status: 500 }
    );
  }
}
