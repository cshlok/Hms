import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Create enums to match Prisma schema
export enum HousekeepingTaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum HousekeepingTaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

// Validation schemas
export const createHousekeepingTaskSchema = z.object({
  taskName: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  assignedToId: z.string().optional().nullable(),
  status: z.nativeEnum(HousekeepingTaskStatus).default(HousekeepingTaskStatus.PENDING),
  priority: z.nativeEnum(HousekeepingTaskPriority).default(HousekeepingTaskPriority.MEDIUM),
  requestedAt: z.date().default(() => new Date()),
  completedAt: z.date().optional().nullable(),
  notes: z.string().optional(),
});

export const updateHousekeepingTaskSchema = createHousekeepingTaskSchema.partial().extend({
  id: z.string(),
});

export type CreateHousekeepingTaskInput = z.infer<typeof createHousekeepingTaskSchema>;
export type UpdateHousekeepingTaskInput = z.infer<typeof updateHousekeepingTaskSchema>;

// Import prisma client
import { prisma } from '../lib/prisma';

/**
 * Service class for managing housekeeping tasks
 */
export class HousekeepingService {
  /**
   * Create a new housekeeping task
   * @param data Task data
   * @returns The created task
   */
  async createTask(data: CreateHousekeepingTaskInput) {
    try {
      // Validate input data
      const validatedData = createHousekeepingTaskSchema.parse(data);
      
      // Create the task
      const task = await prisma.housekeepingTask.create({
        data: validatedData,
      });
      
      return task;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get all housekeeping tasks with optional filtering
   * @param filters Optional filters for status, priority, location, or assignedToId
   * @returns Array of tasks matching the filters
   */
  async getTasks(filters?: {
    status?: string;
    priority?: string;
    location?: string;
    assignedToId?: string;
  }) {
    try {
      const where: any = {};
      
      if (filters) {
        if (filters.status) {
          where.status = filters.status;
        }
        if (filters.priority) {
          where.priority = filters.priority;
        }
        if (filters.location) {
          where.location = { contains: filters.location };
        }
        if (filters.assignedToId) {
          where.assignedToId = filters.assignedToId;
        }
      }
      
      const tasks = await prisma.housekeepingTask.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { requestedAt: 'asc' },
        ],
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return tasks;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single housekeeping task by ID
   * @param id Task ID
   * @returns The task or null if not found
   */
  async getTaskById(id: string) {
    try {
      const task = await prisma.housekeepingTask.findUnique({
        where: { id },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return task;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a housekeeping task
   * @param id Task ID
   * @param data Updated task data
   * @returns The updated task
   */
  async updateTask(id: string, data: UpdateHousekeepingTaskInput) {
    try {
      // Validate input data
      const validatedData = updateHousekeepingTaskSchema.parse({ ...data, id });
      
      // Remove id from the data to be updated
      const { id: _, ...updateData } = validatedData;
      
      // Update the task
      const task = await prisma.housekeepingTask.update({
        where: { id },
        data: updateData,
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return task;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete a housekeeping task
   * @param id Task ID
   * @returns The deleted task
   */
  async deleteTask(id: string) {
    try {
      const task = await prisma.housekeepingTask.delete({
        where: { id },
      });
      
      return task;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Assign a task to a user
   * @param taskId Task ID
   * @param userId User ID
   * @returns The updated task
   */
  async assignTask(taskId: string, userId: string) {
    try {
      const task = await prisma.housekeepingTask.update({
        where: { id: taskId },
        data: {
          assignedToId: userId,
          status: HousekeepingTaskStatus.IN_PROGRESS,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return task;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark a task as completed
   * @param taskId Task ID
   * @returns The updated task
   */
  async completeTask(taskId: string) {
    try {
      const task = await prisma.housekeepingTask.update({
        where: { id: taskId },
        data: {
          status: HousekeepingTaskStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return task;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel a task
   * @param taskId Task ID
   * @returns The updated task
   */
  async cancelTask(taskId: string) {
    try {
      const task = await prisma.housekeepingTask.update({
        where: { id: taskId },
        data: {
          status: HousekeepingTaskStatus.CANCELLED,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return task;
    } catch (error) {
      throw error;
    }
  }
}

// Export a singleton instance
export const housekeepingService = new HousekeepingService();
