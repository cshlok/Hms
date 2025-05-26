import { prisma } from '@/lib/prisma';
import { HousekeepingRequest, HousekeepingTask, HousekeepingSchedule, HousekeepingInspection, HousekeepingInventory } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-logging';
import { toFHIRHousekeepingRequest, toFHIRHousekeepingTask, toFHIRHousekeepingInspection } from '@/lib/models/housekeeping';
import { NotificationService } from '@/lib/services/notification.service';

export interface HousekeepingRequestFilter {
  status?: string;
  locationId?: string;
  priority?: string;
  requestType?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

export interface CreateHousekeepingRequestData {
  locationId: string;
  requestType: string;
  description: string;
  priority: string;
  requestedBy: string;
  scheduledDate?: Date;
  notes?: string;
}

export class HousekeepingService {
  private notificationService: NotificationService;
  
  constructor() {
    this.notificationService = new NotificationService();
  }
  
  /**
   * Get housekeeping requests based on filters
   */
  async getHousekeepingRequests(filter: HousekeepingRequestFilter) {
    const { status, locationId, priority, requestType, startDate, endDate, page, limit } = filter;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (status) where.status = status;
    if (locationId) where.locationId = locationId;
    if (priority) where.priority = priority;
    if (requestType) where.requestType = requestType;
    
    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    
    const [requests, total] = await Promise.all([
      prisma.housekeepingRequest.findMany({
        where,
        include: {
          location: true,
          requestedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          tasks: {
            include: {
              assignedToUser: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.housekeepingRequest.count({ where })
    ]);
    
    // Convert to FHIR format if requested
    const fhirRequests = requests.map(request => toFHIRHousekeepingRequest(request));
    
    return {
      data: requests,
      fhir: fhirRequests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Create a new housekeeping request
   */
  async createHousekeepingRequest(data: CreateHousekeepingRequestData): Promise<HousekeepingRequest> {
    const { locationId, requestType, description, priority, requestedBy, scheduledDate, notes } = data;
    
    // Validate location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    });
    
    if (!location) {
      throw new Error('Location not found');
    }
    
    // Create the housekeeping request
    const request = await prisma.housekeepingRequest.create({
      data: {
        locationId,
        requestType,
        description,
        priority,
        status: 'PENDING',
        requestedById: requestedBy,
        scheduledDate,
        notes
      },
      include: {
        location: true,
        requestedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entityType: 'HOUSEKEEPING_REQUEST',
      entityId: request.id,
      userId: requestedBy,
      details: `Created housekeeping request for ${location.name}`
    });
    
    // Send notification to housekeeping staff
    await this.notificationService.sendNotification({
      type: 'HOUSEKEEPING_REQUEST',
      title: `New ${priority} Housekeeping Request`,
      message: `A new ${requestType} request has been created for ${location.name}`,
      recipientRoles: ['HOUSEKEEPING_MANAGER', 'HOUSEKEEPING_STAFF'],
      entityId: request.id,
      metadata: {
        requestId: request.id,
        locationId: locationId,
        priority: priority
      }
    });
    
    return request;
  }
  
  /**
   * Get a specific housekeeping request by ID
   */
  async getHousekeepingRequestById(id: string, includeFHIR: boolean = false): Promise<any> {
    const request = await prisma.housekeepingRequest.findUnique({
      where: { id },
      include: {
        location: true,
        requestedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        tasks: {
          include: {
            assignedToUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    if (!request) {
      return null;
    }
    
    if (includeFHIR) {
      return {
        data: request,
        fhir: toFHIRHousekeepingRequest(request)
      };
    }
    
    return request;
  }
  
  /**
   * Update a housekeeping request
   */
  async updateHousekeepingRequest(id: string, data: Partial<HousekeepingRequest>, userId: string): Promise<HousekeepingRequest> {
    const request = await prisma.housekeepingRequest.findUnique({
      where: { id },
      include: { location: true }
    });
    
    if (!request) {
      throw new Error('Housekeeping request not found');
    }
    
    // Check if status is changing to completed
    const isCompleting = data.status === 'COMPLETED' && request.status !== 'COMPLETED';
    
    // If completing, ensure all tasks are completed
    if (isCompleting) {
      const incompleteTasks = await prisma.housekeepingTask.count({
        where: {
          requestId: id,
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        }
      });
      
      if (incompleteTasks > 0) {
        throw new Error('Cannot mark request as completed while tasks are still pending');
      }
      
      // Set completed date
      data.completedDate = new Date();
    }
    
    const updatedRequest = await prisma.housekeepingRequest.update({
      where: { id },
      data,
      include: {
        location: true,
        requestedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        tasks: {
          include: {
            assignedToUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'HOUSEKEEPING_REQUEST',
      entityId: id,
      userId,
      details: `Updated housekeeping request for ${request.location.name}${data.status ? ` - Status changed to ${data.status}` : ''}`
    });
    
    // Send notification if status changed
    if (data.status && data.status !== request.status) {
      await this.notificationService.sendNotification({
        type: 'HOUSEKEEPING_STATUS_CHANGE',
        title: `Housekeeping Request Status Updated`,
        message: `Request for ${request.location.name} is now ${data.status}`,
        recipientRoles: ['HOUSEKEEPING_MANAGER'],
        recipientIds: [request.requestedById],
        entityId: request.id,
        metadata: {
          requestId: request.id,
          oldStatus: request.status,
          newStatus: data.status
        }
      });
    }
    
    return updatedRequest;
  }
  
  /**
   * Create a task for a housekeeping request
   */
  async createHousekeepingTask(requestId: string, data: any, userId: string): Promise<HousekeepingTask> {
    const request = await prisma.housekeepingRequest.findUnique({
      where: { id: requestId },
      include: { location: true }
    });
    
    if (!request) {
      throw new Error('Housekeeping request not found');
    }
    
    // If request is in PENDING status, update to ASSIGNED
    if (request.status === 'PENDING' && data.assignedToId) {
      await prisma.housekeepingRequest.update({
        where: { id: requestId },
        data: { status: 'ASSIGNED' }
      });
    }
    
    const task = await prisma.housekeepingTask.create({
      data: {
        requestId,
        description: data.description,
        status: 'PENDING',
        assignedToId: data.assignedToId,
        createdById: userId,
        notes: data.notes
      },
      include: {
        assignedToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entityType: 'HOUSEKEEPING_TASK',
      entityId: task.id,
      userId,
      details: `Created housekeeping task for request ${requestId}`
    });
    
    // Send notification to assigned staff
    if (data.assignedToId) {
      await this.notificationService.sendNotification({
        type: 'HOUSEKEEPING_TASK_ASSIGNED',
        title: `New Housekeeping Task Assigned`,
        message: `You have been assigned a new task: ${data.description}`,
        recipientIds: [data.assignedToId],
        entityId: task.id,
        metadata: {
          taskId: task.id,
          requestId: requestId,
          locationId: request.locationId
        }
      });
    }
    
    return task;
  }
  
  /**
   * Update a housekeeping task
   */
  async updateHousekeepingTask(id: string, data: Partial<HousekeepingTask>, userId: string): Promise<HousekeepingTask> {
    const task = await prisma.housekeepingTask.findUnique({
      where: { id },
      include: {
        request: true
      }
    });
    
    if (!task) {
      throw new Error('Housekeeping task not found');
    }
    
    // Handle status transitions
    if (data.status) {
      // If starting task, set start time
      if (data.status === 'IN_PROGRESS' && task.status !== 'IN_PROGRESS') {
        data.startTime = new Date();
        
        // Also update request status if it's not already in progress
        if (task.request.status !== 'IN_PROGRESS') {
          await prisma.housekeepingRequest.update({
            where: { id: task.requestId },
            data: { status: 'IN_PROGRESS' }
          });
        }
      }
      
      // If completing task, set end time and calculate duration
      if (data.status === 'COMPLETED' && task.status !== 'COMPLETED') {
        const endTime = new Date();
        data.endTime = endTime;
        
        // Calculate duration in minutes if we have a start time
        if (task.startTime) {
          const durationMs = endTime.getTime() - task.startTime.getTime();
          data.duration = Math.round(durationMs / 60000); // Convert ms to minutes
        }
      }
    }
    
    const updatedTask = await prisma.housekeepingTask.update({
      where: { id },
      data,
      include: {
        assignedToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        request: {
          include: {
            location: true
          }
        }
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'HOUSEKEEPING_TASK',
      entityId: id,
      userId,
      details: `Updated housekeeping task status to ${data.status}`
    });
    
    // If task is completed, check if all tasks are completed to update request status
    if (data.status === 'COMPLETED') {
      const allTasks = await prisma.housekeepingTask.findMany({
        where: { requestId: task.requestId }
      });
      
      const allCompleted = allTasks.every(t => t.status === 'COMPLETED' || t.status === 'CANCELLED');
      
      if (allCompleted) {
        await prisma.housekeepingRequest.update({
          where: { id: task.requestId },
          data: { 
            status: 'COMPLETED',
            completedDate: new Date()
          }
        });
        
        // Send notification that request is complete
        await this.notificationService.sendNotification({
          type: 'HOUSEKEEPING_REQUEST_COMPLETED',
          title: `Housekeeping Request Completed`,
          message: `Request for ${updatedTask.request.location.name} has been completed`,
          recipientIds: [updatedTask.request.requestedById],
          entityId: task.requestId,
          metadata: {
            requestId: task.requestId,
            locationId: updatedTask.request.locationId
          }
        });
      }
    }
    
    return updatedTask;
  }
  
  /**
   * Get housekeeping schedules
   */
  async getHousekeepingSchedules(locationId?: string) {
    const where: any = {};
    if (locationId) where.locationId = locationId;
    
    return prisma.housekeepingSchedule.findMany({
      where,
      include: {
        location: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { nextRun: 'asc' }
    });
  }
  
  /**
   * Create a housekeeping schedule
   */
  async createHousekeepingSchedule(data: any, userId: string): Promise<HousekeepingSchedule> {
    const { locationId, scheduleType, frequency, dayOfWeek, timeOfDay, taskTemplate } = data;
    
    // Validate location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    });
    
    if (!location) {
      throw new Error('Location not found');
    }
    
    // Calculate next run date
    const nextRun = this.calculateNextRunDate(scheduleType, frequency, dayOfWeek, timeOfDay);
    
    const schedule = await prisma.housekeepingSchedule.create({
      data: {
        locationId,
        scheduleType,
        frequency,
        dayOfWeek,
        timeOfDay,
        taskTemplate,
        isActive: true,
        nextRun,
        createdById: userId
      },
      include: {
        location: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entityType: 'HOUSEKEEPING_SCHEDULE',
      entityId: schedule.id,
      userId,
      details: `Created ${scheduleType} housekeeping schedule for ${location.name}`
    });
    
    return schedule;
  }
  
  /**
   * Update a housekeeping schedule
   */
  async updateHousekeepingSchedule(id: string, data: any, userId: string): Promise<HousekeepingSchedule> {
    const schedule = await prisma.housekeepingSchedule.findUnique({
      where: { id },
      include: { location: true }
    });
    
    if (!schedule) {
      throw new Error('Housekeeping schedule not found');
    }
    
    // If schedule parameters changed, recalculate next run
    let nextRun = schedule.nextRun;
    if (
      data.scheduleType !== undefined ||
      data.frequency !== undefined ||
      data.dayOfWeek !== undefined ||
      data.timeOfDay !== undefined
    ) {
      const scheduleType = data.scheduleType || schedule.scheduleType;
      const frequency = data.frequency || schedule.frequency;
      const dayOfWeek = data.dayOfWeek !== undefined ? data.dayOfWeek : schedule.dayOfWeek;
      const timeOfDay = data.timeOfDay || schedule.timeOfDay;
      
      nextRun = this.calculateNextRunDate(scheduleType, frequency, dayOfWeek, timeOfDay);
      data.nextRun = nextRun;
    }
    
    const updatedSchedule = await prisma.housekeepingSchedule.update({
      where: { id },
      data,
      include: {
        location: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'HOUSEKEEPING_SCHEDULE',
      entityId: id,
      userId,
      details: `Updated housekeeping schedule for ${schedule.location.name}`
    });
    
    return updatedSchedule;
  }
  
  /**
   * Process due housekeeping schedules and create requests
   */
  async processDueSchedules(userId: string): Promise<number> {
    const now = new Date();
    
    // Find all active schedules that are due
    const dueSchedules = await prisma.housekeepingSchedule.findMany({
      where: {
        isActive: true,
        nextRun: {
          lte: now
        }
      },
      include: {
        location: true
      }
    });
    
    let createdCount = 0;
    
    // Process each due schedule
    for (const schedule of dueSchedules) {
      try {
        // Create a new request based on the schedule
        await prisma.housekeepingRequest.create({
          data: {
            locationId: schedule.locationId,
            requestType: schedule.scheduleType === 'DAILY' ? 'REGULAR_CLEANING' : 'DEEP_CLEANING',
            description: `Scheduled ${schedule.scheduleType.toLowerCase()} cleaning for ${schedule.location.name}`,
            priority: 'MEDIUM',
            status: 'PENDING',
            requestedById: userId,
            scheduledDate: new Date(),
            notes: `Automatically generated from schedule ${schedule.id}`
          }
        });
        
        createdCount++;
        
        // Update the schedule with last run and calculate next run
        const lastRun = new Date();
        const nextRun = this.calculateNextRunDate(
          schedule.scheduleType,
          schedule.frequency,
          schedule.dayOfWeek,
          schedule.timeOfDay,
          lastRun
        );
        
        await prisma.housekeepingSchedule.update({
          where: { id: schedule.id },
          data: {
            lastRun,
            nextRun
          }
        });
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
        // Continue with other schedules even if one fails
      }
    }
    
    return createdCount;
  }
  
  /**
   * Get housekeeping inspections
   */
  async getHousekeepingInspections(filter: any) {
    const { locationId, status, startDate, endDate, page, limit } = filter;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    
    // Date range filter
    if (startDate || endDate) {
      where.inspectionDate = {};
      if (startDate) where.inspectionDate.gte = startDate;
      if (endDate) where.inspectionDate.lte = endDate;
    }
    
    const [inspections, total] = await Promise.all([
      prisma.housekeepingInspection.findMany({
        where,
        include: {
          location: true,
          inspector: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { inspectionDate: 'desc' }
      }),
      prisma.housekeepingInspection.count({ where })
    ]);
    
    // Convert to FHIR format if requested
    const fhirInspections = inspections.map(inspection => toFHIRHousekeepingInspection(inspection));
    
    return {
      data: inspections,
      fhir: fhirInspections,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Create a housekeeping inspection
   */
  async createHousekeepingInspection(data: any, userId: string): Promise<HousekeepingInspection> {
    const { locationId, inspectionType, inspectorId, score, status, findings, recommendations, inspectionDate } = data;
    
    // Validate location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    });
    
    if (!location) {
      throw new Error('Location not found');
    }
    
    const inspection = await prisma.housekeepingInspection.create({
      data: {
        locationId,
        inspectionType,
        inspectorId: inspectorId || userId,
        score,
        status,
        findings,
        recommendations,
        inspectionDate: inspectionDate || new Date()
      },
      include: {
        location: true,
        inspector: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entityType: 'HOUSEKEEPING_INSPECTION',
      entityId: inspection.id,
      userId,
      details: `Created ${inspectionType} inspection for ${location.name}`
    });
    
    // If inspection failed, create a follow-up cleaning request
    if (status === 'FAILED' || (score !== null && score < 70)) {
      await this.createHousekeepingRequest({
        locationId,
        requestType: 'DEEP_CLEANING',
        description: `Follow-up cleaning required based on failed inspection`,
        priority: 'HIGH',
        requestedBy: userId,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Schedule for next day
        notes: `Inspection ID: ${inspection.id}\nFindings: ${findings || 'None provided'}`
      });
      
      // Send notification about failed inspection
      await this.notificationService.sendNotification({
        type: 'HOUSEKEEPING_INSPECTION_FAILED',
        title: `Housekeeping Inspection Failed`,
        message: `Location ${location.name} failed inspection. Follow-up cleaning has been scheduled.`,
        recipientRoles: ['HOUSEKEEPING_MANAGER'],
        entityId: inspection.id,
        metadata: {
          inspectionId: inspection.id,
          locationId: locationId,
          score: score
        }
      });
    }
    
    return inspection;
  }
  
  /**
   * Get housekeeping inventory items
   */
  async getHousekeepingInventory(filter: any) {
    const { itemType, lowStock, page, limit } = filter;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (itemType) where.itemType = itemType;
    if (lowStock === true) {
      where.currentStock = {
        lte: prisma.housekeepingInventory.fields.minimumStock
      };
    }
    
    const [items, total] = await Promise.all([
      prisma.housekeepingInventory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { itemName: 'asc' }
      }),
      prisma.housekeepingInventory.count({ where })
    ]);
    
    return {
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Update inventory item
   */
  async updateInventoryItem(id: string, data: Partial<HousekeepingInventory>, userId: string): Promise<HousekeepingInventory> {
    const item = await prisma.housekeepingInventory.findUnique({
      where: { id }
    });
    
    if (!item) {
      throw new Error('Inventory item not found');
    }
    
    // If restocking, update lastRestocked date
    if (data.currentStock !== undefined && data.currentStock > item.currentStock) {
      data.lastRestocked = new Date();
    }
    
    const updatedItem = await prisma.housekeepingInventory.update({
      where: { id },
      data
    });
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'HOUSEKEEPING_INVENTORY',
      entityId: id,
      userId,
      details: `Updated inventory for ${item.itemName}, stock: ${item.currentStock} → ${data.currentStock || item.currentStock}`
    });
    
    // Check if item is low on stock after update
    if (updatedItem.currentStock <= updatedItem.minimumStock) {
      await this.notificationService.sendNotification({
        type: 'HOUSEKEEPING_INVENTORY_LOW',
        title: `Low Inventory Alert`,
        message: `${updatedItem.itemName} is running low (${updatedItem.currentStock} ${updatedItem.unit} remaining)`,
        recipientRoles: ['HOUSEKEEPING_MANAGER', 'INVENTORY_MANAGER'],
        entityId: updatedItem.id,
        metadata: {
          itemId: updatedItem.id,
          currentStock: updatedItem.currentStock,
          minimumStock: updatedItem.minimumStock
        }
      });
    }
    
    return updatedItem;
  }
  
  /**
   * Get housekeeping analytics
   */
  async getHousekeepingAnalytics(period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY') {
    // Get date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'DAILY':
        startDate = new Date(now.setDate(now.getDate() - 30)); // Last 30 days
        break;
      case 'WEEKLY':
        startDate = new Date(now.setDate(now.getDate() - 90)); // Last 90 days
        break;
      case 'MONTHLY':
        startDate = new Date(now.setMonth(now.getMonth() - 12)); // Last 12 months
        break;
      case 'YEARLY':
        startDate = new Date(now.setFullYear(now.getFullYear() - 5)); // Last 5 years
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 30)); // Default to last 30 days
    }
    
    // Get request counts by status
    const requestsByStatus = await prisma.housekeepingRequest.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true
    });
    
    // Get request counts by type
    const requestsByType = await prisma.housekeepingRequest.groupBy({
      by: ['requestType'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true
    });
    
    // Get average completion time
    const completionTime = await prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM ("completedDate" - "createdAt"))/3600) as avg_hours
      FROM "HousekeepingRequest"
      WHERE "status" = 'COMPLETED'
      AND "createdAt" >= ${startDate}
      AND "completedDate" IS NOT NULL
    `;
    
    // Get inspection scores over time
    const inspectionScores = await prisma.housekeepingInspection.findMany({
      where: {
        inspectionDate: {
          gte: startDate
        },
        score: {
          not: null
        }
      },
      select: {
        inspectionDate: true,
        score: true,
        locationId: true,
        location: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        inspectionDate: 'asc'
      }
    });
    
    // Get top 5 locations with most requests
    const topLocations = await prisma.housekeepingRequest.groupBy({
      by: ['locationId'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true,
      orderBy: {
        _count: {
          locationId: 'desc'
        }
      },
      take: 5
    });
    
    // Get location details for top locations
    const locationDetails = await prisma.location.findMany({
      where: {
        id: {
          in: topLocations.map(loc => loc.locationId)
        }
      },
      select: {
        id: true,
        name: true
      }
    });
    
    // Map location names to the top locations
    const topLocationsWithNames = topLocations.map(loc => ({
      locationId: loc.locationId,
      count: loc._count,
      name: locationDetails.find(l => l.id === loc.locationId)?.name || 'Unknown'
    }));
    
    return {
      requestsByStatus,
      requestsByType,
      completionTime,
      inspectionScores,
      topLocations: topLocationsWithNames,
      period
    };
  }
  
  /**
   * Calculate next run date for a schedule
   */
  private calculateNextRunDate(
    scheduleType: string,
    frequency: number,
    dayOfWeek: number | null,
    timeOfDay: Date | null,
    baseDate: Date = new Date()
  ): Date {
    const result = new Date(baseDate);
    
    // Set time component if provided
    if (timeOfDay) {
      result.setHours(timeOfDay.getHours());
      result.setMinutes(timeOfDay.getMinutes());
      result.setSeconds(0);
      result.setMilliseconds(0);
    } else {
      // Default to 8:00 AM
      result.setHours(8);
      result.setMinutes(0);
      result.setSeconds(0);
      result.setMilliseconds(0);
    }
    
    // If the calculated time is in the past, move to the next occurrence
    if (result < baseDate) {
      // For daily, just move to tomorrow
      if (scheduleType === 'DAILY') {
        result.setDate(result.getDate() + 1);
      }
    }
    
    switch (scheduleType) {
      case 'DAILY':
        result.setDate(result.getDate() + frequency);
        break;
      
      case 'WEEKLY':
        if (dayOfWeek !== null) {
          // Move to the next occurrence of the specified day of week
          const currentDay = result.getDay();
          let daysToAdd = (dayOfWeek - currentDay + 7) % 7;
          if (daysToAdd === 0 && result < baseDate) {
            daysToAdd = 7;
          }
          result.setDate(result.getDate() + daysToAdd);
          
          // Add weeks based on frequency
          if (frequency > 1) {
            result.setDate(result.getDate() + (frequency - 1) * 7);
          }
        } else {
          // If no day specified, just add weeks based on frequency
          result.setDate(result.getDate() + frequency * 7);
        }
        break;
      
      case 'MONTHLY':
        result.setMonth(result.getMonth() + frequency);
        break;
      
      case 'QUARTERLY':
        result.setMonth(result.getMonth() + frequency * 3);
        break;
      
      case 'ANNUAL':
        result.setFullYear(result.getFullYear() + frequency);
        break;
    }
    
    return result;
  }
}
