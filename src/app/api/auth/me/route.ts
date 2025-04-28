// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get additional user details from database if needed
    const { env } = getRequestContext();
    
    const { results } = await env.DB.prepare(
      `SELECT first_name, last_name, email, role, last_login 
       FROM users 
       WHERE id = ? AND is_active = 1 
       LIMIT 1`
    ).bind(user.id).all();
    
    const userDetails = results[0];
    
    if (!userDetails) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Return user information
    return NextResponse.json({
      user: {
        id: user.id,
        email: userDetails.email,
        name: `${userDetails.first_name} ${userDetails.last_name}`,
        firstName: userDetails.first_name,
        lastName: userDetails.last_name,
        role: userDetails.role,
        lastLogin: userDetails.last_login,
        permissions: user.permissions || []
      }
    });
    
  } catch (error) {
    console.error('Error fetching user info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user information' },
      { status: 500 }
    );
  }
}
