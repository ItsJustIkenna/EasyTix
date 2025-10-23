import { NextRequest, NextResponse } from "next/server";
import { verifyToken, extractToken } from "./auth";
import { Client } from "pg";

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
}

async function getDbClient() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  return client;
}

/**
 * Middleware to authenticate requests
 * Returns the authenticated user context or an error response
 */
export async function authenticate(
  req: NextRequest
): Promise<{ error?: NextResponse; user?: AuthContext }> {
  // Extract token from Authorization header
  const authHeader = req.headers.get("authorization");
  const token = extractToken(authHeader || "");

  if (!token) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "No authentication token provided",
        },
        { status: 401 }
      ),
    };
  }

  // Verify token
  const decoded = verifyToken(token);

  if (!decoded) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Invalid or expired token",
        },
        { status: 401 }
      ),
    };
  }

  // Verify user still exists
  const client = await getDbClient();
  
  try {
    const result = await client.query(
      'SELECT id, email, role FROM "User" WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return {
        error: NextResponse.json(
          {
            success: false,
            error: "User not found",
          },
          { status: 404 }
        ),
      };
    }

    const user = result.rows[0];

    return {
      user: {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
    };
  } finally {
    await client.end();
  }
}

/**
 * Middleware to check if user has required role
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: string[]
): Promise<{ error?: NextResponse; user?: AuthContext }> {
  const authResult = await authenticate(req);

  if (authResult.error) {
    return authResult;
  }

  if (!authResult.user) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      ),
    };
  }

  if (!allowedRoles.includes(authResult.user.role)) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions",
        },
        { status: 403 }
      ),
    };
  }

  return { user: authResult.user };
}

/**
 * Middleware to check if user is an admin
 */
export async function requireAdmin(
  req: NextRequest
): Promise<{ error?: NextResponse; user?: AuthContext; admin?: any }> {
  const authResult = await requireRole(req, ["ADMIN"]);

  if (authResult.error) {
    return authResult;
  }

  // Get admin details
  const client = await getDbClient();
  
  try {
    const result = await client.query(
      'SELECT * FROM "Admin" WHERE "userId" = $1',
      [authResult.user!.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].isActive) {
      return {
        error: NextResponse.json(
          {
            success: false,
            error: "Admin access denied",
          },
          { status: 403 }
        ),
      };
    }

    return { user: authResult.user, admin: result.rows[0] };
  } finally {
    await client.end();
  }
}

/**
 * Middleware to check if user is an organizer or owns the organizer
 */
export async function requireOrganizer(
  req: NextRequest,
  organizerId?: string
): Promise<{
  error?: NextResponse;
  user?: AuthContext;
  organizer?: any;
}> {
  const authResult = await authenticate(req);

  if (authResult.error) {
    return authResult;
  }

  const user = authResult.user!;

  // Check if user has organizer role or is admin
  if (!["ORGANIZER", "ADMIN"].includes(user.role)) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Organizer access required",
        },
        { status: 403 }
      ),
    };
  }

  // If specific organizer ID is provided, verify ownership
  if (organizerId) {
    const client = await getDbClient();
    
    try {
      const result = await client.query(
        `SELECT o.* FROM "Organizer" o
         INNER JOIN "_OrganizerToUser" otu ON otu."B" = o.id
         WHERE o.id = $1 AND otu."A" = $2`,
        [organizerId, user.userId]
      );

      if (result.rows.length === 0 && user.role !== "ADMIN") {
        return {
          error: NextResponse.json(
            {
              success: false,
              error: "You do not have access to this organizer",
            },
            { status: 403 }
          ),
        };
      }

      return { user, organizer: result.rows[0] || null };
    } finally {
      await client.end();
    }
  }

  return { user };
}
