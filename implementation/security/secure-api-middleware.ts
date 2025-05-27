import { NextRequest, NextResponse } from "next/server";
import { 
  UserSession, 
  Resource, 
  Permission, 
  AuditEventType,
  hasPermission,
  logAuditEvent,
  encryptSensitiveFields,
  decryptSensitiveFields
} from "../../../../../../../implementation/security/security-framework";

// Middleware to check permissions
export function withPermission(
  handler: (req: NextRequest, session: UserSession) => Promise<NextResponse>,
  resource: Resource,
  permission: Permission
) {
  return async (req: NextRequest) => {
    // In a real implementation, this would extract the session from a token or cookie
    // For now, we'll use a mock session
    const mockSession: UserSession = {
      userId: "user123",
      username: "doctor.smith",
      roles: ["physician"],
      departmentId: "emergency",
      sessionId: "sess_123456",
      issuedAt: Date.now() - 1000 * 60 * 30, // 30 minutes ago
      expiresAt: Date.now() + 1000 * 60 * 30  // 30 minutes from now
    } as UserSession;
    
    // Check if the user has permission
    if (!hasPermission(mockSession, resource, permission)) {
      // Log the failed access attempt
      logAuditEvent(
        mockSession,
        AuditEventType.ACCESS,
        resource,
        `${permission} ${resource}`,
        'failure',
        { path: req.nextUrl.pathname },
        undefined,
        'Permission denied'
      );
      
      return NextResponse.json(
        { error: "You do not have permission to perform this action" },
        { status: 403 }
      );
    }
    
    // Log the successful access
    logAuditEvent(
      mockSession,
      AuditEventType.ACCESS,
      resource,
      `${permission} ${resource}`,
      'success',
      { path: req.nextUrl.pathname }
    );
    
    // Call the handler with the session
    return handler(req, mockSession);
  };
}

// Example of using the middleware with an API route
export const GET = withPermission(
  async (req: NextRequest, session: UserSession) => {
    // Handle the request with the authenticated session
    return NextResponse.json({ message: "Secure data accessed successfully" });
  },
  Resource.PATIENT_RECORD,
  Permission.READ
);

// Example of encrypting sensitive data in a response
export const POST = withPermission(
  async (req: NextRequest, session: UserSession) => {
    try {
      const body = await req.json();
      
      // Process the request...
      
      // Example response with sensitive data
      const responseData = {
        id: "12345",
        patientName: "John Doe",
        ssn: "123-45-6789",
        dateOfBirth: "1980-01-01",
        medicalHistory: {
          conditions: ["Hypertension", "Diabetes"]
        }
      };
      
      // Encrypt sensitive fields based on user's role
      const secureResponse = encryptSensitiveFields(
        Resource.PATIENT_RECORD,
        responseData,
        session
      );
      
      // Log the successful operation
      logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.PATIENT_RECORD,
        "Create patient record",
        'success',
        { patientId: responseData.id }
      );
      
      return NextResponse.json(secureResponse, { status: 201 });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Log the error
      logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.PATIENT_RECORD,
        "Create patient record",
        'failure',
        { error: errorMessage }
      );
      
      return NextResponse.json(
        { error: "Failed to process request", details: errorMessage },
        { status: 500 }
      );
    }
  },
  Resource.PATIENT_RECORD,
  Permission.CREATE
);

// Example of handling emergency access
export const PUT = withPermission(
  async (req: NextRequest, session: UserSession) => {
    try {
      const body = await req.json();
      const isEmergency = body.isEmergency === true;
      
      // If this is an emergency access, log it specially
      if (isEmergency) {
        logAuditEvent(
          session,
          AuditEventType.EMERGENCY_ACCESS,
          Resource.PATIENT_RECORD,
          "Emergency access to patient record",
          'success',
          { patientId: body.patientId, reason: body.reason },
          body.patientId,
          body.reason || "Emergency situation"
        );
      }
      
      // Process the request...
      
      return NextResponse.json({ message: "Record updated successfully" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return NextResponse.json(
        { error: "Failed to update record", details: errorMessage },
        { status: 500 }
      );
    }
  },
  Resource.PATIENT_RECORD,
  Permission.UPDATE
);
