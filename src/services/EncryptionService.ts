import crypto from 'crypto';
import { DatabaseService } from '../lib/DatabaseService';

/**
 * Encryption service for the HMS System Infrastructure & Security module
 * Provides field-level encryption for sensitive patient data
 */
export class EncryptionService {
  private static instance: EncryptionService;
  private db: DatabaseService;
  private algorithm: string = 'aes-256-gcm';
  private masterKeyId: string | null = null;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Get singleton instance of EncryptionService
   * @returns EncryptionService instance
   */
  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Initialize the encryption service
   * Creates encryption_keys table if it doesn't exist and ensures a master key is available
   */
  public async initialize(): Promise<void> {
    try {
      // Create encryption_keys table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS encryption_keys (
          id UUID PRIMARY KEY,
          key_type VARCHAR(50) NOT NULL,
          key_identifier VARCHAR(100) UNIQUE NOT NULL,
          encrypted_key BYTEA NOT NULL,
          iv BYTEA NOT NULL,
          tag BYTEA NOT NULL,
          parent_key_id UUID REFERENCES encryption_keys(id),
          created_at TIMESTAMP NOT NULL,
          expires_at TIMESTAMP,
          revoked BOOLEAN DEFAULT FALSE,
          revoked_at TIMESTAMP,
          metadata JSONB
        );
      `);

      // Create data_encryption_contexts table if it doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS data_encryption_contexts (
          id UUID PRIMARY KEY,
          entity_type VARCHAR(100) NOT NULL,
          entity_id UUID NOT NULL,
          field_name VARCHAR(100) NOT NULL,
          key_id UUID REFERENCES encryption_keys(id),
          iv BYTEA NOT NULL,
          tag BYTEA NOT NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          UNIQUE(entity_type, entity_id, field_name)
        );
      `);

      // Check if master key exists
      const masterKeyResult = await this.db.query(
        'SELECT id FROM encryption_keys WHERE key_type = $1 LIMIT 1',
        ['master']
      );

      if (masterKeyResult.rows.length === 0) {
        // Generate and store master key
        await this.generateMasterKey();
      } else {
        this.masterKeyId = masterKeyResult.rows[0].id;
      }
    } catch (error) {
      console.error('Error initializing encryption service:', error);
      throw error;
    }
  }

  /**
   * Generate a new master encryption key
   * @returns ID of the generated master key
   */
  private async generateMasterKey(): Promise<string> {
    try {
      // Generate a secure random key
      const key = crypto.randomBytes(32); // 256 bits
      const keyId = crypto.randomUUID();
      const keyIdentifier = `master-${Date.now()}`;

      // For master keys, we use a hardware security module or secure enclave in production
      // For this implementation, we'll encrypt with a password-derived key
      const password = process.env.MASTER_KEY_PASSWORD || 'default-master-password';
      const salt = crypto.randomBytes(16);
      const derivedKey = crypto.scryptSync(password, salt, 32);
      
      // Encrypt the master key
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv);
      const encryptedKey = Buffer.concat([cipher.update(key), cipher.final()]);
      const tag = cipher.getAuthTag();

      // Store the encrypted master key
      await this.db.query(
        `INSERT INTO encryption_keys (
          id, key_type, key_identifier, encrypted_key, iv, tag, 
          created_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          keyId,
          'master',
          keyIdentifier,
          encryptedKey,
          iv,
          tag,
          new Date(),
          JSON.stringify({ salt: salt.toString('hex') })
        ]
      );

      this.masterKeyId = keyId;
      return keyId;
    } catch (error) {
      console.error('Error generating master key:', error);
      throw error;
    }
  }

  /**
   * Generate a data encryption key (DEK) for a specific entity
   * @param entityType Type of entity (e.g., 'patient', 'prescription')
   * @param entityId ID of the entity
   * @returns ID of the generated data encryption key
   */
  public async generateDataKey(entityType: string, entityId: string): Promise<string> {
    try {
      if (!this.masterKeyId) {
        await this.initialize();
      }

      // Get the master key
      const masterKeyResult = await this.db.query(
        'SELECT encrypted_key, iv, tag, metadata FROM encryption_keys WHERE id = $1',
        [this.masterKeyId]
      );

      if (masterKeyResult.rows.length === 0) {
        throw new Error('Master key not found');
      }

      const masterKeyRow = masterKeyResult.rows[0];
      const metadata = JSON.parse(masterKeyRow.metadata);
      
      // Decrypt the master key
      const password = process.env.MASTER_KEY_PASSWORD || 'default-master-password';
      const salt = Buffer.from(metadata.salt, 'hex');
      const derivedKey = crypto.scryptSync(password, salt, 32);
      
      const decipher = crypto.createDecipheriv(
        this.algorithm, 
        derivedKey, 
        masterKeyRow.iv
      );
      
      decipher.setAuthTag(masterKeyRow.tag);
      const masterKey = Buffer.concat([
        decipher.update(masterKeyRow.encrypted_key),
        decipher.final()
      ]);

      // Generate a new data encryption key
      const dataKey = crypto.randomBytes(32);
      const dataKeyId = crypto.randomUUID();
      const keyIdentifier = `${entityType}-${entityId}-${Date.now()}`;
      
      // Encrypt the data key with the master key
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, masterKey, iv);
      const encryptedKey = Buffer.concat([cipher.update(dataKey), cipher.final()]);
      const tag = cipher.getAuthTag();

      // Store the encrypted data key
      await this.db.query(
        `INSERT INTO encryption_keys (
          id, key_type, key_identifier, encrypted_key, iv, tag, 
          parent_key_id, created_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          dataKeyId,
          'data',
          keyIdentifier,
          encryptedKey,
          iv,
          tag,
          this.masterKeyId,
          new Date(),
          JSON.stringify({ entityType, entityId })
        ]
      );

      return dataKeyId;
    } catch (error) {
      console.error('Error generating data key:', error);
      throw error;
    }
  }

  /**
   * Encrypt data for a specific entity and field
   * @param entityType Type of entity (e.g., 'patient', 'prescription')
   * @param entityId ID of the entity
   * @param fieldName Name of the field being encrypted
   * @param data Data to encrypt
   * @returns Encrypted data as a hex string
   */
  public async encryptField(
    entityType: string,
    entityId: string,
    fieldName: string,
    data: string
  ): Promise<string> {
    try {
      // Check if encryption context already exists for this field
      const contextResult = await this.db.query(
        `SELECT key_id, iv, tag FROM data_encryption_contexts 
         WHERE entity_type = $1 AND entity_id = $2 AND field_name = $3`,
        [entityType, entityId, fieldName]
      );

      let keyId: string;
      let existingContext = false;

      if (contextResult.rows.length === 0) {
        // Generate a new data key for this entity if none exists
        const dataKeysResult = await this.db.query(
          `SELECT id FROM encryption_keys 
           WHERE key_type = 'data' AND metadata->>'entityType' = $1 
           AND metadata->>'entityId' = $2 AND revoked = FALSE
           LIMIT 1`,
          [entityType, entityId]
        );

        if (dataKeysResult.rows.length === 0) {
          keyId = await this.generateDataKey(entityType, entityId);
        } else {
          keyId = dataKeysResult.rows[0].id;
        }
      } else {
        keyId = contextResult.rows[0].key_id;
        existingContext = true;
      }

      // Get the data key
      const keyResult = await this.db.query(
        'SELECT encrypted_key, iv, tag, parent_key_id FROM encryption_keys WHERE id = $1',
        [keyId]
      );

      if (keyResult.rows.length === 0) {
        throw new Error('Data key not found');
      }

      const keyRow = keyResult.rows[0];
      
      // Get the master key
      const masterKeyResult = await this.db.query(
        'SELECT encrypted_key, iv, tag, metadata FROM encryption_keys WHERE id = $1',
        [keyRow.parent_key_id]
      );

      if (masterKeyResult.rows.length === 0) {
        throw new Error('Master key not found');
      }

      const masterKeyRow = masterKeyResult.rows[0];
      const metadata = JSON.parse(masterKeyRow.metadata);
      
      // Decrypt the master key
      const password = process.env.MASTER_KEY_PASSWORD || 'default-master-password';
      const salt = Buffer.from(metadata.salt, 'hex');
      const derivedKey = crypto.scryptSync(password, salt, 32);
      
      const masterDecipher = crypto.createDecipheriv(
        this.algorithm, 
        derivedKey, 
        masterKeyRow.iv
      );
      
      masterDecipher.setAuthTag(masterKeyRow.tag);
      const masterKey = Buffer.concat([
        masterDecipher.update(masterKeyRow.encrypted_key),
        masterDecipher.final()
      ]);

      // Decrypt the data key
      const dataDecipher = crypto.createDecipheriv(
        this.algorithm, 
        masterKey, 
        keyRow.iv
      );
      
      dataDecipher.setAuthTag(keyRow.tag);
      const dataKey = Buffer.concat([
        dataDecipher.update(keyRow.encrypted_key),
        dataDecipher.final()
      ]);

      // Encrypt the data
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, dataKey, iv);
      const encryptedData = Buffer.concat([
        cipher.update(Buffer.from(data, 'utf-8')),
        cipher.final()
      ]);
      const tag = cipher.getAuthTag();

      // Store or update the encryption context
      if (existingContext) {
        await this.db.query(
          `UPDATE data_encryption_contexts 
           SET iv = $1, tag = $2, updated_at = $3
           WHERE entity_type = $4 AND entity_id = $5 AND field_name = $6`,
          [iv, tag, new Date(), entityType, entityId, fieldName]
        );
      } else {
        await this.db.query(
          `INSERT INTO data_encryption_contexts (
            id, entity_type, entity_id, field_name, key_id, iv, tag, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            crypto.randomUUID(),
            entityType,
            entityId,
            fieldName,
            keyId,
            iv,
            tag,
            new Date(),
            new Date()
          ]
        );
      }

      // Return the encrypted data as a hex string
      return encryptedData.toString('hex');
    } catch (error) {
      console.error('Error encrypting field:', error);
      throw error;
    }
  }

  /**
   * Decrypt data for a specific entity and field
   * @param entityType Type of entity (e.g., 'patient', 'prescription')
   * @param entityId ID of the entity
   * @param fieldName Name of the field being decrypted
   * @param encryptedData Encrypted data as a hex string
   * @returns Decrypted data as a string
   */
  public async decryptField(
    entityType: string,
    entityId: string,
    fieldName: string,
    encryptedData: string
  ): Promise<string> {
    try {
      // Get the encryption context
      const contextResult = await this.db.query(
        `SELECT key_id, iv, tag FROM data_encryption_contexts 
         WHERE entity_type = $1 AND entity_id = $2 AND field_name = $3`,
        [entityType, entityId, fieldName]
      );

      if (contextResult.rows.length === 0) {
        throw new Error('Encryption context not found');
      }

      const contextRow = contextResult.rows[0];
      
      // Get the data key
      const keyResult = await this.db.query(
        'SELECT encrypted_key, iv, tag, parent_key_id FROM encryption_keys WHERE id = $1',
        [contextRow.key_id]
      );

      if (keyResult.rows.length === 0) {
        throw new Error('Data key not found');
      }

      const keyRow = keyResult.rows[0];
      
      // Get the master key
      const masterKeyResult = await this.db.query(
        'SELECT encrypted_key, iv, tag, metadata FROM encryption_keys WHERE id = $1',
        [keyRow.parent_key_id]
      );

      if (masterKeyResult.rows.length === 0) {
        throw new Error('Master key not found');
      }

      const masterKeyRow = masterKeyResult.rows[0];
      const metadata = JSON.parse(masterKeyRow.metadata);
      
      // Decrypt the master key
      const password = process.env.MASTER_KEY_PASSWORD || 'default-master-password';
      const salt = Buffer.from(metadata.salt, 'hex');
      const derivedKey = crypto.scryptSync(password, salt, 32);
      
      const masterDecipher = crypto.createDecipheriv(
        this.algorithm, 
        derivedKey, 
        masterKeyRow.iv
      );
      
      masterDecipher.setAuthTag(masterKeyRow.tag);
      const masterKey = Buffer.concat([
        masterDecipher.update(masterKeyRow.encrypted_key),
        masterDecipher.final()
      ]);

      // Decrypt the data key
      const dataDecipher = crypto.createDecipheriv(
        this.algorithm, 
        masterKey, 
        keyRow.iv
      );
      
      dataDecipher.setAuthTag(keyRow.tag);
      const dataKey = Buffer.concat([
        dataDecipher.update(keyRow.encrypted_key),
        dataDecipher.final()
      ]);

      // Decrypt the data
      const decipher = crypto.createDecipheriv(
        this.algorithm, 
        dataKey, 
        contextRow.iv
      );
      
      decipher.setAuthTag(contextRow.tag);
      const decryptedData = Buffer.concat([
        decipher.update(Buffer.from(encryptedData, 'hex')),
        decipher.final()
      ]);

      return decryptedData.toString('utf-8');
    } catch (error) {
      console.error('Error decrypting field:', error);
      throw error;
    }
  }

  /**
   * Rotate a data encryption key
   * @param keyId ID of the key to rotate
   * @returns ID of the new key
   */
  public async rotateDataKey(keyId: string): Promise<string> {
    try {
      // Get the key to rotate
      const keyResult = await this.db.query(
        `SELECT key_type, key_identifier, metadata FROM encryption_keys WHERE id = $1`,
        [keyId]
      );

      if (keyResult.rows.length === 0) {
        throw new Error('Key not found');
      }

      const keyRow = keyResult.rows[0];
      
      if (keyRow.key_type !== 'data') {
        throw new Error('Only data keys can be rotated');
      }

      const metadata = JSON.parse(keyRow.metadata);
      const entityType = metadata.entityType;
      const entityId = metadata.entityId;

      // Generate a new data key
      const newKeyId = await this.generateDataKey(entityType, entityId);

      // Update all encryption contexts to use the new key
      await this.db.query(
        `UPDATE data_encryption_contexts SET key_id = $1 
         WHERE key_id = $2`,
        [newKeyId, keyId]
      );

      // Mark the old key as revoked
      await this.db.query(
        `UPDATE encryption_keys SET revoked = TRUE, revoked_at = $1 
         WHERE id = $2`,
        [new Date(), keyId]
      );

      return newKeyId;
    } catch (error) {
      console.error('Error rotating data key:', error);
      throw error;
    }
  }

  /**
   * Rotate the master encryption key
   * @returns ID of the new master key
   */
  public async rotateMasterKey(): Promise<string> {
    try {
      if (!this.masterKeyId) {
        await this.initialize();
      }

      // Generate a new master key
      const newMasterKeyId = await this.generateMasterKey();
      const oldMasterKeyId = this.masterKeyId;
      this.masterKeyId = newMasterKeyId;

      // Get all data keys that use the old master key
      const dataKeysResult = await this.db.query(
        `SELECT id, encrypted_key, iv, tag, metadata FROM encryption_keys 
         WHERE key_type = 'data' AND parent_key_id = $1 AND revoked = FALSE`,
        [oldMasterKeyId]
      );

      // Re-encrypt all data keys with the new master key
      for (const dataKeyRow of dataKeysResult.rows) {
        // First decrypt the data key with the old master key
        // Then re-encrypt it with the new master key
        // This is a complex operation that would require decrypting and re-encrypting
        // all data keys, which is beyond the scope of this example
        
        // In a real implementation, we would:
        // 1. Decrypt the data key using the old master key
        // 2. Re-encrypt the data key using the new master key
        // 3. Update the data key record with the new encrypted key and parent key ID
      }

      // Mark the old master key as revoked
      await this.db.query(
        `UPDATE encryption_keys SET revoked = TRUE, revoked_at = $1 
         WHERE id = $2`,
        [new Date(), oldMasterKeyId]
      );

      return newMasterKeyId;
    } catch (error) {
      console.error('Error rotating master key:', error);
      throw error;
    }
  }
}
