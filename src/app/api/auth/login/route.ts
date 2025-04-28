// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { signToken, setAuthCookie, verifyPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const { env } = getRequestContext();
    
    // Find user by email
    const { results } = await env.DB.prepare(
      `SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1`
    ).bind(email.toLowerCase()).all();
    
    const user = results[0];
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Log login attempt
    await env.DB.prepare(
      `INSERT INTO login_logs (user_id, ip_address, user_agent, status)
       VALUES (?, ?, ?, ?)`
    ).bind(
      user.id,
      request.headers.get('x-forwarded-for') || request.ip || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      'success'
    ).run();
    
    // Create user object without sensitive data
    const userForToken = {
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role,
      permissions: user.permissions ? JSON.parse(user.permissions) : []
    };
    
    // Generate token
    const token = await signToken(userForToken);
    
    // Create response
    const response = NextResponse.json({
      user: userForToken,
      message: 'Login successful'
    });
    
    // Set auth cookie
    setAuthCookie(response, token);
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
