import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SessionManager } from '../middleware/SessionManager';
import { InputValidator } from '../middleware/InputValidator';
import { AuditLogService, AuditEventType, AuditEventAction, AuditEventOutcome } from '../services/AuditLogService';
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
            agentType: 'user',
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'audit_log',
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
            agentType: 'user',
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'audit_log',
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
      let exportData;
      let contentType;
      let filename;
      
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      
      if (format === 'json') {
        exportData = JSON.stringify(auditLogsResult.rows, null, 2);
        contentType = 'application/json';
        filename = `audit_logs_${timestamp}.json`;
      } else if (format === 'csv') {
        // Simple CSV generation
        const headers = [
          'id', 'event_type', 'event_action', 'event_outcome', 
          'event_outcome_desc', 'occurred_at', 'agents', 'entities'
        ];
        
        const rows = auditLogsResult.rows.map((row: any) => {
          return headers.map(header => {
            const value = row[header];
            if (typeof value === 'object') {
              return JSON.stringify(value);
            }
            return value;
          }).join(',');
        });
        
        exportData = [headers.join(','), ...rows].join('\n');
        contentType = 'text/csv';
        filename = `audit_logs_${timestamp}.csv`;
      } else {
        // PDF generation would be implemented here
        // For now, just return JSON
        exportData = JSON.stringify(auditLogsResult.rows, null, 2);
        contentType = 'application/json';
        filename = `audit_logs_${timestamp}.json`;
      }
      
      // Log audit log export
      await this.auditLog.logEvent({
        eventType: AuditEventType.AUDIT_LOG,
        eventAction: AuditEventAction.EXPORT,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Audit logs exported successfully',
        occurredAt: now,
        agents: [
          {
            agentType: 'user',
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'audit_log',
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
              }
            }
          }
        ]
      });
      
      // Set response headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      
      // Send export data
      res.status(200).send(exportData);
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
            agentType: 'user',
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'encryption_keys',
            entityDetail: {
              action: 'retrieve_metadata'
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
      const rotationResult = await this.encryptionService.rotateKeys();
      
      // Log encryption keys rotation
      await this.auditLog.logEvent({
        eventType: AuditEventType.ENCRYPTION,
        eventAction: AuditEventAction.UPDATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Encryption keys rotated successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'encryption_keys',
            entityDetail: {
              action: 'rotate',
              newMasterKeyId: rotationResult.newMasterKeyId,
              affectedDataKeys: rotationResult.affectedDataKeys
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'Encryption keys rotated successfully',
        rotationResult
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
        eventAction: AuditEventAction.BACKUP,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Encryption keys backed up successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'encryption_keys',
            entityDetail: {
              action: 'backup'
            }
          }
        ]
      });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename=encryption_keys_backup.dat');
      
      // Send backup data
      res.status(200).send(backupData);
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
      const restoreResult = await this.encryptionService.restoreKeys(backupData, password);
      
      // Log encryption keys restoration
      await this.auditLog.logEvent({
        eventType: AuditEventType.ENCRYPTION,
        eventAction: AuditEventAction.RESTORE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Encryption keys restored successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'encryption_keys',
            entityDetail: {
              action: 'restore',
              restoredMasterKeys: restoreResult.restoredMasterKeys,
              restoredDataKeys: restoreResult.restoredDataKeys
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'Encryption keys restored successfully',
        restoreResult
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
      const settingsResult = await this.db.query(
        'SELECT * FROM security_settings WHERE id = $1',
        ['global'] // Using 'global' as the ID for global settings
      );
      
      let settings;
      
      if (settingsResult.rows.length === 0) {
        // Return default settings
        settings = {
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
      } else {
        settings = settingsResult.rows[0].settings;
      }
      
      // Log security settings retrieval
      await this.auditLog.logEvent({
        eventType: AuditEventType.SECURITY_SETTINGS,
        eventAction: AuditEventAction.READ,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Security settings retrieved successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'security_settings',
            entityDetail: {
              action: 'retrieve'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        settings
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
      
      // Get current settings
      const settingsResult = await this.db.query(
        'SELECT * FROM security_settings WHERE id = $1',
        ['global']
      );
      
      let currentSettings;
      
      if (settingsResult.rows.length === 0) {
        // Use default settings
        currentSettings = {
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
      } else {
        currentSettings = settingsResult.rows[0].settings;
      }
      
      // Merge new settings with current settings
      const newSettings = {
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
      
      // Update settings
      await this.db.query(
        `INSERT INTO security_settings (id, settings, updated_at, updated_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
         settings = $2, updated_at = $3, updated_by = $4`,
        [
          'global',
          JSON.stringify(newSettings),
          new Date(),
          req.user!.id
        ]
      );
      
      // Log security settings update
      await this.auditLog.logEvent({
        eventType: AuditEventType.SECURITY_SETTINGS,
        eventAction: AuditEventAction.UPDATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'Security settings updated successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'security_settings',
            entityDetail: {
              action: 'update',
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
        settings: newSettings
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
        'SELECT * FROM ip_allowlist ORDER BY created_at DESC'
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
            agentType: 'user',
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'ip_allowlist',
            entityDetail: {
              action: 'retrieve'
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
      
      // Check if IP already exists
      const existingIpResult = await this.db.query(
        'SELECT * FROM ip_allowlist WHERE ip_address = $1',
        [ipAddress]
      );
      
      if (existingIpResult.rows.length > 0) {
        res.status(409).json({ 
          success: false,
          message: 'IP address already exists in allowlist' 
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
        eventOutcomeDesc: 'IP address added to allowlist successfully',
        occurredAt: now,
        agents: [
          {
            agentType: 'user',
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'ip_allowlist',
            entityId: id,
            entityDetail: {
              action: 'add',
              ipAddress,
              description,
              expiresAt
            }
          }
        ]
      });
      
      res.status(201).json({
        success: true,
        message: 'IP address added to allowlist successfully',
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
        message: 'Failed to add IP address to allowlist', 
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
      
      // Check if IP exists
      const ipResult = await this.db.query(
        'SELECT * FROM ip_allowlist WHERE id = $1',
        [id]
      );
      
      if (ipResult.rows.length === 0) {
        res.status(404).json({ 
          success: false,
          message: 'IP address not found in allowlist' 
        });
        return;
      }
      
      const ip = ipResult.rows[0];
      
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
        eventOutcomeDesc: 'IP address removed from allowlist successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'ip_allowlist',
            entityId: id,
            entityDetail: {
              action: 'remove',
              ipAddress: ip.ip_address
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        message: 'IP address removed from allowlist successfully'
      });
    } catch (error) {
      console.error('Remove IP allowlist error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to remove IP address from allowlist', 
        error: (error as Error).message 
      });
    }
  };

  /**
   * Get HIPAA compliance report
   */
  private getHipaaComplianceReport = async (req: Request, res: Response): Promise<void> => {
    try {
      // In a real implementation, this would generate a comprehensive HIPAA compliance report
      // For now, we'll return a mock report
      
      // Log compliance report retrieval
      await this.auditLog.logEvent({
        eventType: AuditEventType.COMPLIANCE,
        eventAction: AuditEventAction.READ,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'HIPAA compliance report retrieved successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'compliance_report',
            entityDetail: {
              action: 'retrieve',
              reportType: 'hipaa'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        report: {
          reportType: 'HIPAA Compliance',
          generatedAt: new Date(),
          generatedBy: req.user!.id,
          overallCompliance: '92%',
          sections: [
            {
              name: 'Administrative Safeguards',
              compliance: '95%',
              controls: [
                { name: 'Security Management Process', compliance: '100%' },
                { name: 'Assigned Security Responsibility', compliance: '100%' },
                { name: 'Workforce Security', compliance: '90%' },
                { name: 'Information Access Management', compliance: '95%' },
                { name: 'Security Awareness and Training', compliance: '85%' },
                { name: 'Security Incident Procedures', compliance: '100%' },
                { name: 'Contingency Plan', compliance: '90%' },
                { name: 'Evaluation', compliance: '95%' }
              ]
            },
            {
              name: 'Physical Safeguards',
              compliance: '90%',
              controls: [
                { name: 'Facility Access Controls', compliance: '90%' },
                { name: 'Workstation Use', compliance: '95%' },
                { name: 'Workstation Security', compliance: '85%' },
                { name: 'Device and Media Controls', compliance: '90%' }
              ]
            },
            {
              name: 'Technical Safeguards',
              compliance: '94%',
              controls: [
                { name: 'Access Control', compliance: '95%' },
                { name: 'Audit Controls', compliance: '100%' },
                { name: 'Integrity', compliance: '90%' },
                { name: 'Person or Entity Authentication', compliance: '95%' },
                { name: 'Transmission Security', compliance: '90%' }
              ]
            }
          ],
          findings: [
            {
              severity: 'Medium',
              control: 'Workforce Security',
              finding: 'Termination procedures need improvement',
              recommendation: 'Implement automated access revocation upon termination'
            },
            {
              severity: 'Low',
              control: 'Workstation Security',
              finding: 'Some workstations have outdated screen lock policies',
              recommendation: 'Update screen lock timeout to 10 minutes for all workstations'
            },
            {
              severity: 'Low',
              control: 'Transmission Security',
              finding: 'Some non-critical internal communications are not encrypted',
              recommendation: 'Extend encryption to all internal communications'
            }
          ]
        }
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
      // In a real implementation, this would generate a comprehensive HITRUST compliance report
      // For now, we'll return a mock report
      
      // Log compliance report retrieval
      await this.auditLog.logEvent({
        eventType: AuditEventType.COMPLIANCE,
        eventAction: AuditEventAction.READ,
        eventOutcome: AuditEventOutcome.SUCCESS,
        eventOutcomeDesc: 'HITRUST compliance report retrieved successfully',
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'user',
            agentId: req.user!.id,
            agentName: req.user!.username,
            networkAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          }
        ],
        entities: [
          {
            entityType: 'compliance_report',
            entityDetail: {
              action: 'retrieve',
              reportType: 'hitrust'
            }
          }
        ]
      });
      
      res.status(200).json({
        success: true,
        report: {
          reportType: 'HITRUST CSF Compliance',
          generatedAt: new Date(),
          generatedBy: req.user!.id,
          overallMaturity: '3.8',
          domains: [
            {
              name: '00. Information Security Management Program',
              maturity: '4.2',
              controls: [
                { id: '00.a', name: 'Information Security Management Program', maturity: '4.2' }
              ]
            },
            {
              name: '01. Access Control',
              maturity: '3.9',
              controls: [
                { id: '01.a', name: 'Access Control Policy', maturity: '4.0' },
                { id: '01.b', name: 'User Registration', maturity: '4.2' },
                { id: '01.c', name: 'Privilege Management', maturity: '3.8' },
                { id: '01.d', name: 'User Password Management', maturity: '4.0' },
                { id: '01.e', name: 'Review of User Access Rights', maturity: '3.5' },
                { id: '01.f', name: 'Password Use', maturity: '4.0' },
                { id: '01.g', name: 'Unattended User Equipment', maturity: '3.8' },
                { id: '01.h', name: 'Clear Desk and Clear Screen Policy', maturity: '3.5' },
                { id: '01.i', name: 'Network Access Control', maturity: '4.0' },
                { id: '01.j', name: 'User Authentication for External Connections', maturity: '4.2' },
                { id: '01.k', name: 'Equipment Identification in Networks', maturity: '3.8' },
                { id: '01.l', name: 'Remote Diagnostic and Configuration Port Protection', maturity: '3.5' },
                { id: '01.m', name: 'Segregation in Networks', maturity: '4.0' },
                { id: '01.n', name: 'Network Connection Control', maturity: '4.0' },
                { id: '01.o', name: 'Network Routing Control', maturity: '3.8' },
                { id: '01.p', name: 'Operating System Access Control', maturity: '4.0' },
                { id: '01.q', name: 'Application Access Control', maturity: '3.8' },
                { id: '01.r', name: 'Mobile Computing and Teleworking', maturity: '3.5' }
              ]
            },
            {
              name: '02. Human Resources Security',
              maturity: '3.7',
              controls: [
                { id: '02.a', name: 'Security in Job Definition and Resourcing', maturity: '3.8' },
                { id: '02.b', name: 'During Employment', maturity: '3.5' },
                { id: '02.c', name: 'Termination or Change of Employment', maturity: '3.8' }
              ]
            }
          ],
          findings: [
            {
              severity: 'Medium',
              control: '01.e Review of User Access Rights',
              finding: 'User access reviews are not consistently documented',
              recommendation: 'Implement automated user access review workflow with documentation'
            },
            {
              severity: 'Medium',
              control: '01.r Mobile Computing and Teleworking',
              finding: 'Mobile device management policy needs enhancement',
              recommendation: 'Update mobile device management to include containerization'
            },
            {
              severity: 'Low',
              control: '02.b During Employment',
              finding: 'Security awareness training completion rates below target',
              recommendation: 'Implement automated reminders and management reporting for training completion'
            }
          ]
        }
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
