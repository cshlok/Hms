import { RedisCache } from './redis';
import { config } from '@/config';

export class CacheInvalidation {
  /**
   * Invalidate test-related caches
   */
  static async invalidateTest(testId: number): Promise<void> {
    // Invalidate specific test
    await RedisCache.delete(`${config.cache.prefix.test}${testId}`);
    
    // Invalidate test lists
    await RedisCache.deletePattern(`${config.cache.prefix.test}list:*`);
    
    // Invalidate related entities
    await this.invalidateRelatedTestPanels(testId);
  }
  
  /**
   * Invalidate specimen-related caches
   */
  static async invalidateSpecimen(specimenId: number): Promise<void> {
    // Invalidate specific specimen
    await RedisCache.delete(`${config.cache.prefix.specimen}${specimenId}`);
    
    // Invalidate specimen lists
    await RedisCache.deletePattern(`${config.cache.prefix.specimen}list:*`);
    
    // Invalidate related entities
    await this.invalidateRelatedResults(specimenId);
  }
  
  /**
   * Invalidate result-related caches
   */
  static async invalidateResult(resultId: number): Promise<void> {
    // Invalidate specific result
    await RedisCache.delete(`${config.cache.prefix.result}${resultId}`);
    
    // Invalidate result lists
    await RedisCache.deletePattern(`${config.cache.prefix.result}list:*`);
    
    // Invalidate related entities
    await this.invalidateRelatedReports(resultId);
  }
  
  /**
   * Invalidate radiology order-related caches
   */
  static async invalidateRadiologyOrder(orderId: number): Promise<void> {
    // Invalidate specific order
    await RedisCache.delete(`${config.cache.prefix.radiologyOrder}${orderId}`);
    
    // Invalidate order lists
    await RedisCache.deletePattern(`${config.cache.prefix.radiologyOrder}list:*`);
    
    // Invalidate related entities
    await this.invalidateRelatedReports(orderId);
  }
  
  /**
   * Invalidate report-related caches
   */
  static async invalidateReport(reportId: number): Promise<void> {
    // Invalidate specific report
    await RedisCache.delete(`${config.cache.prefix.report}${reportId}`);
    
    // Invalidate report lists
    await RedisCache.deletePattern(`${config.cache.prefix.report}list:*`);
  }
  
  /**
   * Invalidate related test panels when a test changes
   */
  private static async invalidateRelatedTestPanels(testId: number): Promise<void> {
    // Get related test panel IDs
    // This is a simplified example - in a real implementation, you would query the database
    const relatedPanelIds = await getRelatedTestPanelIds(testId);
    
    // Invalidate each related panel
    for (const panelId of relatedPanelIds) {
      await RedisCache.delete(`diagnostic:lab:panel:${panelId}`);
    }
    
    // Invalidate panel lists
    await RedisCache.deletePattern('diagnostic:lab:panel:list:*');
  }
  
  /**
   * Invalidate related results when a specimen changes
   */
  private static async invalidateRelatedResults(specimenId: number): Promise<void> {
    // Get related result IDs
    // This is a simplified example - in a real implementation, you would query the database
    const relatedResultIds = await getRelatedResultIds(specimenId);
    
    // Invalidate each related result
    for (const resultId of relatedResultIds) {
      await this.invalidateResult(resultId);
    }
  }
  
  /**
   * Invalidate related reports when a result or order changes
   */
  private static async invalidateRelatedReports(entityId: number): Promise<void> {
    // Get related report IDs
    // This is a simplified example - in a real implementation, you would query the database
    const relatedReportIds = await getRelatedReportIds(entityId);
    
    // Invalidate each related report
    for (const reportId of relatedReportIds) {
      await this.invalidateReport(reportId);
    }
  }
}

// Helper functions to get related entity IDs
// These would be replaced with actual database queries in a real implementation
async function getRelatedTestPanelIds(testId: number): Promise<number[]> {
  // Example implementation
  return []; // Placeholder
}

async function getRelatedResultIds(specimenId: number): Promise<number[]> {
  // Example implementation
  return []; // Placeholder
}

async function getRelatedReportIds(entityId: number): Promise<number[]> {
  // Example implementation
  return []; // Placeholder
}
