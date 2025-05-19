import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Create enums to match Prisma schema
export enum AmbulanceStatus {
  AVAILABLE = 'AVAILABLE',
  ON_CALL = 'ON_CALL',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  MAINTENANCE = 'MAINTENANCE'
}

export enum AmbulanceType {
  BASIC = 'BASIC',
  ADVANCED = 'ADVANCED',
  CRITICAL_CARE = 'CRITICAL_CARE',
  NEONATAL = 'NEONATAL',
  BARIATRIC = 'BARIATRIC'
}

export enum AmbulanceRunStatus {
  PENDING = 'PENDING',
  DISPATCHED = 'DISPATCHED',
  EN_ROUTE_TO_SCENE = 'EN_ROUTE_TO_SCENE',
  AT_SCENE = 'AT_SCENE',
  EN_ROUTE_TO_DESTINATION = 'EN_ROUTE_TO_DESTINATION',
  AT_DESTINATION = 'AT_DESTINATION',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Validation schemas for Ambulance
export const createAmbulanceSchema = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  type: z.nativeEnum(AmbulanceType).default(AmbulanceType.BASIC),
  status: z.nativeEnum(AmbulanceStatus).default(AmbulanceStatus.AVAILABLE),
  currentDriverId: z.string().optional().nullable(),
  currentLocation: z.string().optional(),
  notes: z.string().optional(),
});

export const updateAmbulanceSchema = createAmbulanceSchema.partial().extend({
  id: z.string(),
});

// Validation schemas for AmbulanceRun
export const createAmbulanceRunSchema = z.object({
  ambulanceId: z.string().min(1, 'Ambulance ID is required'),
  patientId: z.string().optional().nullable(),
  pickupLocation: z.string().min(1, 'Pickup location is required'),
  destination: z.string().min(1, 'Destination is required'),
  callTime: z.date().default(() => new Date()),
  dispatchTime: z.date().optional().nullable(),
  arrivalAtSceneTime: z.date().optional().nullable(),
  departureFromSceneTime: z.date().optional().nullable(),
  arrivalAtDestinationTime: z.date().optional().nullable(),
  crewMembers: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
  status: z.nativeEnum(AmbulanceRunStatus).default(AmbulanceRunStatus.PENDING),
});

export const updateAmbulanceRunSchema = createAmbulanceRunSchema.partial().extend({
  id: z.string(),
});

export type CreateAmbulanceInput = z.infer<typeof createAmbulanceSchema>;
export type UpdateAmbulanceInput = z.infer<typeof updateAmbulanceSchema>;
export type CreateAmbulanceRunInput = z.infer<typeof createAmbulanceRunSchema>;
export type UpdateAmbulanceRunInput = z.infer<typeof updateAmbulanceRunSchema>;

// Import prisma client
import { prisma } from '../lib/prisma';

/**
 * Service class for managing ambulance fleet and runs
 */
export class AmbulanceService {
  /**
   * Create a new ambulance
   * @param data Ambulance data
   * @returns The created ambulance
   */
  async createAmbulance(data: CreateAmbulanceInput) {
    try {
      // Validate input data
      const validatedData = createAmbulanceSchema.parse(data);
      
      // Create the ambulance
      const ambulance = await prisma.ambulance.create({
        data: validatedData,
      });
      
      return ambulance;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get all ambulances with optional filtering
   * @param filters Optional filters for status or type
   * @returns Array of ambulances matching the filters
   */
  async getAmbulances(filters?: {
    status?: string;
    type?: string;
  }) {
    try {
      const where: any = {};
      
      if (filters) {
        if (filters.status) {
          where.status = filters.status;
        }
        if (filters.type) {
          where.type = filters.type;
        }
      }
      
      const ambulances = await prisma.ambulance.findMany({
        where,
        include: {
          currentDriver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return ambulances;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single ambulance by ID
   * @param id Ambulance ID
   * @returns The ambulance or null if not found
   */
  async getAmbulanceById(id: string) {
    try {
      const ambulance = await prisma.ambulance.findUnique({
        where: { id },
        include: {
          currentDriver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return ambulance;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update an ambulance
   * @param id Ambulance ID
   * @param data Updated ambulance data
   * @returns The updated ambulance
   */
  async updateAmbulance(id: string, data: UpdateAmbulanceInput) {
    try {
      // Validate input data
      const validatedData = updateAmbulanceSchema.parse({ ...data, id });
      
      // Remove id from the data to be updated
      const { id: _, ...updateData } = validatedData;
      
      // Update the ambulance
      const ambulance = await prisma.ambulance.update({
        where: { id },
        data: updateData,
        include: {
          currentDriver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return ambulance;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete an ambulance
   * @param id Ambulance ID
   * @returns The deleted ambulance
   */
  async deleteAmbulance(id: string) {
    try {
      // Check if ambulance is on an active run
      const activeRun = await prisma.ambulanceRun.findFirst({
        where: {
          ambulanceId: id,
          status: {
            in: [
              AmbulanceRunStatus.PENDING,
              AmbulanceRunStatus.DISPATCHED,
              AmbulanceRunStatus.EN_ROUTE_TO_SCENE,
              AmbulanceRunStatus.AT_SCENE,
              AmbulanceRunStatus.EN_ROUTE_TO_DESTINATION,
              AmbulanceRunStatus.AT_DESTINATION,
            ],
          },
        },
      });
      
      if (activeRun) {
        throw new Error(`Cannot delete ambulance with ID ${id} because it is currently on an active run`);
      }
      
      const ambulance = await prisma.ambulance.delete({
        where: { id },
      });
      
      return ambulance;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Assign a driver to an ambulance
   * @param ambulanceId Ambulance ID
   * @param driverId Driver user ID
   * @returns The updated ambulance
   */
  async assignDriver(ambulanceId: string, driverId: string) {
    try {
      const ambulance = await prisma.ambulance.update({
        where: { id: ambulanceId },
        data: {
          currentDriverId: driverId,
        },
        include: {
          currentDriver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return ambulance;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update ambulance status
   * @param ambulanceId Ambulance ID
   * @param status New status
   * @returns The updated ambulance
   */
  async updateStatus(ambulanceId: string, status: AmbulanceStatus) {
    try {
      // If setting to ON_CALL, check that ambulance is not already on a run
      if (status === AmbulanceStatus.ON_CALL) {
        const activeRun = await prisma.ambulanceRun.findFirst({
          where: {
            ambulanceId,
            status: {
              in: [
                AmbulanceRunStatus.PENDING,
                AmbulanceRunStatus.DISPATCHED,
                AmbulanceRunStatus.EN_ROUTE_TO_SCENE,
                AmbulanceRunStatus.AT_SCENE,
                AmbulanceRunStatus.EN_ROUTE_TO_DESTINATION,
                AmbulanceRunStatus.AT_DESTINATION,
              ],
            },
          },
        });
        
        if (activeRun) {
          throw new Error(`Ambulance with ID ${ambulanceId} is already on an active run`);
        }
      }
      
      const ambulance = await prisma.ambulance.update({
        where: { id: ambulanceId },
        data: {
          status,
        },
        include: {
          currentDriver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return ambulance;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new ambulance run
   * @param data Run data
   * @returns The created run
   */
  async createRun(data: CreateAmbulanceRunInput) {
    try {
      // Validate input data
      const validatedData = createAmbulanceRunSchema.parse(data);
      
      // Check if ambulance is available
      const ambulance = await prisma.ambulance.findUnique({
        where: { id: validatedData.ambulanceId },
      });
      
      if (!ambulance) {
        throw new Error(`Ambulance with ID ${validatedData.ambulanceId} not found`);
      }
      
      if (ambulance.status !== AmbulanceStatus.AVAILABLE) {
        throw new Error(`Ambulance with ID ${validatedData.ambulanceId} is not available`);
      }
      
      // Create the run and update ambulance status in a transaction
      const run = await prisma.$transaction(async (tx) => {
        // Create the run
        const newRun = await tx.ambulanceRun.create({
          data: validatedData,
        });
        
        // Update ambulance status
        await tx.ambulance.update({
          where: { id: validatedData.ambulanceId },
          data: {
            status: AmbulanceStatus.ON_CALL,
          },
        });
        
        return newRun;
      });
      
      return run;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get all ambulance runs with optional filtering
   * @param filters Optional filters for status, ambulanceId, patientId, or date range
   * @returns Array of runs matching the filters
   */
  async getRuns(filters?: {
    status?: string;
    ambulanceId?: string;
    patientId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    try {
      const where: any = {};
      
      if (filters) {
        if (filters.status) {
          where.status = filters.status;
        }
        if (filters.ambulanceId) {
          where.ambulanceId = filters.ambulanceId;
        }
        if (filters.patientId) {
          where.patientId = filters.patientId;
        }
        if (filters.dateFrom || filters.dateTo) {
          where.callTime = {};
          if (filters.dateFrom) {
            where.callTime.gte = filters.dateFrom;
          }
          if (filters.dateTo) {
            where.callTime.lte = filters.dateTo;
          }
        }
      }
      
      const runs = await prisma.ambulanceRun.findMany({
        where,
        orderBy: [
          { callTime: 'desc' },
        ],
        include: {
          ambulance: true,
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return runs;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single ambulance run by ID
   * @param id Run ID
   * @returns The run or null if not found
   */
  async getRunById(id: string) {
    try {
      const run = await prisma.ambulanceRun.findUnique({
        where: { id },
        include: {
          ambulance: true,
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return run;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update an ambulance run
   * @param id Run ID
   * @param data Updated run data
   * @returns The updated run
   */
  async updateRun(id: string, data: UpdateAmbulanceRunInput) {
    try {
      // Validate input data
      const validatedData = updateAmbulanceRunSchema.parse({ ...data, id });
      
      // Remove id from the data to be updated
      const { id: _, ...updateData } = validatedData;
      
      // Get current run
      const currentRun = await prisma.ambulanceRun.findUnique({
        where: { id },
      });
      
      if (!currentRun) {
        throw new Error(`Ambulance run with ID ${id} not found`);
      }
      
      // Update the run
      const run = await prisma.ambulanceRun.update({
        where: { id },
        data: updateData,
        include: {
          ambulance: true,
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      // If status is changing to COMPLETED or CANCELLED, update ambulance status
      if (updateData.status && 
          (updateData.status === AmbulanceRunStatus.COMPLETED || 
           updateData.status === AmbulanceRunStatus.CANCELLED) && 
          currentRun.status !== AmbulanceRunStatus.COMPLETED && 
          currentRun.status !== AmbulanceRunStatus.CANCELLED) {
        
        await prisma.ambulance.update({
          where: { id: run.ambulanceId },
          data: {
            status: AmbulanceStatus.AVAILABLE,
          },
        });
      }
      
      return run;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete an ambulance run
   * @param id Run ID
   * @returns The deleted run
   */
  async deleteRun(id: string) {
    try {
      // Get current run
      const currentRun = await prisma.ambulanceRun.findUnique({
        where: { id },
      });
      
      if (!currentRun) {
        throw new Error(`Ambulance run with ID ${id} not found`);
      }
      
      // Check if run is active
      if (![AmbulanceRunStatus.COMPLETED, AmbulanceRunStatus.CANCELLED].includes(currentRun.status as AmbulanceRunStatus)) {
        throw new Error(`Cannot delete active ambulance run with ID ${id}`);
      }
      
      const run = await prisma.ambulanceRun.delete({
        where: { id },
      });
      
      return run;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update run status
   * @param runId Run ID
   * @param status New status
   * @returns The updated run
   */
  async updateRunStatus(runId: string, status: AmbulanceRunStatus) {
    try {
      // Get current run
      const currentRun = await prisma.ambulanceRun.findUnique({
        where: { id: runId },
      });
      
      if (!currentRun) {
        throw new Error(`Ambulance run with ID ${runId} not found`);
      }
      
      // Update timestamps based on status
      const updateData: any = {
        status,
      };
      
      switch (status) {
        case AmbulanceRunStatus.DISPATCHED:
          updateData.dispatchTime = new Date();
          break;
        case AmbulanceRunStatus.EN_ROUTE_TO_SCENE:
          if (!currentRun.dispatchTime) {
            updateData.dispatchTime = new Date();
          }
          break;
        case AmbulanceRunStatus.AT_SCENE:
          if (!currentRun.dispatchTime) {
            updateData.dispatchTime = new Date();
          }
          updateData.arrivalAtSceneTime = new Date();
          break;
        case AmbulanceRunStatus.EN_ROUTE_TO_DESTINATION:
          if (!currentRun.arrivalAtSceneTime) {
            updateData.arrivalAtSceneTime = new Date();
          }
          updateData.departureFromSceneTime = new Date();
          break;
        case AmbulanceRunStatus.AT_DESTINATION:
          if (!currentRun.departureFromSceneTime) {
            updateData.departureFromSceneTime = new Date();
          }
          updateData.arrivalAtDestinationTime = new Date();
          break;
      }
      
      // Update the run
      const run = await prisma.$transaction(async (tx) => {
        const updatedRun = await tx.ambulanceRun.update({
          where: { id: runId },
          data: updateData,
          include: {
            ambulance: true,
            patient: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
        
        // If status is changing to COMPLETED or CANCELLED, update ambulance status
        if ((status === AmbulanceRunStatus.COMPLETED || status === AmbulanceRunStatus.CANCELLED) && 
            currentRun.status !== AmbulanceRunStatus.COMPLETED && 
            currentRun.status !== AmbulanceRunStatus.CANCELLED) {
          
          await tx.ambulance.update({
            where: { id: currentRun.ambulanceId },
            data: {
              status: AmbulanceStatus.AVAILABLE,
            },
          });
        }
        
        return updatedRun;
      });
      
      return run;
    } catch (error) {
      throw error;
    }
  }
}

// Export a singleton instance
export const ambulanceService = new AmbulanceService();
