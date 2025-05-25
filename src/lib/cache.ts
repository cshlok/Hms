/**
 * Cache service for the HMS application
 * Provides a unified interface for caching with Redis or in-memory fallback
 */

import { createClient } from 'redis';

// Configuration for Redis connection
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

// In-memory cache fallback
const memoryCache: Record<string, { value: string; expiry: number }> = {};

class CacheService {
  private redisClient: any;
  private connected: boolean = false;

  constructor() {
    if (REDIS_ENABLED) {
      this.initRedisClient();
    }
  }

  /**
   * Initialize Redis client
   */
  private async initRedisClient() {
    try {
      this.redisClient = createClient({ url: REDIS_URL });
      
      this.redisClient.on('error', (err: any) => {
        console.error('Redis connection error:', err);
        this.connected = false;
      });
      
      this.redisClient.on('connect', () => {
        console.log('Redis connected successfully');
        this.connected = true;
      });
      
      await this.redisClient.connect();
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      this.connected = false;
    }
  }

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  async get(key: string): Promise<string | null> {
    try {
      // Try Redis if connected
      if (REDIS_ENABLED && this.connected) {
        return await this.redisClient.get(key);
      }
      
      // Fallback to memory cache
      const item = memoryCache[key];
      if (item && item.expiry > Date.now()) {
        return item.value;
      }
      
      // Remove expired item if exists
      if (item) {
        delete memoryCache[key];
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds
   */
  async set(key: string, value: string, ttl: number = 3600): Promise<void> {
    try {
      // Try Redis if connected
      if (REDIS_ENABLED && this.connected) {
        await this.redisClient.set(key, value, { EX: ttl });
        return;
      }
      
      // Fallback to memory cache
      memoryCache[key] = {
        value,
        expiry: Date.now() + (ttl * 1000)
      };
    } catch (error) {
      console.error(`Error setting cache key ${key}:`, error);
    }
  }

  /**
   * Delete a value from cache
   * @param key Cache key
   */
  async del(key: string): Promise<void> {
    try {
      // Try Redis if connected
      if (REDIS_ENABLED && this.connected) {
        await this.redisClient.del(key);
        return;
      }
      
      // Fallback to memory cache
      delete memoryCache[key];
    } catch (error) {
      console.error(`Error deleting cache key ${key}:`, error);
    }
  }

  /**
   * Delete multiple values from cache using pattern matching
   * @param pattern Pattern to match keys (e.g., "user:*")
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      // Try Redis if connected
      if (REDIS_ENABLED && this.connected) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
        return;
      }
      
      // Fallback to memory cache - simple pattern matching
      const regex = new RegExp(pattern.replace('*', '.*'));
      Object.keys(memoryCache).forEach(key => {
        if (regex.test(key)) {
          delete memoryCache[key];
        }
      });
    } catch (error) {
      console.error(`Error deleting cache pattern ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      // Try Redis if connected
      if (REDIS_ENABLED && this.connected) {
        await this.redisClient.flushDb();
        return;
      }
      
      // Fallback to memory cache
      Object.keys(memoryCache).forEach(key => {
        delete memoryCache[key];
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

// Export singleton instance
export const cache = new CacheService();
