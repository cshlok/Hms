// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
// import { getRequestContext } from '@cloudflare/next-on-pages';
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
    
    // const { env } = getRequestContext();
    
    // Mock implementation for development without Cloudflare
    // In a real implementation, this would connect to your database
    
    // Mock user for development
    const user = {
      id: '1',
      email: email.toLowerCase(),
      password: '$2a$10$GQH.xZm5DqJu8HxEIQG9S.6Xf.POZBCbKXLc/Jx.co.T3xtEP2YKu', // hashed 'password123'
      first_name: 'Test',
      last_name: 'User',
      role: 'doctor',
      permissions: JSON.stringify(['patient:read', 'patient:write', 'medication:prescribe'])
    };
    
    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Log login attempt would go here in production
    
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
