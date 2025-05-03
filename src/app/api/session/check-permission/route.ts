// src/app/api/session/check-permission/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session"; // Keep original getSession for server-side use

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const permission = searchParams.get("permission");

  if (!permission) {
    return NextResponse.json(
      { error: "Permission parameter is required" },
      { status: 400 }
    );
  }

  try {
    const session = await getSession(); // This is fine here (Server Component context)
    let hasPerm = false;
    if (session?.user?.permissions) {
      hasPerm = session.user.permissions.includes(permission);
    }

    return NextResponse.json({ hasPermission: hasPerm });
  } catch (error: unknown) {
    console.error("Error checking permission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
