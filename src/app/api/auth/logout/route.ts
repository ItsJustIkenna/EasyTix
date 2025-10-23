import { NextRequest, NextResponse } from "next/server";

/**
 * Logout endpoint
 * Since we're using JWT tokens, there's no server-side session to clear.
 * The client should discard the token to log out.
 * This endpoint is mainly for consistency and can be used for logging.
 */
export async function POST(req: NextRequest) {
  try {
    // You could add logout logging here if needed
    // For example, logging to audit log

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred during logout",
      },
      { status: 500 }
    );
  }
}