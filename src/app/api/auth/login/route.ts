// app/api/auth/login/route.ts
import { NextRequest } from 'next/server';
import { getDb, initializeDb } from '@/lib/db';
import { createSession } from '@/lib/session';
import { z } from 'zod';
import { compare } from 'bcryptjs';

// Schema for login validation
const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    // Get Cloudflare bindings from request context
    const env = (request as any).cf?.env;
    
    // Initialize DB if we have bindings
    if (env && env.DB) {
      initializeDb(env);
    }
    
    // Get DB instance
    const db = getDb();
    
    // Parse and validate request body
    const data = await request.json();
    const validationResult = LoginSchema.safeParse(data);
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: "Invalid login data", 
        details: validationResult.error.format() 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const { username, password } = validationResult.data;
    
    // Find user by username
    const user = await db.prepare(`
      SELECT 
        user_id, 
        username, 
        password_hash, 
        is_active
      FROM 
        Users
      WHERE 
        username = ?
    `).bind(username).first();
    
    // Check if user exists
    if (!user) {
      return new Response(JSON.stringify({ 
        error: "Invalid username or password" 
      }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Check if user is active
    if (!user.is_active) {
      return new Response(JSON.stringify({ 
        error: "Account is inactive. Please contact administrator." 
      }), { 
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Verify password
    const passwordValid = await compare(password, user.password_hash);
    
    if (!passwordValid) {
      return new Response(JSON.stringify({ 
        error: "Invalid username or password" 
      }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Create session
    const session = await createSession(user.user_id);
    
    if (!session) {
      return new Response(JSON.stringify({ 
        error: "Failed to create session" 
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Return user data (excluding sensitive information)
    return new Response(JSON.stringify({ 
      message: "Login successful",
      user: {
        userId: user.user_id,
        username: user.username,
        role: session.user?.roleName,
        permissions: session.user?.permissions
      }
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("Error during login:", error);
    return new Response(JSON.stringify({ 
      error: "Login failed", 
      details: error instanceof Error ? error.message : String(error) 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
