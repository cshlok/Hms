import { CampaignAnalytics } from '@/lib/models/marketing';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { ValidationError, DatabaseError, NotFoundError } from '@/lib/errors';

/**
 * Service for managing marketing analytics
 */
export class AnalyticsService {
  private auditLogger = new AuditLogger('marketing-analytics');

  /**
   * Record campaign analytics data
   */
  async recordAnalytics(campaignId: string, data: { date: Date; metrics: any }, userId: string): Promise<CampaignAnalytics> {
    try {
      // Validate analytics data
      this.validateAnalyticsData(data);
      
      // Check if campaign exists
      const existingCampaign = await prisma.marketingCampaign.findUnique({
        where: { id: campaignId }
      });
      
      if (!existingCampaign) {
        throw new NotFoundError(`Marketing campaign with ID ${campaignId} not found`);
      }
      
      // Check if analytics for this date already exists
      const existingAnalytics = await prisma.campaignAnalytics.findFirst({
        where: {
          campaignId,
          date: data.date
        }
      });
      
      let analytics;
      
      if (existingAnalytics) {
        // Update existing analytics
        analytics = await prisma.campaignAnalytics.update({
          where: { id: existingAnalytics.id },
          data: {
            metrics: data.metrics,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new analytics
        analytics = await prisma.campaignAnalytics.create({
          data: {
            campaignId,
            date: data.date,
            metrics: data.metrics
          }
        });
      }
      
      // Log audit event
      await this.auditLogger.log({
        action: existingAnalytics ? 'analytics.update' : 'analytics.create',
        resourceId: campaignId,
        userId,
        details: { 
          analyticsId: analytics.id,
          date: data.date.toISOString().split('T')[0],
          metricKeys: Object.keys(data.metrics)
        }
      });
      
      return analytics;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to record campaign analytics', error);
    }
  }

  /**
   * Get analytics for a campaign
   */
  async getCampaignAnalytics(campaignId: string, filters: {
    startDate?: Date;
    endDate?: Date;
    metrics?: string[];
  } = {}): Promise<CampaignAnalytics[]> {
    try {
      const { startDate, endDate, metrics } = filters;
      
      // Check if campaign exists
      const existingCampaign = await prisma.marketingCampaign.findUnique({
        where: { id: campaignId }
      });
      
      if (!existingCampaign) {
        throw new NotFoundError(`Marketing campaign with ID ${campaignId} not found`);
      }
      
      // Build where clause based on filters
      const where: any = { campaignId };
      
      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = startDate;
        }
        if (endDate) {
          where.date.lte = endDate;
        }
      }
      
      // Get analytics data
      const analyticsData = await prisma.campaignAnalytics.findMany({
        where,
        orderBy: {
          date: 'asc'
        }
      });
      
      // Filter metrics if specified
      if (metrics && metrics.length > 0) {
        return analyticsData.map(item => ({
          ...item,
          metrics: this.filterMetrics(item.metrics, metrics)
        }));
      }
      
      return analyticsData;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve campaign analytics', error);
    }
  }

  /**
   * Get aggregated analytics for a campaign
   */
  async getAggregatedAnalytics(campaignId: string, filters: {
    startDate?: Date;
    endDate?: Date;
    metrics?: string[];
    groupBy?: 'day' | 'week' | 'month';
  } = {}): Promise<any> {
    try {
      const { startDate, endDate, metrics, groupBy = 'day' } = filters;
      
      // Get raw analytics data
      const analyticsData = await this.getCampaignAnalytics(campaignId, {
        startDate,
        endDate,
        metrics
      });
      
      // Group data by specified interval
      const groupedData = this.groupAnalyticsByInterval(analyticsData, groupBy);
      
      // Calculate totals
      const totals = this.calculateAnalyticsTotals(analyticsData);
      
      // Calculate averages
      const averages = this.calculateAnalyticsAverages(analyticsData);
      
      // Calculate trends
      const trends = this.calculateAnalyticsTrends(analyticsData);
      
      return {
        timeSeriesData: groupedData,
        totals,
        averages,
        trends
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve aggregated analytics', error);
    }
  }

  /**
   * Get comparative analytics for multiple campaigns
   */
  async getComparativeAnalytics(campaignIds: string[], filters: {
    startDate?: Date;
    endDate?: Date;
    metrics?: string[];
  } = {}): Promise<any> {
    try {
      const { startDate, endDate, metrics } = filters;
      
      // Get data for each campaign
      const campaignsData = await Promise.all(
        campaignIds.map(async (campaignId) => {
          try {
            const campaign = await prisma.marketingCampaign.findUnique({
              where: { id: campaignId },
              select: {
                id: true,
                name: true,
                type: true,
                status: true
              }
            });
            
            if (!campaign) {
              return null;
            }
            
            const analytics = await this.getCampaignAnalytics(campaignId, {
              startDate,
              endDate,
              metrics
            });
            
            const totals = this.calculateAnalyticsTotals(analytics);
            
            return {
              campaign,
              totals,
              analyticsCount: analytics.length
            };
          } catch (error) {
            console.error(`Error getting analytics for campaign ${campaignId}:`, error);
            return null;
          }
        })
      );
      
      // Filter out null results
      const validCampaignsData = campaignsData.filter(data => data !== null);
      
      // Sort by performance (using first metric as sorting criteria)
      const sortedData = this.sortCampaignsByPerformance(validCampaignsData);
      
      return {
        campaigns: sortedData,
        comparisonDate: new Date()
      };
    } catch (error) {
      throw new DatabaseError('Failed to retrieve comparative analytics', error);
    }
  }

  /**
   * Filter metrics to include only specified keys
   */
  private filterMetrics(metrics: any, keys: string[]): any {
    if (!metrics || typeof metrics !== 'object') {
      return {};
    }
    
    const filteredMetrics: any = {};
    
    keys.forEach(key => {
      if (metrics[key] !== undefined) {
        filteredMetrics[key] = metrics[key];
      }
    });
    
    return filteredMetrics;
  }

  /**
   * Group analytics data by time interval
   */
  private groupAnalyticsByInterval(analytics: CampaignAnalytics[], interval: 'day' | 'week' | 'month'): any[] {
    if (!analytics || analytics.length === 0) {
      return [];
    }
    
    const groupedData: Map<string, any> = new Map();
    
    analytics.forEach(item => {
      const date = new Date(item.date);
      let groupKey: string;
      
      switch (interval) {
        case 'day':
          groupKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'week':
          // Get the Monday of the week
          const day = date.getDay();
          const diff = date.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(date);
          monday.setDate(diff);
          groupKey = monday.toISOString().split('T')[0]; // YYYY-MM-DD of Monday
          break;
        case 'month':
          groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
          break;
        default:
          groupKey = date.toISOString().split('T')[0]; // Default to day
      }
      
      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, {
          interval: groupKey,
          metrics: { ...item.metrics }
        });
      } else {
        const existing = groupedData.get(groupKey);
        const updatedMetrics = this.mergeMetrics(existing.metrics, item.metrics);
        groupedData.set(groupKey, {
          ...existing,
          metrics: updatedMetrics
        });
      }
    });
    
    // Convert map to array and sort by interval
    return Array.from(groupedData.values()).sort((a, b) => a.interval.localeCompare(b.interval));
  }

  /**
   * Merge metrics objects, summing numeric values
   */
  private mergeMetrics(metrics1: any, metrics2: any): any {
    const result: any = { ...metrics1 };
    
    Object.entries(metrics2).forEach(([key, value]) => {
      if (typeof value === 'number') {
        result[key] = (result[key] || 0) + value;
      } else if (value !== undefined && result[key] === undefined) {
        result[key] = value;
      }
    });
    
    return result;
  }

  /**
   * Calculate totals for analytics metrics
   */
  private calculateAnalyticsTotals(analytics: CampaignAnalytics[]): any {
    if (!analytics || analytics.length === 0) {
      return {};
    }
    
    const totals: any = {};
    
    analytics.forEach(item => {
      Object.entries(item.metrics).forEach(([key, value]) => {
        if (typeof value === 'number') {
          totals[key] = (totals[key] || 0) + value;
        }
      });
    });
    
    return totals;
  }

  /**
   * Calculate averages for analytics metrics
   */
  private calculateAnalyticsAverages(analytics: CampaignAnalytics[]): any {
    if (!analytics || analytics.length === 0) {
      return {};
    }
    
    const totals = this.calculateAnalyticsTotals(analytics);
    const count = analytics.length;
    
    const averages: any = {};
    
    Object.entries(totals).forEach(([key, value]) => {
      if (typeof value === 'number') {
        averages[key] = value / count;
      }
    });
    
    return averages;
  }

  /**
   * Calculate trends for analytics metrics
   */
  private calculateAnalyticsTrends(analytics: CampaignAnalytics[]): any {
    if (!analytics || analytics.length < 2) {
      return {};
    }
    
    // Sort by date
    const sortedAnalytics = [...analytics].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Get first and last data points
    const first = sortedAnalytics[0];
    const last = sortedAnalytics[sortedAnalytics.length - 1];
    
    const trends: any = {};
    
    // Calculate percentage change for each metric
    Object.entries(last.metrics).forEach(([key, value]) => {
      if (typeof value === 'number' && typeof first.metrics[key] === 'number' && first.metrics[key] !== 0) {
        const change = value - first.metrics[key];
        const percentChange = (change / first.metrics[key]) * 100;
        trends[key] = {
          change,
          percentChange,
          direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
        };
      }
    });
    
    return trends;
  }

  /**
   * Sort campaigns by performance
   */
  private sortCampaignsByPerformance(campaignsData: any[]): any[] {
    if (!campaignsData || campaignsData.length === 0) {
      return [];
    }
    
    // Find a common metric to sort by
    const firstCampaign = campaignsData[0];
    const metrics = firstCampaign.totals ? Object.keys(firstCampaign.totals) : [];
    
    if (metrics.length === 0) {
      return campaignsData;
    }
    
    // Prioritize important metrics for sorting
    const sortMetric = ['conversions', 'leads', 'clicks', 'impressions'].find(m => metrics.includes(m)) || metrics[0];
    
    // Sort by the selected metric
    return [...campaignsData].sort((a, b) => {
      const valueA = a.totals && a.totals[sortMetric] ? a.totals[sortMetric] : 0;
      const valueB = b.totals && b.totals[sortMetric] ? b.totals[sortMetric] : 0;
      return valueB - valueA; // Descending order
    });
  }

  /**
   * Validate analytics data
   */
  private validateAnalyticsData(data: { date: Date; metrics: any }): void {
    const errors: string[] = [];
    
    // Date is required
    if (!data.date) {
      errors.push('Analytics date is required');
    }
    
    // Metrics is required and must be an object
    if (!data.metrics || typeof data.metrics !== 'object') {
      errors.push('Analytics metrics must be a valid object');
    }
    
    if (errors.length > 0) {
      throw new ValidationError('Analytics validation failed', errors);
    }
  }
}
