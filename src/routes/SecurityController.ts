import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SessionManager } from '../middleware/SessionManager';
import { InputValidator } from '../middleware/InputValidator';
import { AuditLogService, AuditEventType, AuditEventAction, AuditEventOutcome, AuditAgentType, AuditEntityType } from '../services/AuditLogService';
import { DatabaseService } from '../lib/DatabaseService';
import { EncryptionService } from '../services/EncryptionService';
import Joi from 'joi';

/**
 * Security Controller for the HMS System Infrastructure & Security module
 * Provides endpoints for security-related operations
 */
export class SecurityController {
  private router: Router;
  private auditLog: AuditLogService;
  private validator: InputValidator;
  private db: DatabaseService;
  private encryptionService: EncryptionService;

  constructor() {
    this.router = Router();
    this.auditLog = AuditLogService.getInstance();
    this.validator = InputValidator.getInstance();
    this.db = DatabaseService.getInstance();
    this.encryptionService = EncryptionService.getInstance();
    
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Audit log routes
    this.router.get('/audit-logs', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin', 'security_officer', 'compliance_officer']),
      this.validator.validateQuery(this.auditLogQuerySchema()),
      this.getAuditLogs
    );
    
    this.router.get('/audit-logs/:id', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin', 'security_officer', 'compliance_officer']),
      this.validator.validateParams(this.idParamSchema()),
      this.getAuditLogById
    );
    
    this.router.post('/audit-logs/export', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin', 'security_officer', 'compliance_officer']),
      this.validator.validateBody(this.exportAuditLogsSchema()),
      this.exportAuditLogs
    );
    
    // Encryption key management routes
    this.router.get('/encryption/keys', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin', 'security_officer']),
      this.getEncryptionKeys
    );
    
    this.router.post('/encryption/keys/rotate', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin', 'security_officer']),
      this.rotateEncryptionKeys
    );
    
    this.router.post('/encryption/keys/backup', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin', 'security_officer']),
      this.backupEncryptionKeys
    );
    
    this.router.post('/encryption/keys/restore', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin', 'security_officer']),
      this.validator.validateBody(this.restoreEncryptionKeysSchema()),
      this.restoreEncryptionKeys
    );
    
    // Security settings routes
    this.router.get('/settings', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin', 'security_officer']),
      this.getSecuritySettings
    );
    
    this.router.put('/settings', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin', 'security_officer']),
      this.validator.validateBody(this.updateSecuritySettingsSchema()),
      this.updateSecuritySettings
    );
    
    // IP allowlist routes
    this.router.get('/ip-allowlist', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin', 'security_officer']),
      this.getIpAllowlist
    );
    
    this.router.post('/ip-allowlist', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin', 'security_officer']),
      this.validator.validateBody(this.addIpAllowlistSchema()),
      this.addIpAllowlist
    );
    
    this.router.delete('/ip-allowlist/:id', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin', 'security_officer']),
      this.validator.validateParams(this.idParamSchema()),
      this.removeIpAllowlist
    );
    
    // Security compliance routes
    this.router.get('/compliance/hipaa', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin', 'security_officer', 'compliance_officer']),
      this.getHipaaComplianceReport
    );
    
    this.router.get('/compliance/hitrust', 
      SessionManager.authenticate,
      SessionManager.authorize(['admin', 'security_officer', 'compliance_officer']),
      this.getHitrustComplianceReport
    );
  }

  getRouter(): Router {
    return this.router;
  }

  /**
   * ID parameter schema validation
   */
  private idParamSchema(): Joi.Schema {
    return Joi.object({
      id: Joi.string().uuid().required()
    });
  }

  /**
   * Audit log query schema validation
   */
  private auditLogQuerySchema(): Joi.Schema {
    return Joi.object({
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().optional(),
      eventType: Joi.string().optional(),
      eventAction: Joi.string().optional(),
      eventOutcome: Joi.string().optional(),
      agentId: Joi.string().optional(),
      entityId: Joi.string().optional(),
      entityType: Joi.string().optional(),
      page: Joi.number().integer().min(1).optional().default(1),
      limit: Joi.number().integer().min(1).max(100).optional().default(20)
    });
  }

  /**
   * Export audit logs schema validation
   */
  private exportAuditLogsSchema(): Joi.Schema {
    return Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().required(),
      eventType: Joi.string().optional(),
      eventAction: Joi.string().optional(),
      eventOutcome: Joi.string().optional(),
      agentId: Joi.string().optional(),
      entityId: Joi.string().optional(),
      entityType: Joi.string().optional(),
      format: Joi.string().valid('csv', 'json', 'pdf').required()
    });
  }

  /**
   * Restore encryption keys schema validation
   */
  private restoreEncryptionKeysSchema(): Joi.Schema {
    return Joi.object({
      backupData: Joi.string().required(),
      password: Joi.string().required()
    });
  }

  /**
   * Update security settings schema validation
   */
  private updateSecuritySettingsSchema(): Joi.Schema {
    return Joi.object({
      passwordPolicy: Joi.object({
        minLength: Joi.number().integer().min(8).max(64).optional(),
        requireUppercase: Joi.boolean().optional(),
        requireLowercase: Joi.boolean().optional(),
        requireNumbers: Joi.boolean().optional(),
        requireSpecialChars: Joi.boolean().optional(),
        passwordHistory: Joi.number().integer().min(0).max(24).optional(),
        maxAge: Joi.number().integer().min(0).optional(),
        lockoutThreshold: Joi.number().integer().min(0).optional(),
        lockoutDuration: Joi.number().integer().min(0).optional()
      }).optional(),
      sessionPolicy: Joi.object({
        sessionTimeout: Joi.number().integer().min(60).max(86400).optional(),
        maxConcurrentSessions: Joi.number().integer().min(1).optional(),
        requireMfaForSensitiveOperations: Joi.boolean().optional()
      }).optional(),
      auditPolicy: Joi.object({
        retentionPeriod: Joi.number().integer().min(30).optional(),
        enableAlerts: Joi.boolean().optional(),
        alertThreshold: Joi.number().integer().min(1).optional()
      }).optional()
    });
  }

  /**
   * Add IP allowlist schema validation
   */
  private addIpAllowlistSchema(): Joi.Schema {
    return Joi.object({
      ipAddress: Joi.string().ip().required(),
      description: Joi.string().optional(),
      expiresAt: Joi.date().iso().optional()
    });
  }

  /**
   * Get audit logs
   */
  private getAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        startDate,
        endDate,
        eventType,
        eventAction,
        eventOutcome,
        agentId,
        entityId,
        entityType,
        page,
        limit
      } = req.query;
      
      // Build query conditions
      const conditions = [];
      const params = [];
      let paramIndex = 1;
      
      if (startDate) {
        conditions.push(`ae.occurred_at >= $${paramIndex++}`);
        params.push(new Date(startDate as string));
      }
      
      if (endDate) {
        conditions.push(`ae.occurred_at <= $${paramIndex++}`);
        params.push(new Date(endDate as string));
      }
      
      if (eventType) {
        conditions.push(`ae.event_type = $${paramIndex++}`);
        params.push(eventType);
      }
      
      if (eventAction) {
        conditions.push(`ae.event_action = $${paramIndex++}`);
        params.push(eventAction);
      }
      
      if (eventOutcome) {
        conditions.push(`ae.event_outcome = $${paramIndex++}`);
        params.push(eventOutcome);
      }
      
      // Calculate pagination
      const offset = ((page as number) - 1) * (limit as number);
      
      // Build query
      let query = `
        SELECT ae.*, 
          (SELECT json_agg(aa.*) FROM audit_agents aa WHERE aa.audit_event_id = ae.id) as agents,
          (SELECT json_agg(aent.*) FROM audit_entities aent WHERE aent.audit_event_id = ae.id) as entities
        FROM audit_events ae
      `;
      
      // Add agent and entity conditions if specified
      if (agentId || entityId || entityType) {
        query += ' WHERE ';
        const subConditions = [];
        
        if (agentId) {
          subConditions.push(`EXISTS (
            SELECT 1 FROM audit_agents aa 
            WHERE aa.audit_event_id = ae.id AND aa.agent_id = $${paramIndex++}
          )`);
          params.push(agentId);
        }
        
        if (entityId) {
          subConditions.push(`EXISTS (
            SELECT 1 FROM audit_entities aent 
            WHERE aent.audit_event_id = ae.id AND aent.entity_id = $${paramIndex++}
          )`);
          params.push(entityId);
        }
        
        if (entityType) {
          subConditions.push(`EXISTS (
            SELECT 1 FROM audit_entities aent 
            WHERE aent.audit_event_id = ae.id AND aent.entity_type = $${paramIndex++}
          )`);
          params.push(entityType);
        }
        
        query += subConditions.join(' AND ');
        
        if (conditions.length > 0) {
          query += ' AND ';
        }
      }
      
      if (conditions.length > 0) {
        query += conditions.join(' AND ');
      }
      
      // Add order by and pagination
      query += `
        ORDER BY ae.occurred_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      params.push(limit);
      params.push(offset);
      
      // Execute query
      const auditLogsResult = await this.db.query(query, params);
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM audit_events ae';
      
      if (conditions.length > 0 || agentId || entityId || entityType) {
        countQuery += ' WHERE ';
        const allConditions = [];
        
        if (agentId) {
          allConditions.push(`EXISTS (
            SELECT 1 FROM audit_agents aa 
            WHERE aa.audit_event_id = ae.id AND aa.agent_id = $1
          )`);
        }
        
        if (entityId) {
          allConditions.push(`EXISTS (
            SELECT 1 FROM audit_entities aent 
            WHERE aent.audit_event_id = ae.id AND aent.entity_id = $${agentId ? 2 : 1}
          )`);
        }
        
        if (entityType) {
          allConditions.push(`EXISTS (
            SELECT 1 FROM audit_entities aent 
            WHERE aent.audit_event_id = ae.id AND aent.entity_type = $${
              (agentId ? 2 : 1) + (entityId ? 1 : 0)
            }
          )`);
        }
        
        if (allConditions.length > 0) {
          countQuery += allConditions.join(' AND ');
          
          if (conditions.length > 0) {
            countQuery += ' AND ';
          }
        }
        
        if (conditions.length > 0) {
          countQuery += conditions.join(' AND ');
        }
      }
      
      const countResult = await this.db.query(countQuery, params.slice(0, -2));
      const totalCount = parseInt(countResult.rows[0].count);
      
      // Log audit log retrieval
      await this.auditLog.logEvent({
        eventType: AuditEventType.AUDIT_LOG,
        eventAction: AuditEventAction.READ,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Audit logs retrieved successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityDetail: {
              action: 'retrieve',
              filters: {
                startDate,
                endDate,
                eventType,
                eventAction,
                eventOutcome,
                agentId,
                entityId,
                entityType
              }
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        auditLogs: auditLogsResult.rows,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / (limit as number))
        }
      });
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve audit logs', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Get audit log by ID
   */
  private getAuditLogById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Get audit event
      const auditEventResult = await this.db.query(
        'SELECT * FROM audit_events WHERE id = $1',
        [id]
      );
      
      if (auditEventResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'Audit log not found' 
        });
        return;
      }
      
      // Get audit agents
      const auditAgentsResult = await this.db.query(
        'SELECT * FROM audit_agents WHERE audit_event_id = $1',
        [id]
      );
      
      // Get audit entities
      const auditEntitiesResult = await this.db.query(
        'SELECT * FROM audit_entities WHERE audit_event_id = $1',
        [id]
      );
      
      // Log audit log retrieval
      await this.auditLog.logEvent({
        eventType: AuditEventType.AUDIT_LOG,
        eventAction: AuditEventAction.READ,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Audit log retrieved successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityId: id,
            entityDetail: {
              action: 'retrieve'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        auditLog: {
          ...auditEventResult.rows[0],
          agents: auditAgentsResult.rows,
          entities: auditEntitiesResult.rows
        }
      });
    } catch (error) {
      console.error('Get audit log error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve audit log', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Export audit logs
   */
  private exportAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        startDate,
        endDate,
        eventType,
        eventAction,
        eventOutcome,
        agentId,
        entityId,
        entityType,
        format
      } = req.body;
      
      // Build query conditions
      const conditions = [];
      const params = [];
      let paramIndex = 1;
      
      conditions.push(`ae.occurred_at >= $${paramIndex++}`);
      params.push(new Date(startDate));
      
      conditions.push(`ae.occurred_at <= $${paramIndex++}`);
      params.push(new Date(endDate));
      
      if (eventType) {
        conditions.push(`ae.event_type = $${paramIndex++}`);
        params.push(eventType);
      }
      
      if (eventAction) {
        conditions.push(`ae.event_action = $${paramIndex++}`);
        params.push(eventAction);
      }
      
      if (eventOutcome) {
        conditions.push(`ae.event_outcome = $${paramIndex++}`);
        params.push(eventOutcome);
      }
      
      // Build query
      let query = `
        SELECT ae.*, 
          (SELECT json_agg(aa.*) FROM audit_agents aa WHERE aa.audit_event_id = ae.id) as agents,
          (SELECT json_agg(aent.*) FROM audit_entities aent WHERE aent.audit_event_id = ae.id) as entities
        FROM audit_events ae
        WHERE ${conditions.join(' AND ')}
      `;
      
      // Add agent and entity conditions if specified
      if (agentId || entityId || entityType) {
        const subConditions = [];
        
        if (agentId) {
          subConditions.push(`EXISTS (
            SELECT 1 FROM audit_agents aa 
            WHERE aa.audit_event_id = ae.id AND aa.agent_id = $${paramIndex++}
          )`);
          params.push(agentId);
        }
        
        if (entityId) {
          subConditions.push(`EXISTS (
            SELECT 1 FROM audit_entities aent 
            WHERE aent.audit_event_id = ae.id AND aent.entity_id = $${paramIndex++}
          )`);
          params.push(entityId);
        }
        
        if (entityType) {
          subConditions.push(`EXISTS (
            SELECT 1 FROM audit_entities aent 
            WHERE aent.audit_event_id = ae.id AND aent.entity_type = $${paramIndex++}
          )`);
          params.push(entityType);
        }
        
        query += ` AND ${subConditions.join(' AND ')}`;
      }
      
      // Add order by
      query += ' ORDER BY ae.occurred_at DESC';
      
      // Execute query
      const auditLogsResult = await this.db.query(query, params);
      
      // Generate export file
      const exportData = auditLogsResult.rows;
      const exportFileName = `audit_logs_${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;
      
      // In a real implementation, we would generate the file in the requested format
      // For now, we just return the data
      
      // Log audit log export
      await this.auditLog.logEvent({
        eventType: AuditEventType.AUDIT_LOG,
        eventAction: AuditEventAction.EXPORT,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Audit logs exported successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityDetail: {
              action: 'export',
              format,
              filters: {
                startDate,
                endDate,
                eventType,
                eventAction,
                eventOutcome,
                agentId,
                entityId,
                entityType
              },
              recordCount: exportData.length
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        fileName: exportFileName,
        recordCount: exportData.length,
        data: exportData
      });
    } catch (error) {
      console.error('Export audit logs error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to export audit logs', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Get encryption keys
   */
  private getEncryptionKeys = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get encryption keys metadata
      const keysMetadata = await this.encryptionService.getKeysMetadata();
      
      // Log encryption keys retrieval
      await this.auditLog.logEvent({
        eventType: AuditEventType.ENCRYPTION,
        eventAction: AuditEventAction.READ,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Encryption keys metadata retrieved successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityDetail: {
              action: 'retrieve_keys_metadata'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        keysMetadata
      });
    } catch (error) {
      console.error('Get encryption keys error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve encryption keys', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Rotate encryption keys
   */
  private rotateEncryptionKeys = async (req: Request, res: Response): Promise<void> => {
    try {
      // Rotate encryption keys
      await this.encryptionService.rotateKeys();
      
      // Log encryption keys rotation
      await this.auditLog.logEvent({
        eventType: AuditEventType.ENCRYPTION,
        eventAction: AuditEventAction.UPDATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Encryption keys rotated successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityDetail: {
              action: 'rotate_keys'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'Encryption keys rotated successfully'
      });
    } catch (error) {
      console.error('Rotate encryption keys error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to rotate encryption keys', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Backup encryption keys
   */
  private backupEncryptionKeys = async (req: Request, res: Response): Promise<void> => {
    try {
      // Backup encryption keys
      const backupData = await this.encryptionService.backupKeys();
      
      // Log encryption keys backup
      await this.auditLog.logEvent({
        eventType: AuditEventType.ENCRYPTION,
        eventAction: AuditEventAction.EXPORT,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Encryption keys backed up successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityDetail: {
              action: 'backup_keys'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'Encryption keys backed up successfully',
        backupData
      });
    } catch (error) {
      console.error('Backup encryption keys error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to backup encryption keys', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Restore encryption keys
   */
  private restoreEncryptionKeys = async (req: Request, res: Response): Promise<void> => {
    try {
      const { backupData, password } = req.body;
      
      // Restore encryption keys
      await this.encryptionService.restoreKeys(backupData, password);
      
      // Log encryption keys restoration
      await this.auditLog.logEvent({
        eventType: AuditEventType.ENCRYPTION,
        eventAction: AuditEventAction.IMPORT,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Encryption keys restored successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityDetail: {
              action: 'restore_keys'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'Encryption keys restored successfully'
      });
    } catch (error) {
      console.error('Restore encryption keys error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to restore encryption keys', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Get security settings
   */
  private getSecuritySettings = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get security settings
      const securitySettingsResult = await this.db.query(
        'SELECT * FROM security_settings WHERE id = $1',
        ['global'] // Using 'global' as the ID for system-wide settings
      );
      
      const securitySettings = securitySettingsResult.rows.length > 0
        ? securitySettingsResult.rows[0]
        : {
            id: 'global',
            passwordPolicy: {
              minLength: 8,
              requireUppercase: true,
              requireLowercase: true,
              requireNumbers: true,
              requireSpecialChars: true,
              passwordHistory: 5,
              maxAge: 90,
              lockoutThreshold: 5,
              lockoutDuration: 30
            },
            sessionPolicy: {
              sessionTimeout: 3600,
              maxConcurrentSessions: 3,
              requireMfaForSensitiveOperations: true
            },
            auditPolicy: {
              retentionPeriod: 365,
              enableAlerts: true,
              alertThreshold: 3
            }
          };
      
      // Log security settings retrieval
      await this.auditLog.logEvent({
        eventType: AuditEventType.SECURITY_SETTINGS,
        eventAction: AuditEventAction.READ,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Security settings retrieved successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityDetail: {
              action: 'retrieve_security_settings'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        securitySettings
      });
    } catch (error) {
      console.error('Get security settings error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve security settings', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Update security settings
   */
  private updateSecuritySettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const { passwordPolicy, sessionPolicy, auditPolicy } = req.body;
      
      // Get current security settings
      const securitySettingsResult = await this.db.query(
        'SELECT * FROM security_settings WHERE id = $1',
        ['global']
      );
      
      const currentSettings = securitySettingsResult.rows.length > 0
        ? securitySettingsResult.rows[0]
        : {
            passwordPolicy: {
              minLength: 8,
              requireUppercase: true,
              requireLowercase: true,
              requireNumbers: true,
              requireSpecialChars: true,
              passwordHistory: 5,
              maxAge: 90,
              lockoutThreshold: 5,
              lockoutDuration: 30
            },
            sessionPolicy: {
              sessionTimeout: 3600,
              maxConcurrentSessions: 3,
              requireMfaForSensitiveOperations: true
            },
            auditPolicy: {
              retentionPeriod: 365,
              enableAlerts: true,
              alertThreshold: 3
            }
          };
      
      // Merge settings
      const updatedSettings = {
        passwordPolicy: {
          ...currentSettings.passwordPolicy,
          ...(passwordPolicy || {})
        },
        sessionPolicy: {
          ...currentSettings.sessionPolicy,
          ...(sessionPolicy || {})
        },
        auditPolicy: {
          ...currentSettings.auditPolicy,
          ...(auditPolicy || {})
        }
      };
      
      // Update security settings
      if (securitySettingsResult.rows.length > 0) {
        await this.db.query(
          `UPDATE security_settings 
           SET password_policy = $1, session_policy = $2, audit_policy = $3, updated_at = $4, updated_by = $5
           WHERE id = $6`,
          [
            JSON.stringify(updatedSettings.passwordPolicy),
            JSON.stringify(updatedSettings.sessionPolicy),
            JSON.stringify(updatedSettings.auditPolicy),
            new Date(),
            req.user!.id,
            'global'
          ]
        );
      } else {
        await this.db.query(
          `INSERT INTO security_settings (
            id, password_policy, session_policy, audit_policy, created_at, updated_at, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            'global',
            JSON.stringify(updatedSettings.passwordPolicy),
            JSON.stringify(updatedSettings.sessionPolicy),
            JSON.stringify(updatedSettings.auditPolicy),
            new Date(),
            new Date(),
            req.user!.id
          ]
        );
      }
      
      // Log security settings update
      await this.auditLog.logEvent({
        eventType: AuditEventType.SECURITY_SETTINGS,
        eventAction: AuditEventAction.UPDATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Security settings updated successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityDetail: {
              action: 'update_security_settings',
              changes: {
                passwordPolicy: passwordPolicy || null,
                sessionPolicy: sessionPolicy || null,
                auditPolicy: auditPolicy || null
              }
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'Security settings updated successfully',
        securitySettings: {
          id: 'global',
          ...updatedSettings
        }
      });
    } catch (error) {
      console.error('Update security settings error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to update security settings', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Get IP allowlist
   */
  private getIpAllowlist = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get IP allowlist
      const ipAllowlistResult = await this.db.query(
        `SELECT * FROM ip_allowlist 
         WHERE expires_at IS NULL OR expires_at > $1
         ORDER BY created_at DESC`,
        [new Date()]
      );
      
      // Log IP allowlist retrieval
      await this.auditLog.logEvent({
        eventType: AuditEventType.SECURITY_SETTINGS,
        eventAction: AuditEventAction.READ,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'IP allowlist retrieved successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityDetail: {
              action: 'retrieve_ip_allowlist'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        ipAllowlist: ipAllowlistResult.rows
      });
    } catch (error) {
      console.error('Get IP allowlist error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve IP allowlist', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Add IP to allowlist
   */
  private addIpAllowlist = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ipAddress, description, expiresAt } = req.body;
      
      // Check if IP already exists in allowlist
      const existingIpResult = await this.db.query(
        `SELECT * FROM ip_allowlist 
         WHERE ip_address = $1
         AND (expires_at IS NULL OR expires_at > $2)`,
        [ipAddress, new Date()]
      );
      
      if (existingIpResult.rows.length > 0) {
        res.status(409).json({ 
          success: false,
          message: 'IP address already in allowlist' 
        });
        return;
      }
      
      // Add IP to allowlist
      const id = uuidv4();
      const now = new Date();
      
      await this.db.query(
        `INSERT INTO ip_allowlist (
          id, ip_address, description, expires_at, created_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          ipAddress,
          description || null,
          expiresAt ? new Date(expiresAt) : null,
          now,
          req.user!.id
        ]
      );
      
      // Log IP allowlist addition
      await this.auditLog.logEvent({
        eventType: AuditEventType.SECURITY_SETTINGS,
        eventAction: AuditEventAction.CREATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'IP added to allowlist successfully',
        occurredAt: now,
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityId: id,
            entityDetail: {
              action: 'add_ip_allowlist',
              ipAddress,
              description,
              expiresAt
            }
          }
        ]
      });
      
      res.status(201).json({
        success: true,
        message: 'IP added to allowlist successfully',
        ipAllowlist: {
          id,
          ipAddress,
          description,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdAt: now,
          createdBy: req.user!.id
        }
      });
    } catch (error) {
      console.error('Add IP allowlist error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to add IP to allowlist', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Remove IP from allowlist
   */
  private removeIpAllowlist = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Check if IP exists in allowlist
      const ipAllowlistResult = await this.db.query(
        'SELECT * FROM ip_allowlist WHERE id = $1',
        [id]
      );
      
      if (ipAllowlistResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'IP not found in allowlist' 
        });
        return;
      }
      
      const ipAllowlist = ipAllowlistResult.rows[0];
      
      // Remove IP from allowlist
      await this.db.query(
        'DELETE FROM ip_allowlist WHERE id = $1',
        [id]
      );
      
      // Log IP allowlist removal
      await this.auditLog.logEvent({
        eventType: AuditEventType.SECURITY_SETTINGS,
        eventAction: AuditEventAction.DELETE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'IP removed from allowlist successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityId: id,
            entityDetail: {
              action: 'remove_ip_allowlist',
              ipAddress: ipAllowlist.ip_address
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'IP removed from allowlist successfully'
      });
    } catch (error) {
      console.error('Remove IP allowlist error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to remove IP from allowlist', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Get HIPAA compliance report
   */
  private getHipaaComplianceReport = async (req: Request, res: Response): Promise<void> => {
    try {
      // In a real implementation, we would generate a comprehensive HIPAA compliance report
      // For now, we just return a sample report
      
      const hipaaReport = {
        reportDate: new Date(),
        complianceStatus: 'Compliant',
        sections: [
          {
            title: 'Administrative Safeguards',
            status: 'Compliant',
            items: [
              { requirement: 'Security Management Process', status: 'Compliant' },
              { requirement: 'Assigned Security Responsibility', status: 'Compliant' },
              { requirement: 'Workforce Security', status: 'Compliant' },
              { requirement: 'Information Access Management', status: 'Compliant' },
              { requirement: 'Security Awareness and Training', status: 'Compliant' },
              { requirement: 'Security Incident Procedures', status: 'Compliant' },
              { requirement: 'Contingency Plan', status: 'Compliant' },
              { requirement: 'Evaluation', status: 'Compliant' },
              { requirement: 'Business Associate Contracts', status: 'Compliant' }
            ]
          },
          {
            title: 'Physical Safeguards',
            status: 'Compliant',
            items: [
              { requirement: 'Facility Access Controls', status: 'Compliant' },
              { requirement: 'Workstation Use', status: 'Compliant' },
              { requirement: 'Workstation Security', status: 'Compliant' },
              { requirement: 'Device and Media Controls', status: 'Compliant' }
            ]
          },
          {
            title: 'Technical Safeguards',
            status: 'Compliant',
            items: [
              { requirement: 'Access Control', status: 'Compliant' },
              { requirement: 'Audit Controls', status: 'Compliant' },
              { requirement: 'Integrity', status: 'Compliant' },
              { requirement: 'Person or Entity Authentication', status: 'Compliant' },
              { requirement: 'Transmission Security', status: 'Compliant' }
            ]
          }
        ]
      };
      
      // Log HIPAA compliance report retrieval
      await this.auditLog.logEvent({
        eventType: AuditEventType.COMPLIANCE,
        eventAction: AuditEventAction.READ,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'HIPAA compliance report retrieved successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityDetail: {
              action: 'retrieve_hipaa_compliance_report'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        hipaaReport
      });
    } catch (error) {
      console.error('Get HIPAA compliance report error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve HIPAA compliance report', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Get HITRUST compliance report
   */
  private getHitrustComplianceReport = async (req: Request, res: Response): Promise<void> => {
    try {
      // In a real implementation, we would generate a comprehensive HITRUST compliance report
      // For now, we just return a sample report
      
      const hitrustReport = {
        reportDate: new Date(),
        complianceStatus: 'Compliant',
        sections: [
          {
            title: 'Information Protection Program',
            status: 'Compliant',
            items: [
              { requirement: 'Information Security Management Program', status: 'Compliant' },
              { requirement: 'Information Security Policy', status: 'Compliant' },
              { requirement: 'Risk Management', status: 'Compliant' }
            ]
          },
          {
            title: 'Endpoint Protection',
            status: 'Compliant',
            items: [
              { requirement: 'Endpoint Encryption', status: 'Compliant' },
              { requirement: 'Malware Protection', status: 'Compliant' },
              { requirement: 'Patch Management', status: 'Compliant' }
            ]
          },
          {
            title: 'Network Protection',
            status: 'Compliant',
            items: [
              { requirement: 'Network Security', status: 'Compliant' },
              { requirement: 'Wireless Security', status: 'Compliant' },
              { requirement: 'Remote Access', status: 'Compliant' }
            ]
          },
          {
            title: 'Identity and Access Management',
            status: 'Compliant',
            items: [
              { requirement: 'Access Control', status: 'Compliant' },
              { requirement: 'Authentication', status: 'Compliant' },
              { requirement: 'Authorization', status: 'Compliant' }
            ]
          },
          {
            title: 'Data Protection and Privacy',
            status: 'Compliant',
            items: [
              { requirement: 'Data Classification', status: 'Compliant' },
              { requirement: 'Data Encryption', status: 'Compliant' },
              { requirement: 'Privacy Protections', status: 'Compliant' }
            ]
          }
        ]
      };
      
      // Log HITRUST compliance report retrieval
      await this.auditLog.logEvent({
        eventType: AuditEventType.COMPLIANCE,
        eventAction: AuditEventAction.READ,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'HITRUST compliance report retrieved successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityDetail: {
              action: 'retrieve_hitrust_compliance_report'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        hitrustReport
      });
    } catch (error) {
      console.error('Get HITRUST compliance report error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to retrieve HITRUST compliance report', 
        error: (error as Error).message 
      });
    }
  };
}
