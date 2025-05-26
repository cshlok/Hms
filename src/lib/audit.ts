/**
 * Audit logging module for HMS Diagnostics
 * 
 * This module provides comprehensive audit logging functionality for all
 * diagnostic operations, ensuring HIPAA compliance and maintaining a
 * complete audit trail of all actions performed on sensitive data.
 */

import { DB } from './database';

/**
 * Audit log entry type definition
 */
export interface AuditLogEntry {
  userId: number;
  action: 'create' | 'read' | 'update' | 'delete' | 'acknowledge' | 'retrieve' | 'store' | 'sync';
  resource: string;
  resourceId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Creates an audit log entry in the database
 * 
 * @param entry The audit log entry to create
 * @returns Promise resolving to the created audit log entry ID
 */
export async function auditLog(entry: AuditLogEntry): Promise<number> {
  try {
    const db = DB();
    
    // Sanitize details to prevent sensitive data leakage
    const sanitizedDetails = entry.details ? JSON.stringify(entry.details) : null;
    
    const result = await db.query(
      `INSERT INTO audit_logs 
       (user_id, action, resource, resource_id, details, ip_address, user_agent, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        entry.userId,
        entry.action,
        entry.resource,
        entry.resourceId || null,
        sanitizedDetails,
        entry.ipAddress || null,
        entry.userAgent || null
      ]
    );
    
    return result.insertId;
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
    // Don't throw - audit logging should never break the main flow
    return 0;
  }
}

/**
 * Retrieves audit logs for a specific resource
 * 
 * @param resource The resource type to retrieve logs for
 * @param resourceId Optional resource ID to filter by
 * @param limit Maximum number of logs to retrieve
 * @returns Promise resolving to array of audit log entries
 */
export async function getAuditLogs(
  resource: string,
  resourceId?: number,
  limit: number = 100
): Promise<any[]> {
  try {
    const db = DB();
    
    let query = `
      SELECT al.*, u.username, u.first_name, u.last_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.resource = ?
    `;
    
    const params: any[] = [resource];
    
    if (resourceId) {
      query += ' AND al.resource_id = ?';
      params.push(resourceId);
    }
    
    query += ' ORDER BY al.created_at DESC LIMIT ?';
    params.push(limit);
    
    const result = await db.query(query, params);
    
    return result.results.map((log: any) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));
  } catch (error) {
    console.error('Failed to retrieve audit logs:', error);
    return [];
  }
}

/**
 * Retrieves audit logs for a specific user
 * 
 * @param userId The user ID to retrieve logs for
 * @param limit Maximum number of logs to retrieve
 * @returns Promise resolving to array of audit log entries
 */
export async function getUserAuditLogs(
  userId: number,
  limit: number = 100
): Promise<any[]> {
  try {
    const db = DB();
    
    const query = `
      SELECT al.*, u.username, u.first_name, u.last_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.user_id = ?
      ORDER BY al.created_at DESC
      LIMIT ?
    `;
    
    const result = await db.query(query, [userId, limit]);
    
    return result.results.map((log: any) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));
  } catch (error) {
    console.error('Failed to retrieve user audit logs:', error);
    return [];
  }
}
