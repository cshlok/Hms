import { Router } from 'express';
import { AuthenticationService } from '../services/AuthenticationService';
import { SessionManager } from '../middleware/SessionManager';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { AuditLogService, AuditEventType, AuditEventAction, AuditEventOutcome } from '../services/AuditLogService';
import { EncryptionService } from '../services/EncryptionService';
import { NotificationService } from '../services/NotificationService';
import { AnalyticsService } from '../services/AnalyticsService';
import { BackupService } from '../services/BackupService';

/**
 * Integration Router for HMS modules
 * Provides centralized access to security and infrastructure services
 */
export class IntegrationRouter {
  private router: Router;
  private authService: AuthenticationService;
  private auditLog: AuditLogService;
  private encryption: EncryptionService;
  private notification: NotificationService;
  private analytics: AnalyticsService;
  private backup: BackupService;

  constructor() {
    this.router = Router();
    this.authService = AuthenticationService.getInstance();
    this.auditLog = AuditLogService.getInstance();
    this.encryption = EncryptionService.getInstance();
    this.notification = NotificationService.getInstance();
    this.analytics = AnalyticsService.getInstance();
    this.backup = BackupService.getInstance();
    
    this.initializeRoutes();
  }

  /**
   * Initialize integration routes
   */
  private initializeRoutes(): void {
    // Authentication integration routes
    this.router.post('/auth/validate-token', SessionManager.validateToken, this.validateToken.bind(this));
    this.router.post('/auth/check-permission', SessionManager.validateToken, this.checkPermission.bind(this));
    
    // Encryption integration routes
    this.router.post('/encryption/encrypt', SessionManager.validateToken, this.encryptData.bind(this));
    this.router.post('/encryption/decrypt', SessionManager.validateToken, this.decryptData.bind(this));
    
    // Audit logging integration routes
    this.router.post('/audit/log-event', SessionManager.validateToken, this.logAuditEvent.bind(this));
    
    // Notification integration routes
    this.router.post('/notifications/send', SessionManager.validateToken, this.sendNotification.bind(this));
    
    // Analytics integration routes
    this.router.post('/analytics/record-metric', SessionManager.validateToken, this.recordMetric.bind(this));
    
    // Error handling
    this.router.use(ErrorHandler.handleError);
  }

  /**
   * Get the router instance
   * @returns Express Router instance
   */
  public getRouter(): Router {
    return this.router;
  }

  /**
   * Validate a token
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  private async validateToken(req: any, res: any, next: any): Promise<void> {
    try {
      // Token is already validated by SessionManager middleware
      // Just return the user information
      res.status(200).json({
        success: true,
        user: {
          id: req.user.id,
          username: req.user.username,
          roles: req.user.roles,
          permissions: req.user.permissions
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if user has a specific permission
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  private async checkPermission(req: any, res: any, next: any): Promise<void> {
    try {
      const { permission, resourceType, resourceId } = req.body;
      
      if (!permission) {
        return res.status(400).json({
          success: false,
          message: 'Permission parameter is required'
        });
      }
      
      // Check if user has the requested permission
      const hasPermission = req.user.permissions.includes(permission);
      
      // For resource-specific permissions, additional checks would be performed here
      // based on resourceType and resourceId
      
      // Log the permission check
      await this.auditLog.logEvent({
        eventType: AuditEventType.AUTHORIZATION,
        eventAction: AuditEventAction.READ,
        eventOutcome: hasPermission ? AuditEventOutcome.SUCCESS : AuditEventOutcome.MINOR_FAILURE,
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: req.user.id,
            agentName: req.user.username
          }
        ],
        entities: [
          {
            entityType: 'permission',
            entityId: permission,
            entityDetail: {
              resourceType,
              resourceId
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        hasPermission
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Encrypt data
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  private async encryptData(req: any, res: any, next: any): Promise<void> {
    try {
      const { entityType, entityId, fieldName, data } = req.body;
      
      if (!entityType || !entityId || !fieldName || data === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }
      
      // Encrypt the data
      const encryptedData = await this.encryption.encryptField(
        entityType,
        entityId,
        fieldName,
        data
      );
      
      // Log the encryption operation
      await this.auditLog.logEvent({
        eventType: AuditEventType.ENCRYPTION,
        eventAction: AuditEventAction.EXECUTE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: req.user.id,
            agentName: req.user.username
          }
        ],
        entities: [
          {
            entityType,
            entityId,
            entityDetail: {
              fieldName
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        encryptedData
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Decrypt data
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  private async decryptData(req: any, res: any, next: any): Promise<void> {
    try {
      const { entityType, entityId, fieldName, encryptedData } = req.body;
      
      if (!entityType || !entityId || !fieldName || !encryptedData) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }
      
      // Decrypt the data
      const data = await this.encryption.decryptField(
        entityType,
        entityId,
        fieldName,
        encryptedData
      );
      
      // Log the decryption operation
      await this.auditLog.logEvent({
        eventType: AuditEventType.ENCRYPTION,
        eventAction: AuditEventAction.EXECUTE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: req.user.id,
            agentName: req.user.username
          }
        ],
        entities: [
          {
            entityType,
            entityId,
            entityDetail: {
              fieldName
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log an audit event
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  private async logAuditEvent(req: any, res: any, next: any): Promise<void> {
    try {
      const { eventType, eventAction, eventOutcome, entities } = req.body;
      
      if (!eventType || !eventAction || !eventOutcome) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }
      
      // Create the audit event
      const eventId = await this.auditLog.logEvent({
        eventType,
        eventAction,
        eventOutcome,
        eventOutcomeDesc: req.body.eventOutcomeDesc,
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: req.user.id,
            agentName: req.user.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent']
          }
        ],
        entities: entities || []
      });
      
      res.status(200).json({
        success: true,
        eventId
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a notification
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  private async sendNotification(req: any, res: any, next: any): Promise<void> {
    try {
      const { templateId, recipientId, recipientType, priority, channels, data } = req.body;
      
      if (!templateId || !recipientId || !recipientType || !data) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }
      
      // Send the notification
      const notificationId = await this.notification.sendNotification(
        {
          templateId,
          recipientId,
          recipientType,
          priority,
          channels,
          data
        },
        req.user.id
      );
      
      res.status(200).json({
        success: true,
        notificationId
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record a metric
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  private async recordMetric(req: any, res: any, next: any): Promise<void> {
    try {
      const { metricId, dimensions } = req.body;
      
      if (!metricId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }
      
      // Calculate and record the metric
      const value = await this.analytics.calculateMetric(metricId, dimensions);
      
      res.status(200).json({
        success: true,
        metricId,
        value
      });
    } catch (error) {
      next(error);
    }
  }
}
