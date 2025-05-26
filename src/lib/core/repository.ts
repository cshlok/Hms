/**
 * Core repository pattern implementation for the Financial Management system
 * Provides standardized data access abstraction
 */

import { NotFoundError, DatabaseError } from './errors';

// Query options interface for filtering, sorting, and pagination
export interface QueryOptions {
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    page?: number;
    pageSize?: number;
    cursor?: string;
  };
  includes?: string[];
}

// Base repository interface
export interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: ID, data: Partial<T>): Promise<T>;
  delete(id: ID): Promise<boolean>;
  count(options?: QueryOptions): Promise<number>;
}

// Prisma repository implementation
export abstract class PrismaRepository<T, ID> implements Repository<T, ID> {
  protected abstract model: any;

  async findById(id: ID): Promise<T | null> {
    try {
      return await this.model.findUnique({
        where: { id },
      });
    } catch (error) {
      throw new DatabaseError(
        `Error finding entity by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_FIND_ERROR',
        { id }
      );
    }
  }

  async findAll(options?: QueryOptions): Promise<T[]> {
    try {
      const query: Record<string, any> = {};

      // Apply filters
      if (options?.filters) {
        query.where = options.filters;
      }

      // Apply sorting
      if (options?.sort) {
        query.orderBy = {
          [options.sort.field]: options.sort.direction,
        };
      }

      // Apply pagination
      if (options?.pagination) {
        if (options.pagination.cursor) {
          query.cursor = { id: options.pagination.cursor };
          query.skip = 1; // Skip the cursor item
        } else if (options.pagination.page && options.pagination.pageSize) {
          query.skip = (options.pagination.page - 1) * options.pagination.pageSize;
        }

        if (options.pagination.pageSize) {
          query.take = options.pagination.pageSize;
        }
      }

      // Apply includes
      if (options?.includes && options.includes.length > 0) {
        query.include = this.processIncludes(options.includes);
      }

      return await this.model.findMany(query);
    } catch (error) {
      throw new DatabaseError(
        `Error finding entities: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_FIND_ERROR',
        { options }
      );
    }
  }

  async create(data: Partial<T>): Promise<T> {
    try {
      return await this.model.create({
        data,
      });
    } catch (error) {
      throw new DatabaseError(
        `Error creating entity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_CREATE_ERROR',
        { data }
      );
    }
  }

  async update(id: ID, data: Partial<T>): Promise<T> {
    try {
      return await this.model.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new DatabaseError(
        `Error updating entity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_UPDATE_ERROR',
        { id, data }
      );
    }
  }

  async delete(id: ID): Promise<boolean> {
    try {
      await this.model.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      throw new DatabaseError(
        `Error deleting entity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_DELETE_ERROR',
        { id }
      );
    }
  }

  async count(options?: QueryOptions): Promise<number> {
    try {
      const query: Record<string, any> = {};

      // Apply filters
      if (options?.filters) {
        query.where = options.filters;
      }

      return await this.model.count(query);
    } catch (error) {
      throw new DatabaseError(
        `Error counting entities: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_COUNT_ERROR',
        { options }
      );
    }
  }

  // Helper method to process nested includes
  private processIncludes(includes: string[]): Record<string, any> {
    const result: Record<string, any> = {};

    for (const include of includes) {
      if (include.includes('.')) {
        // Handle nested includes (e.g., "items.product")
        const [parent, child] = include.split('.', 2);
        
        if (!result[parent]) {
          result[parent] = { include: {} };
        } else if (!result[parent].include) {
          result[parent].include = {};
        }
        
        result[parent].include[child] = true;
      } else {
        // Handle simple includes
        result[include] = true;
      }
    }

    return result;
  }
}

// Cached repository decorator
export class CachedRepository<T, ID> implements Repository<T, ID> {
  private cachePrefix: string;
  private cacheTTL: number;

  constructor(
    private repository: Repository<T, ID>,
    cachePrefix: string,
    cacheTTL = 3600 // Default TTL: 1 hour
  ) {
    this.cachePrefix = cachePrefix;
    this.cacheTTL = cacheTTL;
  }

  async findById(id: ID): Promise<T | null> {
    const cacheKey = `${this.cachePrefix}:${String(id)}`;
    
    // TODO: Implement actual caching logic when cache service is available
    // For now, just pass through to the repository
    return this.repository.findById(id);
  }

  async findAll(options?: QueryOptions): Promise<T[]> {
    // TODO: Implement caching for findAll with options hash
    return this.repository.findAll(options);
  }

  async create(data: Partial<T>): Promise<T> {
    const result = await this.repository.create(data);
    // TODO: Invalidate relevant cache entries
    return result;
  }

  async update(id: ID, data: Partial<T>): Promise<T> {
    const result = await this.repository.update(id, data);
    // TODO: Invalidate relevant cache entries
    return result;
  }

  async delete(id: ID): Promise<boolean> {
    const result = await this.repository.delete(id);
    // TODO: Invalidate relevant cache entries
    return result;
  }

  async count(options?: QueryOptions): Promise<number> {
    // TODO: Implement caching for count with options hash
    return this.repository.count(options);
  }
}

// Transaction service interface
export interface TransactionService {
  executeInTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T>;
}

// Prisma transaction service implementation
export class PrismaTransactionService implements TransactionService {
  constructor(private prisma: any) {}

  async executeInTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(callback);
    } catch (error) {
      throw new DatabaseError(
        `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRANSACTION_ERROR'
      );
    }
  }
}
