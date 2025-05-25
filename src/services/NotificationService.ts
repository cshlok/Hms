import { DatabaseService } from '../lib/DatabaseService';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { AuditLogService, AuditEventType, AuditEventAction, AuditEventOutcome, AuditAgentType, AuditEntityType } from './AuditLogService';

/**
 * Notification channel types
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
  PUSH = 'push'
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Notification status
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

/**
 * Notification template data
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  content: string;
  contentHtml?: string;
  channels: NotificationChannel[];
  defaultPriority: NotificationPriority;
  metadata?: Record<string, any>;
}

/**
 * Notification data
 */
export interface NotificationData {
  templateId: string;
  recipientId: string;
  recipientType: string;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Notification service for the HMS System Infrastructure & Security module
 */
export class NotificationService {
  private static instance: NotificationService;
  private db: DatabaseService;
  private auditLog: AuditLogService;
  private emailTransporter: any;
  private smsProvider: any;
  private pushProvider: any;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.auditLog = AuditLogService.getInstance();
    
    // Initialize email transporter
    this.initializeEmailTransporter();
    
    // Initialize SMS provider (would be implemented with a real SMS provider)
    this.initializeSmsProvider();
    
    // Initialize push notification provider (would be implemented with a real push provider)
    this.initializePushProvider();
  }

  /**
   * Get singleton instance of NotificationService
   * @returns NotificationService instance
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   * Creates necessary tables if they don't exist
   */
  public async initialize(): Promise<void> {
    try {
      // Create notification_templates table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS notification_templates (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          subject VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          content_html TEXT,
          channels JSONB NOT NULL,
          default_priority VARCHAR(50) NOT NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          created_by UUID,
          updated_by UUID,
          metadata JSONB
        );
      `);

      // Create notifications table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY,
          template_id UUID REFERENCES notification_templates(id),
          recipient_id VARCHAR(255) NOT NULL,
          recipient_type VARCHAR(100) NOT NULL,
          priority VARCHAR(50) NOT NULL,
          channels JSONB NOT NULL,
          data JSONB NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP NOT NULL,
          scheduled_at TIMESTAMP,
          expires_at TIMESTAMP
        );
      `);

      // Create notification_deliveries table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS notification_deliveries (
          id UUID PRIMARY KEY,
          notification_id UUID REFERENCES notifications(id),
          channel VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          status_message TEXT,
          delivery_data JSONB,
          created_at TIMESTAMP NOT NULL,
          sent_at TIMESTAMP,
          delivered_at TIMESTAMP,
          read_at TIMESTAMP,
          failed_at TIMESTAMP,
          retry_count INTEGER DEFAULT 0,
          next_retry_at TIMESTAMP
        );
      `);

      // Create user_notification_preferences table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS user_notification_preferences (
          id UUID PRIMARY KEY,
          user_id UUID NOT NULL,
          channel VARCHAR(50) NOT NULL,
          enabled BOOLEAN DEFAULT TRUE,
          quiet_hours_start TIME,
          quiet_hours_end TIME,
          minimum_priority VARCHAR(50) DEFAULT 'low',
          contact_info JSONB,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          UNIQUE(user_id, channel)
        );
      `);

      console.log('Notification service initialized');
    } catch (error) {
      console.error('Error initializing notification service:', error);
      throw error;
    }
  }

  /**
   * Initialize email transporter
   */
  private initializeEmailTransporter(): void {
    // In a production environment, this would use real SMTP settings
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'user@example.com',
        pass: process.env.SMTP_PASSWORD || 'password'
      }
    });
  }

  /**
   * Initialize SMS provider
   */
  private initializeSmsProvider(): void {
    // In a production environment, this would initialize a real SMS provider like Twilio
    this.smsProvider = {
      sendSms: async (to: string, message: string) => {
        console.log(`[SMS MOCK] To: ${to}, Message: ${message}`);
        return { success: true, messageId: crypto.randomUUID() };
      }
    };
  }

  /**
   * Initialize push notification provider
   */
  private initializePushProvider(): void {
    // In a production environment, this would initialize a real push provider like Firebase
    this.pushProvider = {
      sendPush: async (token: string, title: string, body: string, data: any) => {
        console.log(`[PUSH MOCK] Token: ${token}, Title: ${title}, Body: ${body}, Data:`, data);
        return { success: true, messageId: crypto.randomUUID() };
      }
    };
  }

  /**
   * Create a notification template
   * @param template Notification template data
   * @param createdBy ID of the user creating the template
   * @returns ID of the created template
   */
  public async createTemplate(
    template: Omit<NotificationTemplate, 'id'>,
    createdBy: string
  ): Promise<string> {
    try {
      const templateId = crypto.randomUUID();
      const now = new Date();
      
      await this.db.query(
        `INSERT INTO notification_templates (
          id, name, description, subject, content, content_html, 
          channels, default_priority, created_at, updated_at, 
          created_by, updated_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          templateId,
          template.name,
          template.description,
          template.subject,
          template.content,
          template.contentHtml || null,
          JSON.stringify(template.channels),
          template.defaultPriority,
          now,
          now,
          createdBy,
          createdBy,
          template.metadata ? JSON.stringify(template.metadata) : null
        ]
      );
      
      // Audit log
      await this.auditLog.logEvent({
        eventType: AuditEventType.CREATE,
        eventAction: AuditEventAction.CREATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        occurredAt: now,
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: createdBy,
            agentRole: 'template_creator'
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityId: templateId,
            entityName: `Notification Template: ${template.name}`
          }
        ]
      });
      
      return templateId;
    } catch (error) {
      console.error('Error creating notification template:', error);
      throw error;
    }
  }

  /**
   * Get a notification template by ID
   * @param templateId Template ID
   * @returns Notification template
   */
  public async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM notification_templates WHERE id = $1',
        [templateId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const template = result.rows[0];
      
      return {
        id: template.id,
        name: template.name,
        description: template.description,
        subject: template.subject,
        content: template.content,
        contentHtml: template.content_html,
        channels: JSON.parse(template.channels),
        defaultPriority: template.default_priority,
        metadata: template.metadata ? JSON.parse(template.metadata) : undefined
      };
    } catch (error) {
      console.error('Error getting notification template:', error);
      throw error;
    }
  }

  /**
   * Send a notification
   * @param notification Notification data
   * @param senderId ID of the user or system sending the notification
   * @returns ID of the created notification
   */
  public async sendNotification(
    notification: NotificationData,
    senderId: string
  ): Promise<string> {
    return this.db.transaction(async (client) => {
      try {
        const notificationId = crypto.randomUUID();
        const now = new Date();
        
        // Get the template
        const templateResult = await client.query(
          'SELECT * FROM notification_templates WHERE id = $1',
          [notification.templateId]
        );
        
        if (templateResult.rows.length === 0) {
          throw new Error(`Template not found: ${notification.templateId}`);
        }
        
        const template = templateResult.rows[0];
        
        // Determine channels and priority
        const channels = notification.channels || JSON.parse(template.channels);
        const priority = notification.priority || template.default_priority;
        
        // Create the notification record
        await client.query(
          `INSERT INTO notifications (
            id, template_id, recipient_id, recipient_type, 
            priority, channels, data, metadata, 
            created_at, scheduled_at, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            notificationId,
            notification.templateId,
            notification.recipientId,
            notification.recipientType,
            priority,
            JSON.stringify(channels),
            JSON.stringify(notification.data),
            notification.metadata ? JSON.stringify(notification.metadata) : null,
            now,
            null, // scheduled_at - for future scheduled notifications
            null  // expires_at - for notifications that expire
          ]
        );
        
        // Get user notification preferences
        const preferencesResult = await client.query(
          `SELECT * FROM user_notification_preferences 
           WHERE user_id = $1`,
          [notification.recipientId]
        );
        
        const preferences = preferencesResult.rows.reduce((acc: any, pref: any) => {
          acc[pref.channel] = {
            enabled: pref.enabled,
            quietHoursStart: pref.quiet_hours_start,
            quietHoursEnd: pref.quiet_hours_end,
            minimumPriority: pref.minimum_priority,
            contactInfo: pref.contact_info ? JSON.parse(pref.contact_info) : {}
          };
          return acc;
        }, {});
        
        // Process each channel
        for (const channel of channels) {
          // Check if user has disabled this channel or if priority is below minimum
          const channelPrefs = preferences[channel];
          if (channelPrefs && (!channelPrefs.enabled || !this.isPriorityHighEnough(priority, channelPrefs.minimumPriority))) {
            continue;
          }
          
          // Check if we're in quiet hours
          if (channelPrefs && channelPrefs.quietHoursStart && channelPrefs.quietHoursEnd) {
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTime = currentHour * 60 + currentMinute;
            
            const startParts = channelPrefs.quietHoursStart.split(':');
            const startHour = parseInt(startParts[0], 10);
            const startMinute = parseInt(startParts[1], 10);
            const startTime = startHour * 60 + startMinute;
            
            const endParts = channelPrefs.quietHoursEnd.split(':');
            const endHour = parseInt(endParts[0], 10);
            const endMinute = parseInt(endParts[1], 10);
            const endTime = endHour * 60 + endMinute;
            
            const isQuietHours = startTime <= endTime
              ? currentTime >= startTime && currentTime <= endTime
              : currentTime >= startTime || currentTime <= endTime;
            
            // Skip non-critical notifications during quiet hours
            if (isQuietHours && priority !== NotificationPriority.CRITICAL) {
              continue;
            }
          }
          
          // Create delivery record
          const deliveryId = crypto.randomUUID();
          await client.query(
            `INSERT INTO notification_deliveries (
              id, notification_id, channel, status, 
              created_at
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
              deliveryId,
              notificationId,
              channel,
              NotificationStatus.PENDING,
              now
            ]
          );
          
          // Process the notification based on channel
          try {
            // Render the template with the notification data
            const renderedSubject = this.renderTemplate(template.subject, notification.data);
            const renderedContent = this.renderTemplate(template.content, notification.data);
            const renderedHtmlContent = template.content_html
              ? this.renderTemplate(template.content_html, notification.data)
              : undefined;
            
            let deliveryResult;
            
            switch (channel) {
              case NotificationChannel.EMAIL:
                deliveryResult = await this.sendEmail(
                  notification.recipientId,
                  renderedSubject,
                  renderedContent,
                  renderedHtmlContent,
                  channelPrefs?.contactInfo?.email
                );
                break;
                
              case NotificationChannel.SMS:
                deliveryResult = await this.sendSms(
                  notification.recipientId,
                  renderedContent,
                  channelPrefs?.contactInfo?.phone
                );
                break;
                
              case NotificationChannel.PUSH:
                deliveryResult = await this.sendPush(
                  notification.recipientId,
                  renderedSubject,
                  renderedContent,
                  notification.data,
                  channelPrefs?.contactInfo?.pushToken
                );
                break;
                
              case NotificationChannel.IN_APP:
                deliveryResult = await this.createInAppNotification(
                  notification.recipientId,
                  renderedSubject,
                  renderedContent,
                  notification.data
                );
                break;
                
              default:
                throw new Error(`Unsupported channel: ${channel}`);
            }
            
            // Update delivery status
            await client.query(
              `UPDATE notification_deliveries 
               SET status = $1, status_message = $2, delivery_data = $3, sent_at = $4
               WHERE id = $5`,
              [
                NotificationStatus.SENT,
                'Notification sent successfully',
                JSON.stringify(deliveryResult),
                now,
                deliveryId
              ]
            );
          } catch (error) {
            // Update delivery status with error
            await client.query(
              `UPDATE notification_deliveries 
               SET status = $1, status_message = $2, failed_at = $3
               WHERE id = $4`,
              [
                NotificationStatus.FAILED,
                (error as Error).message,
                now,
                deliveryId
              ]
            );
            
            console.error(`Error sending notification via ${channel}:`, error);
            // Continue with other channels even if one fails
          }
        }
        
        // Audit log
        await this.auditLog.logEvent({
          eventType: AuditEventType.CREATE,
          eventAction: AuditEventAction.CREATE,
          eventOutcome: AuditEventOutcome.SUCCESS,
          occurredAt: now,
          agents: [
            {
              agentType: AuditAgentType.USER,
              agentId: senderId,
              agentRole: 'notification_sender'
            }
          ],
          entities: [
            {
              entityType: AuditEntityType.SYSTEM,
              entityId: notificationId,
              entityName: `Notification: ${template.name}`,
              entityDetail: {
                recipientId: notification.recipientId,
                recipientType: notification.recipientType,
                priority,
                channels
              }
            }
          ]
        });
        
        return notificationId;
      } catch (error) {
        console.error('Error sending notification:', error);
        throw error;
      }
    });
  }

  /**
   * Check if a priority is high enough to meet the minimum
   * @param priority Priority to check
   * @param minimumPriority Minimum priority required
   * @returns True if priority is high enough
   */
  private isPriorityHighEnough(
    priority: NotificationPriority,
    minimumPriority: NotificationPriority
  ): boolean {
    const priorityValues = {
      [NotificationPriority.LOW]: 0,
      [NotificationPriority.MEDIUM]: 1,
      [NotificationPriority.HIGH]: 2,
      [NotificationPriority.CRITICAL]: 3
    };
    
    return priorityValues[priority] >= priorityValues[minimumPriority];
  }

  /**
   * Render a template with data
   * @param template Template string
   * @param data Data to use for rendering
   * @returns Rendered template
   */
  private renderTemplate(template: string, data: Record<string, any>): string {
    // Simple template rendering with {{variable}} syntax
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const keys = key.trim().split('.');
      let value = data;
      
      for (const k of keys) {
        if (value === undefined || value === null) {
          return '';
        }
        value = value[k];
      }
      
      return value !== undefined && value !== null ? value : '';
    });
  }

  /**
   * Send an email notification
   * @param userId User ID
   * @param subject Email subject
   * @param text Plain text content
   * @param html HTML content
   * @param overrideEmail Optional email to override user's default
   * @returns Delivery result
   */
  private async sendEmail(
    userId: string,
    subject: string,
    text: string,
    html?: string,
    overrideEmail?: string
  ): Promise<any> {
    try {
      // In a real implementation, we would get the user's email from the database
      // if not provided as an override
      const email = overrideEmail || await this.getUserEmail(userId);
      
      if (!email) {
        throw new Error(`No email address found for user ${userId}`);
      }
      
      // Send the email
      const result = await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        to: email,
        subject,
        text,
        html: html || undefined
      });
      
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send an SMS notification
   * @param userId User ID
   * @param message SMS message
   * @param overridePhone Optional phone number to override user's default
   * @returns Delivery result
   */
  private async sendSms(
    userId: string,
    message: string,
    overridePhone?: string
  ): Promise<any> {
    try {
      // In a real implementation, we would get the user's phone from the database
      // if not provided as an override
      const phone = overridePhone || await this.getUserPhone(userId);
      
      if (!phone) {
        throw new Error(`No phone number found for user ${userId}`);
      }
      
      // Send the SMS
      const result = await this.smsProvider.sendSms(phone, message);
      
      return result;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  /**
   * Send a push notification
   * @param userId User ID
   * @param title Notification title
   * @param body Notification body
   * @param data Additional data
   * @param overrideToken Optional push token to override user's default
   * @returns Delivery result
   */
  private async sendPush(
    userId: string,
    title: string,
    body: string,
    data: Record<string, any>,
    overrideToken?: string
  ): Promise<any> {
    try {
      // In a real implementation, we would get the user's push token from the database
      // if not provided as an override
      const token = overrideToken || await this.getUserPushToken(userId);
      
      if (!token) {
        throw new Error(`No push token found for user ${userId}`);
      }
      
      // Send the push notification
      const result = await this.pushProvider.sendPush(token, title, body, data);
      
      return result;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Create an in-app notification
   * @param userId User ID
   * @param title Notification title
   * @param body Notification body
   * @param data Additional data
   * @returns Delivery result
   */
  private async createInAppNotification(
    userId: string,
    title: string,
    body: string,
    data: Record<string, any>
  ): Promise<any> {
    try {
      // In a real implementation, this would create an in-app notification
      // that would be displayed to the user when they log in
      console.log(`[IN-APP MOCK] Creating in-app notification for user ${userId}`);
      
      // This is a mock implementation
      return {
        success: true,
        notificationId: crypto.randomUUID()
      };
    } catch (error) {
      console.error('Error creating in-app notification:', error);
      throw error;
    }
  }

  /**
   * Get a user's email address
   * @param userId User ID
   * @returns Email address or null if not found
   */
  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      // In a real implementation, this would query the user database
      // This is a mock implementation
      const result = await this.db.query(
        'SELECT email FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].email;
    } catch (error) {
      console.error('Error getting user email:', error);
      throw error;
    }
  }

  /**
   * Get a user's phone number
   * @param userId User ID
   * @returns Phone number or null if not found
   */
  private async getUserPhone(userId: string): Promise<string | null> {
    try {
      // In a real implementation, this would query the user database
      // This is a mock implementation
      const result = await this.db.query(
        'SELECT phone_number FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].phone_number;
    } catch (error) {
      console.error('Error getting user phone:', error);
      throw error;
    }
  }

  /**
   * Get a user's push token
   * @param userId User ID
   * @returns Push token or null if not found
   */
  private async getUserPushToken(userId: string): Promise<string | null> {
    try {
      // In a real implementation, this would query the user's device tokens
      // This is a mock implementation
      return null;
    } catch (error) {
      console.error('Error getting user push token:', error);
      throw error;
    }
  }

  /**
   * Set user notification preferences
   * @param userId User ID
   * @param channel Notification channel
   * @param preferences Preferences for the channel
   * @returns True if preferences were set
   */
  public async setUserPreferences(
    userId: string,
    channel: NotificationChannel,
    preferences: {
      enabled: boolean;
      quietHoursStart?: string;
      quietHoursEnd?: string;
      minimumPriority?: NotificationPriority;
      contactInfo?: Record<string, any>;
    }
  ): Promise<boolean> {
    try {
      const now = new Date();
      
      // Check if preferences already exist
      const existingResult = await this.db.query(
        'SELECT id FROM user_notification_preferences WHERE user_id = $1 AND channel = $2',
        [userId, channel]
      );
      
      if (existingResult.rows.length > 0) {
        // Update existing preferences
        await this.db.query(
          `UPDATE user_notification_preferences 
           SET enabled = $1, quiet_hours_start = $2, quiet_hours_end = $3, 
           minimum_priority = $4, contact_info = $5, updated_at = $6
           WHERE user_id = $7 AND channel = $8`,
          [
            preferences.enabled,
            preferences.quietHoursStart || null,
            preferences.quietHoursEnd || null,
            preferences.minimumPriority || NotificationPriority.LOW,
            preferences.contactInfo ? JSON.stringify(preferences.contactInfo) : null,
            now,
            userId,
            channel
          ]
        );
      } else {
        // Create new preferences
        await this.db.query(
          `INSERT INTO user_notification_preferences (
            id, user_id, channel, enabled, quiet_hours_start, 
            quiet_hours_end, minimum_priority, contact_info, 
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            crypto.randomUUID(),
            userId,
            channel,
            preferences.enabled,
            preferences.quietHoursStart || null,
            preferences.quietHoursEnd || null,
            preferences.minimumPriority || NotificationPriority.LOW,
            preferences.contactInfo ? JSON.stringify(preferences.contactInfo) : null,
            now,
            now
          ]
        );
      }
      
      // Audit log
      await this.auditLog.logEvent({
        eventType: AuditEventType.UPDATE,
        eventAction: AuditEventAction.UPDATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        occurredAt: now,
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: userId,
            agentRole: 'user'
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityId: `${userId}-${channel}`,
            entityName: `Notification Preferences: ${channel}`,
            entityDetail: preferences
          }
        ]
      });
      
      return true;
    } catch (error) {
      console.error('Error setting user notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   * @param userId User ID
   * @returns User's notification preferences
   */
  public async getUserPreferences(userId: string): Promise<Record<string, any>> {
    try {
      const result = await this.db.query(
        'SELECT * FROM user_notification_preferences WHERE user_id = $1',
        [userId]
      );
      
      const preferences: Record<string, any> = {};
      
      for (const row of result.rows) {
        preferences[row.channel] = {
          enabled: row.enabled,
          quietHoursStart: row.quiet_hours_start,
          quietHoursEnd: row.quiet_hours_end,
          minimumPriority: row.minimum_priority,
          contactInfo: row.contact_info ? JSON.parse(row.contact_info) : {}
        };
      }
      
      return preferences;
    } catch (error) {
      console.error('Error getting user notification preferences:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   * @param notificationId Notification ID
   * @param userId User ID
   * @returns True if notification was marked as read
   */
  public async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const now = new Date();
      
      // Get the notification
      const notificationResult = await this.db.query(
        'SELECT * FROM notifications WHERE id = $1 AND recipient_id = $2',
        [notificationId, userId]
      );
      
      if (notificationResult.rows.length === 0) {
        return false;
      }
      
      // Update in-app delivery status
      const result = await this.db.query(
        `UPDATE notification_deliveries 
         SET status = $1, read_at = $2
         WHERE notification_id = $3 AND channel = $4 AND status = $5`,
        [
          NotificationStatus.READ,
          now,
          notificationId,
          NotificationChannel.IN_APP,
          NotificationStatus.DELIVERED
        ]
      );
      
      // Audit log
      await this.auditLog.logEvent({
        eventType: AuditEventType.UPDATE,
        eventAction: AuditEventAction.UPDATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        occurredAt: now,
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: userId,
            agentRole: 'user'
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityId: notificationId,
            entityName: 'Notification',
            entityDetail: {
              action: 'mark_as_read'
            }
          }
        ]
      });
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Get user's notifications
   * @param userId User ID
   * @param status Optional status filter
   * @param limit Maximum number of notifications to return
   * @param offset Offset for pagination
   * @returns Array of notifications
   */
  public async getUserNotifications(
    userId: string,
    status?: NotificationStatus,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      let query = `
        SELECT n.*, nt.name as template_name, nt.subject as template_subject,
        nd.status, nd.sent_at, nd.delivered_at, nd.read_at
        FROM notifications n
        JOIN notification_templates nt ON n.template_id = nt.id
        JOIN notification_deliveries nd ON n.id = nd.notification_id
        WHERE n.recipient_id = $1 AND nd.channel = $2
      `;
      
      const queryParams: any[] = [userId, NotificationChannel.IN_APP];
      
      if (status) {
        query += ` AND nd.status = $3`;
        queryParams.push(status);
      }
      
      query += ` ORDER BY n.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);
      
      const result = await this.db.query(query, queryParams);
      
      return result.rows.map((row: any) => ({
        id: row.id,
        templateId: row.template_id,
        templateName: row.template_name,
        subject: row.template_subject,
        data: JSON.parse(row.data),
        priority: row.priority,
        status: row.status,
        createdAt: row.created_at,
        sentAt: row.sent_at,
        deliveredAt: row.delivered_at,
        readAt: row.read_at
      }));
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }
}
