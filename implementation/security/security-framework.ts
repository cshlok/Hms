/**
 * Security Framework Implementation
 * 
 * This module implements role-based access control, field-level encryption,
 * and comprehensive audit logging for the HMS Acute & Procedural Care module.
 */

// User roles
export enum UserRole {
  SYSTEM_ADMIN = 'system_admin',
  DEPARTMENT_ADMIN = 'department_admin',
  PHYSICIAN = 'physician',
  NURSE = 'nurse',
  TRIAGE_NURSE = 'triage_nurse',
  CHARGE_NURSE = 'charge_nurse',
  SURGEON = 'surgeon',
  ANESTHESIOLOGIST = 'anesthesiologist',
  PHARMACIST = 'pharmacist',
  LAB_TECHNICIAN = 'lab_technician',
  RADIOLOGIST = 'radiologist',
  BLOOD_BANK_TECHNICIAN = 'blood_bank_technician',
  RECEPTIONIST = 'receptionist',
  PATIENT = 'patient'
}

// Permission types
export enum Permission {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  ASSIGN = 'assign',
  TRIAGE = 'triage',
  PRESCRIBE = 'prescribe',
  ADMINISTER = 'administer',
  DISCHARGE = 'discharge',
  SCHEDULE = 'schedule',
  CANCEL = 'cancel',
  EXPORT = 'export',
  IMPORT = 'import'
}

// Resource types
export enum Resource {
  ER_VISIT = 'er_visit',
  TRIAGE_ASSESSMENT = 'triage_assessment',
  PATIENT_RECORD = 'patient_record',
  MEDICAL_HISTORY = 'medical_history',
  VITAL_SIGNS = 'vital_signs',
  MEDICATION = 'medication',
  LAB_ORDER = 'lab_order',
  LAB_RESULT = 'lab_result',
  IMAGING_ORDER = 'imaging_order',
  IMAGING_RESULT = 'imaging_result',
  PROCEDURE = 'procedure',
  SURGERY_SCHEDULE = 'surgery_schedule',
  SURGERY_RECORD = 'surgery_record',
  BLOOD_PRODUCT = 'blood_product',
  BLOOD_TRANSFUSION = 'blood_transfusion',
  BLOOD_DONATION = 'blood_donation',
  ALERT = 'alert',
  REPORT = 'report',
  USER = 'user',
  ROLE = 'role'
}

// Permission assignment
export interface PermissionAssignment {
  role: UserRole;
  resource: Resource;
  permissions: Permission[];
  constraints?: Record<string, any>;
}

// User session
export interface UserSession {
  userId: string;
  username: string;
  roles: UserRole[];
  departmentId?: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
}

// Audit event types
export enum AuditEventType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  ACCESS = 'access',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  IMPORT = 'import',
  APPROVE = 'approve',
  REJECT = 'reject',
  ASSIGN = 'assign',
  TRIAGE = 'triage',
  PRESCRIBE = 'prescribe',
  ADMINISTER = 'administer',
  DISCHARGE = 'discharge',
  SCHEDULE = 'schedule',
  CANCEL = 'cancel',
  EMERGENCY_ACCESS = 'emergency_access'
}

// Audit log entry
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  userRoles: UserRole[];
  sessionId: string;
  ipAddress: string;
  eventType: AuditEventType;
  resourceType: Resource;
  resourceId?: string;
  action: string;
  status: 'success' | 'failure';
  details?: Record<string, any>;
  reason?: string;
}

// Sensitive field definition
export interface SensitiveField {
  resource: Resource;
  fieldPath: string;
  encryptionLevel: 'none' | 'hash' | 'encrypt';
  accessRoles: UserRole[];
}

// Mock permission assignments
const mockPermissionAssignments: PermissionAssignment[] = [
  // Emergency Department permissions
  {
    role: UserRole.TRIAGE_NURSE,
    resource: Resource.TRIAGE_ASSESSMENT,
    permissions: [Permission.CREATE, Permission.READ, Permission.UPDATE, Permission.TRIAGE]
  },
  {
    role: UserRole.NURSE,
    resource: Resource.TRIAGE_ASSESSMENT,
    permissions: [Permission.READ]
  },
  {
    role: UserRole.PHYSICIAN,
    resource: Resource.TRIAGE_ASSESSMENT,
    permissions: [Permission.READ, Permission.UPDATE]
  },
  {
    role: UserRole.TRIAGE_NURSE,
    resource: Resource.ER_VISIT,
    permissions: [Permission.READ, Permission.UPDATE]
  },
  {
    role: UserRole.NURSE,
    resource: Resource.ER_VISIT,
    permissions: [Permission.READ, Permission.UPDATE]
  },
  {
    role: UserRole.PHYSICIAN,
    resource: Resource.ER_VISIT,
    permissions: [Permission.READ, Permission.UPDATE, Permission.DISCHARGE]
  },
  {
    role: UserRole.CHARGE_NURSE,
    resource: Resource.ER_VISIT,
    permissions: [Permission.READ, Permission.UPDATE, Permission.ASSIGN]
  },
  
  // Operation Theatre permissions
  {
    role: UserRole.SURGEON,
    resource: Resource.SURGERY_SCHEDULE,
    permissions: [Permission.READ, Permission.CREATE, Permission.UPDATE]
  },
  {
    role: UserRole.ANESTHESIOLOGIST,
    resource: Resource.SURGERY_SCHEDULE,
    permissions: [Permission.READ]
  },
  {
    role: UserRole.NURSE,
    resource: Resource.SURGERY_SCHEDULE,
    permissions: [Permission.READ]
  },
  {
    role: UserRole.SURGEON,
    resource: Resource.SURGERY_RECORD,
    permissions: [Permission.CREATE, Permission.READ, Permission.UPDATE]
  },
  {
    role: UserRole.ANESTHESIOLOGIST,
    resource: Resource.SURGERY_RECORD,
    permissions: [Permission.READ, Permission.UPDATE]
  },
  {
    role: UserRole.NURSE,
    resource: Resource.SURGERY_RECORD,
    permissions: [Permission.READ, Permission.UPDATE]
  },
  
  // Blood Bank permissions
  {
    role: UserRole.BLOOD_BANK_TECHNICIAN,
    resource: Resource.BLOOD_PRODUCT,
    permissions: [Permission.CREATE, Permission.READ, Permission.UPDATE, Permission.DELETE]
  },
  {
    role: UserRole.BLOOD_BANK_TECHNICIAN,
    resource: Resource.BLOOD_DONATION,
    permissions: [Permission.CREATE, Permission.READ, Permission.UPDATE]
  },
  {
    role: UserRole.NURSE,
    resource: Resource.BLOOD_TRANSFUSION,
    permissions: [Permission.CREATE, Permission.READ, Permission.UPDATE, Permission.ADMINISTER]
  },
  {
    role: UserRole.PHYSICIAN,
    resource: Resource.BLOOD_TRANSFUSION,
    permissions: [Permission.CREATE, Permission.READ, Permission.APPROVE]
  },
  
  // Alert permissions
  {
    role: UserRole.TRIAGE_NURSE,
    resource: Resource.ALERT,
    permissions: [Permission.CREATE, Permission.READ, Permission.UPDATE]
  },
  {
    role: UserRole.NURSE,
    resource: Resource.ALERT,
    permissions: [Permission.CREATE, Permission.READ, Permission.UPDATE]
  },
  {
    role: UserRole.PHYSICIAN,
    resource: Resource.ALERT,
    permissions: [Permission.CREATE, Permission.READ, Permission.UPDATE]
  },
  {
    role: UserRole.CHARGE_NURSE,
    resource: Resource.ALERT,
    permissions: [Permission.CREATE, Permission.READ, Permission.UPDATE]
  }
];

// Mock sensitive fields
const mockSensitiveFields: SensitiveField[] = [
  {
    resource: Resource.PATIENT_RECORD,
    fieldPath: 'ssn',
    encryptionLevel: 'encrypt',
    accessRoles: [UserRole.PHYSICIAN, UserRole.NURSE, UserRole.SYSTEM_ADMIN]
  },
  {
    resource: Resource.PATIENT_RECORD,
    fieldPath: 'dateOfBirth',
    encryptionLevel: 'encrypt',
    accessRoles: [
      UserRole.PHYSICIAN, 
      UserRole.NURSE, 
      UserRole.TRIAGE_NURSE, 
      UserRole.RECEPTIONIST
    ]
  },
  {
    resource: Resource.MEDICAL_HISTORY,
    fieldPath: 'conditions',
    encryptionLevel: 'encrypt',
    accessRoles: [UserRole.PHYSICIAN, UserRole.NURSE]
  },
  {
    resource: Resource.BLOOD_DONATION,
    fieldPath: 'testResults',
    encryptionLevel: 'encrypt',
    accessRoles: [UserRole.BLOOD_BANK_TECHNICIAN, UserRole.PHYSICIAN]
  }
];

// Mock audit log
const mockAuditLog: AuditLogEntry[] = [];

/**
 * Checks if a user has permission to perform an action on a resource
 */
export function hasPermission(
  session: UserSession,
  resource: Resource,
  permission: Permission,
  resourceId?: string
): boolean {
  // Check if session is valid
  if (Date.now() > session.expiresAt) {
    return false;
  }
  
  // System admins have all permissions
  if (session.roles.includes(UserRole.SYSTEM_ADMIN)) {
    return true;
  }
  
  // Check if any of the user's roles have the required permission
  for (const role of session.roles) {
    const assignment = mockPermissionAssignments.find(
      pa => pa.role === role && pa.resource === resource && pa.permissions.includes(permission)
    );
    
    if (assignment) {
      // If there are constraints, check them
      if (assignment.constraints) {
        // Example constraint: departmentId
        if (assignment.constraints.departmentId && session.departmentId !== assignment.constraints.departmentId) {
          continue;
        }
        
        // Example constraint: ownRecordsOnly
        if (assignment.constraints.ownRecordsOnly && resourceId !== session.userId) {
          continue;
        }
      }
      
      return true;
    }
  }
  
  return false;
}

/**
 * Logs an audit event
 */
export function logAuditEvent(
  session: UserSession,
  eventType: AuditEventType,
  resourceType: Resource,
  action: string,
  status: 'success' | 'failure',
  details?: Record<string, any>,
  resourceId?: string,
  reason?: string,
  ipAddress: string = '127.0.0.1' // Default for mock implementation
): AuditLogEntry {
  const auditEntry: AuditLogEntry = {
    id: Math.random().toString(36).substring(2, 15),
    timestamp: new Date().toISOString(),
    userId: session.userId,
    username: session.username,
    userRoles: session.roles,
    sessionId: session.sessionId,
    ipAddress,
    eventType,
    resourceType,
    resourceId,
    action,
    status,
    details,
    reason
  };
  
  // In a real implementation, this would be stored in a secure, tamper-evident log
  mockAuditLog.push(auditEntry);
  
  return auditEntry;
}

/**
 * Encrypts sensitive fields in an object
 */
export function encryptSensitiveFields(
  resource: Resource,
  data: Record<string, any>,
  session: UserSession
): Record<string, any> {
  // Create a deep copy to avoid modifying the original
  const result = JSON.parse(JSON.stringify(data));
  
  // Find sensitive fields for this resource
  const sensitiveFields = mockSensitiveFields.filter(sf => sf.resource === resource);
  
  for (const field of sensitiveFields) {
    // Check if the field exists in the data
    const fieldPath = field.fieldPath.split('.');
    let current = result;
    let parent = null;
    let lastKey = '';
    
    // Navigate to the field
    for (let i = 0; i < fieldPath.length; i++) {
      const key = fieldPath[i];
      
      if (i === fieldPath.length - 1) {
        // This is the field to encrypt
        lastKey = key;
        parent = current;
      } else if (current[key] === undefined) {
        // Field path doesn't exist
        break;
      } else {
        current = current[key];
      }
    }
    
    // If we found the field and it has a value
    if (parent && parent[lastKey] !== undefined) {
      // Check if the user has access to this field
      const hasAccess = session.roles.some(role => field.accessRoles.includes(role));
      
      if (!hasAccess) {
        // User doesn't have access, apply encryption/redaction
        switch (field.encryptionLevel) {
          case 'hash':
            // In a real implementation, this would be a secure hash
            parent[lastKey] = '********';
            break;
          case 'encrypt':
            // In a real implementation, this would be encrypted
            parent[lastKey] = '********';
            break;
          case 'none':
          default:
            // No encryption needed
            break;
        }
      }
    }
  }
  
  return result;
}

/**
 * Decrypts sensitive fields in an object
 */
export function decryptSensitiveFields(
  resource: Resource,
  data: Record<string, any>,
  session: UserSession
): Record<string, any> {
  // In a real implementation, this would decrypt the fields
  // For this mock, we'll just return the data as is, since we're not actually encrypting
  
  return data;
}

/**
 * Creates a middleware function for checking permissions
 */
export function createPermissionMiddleware(
  resource: Resource,
  permission: Permission
) {
  return (req: any, res: any, next: () => void) => {
    const session = req.session as UserSession;
    
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (!hasPermission(session, resource, permission)) {
      // Log the failed access attempt
      logAuditEvent(
        session,
        AuditEventType.ACCESS,
        resource,
        `${permission} ${resource}`,
        'failure',
        { path: req.path },
        undefined,
        'Permission denied'
      );
      
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    // Log the successful access
    logAuditEvent(
      session,
      AuditEventType.ACCESS,
      resource,
      `${permission} ${resource}`,
      'success',
      { path: req.path }
    );
    
    next();
  };
}

/**
 * Handles emergency access to resources
 */
export function handleEmergencyAccess(
  session: UserSession,
  resource: Resource,
  resourceId: string,
  reason: string
): boolean {
  // In a real implementation, this would have additional checks and balances
  
  // Log the emergency access
  logAuditEvent(
    session,
    AuditEventType.EMERGENCY_ACCESS,
    resource,
    `Emergency access to ${resource}`,
    'success',
    { breakGlassAccess: true },
    resourceId,
    reason
  );
  
  return true;
}

/**
 * Gets audit logs for a specific resource
 */
export function getAuditLogs(
  resource: Resource,
  resourceId?: string,
  startDate?: string,
  endDate?: string,
  eventTypes?: AuditEventType[]
): AuditLogEntry[] {
  let logs = mockAuditLog.filter(log => log.resourceType === resource);
  
  if (resourceId) {
    logs = logs.filter(log => log.resourceId === resourceId);
  }
  
  if (startDate) {
    const start = new Date(startDate);
    logs = logs.filter(log => new Date(log.timestamp) >= start);
  }
  
  if (endDate) {
    const end = new Date(endDate);
    logs = logs.filter(log => new Date(log.timestamp) <= end);
  }
  
  if (eventTypes && eventTypes.length > 0) {
    logs = logs.filter(log => eventTypes.includes(log.eventType));
  }
  
  return logs;
}

/**
 * Creates a user session
 */
export function createSession(
  userId: string,
  username: string,
  roles: UserRole[],
  departmentId?: string,
  durationInMinutes: number = 60
): UserSession {
  const now = Date.now();
  
  return {
    userId,
    username,
    roles,
    departmentId,
    sessionId: Math.random().toString(36).substring(2, 15),
    issuedAt: now,
    expiresAt: now + durationInMinutes * 60 * 1000
  };
}
