import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { verifyToken, extractToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.get("authorization");
    const token = extractToken(authHeader || "");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "No authentication token provided",
        },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired token",
        },
        { status: 401 }
      );
    }

    // Get user from database using pg
    const client = new Client(process.env.DATABASE_URL);
    await client.connect();

    try {
      const userResult = await client.query(
        `SELECT u.*, 
                a.id as admin_id, a.role as admin_role, a.permissions as admin_permissions, a."isActive" as admin_is_active
         FROM "User" u
         LEFT JOIN "Admin" a ON a."userId" = u.id
         WHERE u.id = $1`,
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        await client.end();
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
          },
          { status: 404 }
        );
      }

      const user = userResult.rows[0];

      // Prepare user data
      const userData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.emailVerified,
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

      if (user.role === 'ORGANIZER') {
        // Get organizer info
        const organizerResult = await client.query(
          `SELECT o.* FROM "Organizer" o
           INNER JOIN "_OrganizerToUser" otu ON otu."A" = o.id
           WHERE otu."B" = $1
           LIMIT 1`,
          [user.id]
        );

        roleData = {
          ...roleData,
          isOrganizer: true,
          organizer: organizerResult.rows.length > 0 ? {
            id: organizerResult.rows[0].id,
            businessName: organizerResult.rows[0].businessName,
            businessEmail: organizerResult.rows[0].businessEmail,
          } : null,
        };
      }

      await client.end();

      return NextResponse.json({
        success: true,
        data: {
          user: userData,
          ...roleData,
        },
      });
    } catch (queryError) {
      await client.end();
      throw queryError;
    }
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Authentication failed",
      },
      { status: 500 }
    );
  }
}
