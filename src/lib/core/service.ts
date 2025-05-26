/**
 * Core service layer implementation for the Financial Management system
 * Provides standardized business logic and validation
 */

import { Repository, QueryOptions } from './repository';
import { NotFoundError, ValidationError, AuthorizationError } from './errors';

// Base service interface
export interface Service<T, ID, CreateDTO, UpdateDTO> {
  findById(id: ID): Promise<T>;
  findAll(options?: QueryOptions): Promise<T[]>;
  create(data: CreateDTO): Promise<T>;
  update(id: ID, data: UpdateDTO): Promise<T>;
  delete(id: ID): Promise<boolean>;
}

// Base service implementation
export abstract class BaseService<T, ID, CreateDTO, UpdateDTO> implements Service<T, ID, CreateDTO, UpdateDTO> {
  constructor(protected repository: Repository<T, ID>) {}

  async findById(id: ID): Promise<T> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundError(`Entity with id ${id} not found`);
    }
    return entity;
  }

  async findAll(options?: QueryOptions): Promise<T[]> {
    return this.repository.findAll(options);
  }

  async create(data: CreateDTO): Promise<T> {
    await this.validateCreate(data);
    return this.repository.create(data as unknown as Partial<T>);
  }

  async update(id: ID, data: UpdateDTO): Promise<T> {
    // Ensure entity exists
    await this.findById(id);
    
    // Validate update data
    await this.validateUpdate(id, data);
    
    // Perform update
    return this.repository.update(id, data as unknown as Partial<T>);
  }

  async delete(id: ID): Promise<boolean> {
    // Ensure entity exists
    await this.findById(id);
    
    // Validate deletion
    await this.validateDelete(id);
    
    // Perform deletion
    return this.repository.delete(id);
  }

  // Validation methods to be overridden by subclasses
  protected async validateCreate(data: CreateDTO): Promise<void> {
    // Default implementation does nothing
    // Subclasses should override this method to implement specific validation logic
  }

  protected async validateUpdate(id: ID, data: UpdateDTO): Promise<void> {
    // Default implementation does nothing
    // Subclasses should override this method to implement specific validation logic
  }

  protected async validateDelete(id: ID): Promise<void> {
    // Default implementation does nothing
    // Subclasses should override this method to implement specific validation logic
  }
}

// Audit service interface
export interface AuditService {
  logAuditEvent(event: AuditEvent): Promise<void>;
}

// Audit event interface
export interface AuditEvent {
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  details?: Record<string, any>;
}

// Permission service for authorization
export class PermissionService {
  // This is a simplified implementation
  // In a real application, this would connect to a database or authorization service
  
  // Sample permission map for demonstration
  private permissions: Record<string, Record<string, string[]>> = {
    'user1': {
      'billing': ['read', 'create', 'update'],
      'invoice': ['read', 'create', 'update', 'delete'],
      'payment': ['read', 'create'],
    },
    'user2': {
      'billing': ['read'],
      'invoice': ['read'],
      'payment': ['read'],
    },
    'user3': {
      'billing': ['read', 'create', 'update', 'delete', 'approve'],
      'invoice': ['read', 'create', 'update', 'delete', 'approve'],
      'payment': ['read', 'create', 'update', 'delete', 'refund'],
    },
  };
  
  async hasPermission(userId: string, action: string, resource: string): Promise<boolean> {
    // Check if user exists in permissions map
    if (!this.permissions[userId]) {
      return false;
    }
    
    // Check if resource exists for user
    if (!this.permissions[userId][resource]) {
      return false;
    }
    
    // Check if action is allowed for resource
    return this.permissions[userId][resource].includes(action);
  }
}

// Service with permission checking
export abstract class AuthorizedService<T, ID, CreateDTO, UpdateDTO> extends BaseService<T, ID, CreateDTO, UpdateDTO> {
  constructor(
    repository: Repository<T, ID>,
    private permissionService: PermissionService,
    private resourceType: string
  ) {
    super(repository);
  }
  
  async findById(id: ID, userId: string): Promise<T> {
    await this.checkPermission(userId, 'read');
    return super.findById(id);
  }
  
  async findAll(options?: QueryOptions, userId?: string): Promise<T[]> {
    if (userId) {
      await this.checkPermission(userId, 'read');
    }
    return super.findAll(options);
  }
  
  async create(data: CreateDTO, userId: string): Promise<T> {
    await this.checkPermission(userId, 'create');
    return super.create(data);
  }
  
  async update(id: ID, data: UpdateDTO, userId: string): Promise<T> {
    await this.checkPermission(userId, 'update');
    return super.update(id, data);
  }
  
  async delete(id: ID, userId: string): Promise<boolean> {
    await this.checkPermission(userId, 'delete');
    return super.delete(id);
  }
  
  private async checkPermission(userId: string, action: string): Promise<void> {
    const hasPermission = await this.permissionService.hasPermission(userId, action, this.resourceType);
    if (!hasPermission) {
      throw new AuthorizationError(`User does not have permission to ${action} ${this.resourceType}`);
    }
  }
}
