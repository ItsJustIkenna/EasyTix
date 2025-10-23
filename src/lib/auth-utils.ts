import { verifyToken } from "@/lib/auth";
import { pool } from "@/db";

/**
 * Get organizer details from JWT token
 * Replaces inefficient internal API calls to /api/auth/me
 */
export async function getOrganizerFromToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  try {
    // Use raw SQL to query organizer through join table
    const result = await pool.query(
      `SELECT o.* FROM "Organizer" o
       INNER JOIN "_OrganizerToUser" otu ON otu."A" = o.id
       WHERE otu."B" = $1
       LIMIT 1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const organizer = result.rows[0];
    return {
      id: organizer.id,
      businessName: organizer.businessName,
      businessEmail: organizer.businessEmail,
      businessPhone: organizer.businessPhone,
      stripeAccountId: organizer.stripeAccountId,
    };
  } catch (error) {
    console.error("Error fetching organizer from token:", error);
    return null;
  }
}

/**
 * Get user details from JWT token
 */
export async function getUserFromToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  try {
    const result = await pool.query(
      `SELECT id, email, "firstName", "lastName", role
       FROM "User"
       WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error fetching user from token:", error);
    return null;
  }
}

/**
 * Verify token and return decoded payload
 */
export function verifyAuthToken(authHeader: string | null | undefined): { userId: string; email: string; role: string } | null {
  if (!authHeader) {
    return null;
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
  return verifyToken(token);
}
