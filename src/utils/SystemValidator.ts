import { AuthenticationService } from '../services/AuthenticationService';
import { EncryptionService } from '../services/EncryptionService';
import { AuditLogService } from '../services/AuditLogService';
import { NotificationService } from '../services/NotificationService';
import { AnalyticsService } from '../services/AnalyticsService';
import { BackupService } from '../services/BackupService';
import { DatabaseService } from '../lib/DatabaseService';

/**
 * System Integration Validator
 * Validates the integration and functionality of all security and infrastructure components
 */
export class SystemValidator {
  private authService: AuthenticationService;
  private encryptionService: EncryptionService;
  private auditLogService: AuditLogService;
  private notificationService: NotificationService;
  private analyticsService: AnalyticsService;
  private backupService: BackupService;
  private dbService: DatabaseService;

  constructor() {
    this.authService = AuthenticationService.getInstance();
    this.encryptionService = EncryptionService.getInstance();
    this.auditLogService = AuditLogService.getInstance();
    this.notificationService = NotificationService.getInstance();
    this.analyticsService = AnalyticsService.getInstance();
    this.backupService = BackupService.getInstance();
    this.dbService = DatabaseService.getInstance();
  }

  /**
   * Run all validation tests
   * @returns Validation results
   */
  public async validateAll(): Promise<ValidationResult> {
    console.log('Starting system validation...');
    
    const results: ValidationResult = {
      timestamp: new Date(),
      overallStatus: 'success',
      components: {}
    };
    
    try {
      // Validate database connection
      results.components.database = await this.validateDatabase();
      
      // Validate authentication service
      results.components.authentication = await this.validateAuthentication();
      
      // Validate encryption service
      results.components.encryption = await this.validateEncryption();
      
      // Validate audit logging service
      results.components.auditLogging = await this.validateAuditLogging();
      
      // Validate notification service
      results.components.notification = await this.validateNotification();
      
      // Validate analytics service
      results.components.analytics = await this.validateAnalytics();
      
      // Validate backup service
      results.components.backup = await this.validateBackup();
      
      // Check for any component failures
      for (const component in results.components) {
        if (results.components[component].status === 'failure') {
          results.overallStatus = 'failure';
          break;
        }
      }
      
      console.log('System validation complete.');
      console.log(`Overall status: ${results.overallStatus}`);
      
      return results;
    } catch (error) {
      console.error('Error during system validation:', error);
      
      results.overallStatus = 'failure';
      results.error = (error as Error).message;
      
      return results;
    }
  }

  /**
   * Validate database connection
   * @returns Component validation result
   */
  private async validateDatabase(): Promise<ComponentValidationResult> {
    console.log('Validating database connection...');
    
    try {
      // Test database connection
      const result = await this.dbService.query('SELECT 1 as test');
      
      if (result.rows[0].test !== 1) {
        throw new Error('Database query returned unexpected result');
      }
      
      // Check for required tables
      const tables = [
        'users',
        'roles',
        'permissions',
        'user_roles',
        'role_permissions',
        'refresh_tokens',
        'encryption_keys',
        'data_encryption_contexts',
        'audit_events',
        'audit_agents',
        'audit_entities',
        'notification_templates',
        'notifications',
        'notification_deliveries',
        'user_notification_preferences',
        'analytics_reports',
        'analytics_report_results',
        'analytics_dashboards',
        'analytics_widgets',
        'analytics_metrics',
        'analytics_metric_values',
        'backups',
        'backup_items',
        'restore_operations',
        'backup_schedules',
        'disaster_recovery_plans'
      ];
      
      for (const table of tables) {
        const tableResult = await this.dbService.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [table]
        );
        
        if (!tableResult.rows[0].exists) {
          throw new Error(`Required table not found: ${table}`);
        }
      }
      
      return {
        status: 'success',
        message: 'Database connection validated successfully'
      };
    } catch (error) {
      console.error('Database validation failed:', error);
      
      return {
        status: 'failure',
        message: `Database validation failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Validate authentication service
   * @returns Component validation result
   */
  private async validateAuthentication(): Promise<ComponentValidationResult> {
    console.log('Validating authentication service...');
    
    try {
      // Test user creation
      const testUser = {
        username: `test_user_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'Test@123456',
        firstName: 'Test',
        lastName: 'User'
      };
      
      const userId = await this.authService.createUser(testUser);
      
      if (!userId) {
        throw new Error('Failed to create test user');
      }
      
      // Test authentication
      const authResult = await this.authService.authenticate(testUser.username, testUser.password);
      
      if (!authResult || !authResult.accessToken || !authResult.refreshToken) {
        throw new Error('Authentication failed for test user');
      }
      
      // Test token validation
      const tokenValidation = await this.authService.validateToken(authResult.accessToken);
      
      if (!tokenValidation || !tokenValidation.valid || tokenValidation.userId !== userId) {
        throw new Error('Token validation failed');
      }
      
      // Test token refresh
      const refreshResult = await this.authService.refreshToken(authResult.refreshToken);
      
      if (!refreshResult || !refreshResult.accessToken || !refreshResult.refreshToken) {
        throw new Error('Token refresh failed');
      }
      
      // Clean up test user
      await this.dbService.query('DELETE FROM users WHERE id = $1', [userId]);
      
      return {
        status: 'success',
        message: 'Authentication service validated successfully'
      };
    } catch (error) {
      console.error('Authentication validation failed:', error);
      
      return {
        status: 'failure',
        message: `Authentication validation failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Validate encryption service
   * @returns Component validation result
   */
  private async validateEncryption(): Promise<ComponentValidationResult> {
    console.log('Validating encryption service...');
    
    try {
      // Initialize encryption service
      await this.encryptionService.initialize();
      
      // Test data encryption and decryption
      const testData = 'This is a test string for encryption';
      const entityType = 'test_entity';
      const entityId = `test_${Date.now()}`;
      const fieldName = 'test_field';
      
      // Encrypt the data
      const encryptedData = await this.encryptionService.encryptField(
        entityType,
        entityId,
        fieldName,
        testData
      );
      
      if (!encryptedData) {
        throw new Error('Data encryption failed');
      }
      
      // Decrypt the data
      const decryptedData = await this.encryptionService.decryptField(
        entityType,
        entityId,
        fieldName,
        encryptedData
      );
      
      if (decryptedData !== testData) {
        throw new Error('Data decryption failed or returned incorrect data');
      }
      
      // Clean up test data
      await this.dbService.query(
        'DELETE FROM data_encryption_contexts WHERE entity_type = $1 AND entity_id = $2',
        [entityType, entityId]
      );
      
      return {
        status: 'success',
        message: 'Encryption service validated successfully'
      };
    } catch (error) {
      console.error('Encryption validation failed:', error);
      
      return {
        status: 'failure',
        message: `Encryption validation failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Validate audit logging service
   * @returns Component validation result
   */
  private async validateAuditLogging(): Promise<ComponentValidationResult> {
    console.log('Validating audit logging service...');
    
    try {
      // Initialize audit logging service
      await this.auditLogService.initialize();
      
      // Test audit event logging
      const testEvent = {
        eventType: 'test',
        eventAction: 'C',
        eventOutcome: '0',
        occurredAt: new Date(),
        agents: [
          {
            agentType: 'system',
            agentId: 'validator',
            agentName: 'System Validator'
          }
        ],
        entities: [
          {
            entityType: 'test',
            entityId: `test_${Date.now()}`,
            entityName: 'Test Entity'
          }
        ]
      };
      
      const eventId = await this.auditLogService.logEvent(testEvent);
      
      if (!eventId) {
        throw new Error('Audit event logging failed');
      }
      
      // Verify the event was logged
      const events = await this.auditLogService.getEvents(
        {
          eventType: 'test',
          entityId: testEvent.entities[0].entityId
        },
        1,
        0
      );
      
      if (!events || events.length === 0) {
        throw new Error('Failed to retrieve logged audit event');
      }
      
      // Test FHIR export
      const fhirEvents = await this.auditLogService.exportToFHIR([eventId]);
      
      if (!fhirEvents || fhirEvents.length === 0) {
        throw new Error('FHIR export failed');
      }
      
      return {
        status: 'success',
        message: 'Audit logging service validated successfully'
      };
    } catch (error) {
      console.error('Audit logging validation failed:', error);
      
      return {
        status: 'failure',
        message: `Audit logging validation failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Validate notification service
   * @returns Component validation result
   */
  private async validateNotification(): Promise<ComponentValidationResult> {
    console.log('Validating notification service...');
    
    try {
      // Initialize notification service
      await this.notificationService.initialize();
      
      // Create a test template
      const templateId = await this.notificationService.createTemplate(
        {
          name: `Test Template ${Date.now()}`,
          description: 'Template for validation testing',
          subject: 'Test Notification',
          content: 'This is a test notification with {{variable}}',
          channels: ['in_app'],
          defaultPriority: 'low'
        },
        'system_validator'
      );
      
      if (!templateId) {
        throw new Error('Failed to create notification template');
      }
      
      // Get the template
      const template = await this.notificationService.getTemplate(templateId);
      
      if (!template) {
        throw new Error('Failed to retrieve notification template');
      }
      
      // Send a test notification
      const recipientId = `test_user_${Date.now()}`;
      const notificationId = await this.notificationService.sendNotification(
        {
          templateId,
          recipientId,
          recipientType: 'user',
          data: {
            variable: 'test value'
          }
        },
        'system_validator'
      );
      
      if (!notificationId) {
        throw new Error('Failed to send notification');
      }
      
      return {
        status: 'success',
        message: 'Notification service validated successfully'
      };
    } catch (error) {
      console.error('Notification validation failed:', error);
      
      return {
        status: 'failure',
        message: `Notification validation failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Validate analytics service
   * @returns Component validation result
   */
  private async validateAnalytics(): Promise<ComponentValidationResult> {
    console.log('Validating analytics service...');
    
    try {
      // Initialize analytics service
      await this.analyticsService.initialize();
      
      // Create a test report
      const reportId = await this.analyticsService.createReport(
        {
          reportType: 'system_health',
          reportName: `Test Report ${Date.now()}`,
          reportDescription: 'Report for validation testing'
        },
        'system_validator'
      );
      
      if (!reportId) {
        throw new Error('Failed to create analytics report');
      }
      
      // Run the report
      const resultId = await this.analyticsService.runReport(reportId);
      
      if (!resultId) {
        throw new Error('Failed to run analytics report');
      }
      
      // Create a test dashboard
      const dashboardId = await this.analyticsService.createDashboard(
        {
          dashboardName: `Test Dashboard ${Date.now()}`,
          dashboardDescription: 'Dashboard for validation testing',
          layout: { rows: [], columns: [] }
        },
        'system_validator'
      );
      
      if (!dashboardId) {
        throw new Error('Failed to create analytics dashboard');
      }
      
      // Get the dashboard
      const dashboard = await this.analyticsService.getDashboard(dashboardId);
      
      if (!dashboard) {
        throw new Error('Failed to retrieve analytics dashboard');
      }
      
      return {
        status: 'success',
        message: 'Analytics service validated successfully'
      };
    } catch (error) {
      console.error('Analytics validation failed:', error);
      
      return {
        status: 'failure',
        message: `Analytics validation failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Validate backup service
   * @returns Component validation result
   */
  private async validateBackup(): Promise<ComponentValidationResult> {
    console.log('Validating backup service...');
    
    try {
      // Initialize backup service
      await this.backupService.initialize();
      
      // Create a test backup schedule
      const scheduleId = await this.backupService.createBackupSchedule(
        {
          scheduleName: `Test Schedule ${Date.now()}`,
          backupType: 'schema',
          cronExpression: '0 0 * * *',
          retentionDays: 7,
          storageType: 'local',
          storageLocation: '/tmp/backups'
        },
        'system_validator'
      );
      
      if (!scheduleId) {
        throw new Error('Failed to create backup schedule');
      }
      
      // Create a test disaster recovery plan
      const planId = await this.backupService.createDisasterRecoveryPlan(
        {
          planName: `Test Plan ${Date.now()}`,
          planDescription: 'Plan for validation testing',
          recoveryTimeObjective: '4 hours',
          recoveryPointObjective: '1 hour',
          planDocument: 'This is a test disaster recovery plan document.'
        },
        'system_validator'
      );
      
      if (!planId) {
        throw new Error('Failed to create disaster recovery plan');
      }
      
      // Get backup statistics
      const stats = await this.backupService.getBackupStatistics();
      
      if (!stats) {
        throw new Error('Failed to retrieve backup statistics');
      }
      
      return {
        status: 'success',
        message: 'Backup service validated successfully'
      };
    } catch (error) {
      console.error('Backup validation failed:', error);
      
      return {
        status: 'failure',
        message: `Backup validation failed: ${(error as Error).message}`
      };
    }
  }
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  timestamp: Date;
  overallStatus: 'success' | 'failure';
  components: {
    [key: string]: ComponentValidationResult;
  };
  error?: string;
}

/**
 * Component validation result interface
 */
export interface ComponentValidationResult {
  status: 'success' | 'failure';
  message: string;
  details?: any;
}
