// lib/session.ts
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { getDB } from "./db"; // FIX: Corrected import path

// Secret key for JWT signing - in production, this should be an environment variable
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-at-least-32-characters-long"
);

// Session interface
export interface SessionUser {
  userId: number;
  username: string;
  email: string;
  roleName: string;
  permissions: string[];
}

export interface Session {
  user?: SessionUser;
  expires: Date;
}

// FIX: Define type for the expected structure of the user query result row
interface UserQueryResultRow {
  user_id: number;
  username: string;
  email: string;
  role_name: string;
  permissions: string | null; // GROUP_CONCAT returns a string or null
}

// FIX: Define a type for the expected structure of query results (generic)
interface QueryResult<T> {
  rows?: T[];
  // Add other potential properties like rowCount, etc., based on your DB library
}

/**
 * Get the current session from cookies
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie?.value) {
    return undefined;
  }

  try {
    // Verify the JWT token
    const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET, {
      algorithms: ["HS256"],
    });

    // Check if token is expired
    const expiresTimestamp = payload.exp as number | undefined;
    if (!expiresTimestamp || expiresTimestamp * 1000 < Date.now()) {
      console.log("Session token expired");
      deleteSession(); // Clean up expired cookie
      return undefined;
    }

    const expires = new Date(expiresTimestamp * 1000);

    return {
      user: payload.user as SessionUser | undefined, // Ensure type safety
      expires,
    };
  } catch (error) {
    console.error("Error verifying session token:", error);
    deleteSession(); // Clean up invalid cookie
    return undefined;
  }
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: number): Promise<Session | null> {
  try {
    const database = await getDB();

    // Get user data from database including permissions
    // FIX: Use type assertion for the mock query result
    const userResult = (await database.query(
      `
      SELECT 
        u.user_id, 
        u.username, 
        u.email, 
        r.role_name,
        GROUP_CONCAT(DISTINCT p.permission_name) as permissions
      FROM 
        Users u
      JOIN 
        Roles r ON u.role_id = r.role_id
      LEFT JOIN 
        RolePermissions rp ON r.role_id = rp.role_id
      LEFT JOIN 
        Permissions p ON rp.permission_id = p.permission_id
      WHERE 
        u.user_id = ?
      GROUP BY 
        u.user_id, u.username, u.email, r.role_name
    `,
      [userId]
    )) as QueryResult<UserQueryResultRow>;

    // FIX: Use the defined type for the row
    const userRow =
      userResult.rows && userResult.rows.length > 0 ? userResult.rows[0] : undefined;

    if (!userRow) {
      console.error(`User not found for ID: ${userId}`);
      return undefined;
    }

    // Create session object
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // 24-hour session

    const sessionUser: SessionUser = {
      userId: userRow.user_id,
      username: userRow.username,
      email: userRow.email,
      roleName: userRow.role_name,
      permissions: userRow.permissions ? userRow.permissions.split(",") : [],
    };

    const session: Session = {
      user: sessionUser,
      expires,
    };

    // Create JWT token
    const token = await new SignJWT({ user: session.user })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(expires.getTime() / 1000)) // Use Math.floor for Unix timestamp
      .setIssuedAt()
      .sign(JWT_SECRET);

    // Set cookie
    cookies().set("session", token, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "strict",
    });

    console.log(`Session created for user: ${sessionUser.username}`);
    return session;
  } catch (error) {
    console.error("Error creating session:", error);
    return undefined;
  }
}

/**
 * Delete the current session
 */
export function deleteSession(): void {
  console.log("Deleting session cookie");
  cookies().set("session", "", { expires: new Date(0), path: "/" }); // More robust deletion
}

/**
 * Check if the current user has a specific permission
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const session = await getSession();
  if (!session?.user?.permissions) {
    return false;
  }
  return session.user.permissions.includes(permission);
}

/**
 * Check if the current user has ANY of the specified permissions
 */
export async function hasAnyPermission(
  permissions: string[]
): Promise<boolean> {
  const session = await getSession();
  if (!session?.user?.permissions) {
    return false;
  }
  // FIX: Use non-null assertion safely after check
  return permissions.some((p) => session.user!.permissions.includes(p));
}

/**
 * Check if the current user has ALL of the specified permissions
 */
export async function hasAllPermissions(
  permissions: string[]
): Promise<boolean> {
  const session = await getSession();
  if (!session?.user?.permissions) {
    return false;
  }
  // FIX: Use non-null assertion safely after check
  return permissions.every((p) => session.user!.permissions.includes(p));
}
