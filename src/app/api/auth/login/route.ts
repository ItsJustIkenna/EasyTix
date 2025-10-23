import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { verifyPassword, generateToken } from "@/lib/auth";
import { rateLimitAuth } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Email and password are required",
        },
        { status: 400 }
      );
    }

    // Rate limiting based on IP address
    const identifier = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";
    const rateLimit = await rateLimitAuth(identifier);
    
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many login attempts. Please try again in 15 minutes.",
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

    // Use pg client directly to bypass Prisma ARM64 issue
    console.log('[Login] Attempting database connection...');
    const client = new Client(process.env.DATABASE_URL);
    await client.connect();
    console.log('[Login] Connected to database, querying user:', email);

    try {
      // Find user by email - simplified query without organizers subquery
      const userResult = await client.query(
        `SELECT u.*, 
                a.id as admin_id, a.role as admin_role, a.permissions as admin_permissions, a."isActive" as admin_is_active
         FROM "User" u
         LEFT JOIN "Admin" a ON a."userId" = u.id
         WHERE LOWER(u.email) = LOWER($1)`,
        [email]
      );

      if (userResult.rows.length === 0) {
        console.log('[Login] User not found');
        await client.end();
        return NextResponse.json(
          {
            success: false,
            error: "Invalid email or password",
          },
          { status: 401 }
        );
      }

      const user = userResult.rows[0];
      console.log('[Login] User found:', user.email, 'Role:', user.role);

      // Verify password
      const isValidPassword = await verifyPassword(password, user.passwordHash);
      console.log('[Login] Password valid:', isValidPassword);

      if (!isValidPassword) {
        await client.end();
        return NextResponse.json(
          {
            success: false,
            error: "Invalid email or password",
          },
          { status: 401 }
        );
      }

      // Generate token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Prepare user data
      const userData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      };

      // Add role-specific data
      let roleData: any = {};

      if (user.admin_id) {
        roleData = {
          isAdmin: true,
          adminRole: user.admin_role,
          adminPermissions: user.admin_permissions,
          adminActive: user.admin_is_active,
        };
      }

      // Simplified organizer check based on role
      if (user.role === 'ORGANIZER') {
        roleData = {
          ...roleData,
          isOrganizer: true,
          organizerIds: [], // Can be populated later if needed
          totalEvents: 0,
        };
      }

      await client.end();

      // Return user and token
      return NextResponse.json({
        success: true,
        data: {
          user: userData,
          token,
          ...roleData,
        },
      });
    } catch (queryError) {
      await client.end();
      throw queryError;
    }
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred during login",
      },
      { status: 500 }
    );
  }
}
