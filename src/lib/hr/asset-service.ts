import { PrismaClient } from '@prisma/client';
import { cache } from '@/lib/cache';

const prisma = new PrismaClient();

/**
 * Service for managing asset data with enhanced performance and analytics
 * Optimized with caching, query improvements, and predictive maintenance
 */
export class AssetService {
  // Cache TTL in seconds
  private CACHE_TTL = 3600; // 1 hour
  private CACHE_PREFIX = 'asset:';

  /**
   * Create a new asset
   */
  async createAsset(data: {
    assetId: string;
    name: string;
    description?: string;
    category: string;
    type: string;
    status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'DISPOSED';
    location?: string;
    department?: string;
    purchaseDate?: Date;
    purchasePrice?: number;
    warrantyExpiry?: Date;
    supplier?: string;
    serialNumber?: string;
    model?: string;
    manufacturer?: string;
    properties?: any;
    notes?: string;
  }) {
    const result = await prisma.asset.create({
      data,
    });
    
    // Invalidate relevant caches
    await this.invalidateAssetCache();
    
    return result;
  }

  /**
   * Get asset by ID
   * Enhanced with caching for improved performance
   */
  async getAssetById(id: string) {
    const cacheKey = `${this.CACHE_PREFIX}id:${id}`;
    
    // Try to get from cache first
    const cachedAsset = await cache.get(cacheKey);
    if (cachedAsset) {
      return JSON.parse(cachedAsset);
    }
    
    // If not in cache, fetch from database
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        maintenanceRecords: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        assignments: {
          include: {
            employee: true,
          },
          where: {
            endDate: null, // Only current assignment
          },
          take: 1,
        },
      },
    });
    
    // Store in cache if found
    if (asset) {
      await cache.set(cacheKey, JSON.stringify(asset), this.CACHE_TTL);
    }
    
    return asset;
  }

  /**
   * Get asset by asset ID
   * Enhanced with caching for improved performance
   */
  async getAssetByAssetId(assetId: string) {
    const cacheKey = `${this.CACHE_PREFIX}assetId:${assetId}`;
    
    // Try to get from cache first
    const cachedAsset = await cache.get(cacheKey);
    if (cachedAsset) {
      return JSON.parse(cachedAsset);
    }
    
    // If not in cache, fetch from database
    const asset = await prisma.asset.findUnique({
      where: { assetId },
      include: {
        maintenanceRecords: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        assignments: {
          include: {
            employee: true,
          },
          where: {
            endDate: null, // Only current assignment
          },
          take: 1,
        },
      },
    });
    
    // Store in cache if found
    if (asset) {
      await cache.set(cacheKey, JSON.stringify(asset), this.CACHE_TTL);
    }
    
    return asset;
  }

  /**
   * Update asset
   */
  async updateAsset(
    id: string,
    data: {
      name?: string;
      description?: string;
      category?: string;
      type?: string;
      status?: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'DISPOSED';
      location?: string;
      department?: string;
      purchaseDate?: Date;
      purchasePrice?: number;
      warrantyExpiry?: Date;
      supplier?: string;
      serialNumber?: string;
      model?: string;
      manufacturer?: string;
      properties?: any;
      notes?: string;
    }
  ) {
    // Get current asset to check for asset ID change
    const currentAsset = await prisma.asset.findUnique({
      where: { id },
      select: { assetId: true },
    });
    
    const result = await prisma.asset.update({
      where: { id },
      data,
      include: {
        maintenanceRecords: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        assignments: {
          include: {
            employee: true,
          },
          where: {
            endDate: null, // Only current assignment
          },
          take: 1,
        },
      },
    });
    
    // Invalidate relevant caches
    await this.invalidateAssetCache(id);
    
    // If asset ID changed, invalidate old asset ID cache
    if (currentAsset && data.assetId && currentAsset.assetId !== data.assetId) {
      await cache.del(`${this.CACHE_PREFIX}assetId:${currentAsset.assetId}`);
    }
    
    return result;
  }

  /**
   * List assets with filtering and pagination
   * Optimized with cursor-based pagination and selective field loading
   */
  async listAssets({
    skip = 0,
    take = 10,
    cursor,
    category,
    type,
    status,
    department,
    search,
    needsMaintenance = false,
    includeDetails = false,
  }: {
    skip?: number;
    take?: number;
    cursor?: string;
    category?: string;
    type?: string;
    status?: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'DISPOSED';
    department?: string;
    search?: string;
    needsMaintenance?: boolean;
    includeDetails?: boolean;
  }) {
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (department) {
      where.department = department;
    }

    if (needsMaintenance) {
      where.nextMaintenanceDate = {
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { assetId: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Generate cache key based on query parameters
    const cacheKey = `${this.CACHE_PREFIX}list:${JSON.stringify({
      skip, take, cursor, category, type, status, department, search, needsMaintenance, includeDetails
    })}`;
    
    // Try to get from cache first
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    // Determine what to include based on the detail level requested
    const include: any = {};
    
    if (includeDetails) {
      include.maintenanceRecords = {
        orderBy: { date: 'desc' },
        take: 3,
      };
      
      include.assignments = {
        include: {
          employee: true,
        },
        where: {
          endDate: null, // Only current assignment
        },
        take: 1,
      };
    }

    // Use cursor-based pagination if cursor is provided
    const cursorObj = cursor ? { id: cursor } : undefined;

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take,
        cursor: cursorObj,
        orderBy: { assetId: 'asc' },
        include,
      }),
      prisma.asset.count({ where }),
    ]);

    const result = {
      assets,
      total,
      skip,
      take,
      nextCursor: assets.length === take ? assets[assets.length - 1].id : null,
    };
    
    // Store in cache
    await cache.set(cacheKey, JSON.stringify(result), 300); // 5 minutes TTL for lists
    
    return result;
  }

  /**
   * Record maintenance for asset
   */
  async recordMaintenance(
    assetId: string,
    data: {
      date: Date;
      type: 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION';
      performedBy: string;
      description: string;
      cost?: number;
      parts?: string[];
      status: 'COMPLETED' | 'PENDING' | 'SCHEDULED';
      notes?: string;
      attachments?: string[];
      nextMaintenanceDate?: Date;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      // Create maintenance record
      const maintenance = await tx.assetMaintenance.create({
        data: {
          assetId,
          date: data.date,
          type: data.type,
          performedBy: data.performedBy,
          description: data.description,
          cost: data.cost,
          parts: data.parts,
          status: data.status,
          notes: data.notes,
          attachments: data.attachments,
        },
      });

      // Update asset status and next maintenance date if needed
      const updateData: any = {};
      
      if (data.status === 'COMPLETED') {
        updateData.status = 'AVAILABLE';
      } else if (data.status === 'SCHEDULED' || data.status === 'PENDING') {
        updateData.status = 'MAINTENANCE';
      }
      
      if (data.nextMaintenanceDate) {
        updateData.nextMaintenanceDate = data.nextMaintenanceDate;
      }
      
      if (Object.keys(updateData).length > 0) {
        await tx.asset.update({
          where: { id: assetId },
          data: updateData,
        });
      }

      // Invalidate relevant caches
      await this.invalidateAssetCache(assetId);

      return maintenance;
    });
  }

  /**
   * Assign asset to employee
   */
  async assignAsset(
    assetId: string,
    data: {
      employeeId: string;
      startDate: Date;
      endDate?: Date;
      notes?: string;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      // End any current assignments
      await tx.assetAssignment.updateMany({
        where: {
          assetId,
          endDate: null,
        },
        data: {
          endDate: new Date(),
        },
      });

      // Create new assignment
      const assignment = await tx.assetAssignment.create({
        data: {
          assetId,
          employeeId: data.employeeId,
          startDate: data.startDate,
          endDate: data.endDate,
          notes: data.notes,
        },
        include: {
          employee: true,
        },
      });

      // Update asset status
      await tx.asset.update({
        where: { id: assetId },
        data: {
          status: 'IN_USE',
        },
      });

      // Invalidate relevant caches
      await this.invalidateAssetCache(assetId);

      return assignment;
    });
  }

  /**
   * End asset assignment
   */
  async endAssignment(
    assignmentId: string,
    endDate: Date,
    notes?: string
  ) {
    // Get assignment to find asset ID
    const assignment = await prisma.assetAssignment.findUnique({
      where: { id: assignmentId },
      select: { assetId: true },
    });
    
    return prisma.$transaction(async (tx) => {
      // Update assignment
      const updatedAssignment = await tx.assetAssignment.update({
        where: { id: assignmentId },
        data: {
          endDate,
          notes: notes ? { set: notes } : undefined,
        },
        include: {
          employee: true,
        },
      });

      // Update asset status
      if (assignment) {
        await tx.asset.update({
          where: { id: assignment.assetId },
          data: {
            status: 'AVAILABLE',
          },
        });
        
        // Invalidate relevant caches
        await this.invalidateAssetCache(assignment.assetId);
      }

      return updatedAssignment;
    });
  }

  /**
   * Get maintenance history for asset
   */
  async getMaintenanceHistory(assetId: string) {
    const cacheKey = `${this.CACHE_PREFIX}maintenance:${assetId}`;
    
    // Try to get from cache first
    const cachedHistory = await cache.get(cacheKey);
    if (cachedHistory) {
      return JSON.parse(cachedHistory);
    }
    
    // If not in cache, fetch from database
    const history = await prisma.assetMaintenance.findMany({
      where: { assetId },
      orderBy: { date: 'desc' },
    });
    
    // Store in cache
    await cache.set(cacheKey, JSON.stringify(history), 1800); // 30 minutes TTL
    
    return history;
  }

  /**
   * Get assignment history for asset
   */
  async getAssignmentHistory(assetId: string) {
    const cacheKey = `${this.CACHE_PREFIX}assignments:${assetId}`;
    
    // Try to get from cache first
    const cachedHistory = await cache.get(cacheKey);
    if (cachedHistory) {
      return JSON.parse(cachedHistory);
    }
    
    // If not in cache, fetch from database
    const history = await prisma.assetAssignment.findMany({
      where: { assetId },
      include: {
        employee: true,
      },
      orderBy: { startDate: 'desc' },
    });
    
    // Store in cache
    await cache.set(cacheKey, JSON.stringify(history), 1800); // 30 minutes TTL
    
    return history;
  }

  /**
   * Get assets due for maintenance
   */
  async getAssetsDueForMaintenance(daysThreshold: number = 30) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    
    const cacheKey = `${this.CACHE_PREFIX}due-maintenance:${daysThreshold}`;
    
    // Try to get from cache first
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }
    
    // If not in cache, fetch from database
    const assets = await prisma.asset.findMany({
      where: {
        nextMaintenanceDate: {
          lte: thresholdDate,
        },
        status: {
          not: 'DISPOSED',
        },
      },
      orderBy: {
        nextMaintenanceDate: 'asc',
      },
    });
    
    // Store in cache
    await cache.set(cacheKey, JSON.stringify(assets), 3600); // 1 hour TTL
    
    return assets;
  }
  
  /**
   * Calculate asset utilization metrics
   * New method to support advanced analytics
   */
  async calculateUtilizationMetrics(assetId: string) {
    const asset = await this.getAssetById(assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }
    
    // Get all assignments
    const assignments = await prisma.assetAssignment.findMany({
      where: { assetId },
      orderBy: { startDate: 'asc' },
    });
    
    // Get all maintenance records
    const maintenanceRecords = await prisma.assetMaintenance.findMany({
      where: { assetId },
      orderBy: { date: 'asc' },
    });
    
    // Calculate total lifetime (in days)
    const purchaseDate = asset.purchaseDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // Default to 1 year ago
    const totalLifetime = (new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Calculate total time in use (in days)
    let totalTimeInUse = 0;
    for (const assignment of assignments) {
      const startDate = new Date(assignment.startDate);
      const endDate = assignment.endDate ? new Date(assignment.endDate) : new Date();
      const assignmentDuration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      totalTimeInUse += assignmentDuration;
    }
    
    // Calculate total time in maintenance (in days)
    let totalTimeInMaintenance = 0;
    for (const record of maintenanceRecords) {
      if (record.status === 'COMPLETED') {
        // Estimate 1 day for maintenance if completed
        totalTimeInMaintenance += 1;
      } else {
        // For pending/scheduled, calculate from record date to now or completion
        const startDate = new Date(record.date);
        const endDate = new Date(); // Assume ongoing if not completed
        const maintenanceDuration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        totalTimeInMaintenance += maintenanceDuration;
      }
    }
    
    // Calculate utilization rate
    const utilizationRate = (totalTimeInUse / totalLifetime) * 100;
    
    // Calculate availability rate (excluding maintenance)
    const availabilityRate = ((totalLifetime - totalTimeInMaintenance) / totalLifetime) * 100;
    
    // Calculate maintenance cost
    const totalMaintenanceCost = maintenanceRecords.reduce((sum, record) => sum + (record.cost || 0), 0);
    
    // Calculate cost per day
    const costPerDay = asset.purchasePrice 
      ? (asset.purchasePrice + totalMaintenanceCost) / totalLifetime
      : totalMaintenanceCost / totalLifetime;
    
    return {
      assetId: asset.id,
      assetIdentifier: asset.assetId,
      totalLifetime,
      totalTimeInUse,
      totalTimeInMaintenance,
      utilizationRate,
      availabilityRate,
      totalMaintenanceCost,
      costPerDay,
      assignmentCount: assignments.length,
      maintenanceCount: maintenanceRecords.length,
      purchasePrice: asset.purchasePrice || 0,
    };
  }
  
  /**
   * Predict optimal maintenance schedule
   * New method to support predictive maintenance
   */
  async predictOptimalMaintenanceSchedule(assetId: string) {
    const asset = await this.getAssetById(assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }
    
    // Get all maintenance records
    const maintenanceRecords = await prisma.assetMaintenance.findMany({
      where: { 
        assetId,
        type: 'PREVENTIVE',
        status: 'COMPLETED'
      },
      orderBy: { date: 'asc' },
    });
    
    // Get corrective maintenance records
    const correctiveRecords = await prisma.assetMaintenance.findMany({
      where: { 
        assetId,
        type: 'CORRECTIVE',
        status: 'COMPLETED'
      },
      orderBy: { date: 'asc' },
    });
    
    // Calculate average interval between preventive maintenance
    let averagePreventiveInterval = 90; // Default to 90 days
    if (maintenanceRecords.length > 1) {
      let totalInterval = 0;
      for (let i = 1; i < maintenanceRecords.length; i++) {
        const interval = (new Date(maintenanceRecords[i].date).getTime() - 
                         new Date(maintenanceRecords[i-1].date).getTime()) / (1000 * 60 * 60 * 24);
        totalInterval += interval;
      }
      averagePreventiveInterval = totalInterval / (maintenanceRecords.length - 1);
    }
    
    // Analyze if current interval is optimal by checking corrective maintenance
    let optimalInterval = averagePreventiveInterval;
    let failureRisk = 'LOW';
    let confidenceLevel = 'LOW';
    
    if (correctiveRecords.length > 0 && maintenanceRecords.length > 0) {
      // Check if corrective maintenance occurs close to preventive maintenance
      const timeToFailureAfterMaintenance: number[] = [];
      
      for (const corrective of correctiveRecords) {
        // Find the most recent preventive maintenance before this corrective
        const prevPreventive = maintenanceRecords.filter(
          m => new Date(m.date) < new Date(corrective.date)
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        if (prevPreventive) {
          const timeDiff = (new Date(corrective.date).getTime() - 
                           new Date(prevPreventive.date).getTime()) / (1000 * 60 * 60 * 24);
          timeToFailureAfterMaintenance.push(timeDiff);
        }
      }
      
      if (timeToFailureAfterMaintenance.length > 0) {
        // Calculate average time to failure after maintenance
        const avgTimeToFailure = timeToFailureAfterMaintenance.reduce((sum, time) => sum + time, 0) / 
                                timeToFailureAfterMaintenance.length;
        
        // If failures typically happen before the next scheduled maintenance,
        // we should reduce the interval
        if (avgTimeToFailure < averagePreventiveInterval * 0.8) {
          optimalInterval = Math.max(30, avgTimeToFailure * 0.8); // At least 30 days
          failureRisk = 'HIGH';
        } else if (avgTimeToFailure > averagePreventiveInterval * 1.5) {
          // If failures typically happen long after maintenance, we can extend the interval
          optimalInterval = avgTimeToFailure * 0.8;
          failureRisk = 'LOW';
        }
        
        // Set confidence level based on data points
        confidenceLevel = timeToFailureAfterMaintenance.length >= 5 ? 'HIGH' : 
                         (timeToFailureAfterMaintenance.length >= 3 ? 'MEDIUM' : 'LOW');
      }
    }
    
    // Calculate next maintenance date
    const lastMaintenance = maintenanceRecords.length > 0 ? 
                          new Date(maintenanceRecords[maintenanceRecords.length - 1].date) : 
                          (asset.purchaseDate || new Date());
    
    const nextMaintenanceDate = new Date(lastMaintenance);
    nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + Math.round(optimalInterval));
    
    // Calculate cost savings
    const potentialCostSavings = correctiveRecords.reduce((sum, record) => sum + (record.cost || 0), 0) / 
                               Math.max(1, correctiveRecords.length);
    
    return {
      assetId: asset.id,
      assetIdentifier: asset.assetId,
      currentMaintenanceInterval: averagePreventiveInterval,
      recommendedMaintenanceInterval: Math.round(optimalInterval),
      nextRecommendedMaintenanceDate: nextMaintenanceDate.toISOString(),
      failureRisk,
      confidenceLevel,
      preventiveMaintenanceCount: maintenanceRecords.length,
      correctiveMaintenanceCount: correctiveRecords.length,
      potentialCostSavings,
      recommendation: optimalInterval < averagePreventiveInterval ? 
                    'Increase maintenance frequency' : 
                    (optimalInterval > averagePreventiveInterval ? 
                     'Decrease maintenance frequency' : 
                     'Maintain current schedule'),
      dataPoints: maintenanceRecords.length + correctiveRecords.length,
    };
  }
  
  /**
   * Invalidate asset-related caches
   * @param assetId Optional specific asset ID to invalidate
   */
  private async invalidateAssetCache(assetId?: string) {
    if (assetId) {
      // Get the asset to find all IDs
      const asset = await prisma.asset.findFirst({
        where: { id: assetId },
        select: { id: true, assetId: true }
      });
      
      if (asset) {
        // Invalidate specific asset caches
        await Promise.all([
          cache.del(`${this.CACHE_PREFIX}id:${asset.id}`),
          cache.del(`${this.CACHE_PREFIX}assetId:${asset.assetId}`),
          cache.del(`${this.CACHE_PREFIX}maintenance:${asset.id}`),
          cache.del(`${this.CACHE_PREFIX}assignments:${asset.id}`)
        ]);
      }
    }
    
    // Invalidate list caches with pattern matching
    await Promise.all([
      cache.delPattern(`${this.CACHE_PREFIX}list:*`),
      cache.delPattern(`${this.CACHE_PREFIX}due-maintenance:*`)
    ]);
  }
}

export const assetService = new AssetService();
