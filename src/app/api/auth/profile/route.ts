import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

// Authenticate function (reused from other routes)
async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { success: false, error: "No token provided" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.split(" ")[1];
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    // Verify token
    const tokenResult = await client.query(
      'SELECT id, "userId", expires FROM "Token" WHERE token = $1 AND expires > NOW()',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      await client.end();
      return {
        error: NextResponse.json(
          { success: false, error: "Invalid or expired token" },
          { status: 401 }
        ),
      };
    }

    const tokenData = tokenResult.rows[0];

    // Get user
    const userResult = await client.query(
      'SELECT id, email, "firstName", "lastName", phone, role, "isEmailVerified" FROM "User" WHERE id = $1',
      [tokenData.userId]
    );

    if (userResult.rows.length === 0) {
      await client.end();
      return {
        error: NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        ),
      };
    }

    const user = userResult.rows[0];

    return {
      user: {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      client,
    };
  } catch (error) {
    console.error("[Auth] Error:", error);
    await client.end();
    return {
      error: NextResponse.json(
        { success: false, error: "Authentication failed" },
        { status: 500 }
      ),
    };
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await authenticate(req);

  if (authResult.error) {
    return authResult.error;
  }

  const { user, client } = authResult;

  try {
    const body = await req.json();
    const { firstName, lastName, phone } = body;

    // Validate at least one field is provided
    if (!firstName && !lastName && !phone) {
      await client.end();
      return NextResponse.json(
        { success: false, error: "At least one field is required" },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (firstName !== undefined) {
      updates.push(`"firstName" = $${paramCount}`);
      values.push(firstName);
      paramCount++;
    }

    if (lastName !== undefined) {
      updates.push(`"lastName" = $${paramCount}`);
      values.push(lastName);
      paramCount++;
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramCount}`);
      values.push(phone);
      paramCount++;
    }

    // Always update updatedAt
    updates.push(`"updatedAt" = NOW()`);
    values.push(user.userId);

    const query = `
      UPDATE "User"
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, email, "firstName", "lastName", phone, role, "createdAt", "updatedAt"
    `;

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      await client.end();
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const updatedUser = result.rows[0];

    await client.end();

    console.log('[PATCH /api/auth/profile] User updated:', {
      userId: updatedUser.id,
      fields: updates,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/auth/profile] Error:", error);
    await client.end();
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
