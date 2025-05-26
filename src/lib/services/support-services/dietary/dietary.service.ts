import { prisma } from '@/lib/prisma';
import { DietaryRequest, MealPlan, Meal, MenuItem, NutritionalProfile } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-logging';
import { toFHIRDietaryRequest, toFHIRMealPlan, toFHIRNutritionalProfile } from '@/lib/models/dietary';
import { NotificationService } from '@/lib/services/notification.service';

export interface DietaryRequestFilter {
  status?: string;
  patientId?: string;
  requestType?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

export interface CreateDietaryRequestData {
  patientId: string;
  requestType: string;
  startDate: Date;
  endDate?: Date;
  mealPreferences: string[];
  dietaryRestrictions: string[];
  allergies: string[];
  specialInstructions?: string;
  requestedBy: string;
}

export class DietaryService {
  private notificationService: NotificationService;
  
  constructor() {
    this.notificationService = new NotificationService();
  }
  
  /**
   * Get dietary requests based on filters
   */
  async getDietaryRequests(filter: DietaryRequestFilter) {
    const { status, patientId, requestType, startDate, endDate, page, limit } = filter;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;
    if (requestType) where.requestType = requestType;
    
    // Date range filter for startDate
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = startDate;
      if (endDate) where.startDate.lte = endDate;
    }
    
    const [requests, total] = await Promise.all([
      prisma.dietaryRequest.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              dateOfBirth: true,
              gender: true
            }
          },
          requestedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          approvedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          mealPlans: {
            take: 5,
            orderBy: { date: 'desc' }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.dietaryRequest.count({ where })
    ]);
    
    // Convert to FHIR format
    const fhirRequests = requests.map(request => toFHIRDietaryRequest(request));
    
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
   * Create a new dietary request
   */
  async createDietaryRequest(data: CreateDietaryRequestData): Promise<DietaryRequest> {
    const { 
      patientId, 
      requestType, 
      startDate, 
      endDate, 
      mealPreferences, 
      dietaryRestrictions, 
      allergies, 
      specialInstructions, 
      requestedBy 
    } = data;
    
    // Validate patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });
    
    if (!patient) {
      throw new Error('Patient not found');
    }
    
    // Create the dietary request
    const request = await prisma.dietaryRequest.create({
      data: {
        patientId,
        requestType,
        status: 'PENDING',
        startDate,
        endDate,
        mealPreferences,
        dietaryRestrictions,
        allergies,
        specialInstructions,
        requestedById: requestedBy
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            dateOfBirth: true,
            gender: true
          }
        },
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
      entityType: 'DIETARY_REQUEST',
      entityId: request.id,
      userId: requestedBy,
      details: `Created ${requestType} dietary request for patient ${patient.name}`
    });
    
    // Send notification to dietary staff
    await this.notificationService.sendNotification({
      type: 'DIETARY_REQUEST',
      title: `New Dietary Request`,
      message: `A new ${requestType} request has been created for patient ${patient.name}`,
      recipientRoles: ['DIETARY_MANAGER', 'NUTRITIONIST'],
      entityId: request.id,
      metadata: {
        requestId: request.id,
        patientId: patientId,
        requestType: requestType
      }
    });
    
    return request;
  }
  
  /**
   * Get a specific dietary request by ID
   */
  async getDietaryRequestById(id: string, includeFHIR: boolean = false): Promise<any> {
    const request = await prisma.dietaryRequest.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            dateOfBirth: true,
            gender: true
          }
        },
        requestedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        mealPlans: {
          include: {
            meals: {
              include: {
                menuItems: true
              }
            }
          },
          orderBy: { date: 'asc' }
        }
      }
    });
    
    if (!request) {
      return null;
    }
    
    if (includeFHIR) {
      return {
        data: request,
        fhir: toFHIRDietaryRequest(request)
      };
    }
    
    return request;
  }
  
  /**
   * Update a dietary request
   */
  async updateDietaryRequest(id: string, data: Partial<DietaryRequest>, userId: string): Promise<DietaryRequest> {
    const request = await prisma.dietaryRequest.findUnique({
      where: { id },
      include: { 
        patient: true
      }
    });
    
    if (!request) {
      throw new Error('Dietary request not found');
    }
    
    // If status is changing to APPROVED, set approvedById
    if (data.status === 'APPROVED' && request.status !== 'APPROVED') {
      data.approvedById = userId;
    }
    
    const updatedRequest = await prisma.dietaryRequest.update({
      where: { id },
      data,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            dateOfBirth: true,
            gender: true
          }
        },
        requestedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        mealPlans: true
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'DIETARY_REQUEST',
      entityId: id,
      userId,
      details: `Updated dietary request for patient ${request.patient.name}${data.status ? ` - Status changed to ${data.status}` : ''}`
    });
    
    // Send notification if status changed
    if (data.status && data.status !== request.status) {
      await this.notificationService.sendNotification({
        type: 'DIETARY_STATUS_CHANGE',
        title: `Dietary Request Status Updated`,
        message: `Request for patient ${request.patient.name} is now ${data.status}`,
        recipientRoles: ['DIETARY_MANAGER'],
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
   * Create a meal plan for a dietary request
   */
  async createMealPlan(requestId: string, data: any, userId: string): Promise<MealPlan> {
    const request = await prisma.dietaryRequest.findUnique({
      where: { id: requestId },
      include: { 
        patient: true
      }
    });
    
    if (!request) {
      throw new Error('Dietary request not found');
    }
    
    // Check if meal plan already exists for this date
    const existingMealPlan = await prisma.mealPlan.findFirst({
      where: {
        requestId,
        date: new Date(data.date)
      }
    });
    
    if (existingMealPlan) {
      throw new Error(`A meal plan already exists for ${new Date(data.date).toISOString().split('T')[0]}`);
    }
    
    // Create the meal plan
    const mealPlan = await prisma.mealPlan.create({
      data: {
        requestId,
        date: new Date(data.date),
        status: 'PLANNED',
        notes: data.notes,
        nutritionalSummary: data.nutritionalSummary || {},
        createdById: userId
      },
      include: {
        request: {
          include: {
            patient: true
          }
        },
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
      entityType: 'MEAL_PLAN',
      entityId: mealPlan.id,
      userId,
      details: `Created meal plan for patient ${request.patient.name} on ${new Date(data.date).toISOString().split('T')[0]}`
    });
    
    return mealPlan;
  }
  
  /**
   * Add a meal to a meal plan
   */
  async addMealToMealPlan(mealPlanId: string, data: any, userId: string): Promise<Meal> {
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
      include: { 
        request: {
          include: {
            patient: true
          }
        }
      }
    });
    
    if (!mealPlan) {
      throw new Error('Meal plan not found');
    }
    
    // Check if meal of this type already exists
    const existingMeal = await prisma.meal.findFirst({
      where: {
        mealPlanId,
        mealType: data.mealType
      }
    });
    
    if (existingMeal) {
      throw new Error(`A ${data.mealType} meal already exists for this meal plan`);
    }
    
    // Create the meal
    const meal = await prisma.meal.create({
      data: {
        mealPlanId,
        mealType: data.mealType,
        calories: data.calories,
        protein: data.protein,
        carbohydrates: data.carbohydrates,
        fat: data.fat,
        status: 'PLANNED',
        deliveryTime: data.deliveryTime ? new Date(data.deliveryTime) : undefined,
        notes: data.notes
      }
    });
    
    // Add menu items if provided
    if (data.menuItems && Array.isArray(data.menuItems) && data.menuItems.length > 0) {
      for (const item of data.menuItems) {
        await prisma.menuItem.create({
          data: {
            mealId: meal.id,
            name: item.name,
            description: item.description,
            category: item.category,
            ingredients: item.ingredients || [],
            calories: item.calories,
            protein: item.protein,
            carbohydrates: item.carbohydrates,
            fat: item.fat,
            isSpecialDiet: item.isSpecialDiet || false,
            dietaryFlags: item.dietaryFlags || []
          }
        });
      }
    }
    
    // Update meal plan nutritional summary
    await this.updateMealPlanNutritionalSummary(mealPlanId);
    
    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entityType: 'MEAL',
      entityId: meal.id,
      userId,
      details: `Added ${data.mealType} meal to meal plan for patient ${mealPlan.request.patient.name}`
    });
    
    // Return the meal with menu items
    return prisma.meal.findUnique({
      where: { id: meal.id },
      include: {
        menuItems: true
      }
    }) as Promise<Meal>;
  }
  
  /**
   * Update meal plan nutritional summary
   */
  private async updateMealPlanNutritionalSummary(mealPlanId: string): Promise<void> {
    // Get all meals for this meal plan
    const meals = await prisma.meal.findMany({
      where: { mealPlanId },
      include: {
        menuItems: true
      }
    });
    
    // Calculate totals
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbohydrates = 0;
    let totalFat = 0;
    
    for (const meal of meals) {
      totalCalories += meal.calories || 0;
      totalProtein += meal.protein || 0;
      totalCarbohydrates += meal.carbohydrates || 0;
      totalFat += meal.fat || 0;
    }
    
    // Create summary by meal type
    const mealSummary: Record<string, any> = {};
    for (const meal of meals) {
      mealSummary[meal.mealType] = {
        calories: meal.calories || 0,
        protein: meal.protein || 0,
        carbohydrates: meal.carbohydrates || 0,
        fat: meal.fat || 0,
        menuItems: meal.menuItems.length
      };
    }
    
    // Update meal plan
    await prisma.mealPlan.update({
      where: { id: mealPlanId },
      data: {
        nutritionalSummary: {
          totalCalories,
          totalProtein,
          totalCarbohydrates,
          totalFat,
          mealSummary
        }
      }
    });
  }
  
  /**
   * Update a meal plan
   */
  async updateMealPlan(id: string, data: Partial<MealPlan>, userId: string): Promise<MealPlan> {
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id },
      include: { 
        request: {
          include: {
            patient: true
          }
        }
      }
    });
    
    if (!mealPlan) {
      throw new Error('Meal plan not found');
    }
    
    const updatedMealPlan = await prisma.mealPlan.update({
      where: { id },
      data,
      include: {
        request: {
          include: {
            patient: true
          }
        },
        meals: {
          include: {
            menuItems: true
          }
        },
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
      entityType: 'MEAL_PLAN',
      entityId: id,
      userId,
      details: `Updated meal plan for patient ${mealPlan.request.patient.name}${data.status ? ` - Status changed to ${data.status}` : ''}`
    });
    
    // Send notification if status changed to PREPARED
    if (data.status === 'PREPARED' && mealPlan.status !== 'PREPARED') {
      await this.notificationService.sendNotification({
        type: 'MEAL_PLAN_PREPARED',
        title: `Meal Plan Prepared`,
        message: `Meal plan for patient ${mealPlan.request.patient.name} on ${mealPlan.date.toISOString().split('T')[0]} is ready for delivery`,
        recipientRoles: ['DIETARY_STAFF', 'NURSE'],
        entityId: mealPlan.id,
        metadata: {
          mealPlanId: mealPlan.id,
          requestId: mealPlan.requestId,
          patientId: mealPlan.request.patientId
        }
      });
    }
    
    return updatedMealPlan;
  }
  
  /**
   * Update a meal
   */
  async updateMeal(id: string, data: Partial<Meal>, userId: string): Promise<Meal> {
    const meal = await prisma.meal.findUnique({
      where: { id },
      include: { 
        mealPlan: {
          include: {
            request: {
              include: {
                patient: true
              }
            }
          }
        }
      }
    });
    
    if (!meal) {
      throw new Error('Meal not found');
    }
    
    const updatedMeal = await prisma.meal.update({
      where: { id },
      data,
      include: {
        menuItems: true,
        mealPlan: {
          include: {
            request: {
              include: {
                patient: true
              }
            }
          }
        }
      }
    });
    
    // Update meal plan nutritional summary if nutritional values changed
    if (data.calories !== undefined || data.protein !== undefined || 
        data.carbohydrates !== undefined || data.fat !== undefined) {
      await this.updateMealPlanNutritionalSummary(meal.mealPlanId);
    }
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'MEAL',
      entityId: id,
      userId,
      details: `Updated ${meal.mealType} meal for patient ${meal.mealPlan.request.patient.name}${data.status ? ` - Status changed to ${data.status}` : ''}`
    });
    
    // If meal status changed to DELIVERED, update meal plan status if all meals are delivered
    if (data.status === 'DELIVERED' && meal.status !== 'DELIVERED') {
      const allMeals = await prisma.meal.findMany({
        where: { mealPlanId: meal.mealPlanId }
      });
      
      const allDelivered = allMeals.every(m => m.id === id ? true : m.status === 'DELIVERED');
      
      if (allDelivered) {
        await prisma.mealPlan.update({
          where: { id: meal.mealPlanId },
          data: { status: 'DELIVERED' }
        });
        
        // Send notification that all meals are delivered
        await this.notificationService.sendNotification({
          type: 'MEALS_DELIVERED',
          title: `All Meals Delivered`,
          message: `All meals for patient ${meal.mealPlan.request.patient.name} on ${meal.mealPlan.date.toISOString().split('T')[0]} have been delivered`,
          recipientRoles: ['NURSE'],
          entityId: meal.mealPlanId,
          metadata: {
            mealPlanId: meal.mealPlanId,
            requestId: meal.mealPlan.requestId,
            patientId: meal.mealPlan.request.patientId
          }
        });
      }
    }
    
    return updatedMeal;
  }
  
  /**
   * Get or create nutritional profile for a patient
   */
  async getOrCreateNutritionalProfile(patientId: string, userId: string): Promise<NutritionalProfile> {
    // Check if profile exists
    let profile = await prisma.nutritionalProfile.findUnique({
      where: { patientId },
      include: {
        patient: true,
        lastUpdatedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // If not, create a new one
    if (!profile) {
      // Validate patient exists
      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      });
      
      if (!patient) {
        throw new Error('Patient not found');
      }
      
      profile = await prisma.nutritionalProfile.create({
        data: {
          patientId,
          dietaryPreferences: [],
          dietaryRestrictions: [],
          allergies: [],
          medicalConditions: [],
          lastUpdatedById: userId
        },
        include: {
          patient: true,
          lastUpdatedByUser: {
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
        entityType: 'NUTRITIONAL_PROFILE',
        entityId: profile.id,
        userId,
        details: `Created nutritional profile for patient ${patient.name}`
      });
    }
    
    return profile;
  }
  
  /**
   * Update nutritional profile
   */
  async updateNutritionalProfile(id: string, data: Partial<NutritionalProfile>, userId: string): Promise<NutritionalProfile> {
    const profile = await prisma.nutritionalProfile.findUnique({
      where: { id },
      include: { 
        patient: true
      }
    });
    
    if (!profile) {
      throw new Error('Nutritional profile not found');
    }
    
    // Calculate BMI if height and weight are provided
    if (data.height !== undefined && data.weight !== undefined) {
      const heightInMeters = data.height / 100;
      data.bmi = parseFloat((data.weight / (heightInMeters * heightInMeters)).toFixed(1));
    } else if (data.height !== undefined && profile.weight) {
      const heightInMeters = data.height / 100;
      data.bmi = parseFloat((profile.weight / (heightInMeters * heightInMeters)).toFixed(1));
    } else if (data.weight !== undefined && profile.height) {
      const heightInMeters = profile.height / 100;
      data.bmi = parseFloat((data.weight / (heightInMeters * heightInMeters)).toFixed(1));
    }
    
    // Always update the lastUpdatedById
    data.lastUpdatedById = userId;
    
    const updatedProfile = await prisma.nutritionalProfile.update({
      where: { id },
      data,
      include: {
        patient: true,
        lastUpdatedByUser: {
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
      entityType: 'NUTRITIONAL_PROFILE',
      entityId: id,
      userId,
      details: `Updated nutritional profile for patient ${profile.patient.name}`
    });
    
    return updatedProfile;
  }
  
  /**
   * Get menu templates
   */
  async getMenuTemplates(filter: any) {
    const { mealType, category, isActive, page, limit } = filter;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (mealType) where.mealType = mealType;
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;
    
    const [templates, total] = await Promise.all([
      prisma.menuTemplate.findMany({
        where,
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.menuTemplate.count({ where })
    ]);
    
    return {
      data: templates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Create menu template
   */
  async createMenuTemplate(data: any, userId: string): Promise<any> {
    const template = await prisma.menuTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        mealType: data.mealType,
        category: data.category,
        items: data.items || [],
        isActive: true,
        createdById: userId
      },
      include: {
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
      entityType: 'MENU_TEMPLATE',
      entityId: template.id,
      userId,
      details: `Created menu template: ${template.name}`
    });
    
    return template;
  }
  
  /**
   * Get dietary inventory items
   */
  async getDietaryInventory(filter: any) {
    const { category, lowStock, page, limit } = filter;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (category) where.category = category;
    if (lowStock === true) {
      where.currentStock = {
        lte: prisma.dietaryInventory.fields.minimumStock
      };
    }
    
    const [items, total] = await Promise.all([
      prisma.dietaryInventory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { itemName: 'asc' }
      }),
      prisma.dietaryInventory.count({ where })
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
  async updateInventoryItem(id: string, data: Partial<any>, userId: string): Promise<any> {
    const item = await prisma.dietaryInventory.findUnique({
      where: { id }
    });
    
    if (!item) {
      throw new Error('Inventory item not found');
    }
    
    // If restocking, update lastRestocked date
    if (data.currentStock !== undefined && data.currentStock > item.currentStock) {
      data.lastRestocked = new Date();
    }
    
    const updatedItem = await prisma.dietaryInventory.update({
      where: { id },
      data
    });
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'DIETARY_INVENTORY',
      entityId: id,
      userId,
      details: `Updated inventory for ${item.itemName}, stock: ${item.currentStock} → ${data.currentStock || item.currentStock}`
    });
    
    // Check if item is low on stock after update
    if (updatedItem.currentStock <= updatedItem.minimumStock) {
      await this.notificationService.sendNotification({
        type: 'DIETARY_INVENTORY_LOW',
        title: `Low Inventory Alert`,
        message: `${updatedItem.itemName} is running low (${updatedItem.currentStock} ${updatedItem.unit} remaining)`,
        recipientRoles: ['DIETARY_MANAGER', 'INVENTORY_MANAGER'],
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
   * Get dietary analytics
   */
  async getDietaryAnalytics(period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY') {
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
    const requestsByStatus = await prisma.dietaryRequest.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true
    });
    
    // Get request counts by type
    const requestsByType = await prisma.dietaryRequest.groupBy({
      by: ['requestType'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true
    });
    
    // Get meal counts by type
    const mealsByType = await prisma.meal.groupBy({
      by: ['mealType'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true
    });
    
    // Get average nutritional values
    const mealPlans = await prisma.mealPlan.findMany({
      where: {
        createdAt: {
          gte: startDate
        },
        nutritionalSummary: {
          not: null
        }
      },
      select: {
        nutritionalSummary: true
      }
    });
    
    // Calculate average nutritional values
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let count = 0;
    
    for (const plan of mealPlans) {
      if (plan.nutritionalSummary && typeof plan.nutritionalSummary === 'object') {
        const summary = plan.nutritionalSummary as any;
        if (summary.totalCalories) {
          totalCalories += summary.totalCalories;
          totalProtein += summary.totalProtein || 0;
          totalCarbs += summary.totalCarbohydrates || 0;
          totalFat += summary.totalFat || 0;
          count++;
        }
      }
    }
    
    const averageNutrition = count > 0 ? {
      calories: Math.round(totalCalories / count),
      protein: Math.round(totalProtein / count),
      carbohydrates: Math.round(totalCarbs / count),
      fat: Math.round(totalFat / count)
    } : null;
    
    // Get most common dietary restrictions
    const profiles = await prisma.nutritionalProfile.findMany({
      select: {
        dietaryRestrictions: true,
        allergies: true
      }
    });
    
    const restrictionCounts: Record<string, number> = {};
    const allergyCounts: Record<string, number> = {};
    
    for (const profile of profiles) {
      for (const restriction of profile.dietaryRestrictions) {
        restrictionCounts[restriction] = (restrictionCounts[restriction] || 0) + 1;
      }
      
      for (const allergy of profile.allergies) {
        allergyCounts[allergy] = (allergyCounts[allergy] || 0) + 1;
      }
    }
    
    // Sort restrictions and allergies by frequency
    const topRestrictions = Object.entries(restrictionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
    
    const topAllergies = Object.entries(allergyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
    
    return {
      requestsByStatus,
      requestsByType,
      mealsByType,
      averageNutrition,
      topRestrictions,
      topAllergies,
      period
    };
  }
}
