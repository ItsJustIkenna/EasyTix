import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to protect against CSRF attacks
 * Verifies that state-changing requests come from the same origin
 */
export function middleware(request: NextRequest) {
  // Only check non-GET/HEAD requests (state-changing operations)
  if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS") {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    
    // Allow same-origin requests
    if (origin) {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        console.warn(`CSRF: Blocked cross-origin ${request.method} request from ${origin} to ${host}`);
        return NextResponse.json(
          { error: "Invalid origin" },
          { status: 403 }
        );
      }
    } else if (!request.headers.get("x-requested-with")) {
      // If no origin header, check for custom header (prevents simple form POST attacks)
      console.warn(`CSRF: Blocked request without origin or custom header`);
      return NextResponse.json(
        { error: "Missing required headers" },
        { status: 403 }
      );
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");
  
  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");
  
  // Enable XSS protection
  response.headers.set("X-XSS-Protection", "1; mode=block");
  
  // Restrict referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Content Security Policy (adjust as needed for your app)
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );

  return response;
}

/**
 * Configure which paths should be protected
 * Apply to all API routes and state-changing operations
 */
export const config = {
  matcher: [
    "/api/:path*", // All API routes
    "/((?!_next/static|_next/image|favicon.ico).*)", // All pages except static files
  ],
};
