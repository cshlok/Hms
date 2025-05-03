// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { authMiddleware } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  // Apply authentication middleware to relevant paths
  if (
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/api")
  ) {
    // Exclude public API routes (e.g., login, maybe public info endpoints)
    if (
      request.nextUrl.pathname.startsWith("/api/auth/login") ||
      request.nextUrl.pathname.startsWith("/api/public") // Example for future public endpoints
    ) {
      return NextResponse.next();
    }

    // Apply auth middleware to protected routes
    return await authMiddleware(request);
  }

  // Allow other requests (e.g., static files, login page) to pass through
  return NextResponse.next();
}

// Specify paths middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/ (public images)
     */
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
};
