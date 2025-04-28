// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie, getCurrentUser } from '@/lib/auth';
import { getRequestContext } from '@cloudflare/next-on-pages';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const { env } = getRequestContext();
    
    // Log logout if user is authenticated
    if (user && user.id) {
      await env.DB.prepare(
        `INSERT INTO login_logs (user_id, ip_address, user_agent, status)
         VALUES (?, ?, ?, ?)`
      ).bind(
        user.id,
        request.headers.get('x-forwarded-for') || request.ip || 'unknown',
        request.headers.get('user-agent') || 'unknown',
        'logout'
      ).run();
    }
    
    // Create response
    const response = NextResponse.json({
      message: 'Logout successful'
    });
    
    // Clear auth cookie
    clearAuthCookie(response);
    
    return response;
    
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, attempt to clear the cookie
    const response = NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
    
    clearAuthCookie(response);
    
    return response;
  }
}
