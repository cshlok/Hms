// lib/session.ts
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { getDb } from './db';

// Secret key for JWT signing - in production, this should be an environment variable
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-at-least-32-characters-long'
);

// Session interface
export interface Session {
  user?: {
    userId: number;
    username: string;
    email: string;
    roleName: string;
    permissions: string[];
  };
  expires: Date;
}

/**
 * Get the current session from cookies
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session');
  
  if (!sessionCookie?.value) {
    return null;
  }
  
  try {
    // Verify the JWT token
    const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    
    // Check if token is expired
    const expires = new Date(payload.exp as number * 1000);
    if (expires < new Date()) {
      return null;
    }
    
    return {
      user: payload.user as Session['user'],
      expires,
    };
  } catch (error) {
    console.error('Error verifying session token:', error);
    return null;
  }
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: number): Promise<Session | null> {
  try {
    const db = getDb();
    
    // Get user data from database
    const userResult = await db.query(`
      SELECT 
        u.user_id, 
        u.username, 
        u.email, 
        r.role_name,
        GROUP_CONCAT(p.permission_name) as permissions
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
        u.user_id
    `, [userId]);
    
    const user = userResult.rows && userResult.rows.length > 0 ? userResult.rows[0] : null;
    
    if (!user) {
      return null;
    }
    
    // Create session object
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // 24-hour session
    
    const session: Session = {
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        roleName: user.role_name,
        permissions: user.permissions ? user.permissions.split(',') : [],
      },
      expires,
    };
    
    // Create JWT token
    const token = await new SignJWT({ user: session.user })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(expires.getTime() / 1000)
      .setIssuedAt()
      .sign(JWT_SECRET);
    
    // Set cookie
    cookies().set('session', token, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'strict',
    });
    
    return session;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

/**
 * Delete the current session
 */
export function deleteSession(): void {
  cookies().delete('session');
}
