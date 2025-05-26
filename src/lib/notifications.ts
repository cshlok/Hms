/**
 * Notifications module for HMS Diagnostics
 * 
 * This module provides functionality for sending notifications to users
 * about critical events, alerts, and important updates in the diagnostic workflow.
 */

import { DB } from './database';

/**
 * Notification type definition
 */
export interface Notification {
  userId: number;
  type: 'critical_value' | 'critical_finding' | 'result_available' | 'specimen_rejected' | 'order_status';
  title: string;
  message: string;
  resourceType: string;
  resourceId?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

/**
 * Sends notifications to specified users
 * 
 * @param userIds Array of user IDs to notify
 * @param notification The notification to send
 * @returns Promise resolving to array of created notification IDs
 */
export async function notifyUsers(
  userIds: number[],
  notification: Omit<Notification, 'userId'>
): Promise<number[]> {
  try {
    const db = DB();
    const notificationIds: number[] = [];
    
    // Sanitize metadata to prevent sensitive data leakage
    const sanitizedMetadata = notification.metadata ? JSON.stringify(notification.metadata) : null;
    
    for (const userId of userIds) {
      const result = await db.query(
        `INSERT INTO notifications 
         (user_id, type, title, message, resource_type, resource_id, priority, metadata, created_at, read) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), false)`,
        [
          userId,
          notification.type,
          notification.title,
          notification.message,
          notification.resourceType,
          notification.resourceId || null,
          notification.priority,
          sanitizedMetadata
        ]
      );
      
      notificationIds.push(result.insertId);
    }
    
    return notificationIds;
  } catch (error) {
    console.error('Failed to create notifications:', error);
    return [];
  }
}

/**
 * Marks a notification as read
 * 
 * @param notificationId The ID of the notification to mark as read
 * @param userId The ID of the user who owns the notification
 * @returns Promise resolving to boolean indicating success
 */
export async function markNotificationRead(
  notificationId: number,
  userId: number
): Promise<boolean> {
  try {
    const db = DB();
    
    const result = await db.query(
      `UPDATE notifications 
       SET read = true, read_at = NOW() 
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }
}

/**
 * Gets notifications for a specific user
 * 
 * @param userId The ID of the user to get notifications for
 * @param unreadOnly Whether to only return unread notifications
 * @param limit Maximum number of notifications to return
 * @returns Promise resolving to array of notifications
 */
export async function getUserNotifications(
  userId: number,
  unreadOnly: boolean = false,
  limit: number = 50
): Promise<any[]> {
  try {
    const db = DB();
    
    let query = `
      SELECT *
      FROM notifications
      WHERE user_id = ?
    `;
    
    const params: any[] = [userId];
    
    if (unreadOnly) {
      query += ' AND read = false';
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const result = await db.query(query, params);
    
    return result.results.map((notification: any) => ({
      ...notification,
      metadata: notification.metadata ? JSON.parse(notification.metadata) : null
    }));
  } catch (error) {
    console.error('Failed to get user notifications:', error);
    return [];
  }
}
