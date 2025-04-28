// src/lib/auth.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { getRequestContext } from '@cloudflare/next-on-pages';

// Secret key for JWT signing - in production, use environment variables
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'shlokam-hms-secure-jwt-secret-key-2025');

// Token expiration time
const TOKEN_EXPIRY = '8h';

// User roles and their permissions
export const ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  RECEPTIONIST: 'receptionist',
  PHARMACIST: 'pharmacist',
  LAB_TECHNICIAN: 'lab_technician',
  PATIENT: 'patient',
};

// Permission definitions
export const PERMISSIONS = {
  // Patient management
  VIEW_PATIENTS: 'view_patients',
  CREATE_PATIENT: 'create_patient',
  UPDATE_PATIENT: 'update_patient',
  DELETE_PATIENT: 'delete_patient',
  
  // Appointment management
  VIEW_APPOINTMENTS: 'view_appointments',
  CREATE_APPOINTMENT: 'create_appointment',
  UPDATE_APPOINTMENT: 'update_appointment',
  DELETE_APPOINTMENT: 'delete_appointment',
  
  // Billing management
  VIEW_INVOICES: 'view_invoices',
  CREATE_INVOICE: 'create_invoice',
  UPDATE_INVOICE: 'update_invoice',
  DELETE_INVOICE: 'delete_invoice',
  
  // Medical records
  VIEW_MEDICAL_RECORDS: 'view_medical_records',
  CREATE_MEDICAL_RECORD: 'create_medical_record',
  UPDATE_MEDICAL_RECORD: 'update_medical_record',
  
  // Pharmacy
  VIEW_MEDICATIONS: 'view_medications',
  DISPENSE_MEDICATION: 'dispense_medication',
  MANAGE_INVENTORY: 'manage_inventory',
  
  // Laboratory
  VIEW_LAB_TESTS: 'view_lab_tests',
  CREATE_LAB_TEST: 'create_lab_test',
  UPDATE_LAB_TEST: 'update_lab_test',
  
  // User management
  VIEW_USERS: 'view_users',
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  
  // System settings
  MANAGE_SETTINGS: 'manage_settings',
};

// Role-based permissions mapping
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    ...Object.values(PERMISSIONS),
  ],
  [ROLES.DOCTOR]: [
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.UPDATE_PATIENT,
    PERMISSIONS.VIEW_APPOINTMENTS,
    PERMISSIONS.UPDATE_APPOINTMENT,
    PERMISSIONS.VIEW_INVOICES,
    PERMISSIONS.VIEW_MEDICAL_RECORDS,
    PERMISSIONS.CREATE_MEDICAL_RECORD,
    PERMISSIONS.UPDATE_MEDICAL_RECORD,
    PERMISSIONS.VIEW_MEDICATIONS,
    PERMISSIONS.VIEW_LAB_TESTS,
    PERMISSIONS.CREATE_LAB_TEST,
  ],
  [ROLES.NURSE]: [
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.UPDATE_PATIENT,
    PERMISSIONS.VIEW_APPOINTMENTS,
    PERMISSIONS.VIEW_MEDICAL_RECORDS,
    PERMISSIONS.UPDATE_MEDICAL_RECORD,
    PERMISSIONS.VIEW_MEDICATIONS,
    PERMISSIONS.VIEW_LAB_TESTS,
  ],
  [ROLES.RECEPTIONIST]: [
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.CREATE_PATIENT,
    PERMISSIONS.UPDATE_PATIENT,
    PERMISSIONS.VIEW_APPOINTMENTS,
    PERMISSIONS.CREATE_APPOINTMENT,
    PERMISSIONS.UPDATE_APPOINTMENT,
    PERMISSIONS.DELETE_APPOINTMENT,
    PERMISSIONS.VIEW_INVOICES,
    PERMISSIONS.CREATE_INVOICE,
  ],
  [ROLES.PHARMACIST]: [
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.VIEW_MEDICATIONS,
    PERMISSIONS.DISPENSE_MEDICATION,
    PERMISSIONS.MANAGE_INVENTORY,
  ],
  [ROLES.LAB_TECHNICIAN]: [
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.VIEW_LAB_TESTS,
    PERMISSIONS.UPDATE_LAB_TEST,
  ],
  [ROLES.PATIENT]: [
    PERMISSIONS.VIEW_APPOINTMENTS,
    PERMISSIONS.CREATE_APPOINTMENT,
  ],
};

// Generate JWT token
export async function signToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

// Verify JWT token
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

// Set auth cookie
export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: 'auth_token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });
  return response;
}

// Clear auth cookie
export function clearAuthCookie(response: NextResponse) {
  response.cookies.set({
    name: 'auth_token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}

// Get current user from token
export async function getCurrentUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  
  if (!token) {
    return null;
  }
  
  const payload = await verifyToken(token);
  return payload;
}

// Check if user has permission
export function hasPermission(user: any, permission: string) {
  if (!user || !user.role) {
    return false;
  }
  
  const userRole = user.role;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  
  return permissions.includes(permission);
}

// Middleware to protect routes
export async function authMiddleware(request: NextRequest) {
  const user = await getCurrentUser(request);
  
  // If no user and not on login page, redirect to login
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // If user is on login page but already authenticated, redirect to dashboard
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  // In a real implementation, use bcrypt or argon2
  // Since we're in a Cloudflare environment, we'll use a simple hash for now
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'shlokam-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hashedPassword;
}
