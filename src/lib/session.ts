import { SessionOptions, getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { User } from "@/types/user";

// Define and export the shape of the session data
export interface IronSessionData {
  user?: User;
  isLoggedIn?: boolean; // Added isLoggedIn property
}

// Augment the iron-session module to include our IronSessionData definition
declare module "iron-session" {
  interface IronSessionData {
    user?: User;
    isLoggedIn?: boolean; // Added isLoggedIn property here too for consistency
  }
}

// This is the secret used to encrypt the session cookie.
// It should be at least 32 characters long and kept secret.
// You should use an environment variable for this in production.
const sessionPassword =
  process.env.SECRET_COOKIE_PASSWORD ||
  "complex_password_at_least_32_characters_long_for_dev";

if (!sessionPassword || sessionPassword.length < 32) {
  console.warn(
    "Warning: SECRET_COOKIE_PASSWORD environment variable is not set or is too short (must be at least 32 characters). Using a default insecure password for development."
  );
}

export const sessionOptions: SessionOptions = {
  password: sessionPassword,
  cookieName: "hms-session",
  // secure: true should be used in production (HTTPS) but can be false for localhost
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

// Function to get the session in App Router Route Handlers or Server Components
export async function getSession() {
  const session = await getIronSession<IronSessionData>(
    await cookies(),
    sessionOptions
  );
  // Ensure isLoggedIn reflects the presence of a user
  // This logic might need adjustment based on how login is handled elsewhere
  if (session.user && session.isLoggedIn === undefined) {
    session.isLoggedIn = true;
  }
  return session;
}

