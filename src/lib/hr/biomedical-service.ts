import { PrismaClient } from '@prisma/client';
import { Device, DeviceDefinition } from '@/lib/hr/types';
import { cache } from '@/lib/cache';

const prisma = new PrismaClient();

/**
 * Service for managing biomedical equipment following FHIR Device resource standards
 * Enhanced with caching, query optimization, and FHIR R5 compliance
 */
export class BiomedicalService {
  // Cache TTL in seconds
  private CACHE_TTL = 3600; // 1 hour
  private CACHE_PREFIX = 'biomedical:';

  /**
   * Create a new biomedical equipment record
   */
  async createBiomedicalEquipment(data: {
    serialNumber: string;
    modelNumber: string;
    manufacturer: string;
    manufactureDate?: Date;
    type: string;
    category: string;
    status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED';
    location?: string;
    department?: string;
    purchaseDate?: Date;
    warrantyExpiry?: Date;
    lastCalibrationDate?: Date;
    nextCalibrationDate?: Date;
    calibrationFrequency?: number;
    properties?: any;
    notes?: string;
  }) {
    const result = await prisma.biomedicalEquipment.create({
      data: {
        serialNumber: data.serialNumber,
        modelNumber: data.modelNumber,
        manufacturer: data.manufacturer,
        manufactureDate: data.manufactureDate,
        type: data.type,
        category: data.category,
        status: data.status,
        location: data.location,
        department: data.department,
        purchaseDate: data.purchaseDate,
        warrantyExpiry: data.warrantyExpiry,
        lastCalibrationDate: data.lastCalibrationDate,
        nextCalibrationDate: data.nextCalibrationDate,
        calibrationFrequency: data.calibrationFrequency,
        properties: data.properties,
        notes: data.notes,
      },
    });
    
    // Invalidate relevant caches
    await this.invalidateBiomedicalCache();
    
    return result;
  }

  /**
   * Get biomedical equipment by ID
   * Enhanced with caching for improved performance
   */
  async getBiomedicalEquipmentById(id: string) {
    const cacheKey = `${this.CACHE_PREFIX}id:${id}`;
    
    // Try to get from cache first
    const cachedEquipment = await cache.get(cacheKey);
    if (cachedEquipment) {
      return JSON.parse(cachedEquipment);
    }
    
    // If not in cache, fetch from database
    const equipment = await prisma.biomedicalEquipment.findUnique({
      where: { id },
      include: {
        calibrations: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        maintenanceRecords: {
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
    });
    
    // Store in cache if found
    if (equipment) {
      await cache.set(cacheKey, JSON.stringify(equipment), this.CACHE_TTL);
    }
    
    return equipment;
  }

  /**
   * Get biomedical equipment by serial number
   * Enhanced with caching for improved performance
   */
  async getBiomedicalEquipmentBySerialNumber(serialNumber: string) {
    const cacheKey = `${this.CACHE_PREFIX}serial:${serialNumber}`;
    
    // Try to get from cache first
    const cachedEquipment = await cache.get(cacheKey);
    if (cachedEquipment) {
      return JSON.parse(cachedEquipment);
    }
    
    // If not in cache, fetch from database
    const equipment = await prisma.biomedicalEquipment.findUnique({
      where: { serialNumber },
      include: {
        calibrations: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        maintenanceRecords: {
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
    });
    
    // Store in cache if found
    if (equipment) {
      await cache.set(cacheKey, JSON.stringify(equipment), this.CACHE_TTL);
    }
    
    return equipment;
  }

  /**
   * Update biomedical equipment
   */
  async updateBiomedicalEquipment(
    id: string,
    data: {
      serialNumber?: string;
      modelNumber?: string;
      manufacturer?: string;
      manufactureDate?: Date;
      type?: string;
      category?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED';
      location?: string;
      department?: string;
      purchaseDate?: Date;
      warrantyExpiry?: Date;
      lastCalibrationDate?: Date;
      nextCalibrationDate?: Date;
      calibrationFrequency?: number;
      properties?: any;
      notes?: string;
    }
  ) {
    // Get current equipment to check for serial number change
    const currentEquipment = await prisma.biomedicalEquipment.findUnique({
      where: { id },
      select: { serialNumber: true },
    });
    
    const result = await prisma.biomedicalEquipment.update({
      where: { id },
      data,
      include: {
        calibrations: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        maintenanceRecords: {
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
    });
    
    // Invalidate relevant caches
    await this.invalidateBiomedicalCache(id);
    
    // If serial number changed, invalidate old serial number cache
    if (currentEquipment && data.serialNumber && currentEquipment.serialNumber !== data.serialNumber) {
      await cache.del(`${this.CACHE_PREFIX}serial:${currentEquipment.serialNumber}`);
    }
    
    return result;
  }

  /**
   * List biomedical equipment with filtering and pagination
   * Optimized with cursor-based pagination and selective field loading
   */
  async listBiomedicalEquipment({
    skip = 0,
    take = 10,
    cursor,
    type,
    category,
    status,
    department,
    search,
    needsCalibration = false,
    includeDetails = false,
  }: {
    skip?: number;
    take?: number;
    cursor?: string;
    type?: string;
    category?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED';
    department?: string;
    search?: string;
    needsCalibration?: boolean;
    includeDetails?: boolean;
  }) {
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (department) {
      where.department = department;
    }

    if (needsCalibration) {
      where.nextCalibrationDate = {
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
      };
    }

    if (search) {
      where.OR = [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { modelNumber: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Generate cache key based on query parameters
    const cacheKey = `${this.CACHE_PREFIX}list:${JSON.stringify({
      skip, take, cursor, type, category, status, department, search, needsCalibration, includeDetails
    })}`;
    
    // Try to get from cache first
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    // Determine what to include based on the detail level requested
    const include: any = {};
    
    if (includeDetails) {
      include.calibrations = {
        orderBy: { date: 'desc' },
        take: 3,
      };
      
      include.maintenanceRecords = {
        orderBy: { date: 'desc' },
        take: 3,
      };
    }

    // Use cursor-based pagination if cursor is provided
    const cursorObj = cursor ? { id: cursor } : undefined;

    const [equipment, total] = await Promise.all([
      prisma.biomedicalEquipment.findMany({
        where,
        skip,
        take,
        cursor: cursorObj,
        orderBy: { serialNumber: 'asc' },
        include,
      }),
      prisma.biomedicalEquipment.count({ where }),
    ]);

    const result = {
      equipment,
      total,
      skip,
      take,
      nextCursor: equipment.length === take ? equipment[equipment.length - 1].id : null,
    };
    
    // Store in cache
    await cache.set(cacheKey, JSON.stringify(result), 300); // 5 minutes TTL for lists
    
    return result;
  }

  /**
   * Record calibration for biomedical equipment
   */
  async recordCalibration(
    equipmentId: string,
    data: {
      date: Date;
      performedBy: string;
      result: 'PASS' | 'FAIL' | 'ADJUSTED';
      notes?: string;
      nextCalibrationDate?: Date;
      attachments?: string[];
    }
  ) {
    return prisma.$transaction(async (tx) => {
      // Create calibration record
      const calibration = await tx.calibrationRecord.create({
        data: {
          equipmentId,
          date: data.date,
          performedBy: data.performedBy,
          result: data.result,
          notes: data.notes,
          attachments: data.attachments,
        },
      });

      // Update equipment with new calibration dates
      const updateData: any = {
        lastCalibrationDate: data.date,
      };

      if (data.nextCalibrationDate) {
        updateData.nextCalibrationDate = data.nextCalibrationDate;
      }

      await tx.biomedicalEquipment.update({
        where: { id: equipmentId },
        data: updateData,
      });

      // Invalidate relevant caches
      await this.invalidateBiomedicalCache(equipmentId);

      return calibration;
    });
  }

  /**
   * Record maintenance for biomedical equipment
   */
  async recordMaintenance(
    equipmentId: string,
    data: {
      date: Date;
      type: 'PREVENTIVE' | 'CORRECTIVE' | 'SAFETY';
      performedBy: string;
      description: string;
      cost?: number;
      parts?: string[];
      status: 'COMPLETED' | 'PENDING' | 'SCHEDULED';
      notes?: string;
      attachments?: string[];
    }
  ) {
    return prisma.$transaction(async (tx) => {
      // Create maintenance record
      const maintenance = await tx.maintenanceRecord.create({
        data: {
          equipmentId,
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

      // Update equipment status if maintenance is completed
      if (data.status === 'COMPLETED') {
        await tx.biomedicalEquipment.update({
          where: { id: equipmentId },
          data: {
            status: 'ACTIVE',
          },
        });
      } else if (data.status === 'SCHEDULED' || data.status === 'PENDING') {
        await tx.biomedicalEquipment.update({
          where: { id: equipmentId },
          data: {
            status: 'MAINTENANCE',
          },
        });
      }

      // Invalidate relevant caches
      await this.invalidateBiomedicalCache(equipmentId);

      return maintenance;
    });
  }

  /**
   * Get calibration history for equipment
   */
  async getCalibrationHistory(equipmentId: string) {
    const cacheKey = `${this.CACHE_PREFIX}calibration:${equipmentId}`;
    
    // Try to get from cache first
    const cachedHistory = await cache.get(cacheKey);
    if (cachedHistory) {
      return JSON.parse(cachedHistory);
    }
    
    // If not in cache, fetch from database
    const history = await prisma.calibrationRecord.findMany({
      where: { equipmentId },
      orderBy: { date: 'desc' },
    });
    
    // Store in cache
    await cache.set(cacheKey, JSON.stringify(history), 1800); // 30 minutes TTL
    
    return history;
  }

  /**
   * Get maintenance history for equipment
   */
  async getMaintenanceHistory(equipmentId: string) {
    const cacheKey = `${this.CACHE_PREFIX}maintenance:${equipmentId}`;
    
    // Try to get from cache first
    const cachedHistory = await cache.get(cacheKey);
    if (cachedHistory) {
      return JSON.parse(cachedHistory);
    }
    
    // If not in cache, fetch from database
    const history = await prisma.maintenanceRecord.findMany({
      where: { equipmentId },
      orderBy: { date: 'desc' },
    });
    
    // Store in cache
    await cache.set(cacheKey, JSON.stringify(history), 1800); // 30 minutes TTL
    
    return history;
  }

  /**
   * Get equipment due for calibration
   */
  async getEquipmentDueForCalibration(daysThreshold: number = 30) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    
    const cacheKey = `${this.CACHE_PREFIX}due-calibration:${daysThreshold}`;
    
    // Try to get from cache first
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }
    
    // If not in cache, fetch from database
    const equipment = await prisma.biomedicalEquipment.findMany({
      where: {
        nextCalibrationDate: {
          lte: thresholdDate,
        },
        status: 'ACTIVE',
      },
      orderBy: {
        nextCalibrationDate: 'asc',
      },
    });
    
    // Store in cache
    await cache.set(cacheKey, JSON.stringify(equipment), 3600); // 1 hour TTL
    
    return equipment;
  }

  /**
   * Convert database equipment to FHIR Device
   * Updated to support FHIR R5 enhancements
   */
  toFhirDevice(equipment: any): Device {
    // Create the FHIR Device resource
    const device: Device = {
      resourceType: "Device", // Added for FHIR R5 compliance
      id: equipment.id,
      meta: {
        profile: ["http://hl7.org/fhir/r5/StructureDefinition/Device"]
      },
      identifier: [
        {
          system: 'http://hospital.example.org/biomedical-equipment',
          value: equipment.serialNumber,
        },
      ],
      status: this.mapStatusToFhir(equipment.status),
      manufacturer: equipment.manufacturer,
      serialNumber: equipment.serialNumber,
      modelNumber: equipment.modelNumber,
      manufactureDate: equipment.manufactureDate?.toISOString(),
      type: {
        coding: [
          {
            system: 'http://hospital.example.org/equipment-types',
            code: equipment.type,
            display: equipment.type,
          },
        ],
        text: equipment.type,
      },
      note: equipment.notes
        ? [
            {
              text: equipment.notes,
            },
          ]
        : undefined,
      safety: [], // Added for FHIR R5 compliance
      property: [], // Added for FHIR R5 compliance
    };

    // Add location if available
    if (equipment.location) {
      device.location = {
        display: equipment.location,
      };
    }

    // Add owner (department) if available
    if (equipment.department) {
      device.owner = {
        display: equipment.department,
      };
    }

    // Add properties if available
    if (equipment.properties) {
      for (const [key, value] of Object.entries(equipment.properties)) {
        device.property.push({
          type: {
            coding: [
              {
                system: 'http://hospital.example.org/equipment-properties',
                code: key,
                display: key,
              },
            ],
            text: key,
          },
          valueString: String(value),
        });
      }
    }

    // Add safety information
    device.safety.push({
      coding: [
        {
          system: 'http://hospital.example.org/equipment-safety',
          code: 'calibration-status',
          display: 'Calibration Status',
        },
      ],
      text: this.getCalibrationStatus(equipment),
    });

    return device;
  }

  /**
   * Create a FHIR DeviceDefinition for a type of equipment
   * New method to support FHIR R5 device catalog
   */
  createFhirDeviceDefinition(data: {
    type: string;
    manufacturer: string;
    modelNumber: string;
    description?: string;
    category?: string;
    properties?: any;
  }): DeviceDefinition {
    return {
      resourceType: "DeviceDefinition",
      id: `${data.manufacturer}-${data.modelNumber}`.replace(/\s+/g, '-').toLowerCase(),
      meta: {
        profile: ["http://hl7.org/fhir/r5/StructureDefinition/DeviceDefinition"]
      },
      identifier: [
        {
          system: 'http://hospital.example.org/device-definitions',
          value: `${data.manufacturer}-${data.modelNumber}`,
        },
      ],
      manufacturer: {
        display: data.manufacturer,
      },
      modelNumber: data.modelNumber,
      description: data.description,
      type: {
        coding: [
          {
            system: 'http://hospital.example.org/equipment-types',
            code: data.type,
            display: data.type,
          },
        ],
        text: data.type,
      },
      safety: [], // Added for FHIR R5 compliance
      property: [], // Added for FHIR R5 compliance
    };
  }

  /**
   * Map internal status to FHIR device status
   */
  private mapStatusToFhir(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'active';
      case 'INACTIVE':
        return 'inactive';
      case 'MAINTENANCE':
        return 'entered-in-error';
      case 'RETIRED':
        return 'inactive';
      default:
        return 'unknown';
    }
  }

  /**
   * Get calibration status text
   */
  private getCalibrationStatus(equipment: any): string {
    if (!equipment.nextCalibrationDate) {
      return 'No calibration required';
    }

    const now = new Date();
    const nextCalibration = new Date(equipment.nextCalibrationDate);

    if (nextCalibration < now) {
      return 'Calibration overdue';
    }

    const daysUntilCalibration = Math.ceil(
      (nextCalibration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilCalibration <= 30) {
      return `Calibration due in ${daysUntilCalibration} days`;
    }

    return 'Calibration up to date';
  }
  
  /**
   * Invalidate biomedical-related caches
   * @param equipmentId Optional specific equipment ID to invalidate
   */
  private async invalidateBiomedicalCache(equipmentId?: string) {
    if (equipmentId) {
      // Get the equipment to find all IDs
      const equipment = await prisma.biomedicalEquipment.findFirst({
        where: { id: equipmentId },
        select: { id: true, serialNumber: true }
      });
      
      if (equipment) {
        // Invalidate specific equipment caches
        await Promise.all([
          cache.del(`${this.CACHE_PREFIX}id:${equipment.id}`),
          cache.del(`${this.CACHE_PREFIX}serial:${equipment.serialNumber}`),
          cache.del(`${this.CACHE_PREFIX}calibration:${equipment.id}`),
          cache.del(`${this.CACHE_PREFIX}maintenance:${equipment.id}`)
        ]);
      }
    }
    
    // Invalidate list caches with pattern matching
    await Promise.all([
      cache.delPattern(`${this.CACHE_PREFIX}list:*`),
      cache.delPattern(`${this.CACHE_PREFIX}due-calibration:*`)
    ]);
  }
  
  /**
   * Calculate equipment reliability metrics
   * New method to support advanced analytics
   */
  async calculateReliabilityMetrics(equipmentId: string) {
    const equipment = await this.getBiomedicalEquipmentById(equipmentId);
    if (!equipment) {
      throw new Error('Equipment not found');
    }
    
    // Get all maintenance records
    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where: { equipmentId },
      orderBy: { date: 'asc' },
    });
    
    // Get all calibration records
    const calibrationRecords = await prisma.calibrationRecord.findMany({
      where: { equipmentId },
      orderBy: { date: 'asc' },
    });
    
    // Calculate mean time between failures (MTBF)
    const correctiveMaintenances = maintenanceRecords.filter(
      record => record.type === 'CORRECTIVE' && record.status === 'COMPLETED'
    );
    
    let mtbf = 0;
    if (correctiveMaintenances.length > 1) {
      let totalTimeBetweenFailures = 0;
      for (let i = 1; i < correctiveMaintenances.length; i++) {
        const timeDiff = correctiveMaintenances[i].date.getTime() - correctiveMaintenances[i-1].date.getTime();
        totalTimeBetweenFailures += timeDiff;
      }
      mtbf = totalTimeBetweenFailures / (correctiveMaintenances.length - 1) / (1000 * 60 * 60 * 24); // in days
    }
    
    // Calculate calibration success rate
    const totalCalibrations = calibrationRecords.length;
    const passedCalibrations = calibrationRecords.filter(record => record.result === 'PASS').length;
    const calibrationSuccessRate = totalCalibrations > 0 ? (passedCalibrations / totalCalibrations) * 100 : 100;
    
    // Calculate downtime
    let totalDowntime = 0;
    for (const record of correctiveMaintenances) {
      // Estimate downtime as 1 day if not specified
      totalDowntime += 1;
    }
    
    // Calculate availability
    const lifespan = equipment.purchaseDate 
      ? (new Date().getTime() - new Date(equipment.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)
      : 365; // Default to 1 year if purchase date not available
    
    const availability = ((lifespan - totalDowntime) / lifespan) * 100;
    
    // Calculate maintenance cost
    const totalMaintenanceCost = maintenanceRecords.reduce((sum, record) => sum + (record.cost || 0), 0);
    
    return {
      equipmentId,
      serialNumber: equipment.serialNumber,
      mtbf,
      calibrationSuccessRate,
      totalDowntime,
      availability,
      totalMaintenanceCost,
      maintenanceCount: maintenanceRecords.length,
      calibrationCount: calibrationRecords.length,
      corrective: correctiveMaintenances.length,
      preventive: maintenanceRecords.filter(record => record.type === 'PREVENTIVE').length,
      safety: maintenanceRecords.filter(record => record.type === 'SAFETY').length,
    };
  }
  
  /**
   * Predict maintenance needs based on historical data
   * New method to support predictive maintenance
   */
  async predictMaintenanceNeeds(equipmentId: string) {
    const equipment = await this.getBiomedicalEquipmentById(equipmentId);
    if (!equipment) {
      throw new Error('Equipment not found');
    }
    
    // Get all maintenance records
    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where: { equipmentId },
      orderBy: { date: 'asc' },
    });
    
    // Get corrective maintenance records
    const correctiveMaintenances = maintenanceRecords.filter(
      record => record.type === 'CORRECTIVE' && record.status === 'COMPLETED'
    );
    
    // Calculate time intervals between failures
    const intervals: number[] = [];
    for (let i = 1; i < correctiveMaintenances.length; i++) {
      const timeDiff = correctiveMaintenances[i].date.getTime() - correctiveMaintenances[i-1].date.getTime();
      intervals.push(timeDiff / (1000 * 60 * 60 * 24)); // in days
    }
    
    // Calculate mean and standard deviation
    let meanInterval = 0;
    let stdDevInterval = 0;
    
    if (intervals.length > 0) {
      meanInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      
      const squaredDiffs = intervals.map(interval => Math.pow(interval - meanInterval, 2));
      const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / intervals.length;
      stdDevInterval = Math.sqrt(variance);
    } else {
      // If no historical data, use manufacturer recommendations or defaults
      meanInterval = equipment.calibrationFrequency || 365; // Default to annual
      stdDevInterval = meanInterval * 0.1; // 10% of mean as standard deviation
    }
    
    // Calculate next predicted failure date
    const lastFailure = correctiveMaintenances.length > 0 
      ? correctiveMaintenances[correctiveMaintenances.length - 1].date
      : equipment.purchaseDate || new Date();
    
    const nextPredictedFailureDate = new Date(lastFailure);
    nextPredictedFailureDate.setDate(nextPredictedFailureDate.getDate() + Math.round(meanInterval));
    
    // Calculate confidence interval (95%)
    const confidenceInterval = 1.96 * stdDevInterval;
    
    const earliestFailureDate = new Date(nextPredictedFailureDate);
    earliestFailureDate.setDate(earliestFailureDate.getDate() - Math.round(confidenceInterval));
    
    const latestFailureDate = new Date(nextPredictedFailureDate);
    latestFailureDate.setDate(latestFailureDate.getDate() + Math.round(confidenceInterval));
    
    // Calculate risk score (0-100)
    const daysSinceLastFailure = (new Date().getTime() - lastFailure.getTime()) / (1000 * 60 * 60 * 24);
    const riskScore = Math.min(100, Math.max(0, (daysSinceLastFailure / meanInterval) * 100));
    
    // Determine recommended preventive maintenance date
    const recommendedMaintenanceDate = new Date(nextPredictedFailureDate);
    recommendedMaintenanceDate.setDate(recommendedMaintenanceDate.getDate() - Math.round(meanInterval * 0.2)); // 20% before predicted failure
    
    return {
      equipmentId,
      serialNumber: equipment.serialNumber,
      meanTimeBetweenFailures: meanInterval,
      standardDeviation: stdDevInterval,
      nextPredictedFailureDate: nextPredictedFailureDate.toISOString(),
      earliestFailureDate: earliestFailureDate.toISOString(),
      latestFailureDate: latestFailureDate.toISOString(),
      riskScore,
      recommendedMaintenanceDate: recommendedMaintenanceDate.toISOString(),
      confidenceInterval,
      dataPoints: correctiveMaintenances.length,
      reliability: correctiveMaintenances.length > 0 ? 'Based on historical data' : 'Based on manufacturer recommendations',
    };
  }
}

export const biomedicalService = new BiomedicalService();
