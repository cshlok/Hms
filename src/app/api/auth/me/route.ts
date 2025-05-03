// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
// import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get additional user details from database if needed
    // const { env } = getRequestContext();

    // Mock implementation for development without Cloudflare
    // In a real implementation, this would connect to your database

    // Mock user details for development
    // Assuming user.roles is an array and we take the first role
    const userRole =
      user.roles && user.roles.length > 0 ? user.roles[0] : "User"; // Adjusted to use user.roles

    const userDetails = {
      first_name: user.name?.split(" ")[0] || "Test",
      last_name: user.name?.split(" ")[1] || "User",
      email: user.email,
      role: userRole, // Use the adjusted role
      last_login: new Date().toISOString(),
    };

    // Return user information
    return NextResponse.json({
      user: {
        id: user.id,
        email: userDetails.email,
        name: `${userDetails.first_name} ${userDetails.last_name}`,
        firstName: userDetails.first_name,
        lastName: userDetails.last_name,
        role: userDetails.role, // This now uses the corrected role from userDetails
        lastLogin: userDetails.last_login,
        permissions: user.permissions || [],
      },
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return NextResponse.json(
      { error: "Failed to fetch user information" },
      { status: 500 }
    );
  }
}
