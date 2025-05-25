import { DatabaseService } from '../lib/DatabaseService';
import { AuditLogService, AuditEventType, AuditEventAction, AuditEventOutcome, AuditAgentType, AuditEntityType } from './AuditLogService';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Backup types
 */
export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  DIFFERENTIAL = 'differential',
  SCHEMA = 'schema',
  DATA = 'data',
  LOG = 'log'
}

/**
 * Backup status
 */
export enum BackupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  VERIFIED = 'verified'
}

/**
 * Backup storage type
 */
export enum BackupStorageType {
  LOCAL = 'local',
  S3 = 's3',
  AZURE = 'azure',
  GCP = 'gcp'
}

/**
 * Backup and Disaster Recovery Service for the HMS System Infrastructure & Security module
 */
export class BackupService {
  private static instance: BackupService;
  private db: DatabaseService;
  private auditLog: AuditLogService;
  private backupDir: string;
  private retentionPeriod: number; // in days
  private encryptionKey: string;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.auditLog = AuditLogService.getInstance();
    this.backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
    this.retentionPeriod = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || 'default-backup-encryption-key';
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Get singleton instance of BackupService
   * @returns BackupService instance
   */
  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Initialize the backup service
   * Creates necessary tables if they don't exist
   */
  public async initialize(): Promise<void> {
    try {
      // Create backups table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS backups (
          id UUID PRIMARY KEY,
          backup_type VARCHAR(50) NOT NULL,
          backup_name VARCHAR(255) NOT NULL,
          backup_path VARCHAR(1024) NOT NULL,
          storage_type VARCHAR(50) NOT NULL,
          storage_location VARCHAR(1024) NOT NULL,
          file_size BIGINT,
          checksum VARCHAR(128),
          encryption_algorithm VARCHAR(50),
          compression_algorithm VARCHAR(50),
          status VARCHAR(50) NOT NULL,
          status_message TEXT,
          created_at TIMESTAMP NOT NULL,
          completed_at TIMESTAMP,
          expires_at TIMESTAMP,
          created_by UUID,
          metadata JSONB
        );
      `);

      // Create backup_items table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS backup_items (
          id UUID PRIMARY KEY,
          backup_id UUID REFERENCES backups(id),
          item_type VARCHAR(50) NOT NULL,
          item_name VARCHAR(255) NOT NULL,
          item_path VARCHAR(1024) NOT NULL,
          file_size BIGINT,
          checksum VARCHAR(128),
          created_at TIMESTAMP NOT NULL,
          metadata JSONB
        );
      `);

      // Create restore_operations table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS restore_operations (
          id UUID PRIMARY KEY,
          backup_id UUID REFERENCES backups(id),
          restore_type VARCHAR(50) NOT NULL,
          restore_name VARCHAR(255) NOT NULL,
          restore_path VARCHAR(1024) NOT NULL,
          status VARCHAR(50) NOT NULL,
          status_message TEXT,
          created_at TIMESTAMP NOT NULL,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          created_by UUID,
          metadata JSONB
        );
      `);

      // Create backup_schedules table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS backup_schedules (
          id UUID PRIMARY KEY,
          schedule_name VARCHAR(255) NOT NULL,
          backup_type VARCHAR(50) NOT NULL,
          cron_expression VARCHAR(100) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          last_run_at TIMESTAMP,
          next_run_at TIMESTAMP,
          retention_days INTEGER NOT NULL,
          storage_type VARCHAR(50) NOT NULL,
          storage_location VARCHAR(1024) NOT NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          created_by UUID,
          updated_by UUID,
          metadata JSONB
        );
      `);

      // Create disaster_recovery_plans table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS disaster_recovery_plans (
          id UUID PRIMARY KEY,
          plan_name VARCHAR(255) NOT NULL,
          plan_description TEXT,
          recovery_time_objective VARCHAR(50),
          recovery_point_objective VARCHAR(50),
          plan_document TEXT NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          last_tested_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          created_by UUID,
          updated_by UUID,
          metadata JSONB
        );
      `);

      console.log('Backup service initialized');
    } catch (error) {
      console.error('Error initializing backup service:', error);
      throw error;
    }
  }

  /**
   * Create a backup schedule
   * @param scheduleData Schedule configuration
   * @param createdBy ID of the user creating the schedule
   * @returns ID of the created schedule
   */
  public async createBackupSchedule(
    scheduleData: {
      scheduleName: string;
      backupType: BackupType;
      cronExpression: string;
      retentionDays: number;
      storageType: BackupStorageType;
      storageLocation: string;
      metadata?: Record<string, any>;
    },
    createdBy: string
  ): Promise<string> {
    try {
      const scheduleId = crypto.randomUUID();
      const now = new Date();
      
      // Calculate next run time based on cron expression
      const nextRunAt = this.calculateNextRunTime(scheduleData.cronExpression);
      
      await this.db.query(
        `INSERT INTO backup_schedules (
          id, schedule_name, backup_type, cron_expression, is_active,
          next_run_at, retention_days, storage_type, storage_location,
          created_at, updated_at, created_by, updated_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          scheduleId,
          scheduleData.scheduleName,
          scheduleData.backupType,
          scheduleData.cronExpression,
          true,
          nextRunAt,
          scheduleData.retentionDays,
          scheduleData.storageType,
          scheduleData.storageLocation,
          now,
          now,
          createdBy,
          createdBy,
          scheduleData.metadata ? JSON.stringify(scheduleData.metadata) : null
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
            agentRole: 'backup_administrator'
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityId: scheduleId,
            entityName: `Backup Schedule: ${scheduleData.scheduleName}`
          }
        ]
      });
      
      return scheduleId;
    } catch (error) {
      console.error('Error creating backup schedule:', error);
      throw error;
    }
  }

  /**
   * Calculate next run time based on cron expression
   * @param cronExpression Cron expression
   * @returns Next run time
   */
  private calculateNextRunTime(cronExpression: string): Date {
    // This is a simplified implementation
    // In a real system, you would use a cron parser library
    
    // For now, just return a time 24 hours in the future
    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    return nextRun;
  }

  /**
   * Create a backup
   * @param backupData Backup configuration
   * @param createdBy ID of the user creating the backup
   * @returns ID of the created backup
   */
  public async createBackup(
    backupData: {
      backupType: BackupType;
      backupName: string;
      storageType: BackupStorageType;
      storageLocation: string;
      encryptionAlgorithm?: string;
      compressionAlgorithm?: string;
      metadata?: Record<string, any>;
    },
    createdBy: string
  ): Promise<string> {
    try {
      const backupId = crypto.randomUUID();
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.retentionPeriod);
      
      // Create a backup path
      const backupFileName = `${backupData.backupName.replace(/\s+/g, '_')}_${now.toISOString().replace(/[:.]/g, '-')}.backup`;
      const backupPath = path.join(this.backupDir, backupFileName);
      
      // Create the backup record
      await this.db.query(
        `INSERT INTO backups (
          id, backup_type, backup_name, backup_path, storage_type, storage_location,
          encryption_algorithm, compression_algorithm, status, created_at, expires_at,
          created_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          backupId,
          backupData.backupType,
          backupData.backupName,
          backupPath,
          backupData.storageType,
          backupData.storageLocation,
          backupData.encryptionAlgorithm || 'aes-256-gcm',
          backupData.compressionAlgorithm || 'gzip',
          BackupStatus.PENDING,
          now,
          expiresAt,
          createdBy,
          backupData.metadata ? JSON.stringify(backupData.metadata) : null
        ]
      );
      
      // Audit log
      await this.auditLog.logEvent({
        eventType: AuditEventType.BACKUP,
        eventAction: AuditEventAction.CREATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        occurredAt: now,
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: createdBy,
            agentRole: 'backup_administrator'
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityId: backupId,
            entityName: `Backup: ${backupData.backupName}`
          }
        ]
      });
      
      // Start the backup process asynchronously
      this.performBackup(backupId, backupData.backupType, backupPath, backupData.encryptionAlgorithm, backupData.compressionAlgorithm)
        .catch(error => {
          console.error('Error performing backup:', error);
        });
      
      return backupId;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  /**
   * Perform a database backup
   * @param backupId Backup ID
   * @param backupType Backup type
   * @param backupPath Path to save the backup
   * @param encryptionAlgorithm Encryption algorithm
   * @param compressionAlgorithm Compression algorithm
   */
  private async performBackup(
    backupId: string,
    backupType: BackupType,
    backupPath: string,
    encryptionAlgorithm?: string,
    compressionAlgorithm?: string
  ): Promise<void> {
    try {
      // Update backup status to in progress
      await this.db.query(
        `UPDATE backups SET status = $1, status_message = $2 WHERE id = $3`,
        [BackupStatus.IN_PROGRESS, 'Backup in progress', backupId]
      );
      
      // Get database connection info
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '5432';
      const dbName = process.env.DB_NAME || 'hms';
      const dbUser = process.env.DB_USER || 'postgres';
      const dbPassword = process.env.DB_PASSWORD || 'postgres';
      
      // Create a temporary directory for the backup
      const tempDir = path.join(this.backupDir, 'temp', backupId);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Perform the backup based on type
      let backupCommand: string;
      let backupFilePath: string;
      
      switch (backupType) {
        case BackupType.FULL:
          backupFilePath = path.join(tempDir, 'full_backup.sql');
          backupCommand = `PGPASSWORD=${dbPassword} pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -F c -b -v -f ${backupFilePath} ${dbName}`;
          break;
          
        case BackupType.SCHEMA:
          backupFilePath = path.join(tempDir, 'schema_backup.sql');
          backupCommand = `PGPASSWORD=${dbPassword} pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -s -F c -b -v -f ${backupFilePath} ${dbName}`;
          break;
          
        case BackupType.DATA:
          backupFilePath = path.join(tempDir, 'data_backup.sql');
          backupCommand = `PGPASSWORD=${dbPassword} pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -a -F c -b -v -f ${backupFilePath} ${dbName}`;
          break;
          
        default:
          throw new Error(`Unsupported backup type: ${backupType}`);
      }
      
      // Execute the backup command
      const { stdout, stderr } = await execPromise(backupCommand);
      
      if (stderr && !stderr.includes('pg_dump: dumping contents of table')) {
        throw new Error(`Backup error: ${stderr}`);
      }
      
      // Calculate checksum of the backup file
      const fileBuffer = fs.readFileSync(backupFilePath);
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // Compress the backup if needed
      if (compressionAlgorithm) {
        const compressedFilePath = `${backupFilePath}.gz`;
        await execPromise(`gzip -c ${backupFilePath} > ${compressedFilePath}`);
        fs.unlinkSync(backupFilePath);
        backupFilePath = compressedFilePath;
      }
      
      // Encrypt the backup if needed
      if (encryptionAlgorithm) {
        const encryptedFilePath = `${backupFilePath}.enc`;
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(encryptionAlgorithm || 'aes-256-gcm', Buffer.from(this.encryptionKey), iv);
        
        const input = fs.createReadStream(backupFilePath);
        const output = fs.createWriteStream(encryptedFilePath);
        
        // Write the IV at the beginning of the file
        output.write(iv);
        
        input.pipe(cipher).pipe(output);
        
        await new Promise((resolve, reject) => {
          output.on('finish', resolve);
          output.on('error', reject);
        });
        
        fs.unlinkSync(backupFilePath);
        backupFilePath = encryptedFilePath;
      }
      
      // Move the backup to the final location
      fs.copyFileSync(backupFilePath, backupPath);
      
      // Get the file size
      const stats = fs.statSync(backupPath);
      const fileSize = stats.size;
      
      // Clean up temporary files
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      // Update the backup record
      const now = new Date();
      await this.db.query(
        `UPDATE backups 
         SET status = $1, status_message = $2, completed_at = $3, 
         file_size = $4, checksum = $5
         WHERE id = $6`,
        [
          BackupStatus.COMPLETED,
          'Backup completed successfully',
          now,
          fileSize,
          checksum,
          backupId
        ]
      );
      
      // Audit log
      await this.auditLog.logEvent({
        eventType: AuditEventType.BACKUP,
        eventAction: AuditEventAction.EXECUTE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        occurredAt: now,
        agents: [
          {
            agentType: AuditAgentType.SYSTEM,
            agentId: 'backup_service',
            agentRole: 'system'
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityId: backupId,
            entityName: `Backup Execution`,
            entityDetail: {
              backupType,
              fileSize,
              checksum
            }
          }
        ]
      });
      
      // Clean up old backups
      await this.cleanupOldBackups();
    } catch (error) {
      console.error('Error performing backup:', error);
      
      // Update the backup record with the error
      await this.db.query(
        `UPDATE backups 
         SET status = $1, status_message = $2
         WHERE id = $3`,
        [
          BackupStatus.FAILED,
          `Backup failed: ${(error as Error).message}`,
          backupId
        ]
      );
      
      // Audit log
      await this.auditLog.logEvent({
        eventType: AuditEventType.BACKUP,
        eventAction: AuditEventAction.EXECUTE,
        eventOutcome: AuditEventOutcome.MAJOR_FAILURE,
        eventOutcomeDesc: (error as Error).message,
        occurredAt: new Date(),
        agents: [
          {
            agentType: AuditAgentType.SYSTEM,
            agentId: 'backup_service',
            agentRole: 'system'
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityId: backupId,
            entityName: `Backup Execution`
          }
        ]
      });
      
      throw error;
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const now = new Date();
      
      // Get expired backups
      const expiredBackupsResult = await this.db.query(
        `SELECT id, backup_path FROM backups 
         WHERE expires_at < $1 AND status = $2`,
        [now, BackupStatus.COMPLETED]
      );
      
      for (const backup of expiredBackupsResult.rows) {
        try {
          // Delete the backup file
          if (fs.existsSync(backup.backup_path)) {
            fs.unlinkSync(backup.backup_path);
          }
          
          // Update the backup record
          await this.db.query(
            `UPDATE backups 
             SET status = $1, status_message = $2
             WHERE id = $3`,
            [
              'expired',
              'Backup expired and deleted according to retention policy',
              backup.id
            ]
          );
          
          // Audit log
          await this.auditLog.logEvent({
            eventType: AuditEventType.DELETE,
            eventAction: AuditEventAction.DELETE,
            eventOutcome: AuditEventOutcome.SUCCESS,
            occurredAt: now,
            agents: [
              {
                agentType: AuditAgentType.SYSTEM,
                agentId: 'backup_service',
                agentRole: 'system'
              }
            ],
            entities: [
              {
                entityType: AuditEntityType.SYSTEM,
                entityId: backup.id,
                entityName: `Backup Deletion`,
                entityDetail: {
                  reason: 'retention_policy'
                }
              }
            ]
          });
        } catch (error) {
          console.error(`Error cleaning up backup ${backup.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  /**
   * Restore from a backup
   * @param backupId Backup ID
   * @param restoreData Restore configuration
   * @param createdBy ID of the user initiating the restore
   * @returns ID of the restore operation
   */
  public async restoreFromBackup(
    backupId: string,
    restoreData: {
      restoreType: string;
      restoreName: string;
      metadata?: Record<string, any>;
    },
    createdBy: string
  ): Promise<string> {
    try {
      // Get the backup
      const backupResult = await this.db.query(
        'SELECT * FROM backups WHERE id = $1',
        [backupId]
      );
      
      if (backupResult.rows.length === 0) {
        throw new Error(`Backup not found: ${backupId}`);
      }
      
      const backup = backupResult.rows[0];
      
      if (backup.status !== BackupStatus.COMPLETED && backup.status !== BackupStatus.VERIFIED) {
        throw new Error(`Cannot restore from backup with status: ${backup.status}`);
      }
      
      const restoreId = crypto.randomUUID();
      const now = new Date();
      
      // Create a restore path
      const restorePath = path.join(this.backupDir, 'restores', restoreId);
      if (!fs.existsSync(path.dirname(restorePath))) {
        fs.mkdirSync(path.dirname(restorePath), { recursive: true });
      }
      
      // Create the restore operation record
      await this.db.query(
        `INSERT INTO restore_operations (
          id, backup_id, restore_type, restore_name, restore_path,
          status, created_at, created_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          restoreId,
          backupId,
          restoreData.restoreType,
          restoreData.restoreName,
          restorePath,
          'pending',
          now,
          createdBy,
          restoreData.metadata ? JSON.stringify(restoreData.metadata) : null
        ]
      );
      
      // Audit log
      await this.auditLog.logEvent({
        eventType: AuditEventType.RESTORE,
        eventAction: AuditEventAction.CREATE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        occurredAt: now,
        agents: [
          {
            agentType: AuditAgentType.USER,
            agentId: createdBy,
            agentRole: 'backup_administrator'
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityId: restoreId,
            entityName: `Restore Operation: ${restoreData.restoreName}`,
            entityDetail: {
              backupId,
              backupName: backup.backup_name
            }
          }
        ]
      });
      
      // Start the restore process asynchronously
      this.performRestore(restoreId, backup)
        .catch(error => {
          console.error('Error performing restore:', error);
        });
      
      return restoreId;
    } catch (error) {
      console.error('Error initiating restore:', error);
      throw error;
    }
  }

  /**
   * Perform a database restore
   * @param restoreId Restore operation ID
   * @param backup Backup record
   */
  private async performRestore(restoreId: string, backup: any): Promise<void> {
    try {
      // Update restore status to in progress
      const startedAt = new Date();
      await this.db.query(
        `UPDATE restore_operations 
         SET status = $1, status_message = $2, started_at = $3
         WHERE id = $4`,
        ['in_progress', 'Restore in progress', startedAt, restoreId]
      );
      
      // Get database connection info
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '5432';
      const dbName = process.env.DB_NAME || 'hms';
      const dbUser = process.env.DB_USER || 'postgres';
      const dbPassword = process.env.DB_PASSWORD || 'postgres';
      
      // Create a temporary directory for the restore
      const tempDir = path.join(this.backupDir, 'temp', restoreId);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Copy the backup file to the temp directory
      const tempBackupPath = path.join(tempDir, path.basename(backup.backup_path));
      fs.copyFileSync(backup.backup_path, tempBackupPath);
      
      // Decrypt the backup if needed
      let backupFilePath = tempBackupPath;
      if (backup.encryption_algorithm) {
        const decryptedFilePath = tempBackupPath.replace(/\.enc$/, '');
        
        // Read the IV from the beginning of the file
        const fileBuffer = fs.readFileSync(tempBackupPath);
        const iv = fileBuffer.slice(0, 16);
        const encryptedData = fileBuffer.slice(16);
        
        const decipher = crypto.createDecipheriv(backup.encryption_algorithm, Buffer.from(this.encryptionKey), iv);
        const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
        
        fs.writeFileSync(decryptedFilePath, decrypted);
        backupFilePath = decryptedFilePath;
      }
      
      // Decompress the backup if needed
      if (backup.compression_algorithm) {
        const uncompressedFilePath = backupFilePath.replace(/\.gz$/, '');
        await execPromise(`gunzip -c ${backupFilePath} > ${uncompressedFilePath}`);
        backupFilePath = uncompressedFilePath;
      }
      
      // Perform the restore
      const restoreCommand = `PGPASSWORD=${dbPassword} pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c ${backupFilePath}`;
      const { stdout, stderr } = await execPromise(restoreCommand);
      
      if (stderr && !stderr.includes('creating') && !stderr.includes('restoring')) {
        throw new Error(`Restore error: ${stderr}`);
      }
      
      // Clean up temporary files
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      // Update the restore operation record
      const completedAt = new Date();
      await this.db.query(
        `UPDATE restore_operations 
         SET status = $1, status_message = $2, completed_at = $3
         WHERE id = $4`,
        [
          'completed',
          'Restore completed successfully',
          completedAt,
          restoreId
        ]
      );
      
      // Audit log
      await this.auditLog.logEvent({
        eventType: AuditEventType.RESTORE,
        eventAction: AuditEventAction.EXECUTE,
        eventOutcome: AuditEventOutcome.SUCCESS,
        occurredAt: completedAt,
        agents: [
          {
            agentType: AuditAgentType.SYSTEM,
            agentId: 'backup_service',
            agentRole: 'system'
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityId: restoreId,
            entityName: `Restore Execution`,
            entityDetail: {
              backupId: backup.id,
              backupName: backup.backup_name,
              duration: completedAt.getTime() - startedAt.getTime()
            }
          }
        ]
      });
    } catch (error) {
      console.error('Error performing restore:', error);
      
      // Update the restore operation record with the error
      await this.db.query(
        `UPDATE restore_operations 
         SET status = $1, status_message = $2
         WHERE id = $3`,
        [
          'failed',
          `Restore failed: ${(error as Error).message}`,
          restoreId
        ]
      );
      
      // Audit log
      await this.auditLog.logEvent({
        eventType: AuditEventType.RESTORE,
        eventAction: AuditEventAction.EXECUTE,
        eventOutcome: AuditEventOutcome.MAJOR_FAILURE,
        eventOutcomeDesc: (error as Error).message,
        occurredAt: new Date(),
        agents: [
          {
            agentType: AuditAgentType.SYSTEM,
            agentId: 'backup_service',
            agentRole: 'system'
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityId: restoreId,
            entityName: `Restore Execution`
          }
        ]
      });
      
      throw error;
    }
  }

  /**
   * Create a disaster recovery plan
   * @param planData Plan configuration
   * @param createdBy ID of the user creating the plan
   * @returns ID of the created plan
   */
  public async createDisasterRecoveryPlan(
    planData: {
      planName: string;
      planDescription?: string;
      recoveryTimeObjective?: string;
      recoveryPointObjective?: string;
      planDocument: string;
      isActive?: boolean;
      metadata?: Record<string, any>;
    },
    createdBy: string
  ): Promise<string> {
    try {
      const planId = crypto.randomUUID();
      const now = new Date();
      
      await this.db.query(
        `INSERT INTO disaster_recovery_plans (
          id, plan_name, plan_description, recovery_time_objective,
          recovery_point_objective, plan_document, is_active,
          created_at, updated_at, created_by, updated_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          planId,
          planData.planName,
          planData.planDescription || null,
          planData.recoveryTimeObjective || null,
          planData.recoveryPointObjective || null,
          planData.planDocument,
          planData.isActive !== undefined ? planData.isActive : true,
          now,
          now,
          createdBy,
          createdBy,
          planData.metadata ? JSON.stringify(planData.metadata) : null
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
            agentRole: 'backup_administrator'
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityId: planId,
            entityName: `Disaster Recovery Plan: ${planData.planName}`
          }
        ]
      });
      
      return planId;
    } catch (error) {
      console.error('Error creating disaster recovery plan:', error);
      throw error;
    }
  }

  /**
   * Record a disaster recovery plan test
   * @param planId Plan ID
   * @param testData Test data
   * @param testedBy ID of the user testing the plan
   * @returns True if the test was recorded
   */
  public async recordDisasterRecoveryTest(
    planId: string,
    testData: {
      testResults: string;
      testNotes?: string;
      metadata?: Record<string, any>;
    },
    testedBy: string
  ): Promise<boolean> {
    try {
      const now = new Date();
      
      // Update the plan with the test date
      const result = await this.db.query(
        `UPDATE disaster_recovery_plans 
         SET last_tested_at = $1, updated_at = $2, updated_by = $3,
         metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{tests}',
           COALESCE(metadata->'tests', '[]'::jsonb) || $4::jsonb
         )
         WHERE id = $5`,
        [
          now,
          now,
          testedBy,
          JSON.stringify([{
            testedAt: now,
            testedBy,
            testResults: testData.testResults,
            testNotes: testData.testNotes,
            metadata: testData.metadata
          }]),
          planId
        ]
      );
      
      if (result.rowCount === 0) {
        throw new Error(`Disaster recovery plan not found: ${planId}`);
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
            agentId: testedBy,
            agentRole: 'backup_administrator'
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityId: planId,
            entityName: `Disaster Recovery Plan Test`,
            entityDetail: {
              testResults: testData.testResults,
              testNotes: testData.testNotes
            }
          }
        ]
      });
      
      return true;
    } catch (error) {
      console.error('Error recording disaster recovery test:', error);
      throw error;
    }
  }

  /**
   * Verify a backup
   * @param backupId Backup ID
   * @returns Verification result
   */
  public async verifyBackup(backupId: string): Promise<{ valid: boolean; issues: string[] }> {
    try {
      // Get the backup
      const backupResult = await this.db.query(
        'SELECT * FROM backups WHERE id = $1',
        [backupId]
      );
      
      if (backupResult.rows.length === 0) {
        throw new Error(`Backup not found: ${backupId}`);
      }
      
      const backup = backupResult.rows[0];
      
      if (backup.status !== BackupStatus.COMPLETED) {
        throw new Error(`Cannot verify backup with status: ${backup.status}`);
      }
      
      // Update backup status to in progress
      await this.db.query(
        `UPDATE backups SET status = $1, status_message = $2 WHERE id = $3`,
        ['verifying', 'Backup verification in progress', backupId]
      );
      
      const issues: string[] = [];
      
      // Check if the backup file exists
      if (!fs.existsSync(backup.backup_path)) {
        issues.push(`Backup file not found: ${backup.backup_path}`);
      } else {
        // Check the file size
        const stats = fs.statSync(backup.backup_path);
        if (stats.size !== backup.file_size) {
          issues.push(`File size mismatch: expected ${backup.file_size}, got ${stats.size}`);
        }
        
        // Check the checksum
        const fileBuffer = fs.readFileSync(backup.backup_path);
        const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        if (checksum !== backup.checksum) {
          issues.push(`Checksum mismatch: expected ${backup.checksum}, got ${checksum}`);
        }
      }
      
      // Update the backup status
      const now = new Date();
      const valid = issues.length === 0;
      
      await this.db.query(
        `UPDATE backups 
         SET status = $1, status_message = $2
         WHERE id = $3`,
        [
          valid ? BackupStatus.VERIFIED : BackupStatus.FAILED,
          valid ? 'Backup verified successfully' : `Backup verification failed: ${issues.join(', ')}`,
          backupId
        ]
      );
      
      // Audit log
      await this.auditLog.logEvent({
        eventType: AuditEventType.BACKUP,
        eventAction: AuditEventAction.EXECUTE,
        eventOutcome: valid ? AuditEventOutcome.SUCCESS : AuditEventOutcome.MINOR_FAILURE,
        eventOutcomeDesc: valid ? 'Backup verified successfully' : `Backup verification failed: ${issues.join(', ')}`,
        occurredAt: now,
        agents: [
          {
            agentType: AuditAgentType.SYSTEM,
            agentId: 'backup_service',
            agentRole: 'system'
          }
        ],
        entities: [
          {
            entityType: AuditEntityType.SYSTEM,
            entityId: backupId,
            entityName: `Backup Verification`,
            entityDetail: {
              valid,
              issues
            }
          }
        ]
      });
      
      return { valid, issues };
    } catch (error) {
      console.error('Error verifying backup:', error);
      
      // Update the backup status with the error
      await this.db.query(
        `UPDATE backups 
         SET status = $1, status_message = $2
         WHERE id = $3`,
        [
          BackupStatus.FAILED,
          `Verification failed: ${(error as Error).message}`,
          backupId
        ]
      );
      
      throw error;
    }
  }

  /**
   * Get backup statistics
   * @returns Backup statistics
   */
  public async getBackupStatistics(): Promise<any> {
    try {
      // Get total backup count by status
      const statusCountQuery = `
        SELECT status, COUNT(*) as count
        FROM backups
        GROUP BY status
      `;
      
      const statusCountResult = await this.db.query(statusCountQuery);
      
      // Get total backup size
      const totalSizeQuery = `
        SELECT SUM(file_size) as total_size
        FROM backups
        WHERE status = $1
      `;
      
      const totalSizeResult = await this.db.query(totalSizeQuery, [BackupStatus.COMPLETED]);
      
      // Get backup count by type
      const typeCountQuery = `
        SELECT backup_type, COUNT(*) as count
        FROM backups
        GROUP BY backup_type
      `;
      
      const typeCountResult = await this.db.query(typeCountQuery);
      
      // Get recent backups
      const recentBackupsQuery = `
        SELECT id, backup_name, backup_type, status, created_at, completed_at, file_size
        FROM backups
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      const recentBackupsResult = await this.db.query(recentBackupsQuery);
      
      // Get recent restores
      const recentRestoresQuery = `
        SELECT id, restore_name, restore_type, status, created_at, completed_at
        FROM restore_operations
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      const recentRestoresResult = await this.db.query(recentRestoresQuery);
      
      // Compile the statistics
      return {
        totalBackups: statusCountResult.rows.reduce((sum: number, row: any) => sum + parseInt(row.count, 10), 0),
        backupsByStatus: statusCountResult.rows.reduce((obj: Record<string, number>, row: any) => {
          obj[row.status] = parseInt(row.count, 10);
          return obj;
        }, {}),
        totalSize: parseInt(totalSizeResult.rows[0]?.total_size || '0', 10),
        backupsByType: typeCountResult.rows.reduce((obj: Record<string, number>, row: any) => {
          obj[row.backup_type] = parseInt(row.count, 10);
          return obj;
        }, {}),
        recentBackups: recentBackupsResult.rows,
        recentRestores: recentRestoresResult.rows
      };
    } catch (error) {
      console.error('Error getting backup statistics:', error);
      throw error;
    }
  }
}
