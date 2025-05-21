import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Create enums to match Prisma schema
export enum DietType {
  REGULAR = 'REGULAR',
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
  GLUTEN_FREE = 'GLUTEN_FREE',
  DIABETIC = 'DIABETIC',
  LOW_SODIUM = 'LOW_SODIUM',
  LIQUID = 'LIQUID',
  SOFT = 'SOFT',
  NPO = 'NPO',
  CUSTOM = 'CUSTOM'
}

export enum DietOrderStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Validation schemas
export const createDietOrderSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  dietType: z.nativeEnum(DietType),
  instructions: z.string().optional(),
  startDate: z.date().default(() => new Date()),
  endDate: z.date().optional().nullable(),
  status: z.nativeEnum(DietOrderStatus).default(DietOrderStatus.ACTIVE),
  createdBy: z.string().min(1, 'Creator ID is required'),
  notes: z.string().optional(),
});

export const updateDietOrderSchema = createDietOrderSchema.partial().extend({
  id: z.string(),
});

export type CreateDietOrderInput = z.infer<typeof createDietOrderSchema>;
export type UpdateDietOrderInput = z.infer<typeof updateDietOrderSchema>;

// Import prisma client
import { prisma } from '../lib/prisma';

/**
 * Service class for managing dietary orders
 */
export class DietaryService {
  /**
   * Create a new diet order
   * @param data Diet order data
   * @returns The created diet order
   */
  async createOrder(data: CreateDietOrderInput) {
    try {
      // Validate input data
      const validatedData = createDietOrderSchema.parse(data);
      
      // Create the diet order
      const order = await prisma.dietOrder.create({
        data: validatedData,
      });
      
      return order;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get all diet orders with optional filtering
   * @param filters Optional filters for status, dietType, patientId, or date range
   * @returns Array of diet orders matching the filters
   */
  async getOrders(filters?: {
    status?: string;
    dietType?: string;
    patientId?: string;
    activeOn?: Date;
  }) {
    try {
      const where: any = {};
      
      if (filters) {
        if (filters.status) {
          where.status = filters.status;
        }
        if (filters.dietType) {
          where.dietType = filters.dietType;
        }
        if (filters.patientId) {
          where.patientId = filters.patientId;
        }
        if (filters.activeOn) {
          // Find orders active on the specified date
          where.startDate = { lte: filters.activeOn };
          where.OR = [
            { endDate: null },
            { endDate: { gte: filters.activeOn } },
          ];
        }
      }
      
      const orders = await prisma.dietOrder.findMany({
        where,
        orderBy: [
          { startDate: 'desc' },
        ],
        include: {
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return orders;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single diet order by ID
   * @param id Diet order ID
   * @returns The diet order or null if not found
   */
  async getOrderById(id: string) {
    try {
      const order = await prisma.dietOrder.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return order;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a diet order
   * @param id Diet order ID
   * @param data Updated diet order data
   * @returns The updated diet order
   */
  async updateOrder(id: string, data: UpdateDietOrderInput) {
    try {
      // Validate input data
      const validatedData = updateDietOrderSchema.parse({ ...data, id });
      
      // Remove id from the data to be updated
      const { id: _, ...updateData } = validatedData;
      
      // Update the diet order
      const order = await prisma.dietOrder.update({
        where: { id },
        data: updateData,
        include: {
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return order;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete a diet order
   * @param id Diet order ID
   * @returns The deleted diet order
   */
  async deleteOrder(id: string) {
    try {
      const order = await prisma.dietOrder.delete({
        where: { id },
      });
      
      return order;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel a diet order
   * @param id Diet order ID
   * @returns The updated diet order
   */
  async cancelOrder(id: string) {
    try {
      const order = await prisma.dietOrder.update({
        where: { id },
        data: {
          status: DietOrderStatus.CANCELLED,
          endDate: new Date(),
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return order;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Complete a diet order
   * @param id Diet order ID
   * @returns The updated diet order
   */
  async completeOrder(id: string) {
    try {
      const order = await prisma.dietOrder.update({
        where: { id },
        data: {
          status: DietOrderStatus.COMPLETED,
          endDate: new Date(),
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return order;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get active diet orders for a specific date
   * @param date Date to check for active orders
   * @returns Array of active diet orders on the specified date
   */
  async getActiveOrdersForDate(date: Date) {
    try {
      const orders = await prisma.dietOrder.findMany({
        where: {
          startDate: { lte: date },
          OR: [
            { endDate: null },
            { endDate: { gte: date } },
          ],
          status: DietOrderStatus.ACTIVE,
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return orders;
    } catch (error) {
      throw error;
    }
  }
}

// Export a singleton instance
export const dietaryService = new DietaryService();
