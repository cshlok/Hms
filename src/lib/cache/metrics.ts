import { RedisCache } from './redis';

export class CacheMetrics {
  private static hits = 0;
  private static misses = 0;
  private static totalRequests = 0;
  
  /**
   * Record a cache hit
   */
  static recordHit(): void {
    this.hits++;
    this.totalRequests++;
  }
  
  /**
   * Record a cache miss
   */
  static recordMiss(): void {
    this.misses++;
    this.totalRequests++;
  }
  
  /**
   * Get cache hit rate
   */
  static getHitRate(): number {
    if (this.totalRequests === 0) {
      return 0;
    }
    return this.hits / this.totalRequests;
  }
  
  /**
   * Get cache metrics
   */
  static getMetrics(): {
    hits: number;
    misses: number;
    totalRequests: number;
    hitRate: number;
  } {
    return {
      hits: this.hits,
      misses: this.misses,
      totalRequests: this.totalRequests,
      hitRate: this.getHitRate(),
    };
  }
  
  /**
   * Reset metrics
   */
  static reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.totalRequests = 0;
  }
}

// Enhance RedisCache to track metrics
const originalGet = RedisCache.get;
RedisCache.get = async function<T>(key: string): Promise<T | null> {
  const result = await originalGet<T>(key);
  if (result) {
    CacheMetrics.recordHit();
  } else {
    CacheMetrics.recordMiss();
  }
  return result;
};
