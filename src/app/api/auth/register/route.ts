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
    const { email, password, firstName, lastName, phone, role } = body;

    // Rate limiting based on IP address
    const identifier = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";
    const rateLimit = await rateLimitAuth(identifier);
    
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many registration attempts. Please try again in 15 minutes.",
        },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimit.reset).toISOString(),
          }
        }
      );
    }

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        {
          success: false,
          error: "Email, password, first name, and last name are required",
        },
        { status: 400 }
      );
    }

    // Validate email format
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

    // Default role is CUSTOMER
    const userRole = role || "CUSTOMER";
    if (!["CUSTOMER", "ORGANIZER"].includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid role. Must be CUSTOMER or ORGANIZER",
        },
        { status: 400 }
      );
    }

    const { client } = await getDb();

    // Check if user already exists
    const existingUsers = await client.query(
      `SELECT id FROM "User" WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (existingUsers.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "User with this email already exists",
        },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await client.query(
      `INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", phone, role, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, email, "firstName", "lastName", phone, role, "createdAt", "updatedAt"`,
      [email.toLowerCase(), passwordHash, firstName, lastName, phone || null, userRole]
    );

    const user = result.rows[0];

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Return user and token (without password hash)
    return NextResponse.json(
      {
        success: true,
        data: {
          user: sanitizeUser(user),
          token,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred during registration",
      },
      { status: 500 }
    );
  }
}