import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Create enums to match Prisma schema
export enum BloodType {
  A_POSITIVE = 'A_POSITIVE',
  A_NEGATIVE = 'A_NEGATIVE',
  B_POSITIVE = 'B_POSITIVE',
  B_NEGATIVE = 'B_NEGATIVE',
  AB_POSITIVE = 'AB_POSITIVE',
  AB_NEGATIVE = 'AB_NEGATIVE',
  O_POSITIVE = 'O_POSITIVE',
  O_NEGATIVE = 'O_NEGATIVE'
}

export enum BloodDonationStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum BloodRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  FULFILLED = 'FULFILLED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum BloodRequestPriority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY'
}

// Validation schemas for BloodDonation
export const createBloodDonationSchema = z.object({
  donorId: z.string().min(1, 'Donor ID is required'),
  bloodType: z.nativeEnum(BloodType),
  quantity: z.number().positive('Quantity must be positive'),
  donationDate: z.date().default(() => new Date()),
  expirationDate: z.date(),
  status: z.nativeEnum(BloodDonationStatus).default(BloodDonationStatus.PENDING),
  notes: z.string().optional().nullable(),
});

export const updateBloodDonationSchema = createBloodDonationSchema.partial().extend({
  id: z.string(),
});

// Validation schemas for BloodRequest
export const createBloodRequestSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  requestedBy: z.string().min(1, 'Requester ID is required'),
  bloodType: z.nativeEnum(BloodType),
  quantity: z.number().positive('Quantity must be positive'),
  priority: z.nativeEnum(BloodRequestPriority).default(BloodRequestPriority.ROUTINE),
  requestDate: z.date().default(() => new Date()),
  requiredBy: z.date().optional().nullable(),
  status: z.nativeEnum(BloodRequestStatus).default(BloodRequestStatus.PENDING),
  fulfilledDate: z.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateBloodRequestSchema = createBloodRequestSchema.partial().extend({
  id: z.string(),
});

export type CreateBloodDonationInput = z.infer<typeof createBloodDonationSchema>;
export type UpdateBloodDonationInput = z.infer<typeof updateBloodDonationSchema>;
export type CreateBloodRequestInput = z.infer<typeof createBloodRequestSchema>;
export type UpdateBloodRequestInput = z.infer<typeof updateBloodRequestSchema>;

// Import prisma client
import { prisma } from '../lib/prisma';

/**
 * Service class for managing blood bank operations
 */
export class BloodBankService {
  /**
   * Create a new blood donation
   * @param data Blood donation data
   * @returns The created blood donation
   */
  async createDonation(data: CreateBloodDonationInput) {
    try {
      // Validate input data
      const validatedData = createBloodDonationSchema.parse(data);
      
      // Create the donation and update inventory in a transaction
      const donation = await prisma.$transaction(async (tx) => {
        // Create the donation
        const newDonation = await tx.bloodDonation.create({
          data: validatedData,
        });
        
        // If the donation status is COMPLETED, update the inventory
        if (validatedData.status === BloodDonationStatus.COMPLETED) {
          // Check if inventory exists for this blood type
          const inventory = await tx.bloodInventory.findUnique({
            where: {
              bloodType: validatedData.bloodType,
            },
          });
          
          if (inventory) {
            // Update existing inventory
            await tx.bloodInventory.update({
              where: {
                bloodType: validatedData.bloodType,
              },
              data: {
                quantity: inventory.quantity + validatedData.quantity,
                lastUpdated: new Date(),
              },
            });
          } else {
            // Create new inventory
            await tx.bloodInventory.create({
              data: {
                bloodType: validatedData.bloodType,
                quantity: validatedData.quantity,
                lastUpdated: new Date(),
              },
            });
          }
        }
        
        return newDonation;
      });
      
      return donation;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get all blood donations with optional filtering
   * @param filters Optional filters for status, bloodType, donorId, or date range
   * @returns Array of blood donations matching the filters
   */
  async getDonations(filters?: {
    status?: string;
    bloodType?: string;
    donorId?: string;
    fromDate?: Date;
    toDate?: Date;
  }) {
    try {
      const where: any = {};
      
      if (filters) {
        if (filters.status) {
          where.status = filters.status;
        }
        if (filters.bloodType) {
          where.bloodType = filters.bloodType;
        }
        if (filters.donorId) {
          where.donorId = filters.donorId;
        }
        if (filters.fromDate || filters.toDate) {
          where.donationDate = {};
          if (filters.fromDate) {
            where.donationDate.gte = filters.fromDate;
          }
          if (filters.toDate) {
            where.donationDate.lte = filters.toDate;
          }
        }
      }
      
      const donations = await prisma.bloodDonation.findMany({
        where,
        orderBy: [
          { donationDate: 'desc' },
        ],
        include: {
          donor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return donations;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single blood donation by ID
   * @param id Blood donation ID
   * @returns The blood donation or null if not found
   */
  async getDonationById(id: string) {
    try {
      const donation = await prisma.bloodDonation.findUnique({
        where: { id },
        include: {
          donor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      
      return donation;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a blood donation
   * @param id Blood donation ID
   * @param data Updated blood donation data
   * @returns The updated blood donation
   */
  async updateDonation(id: string, data: UpdateBloodDonationInput) {
    try {
      // Validate input data
      const validatedData = updateBloodDonationSchema.parse({ ...data, id });
      
      // Remove id from the data to be updated
      const { id: _, ...updateData } = validatedData;
      
      // Get the current donation
      const currentDonation = await prisma.bloodDonation.findUnique({
        where: { id },
      });
      
      if (!currentDonation) {
        throw new Error(`Blood donation with ID ${id} not found`);
      }
      
      // Update the donation and inventory in a transaction if status changes
      const updatedDonation = await prisma.$transaction(async (tx) => {
        // Update the donation
        const donation = await tx.bloodDonation.update({
          where: { id },
          data: updateData,
        });
        
        // Handle inventory updates if status changes
        if (updateData.status && updateData.status !== currentDonation.status) {
          // If changing to COMPLETED, add to inventory
          if (updateData.status === BloodDonationStatus.COMPLETED && currentDonation.status !== BloodDonationStatus.COMPLETED) {
            const bloodType = updateData.bloodType || currentDonation.bloodType;
            const quantity = updateData.quantity || currentDonation.quantity;
            
            // Check if inventory exists for this blood type
            const inventory = await tx.bloodInventory.findUnique({
              where: {
                bloodType,
              },
            });
            
            if (inventory) {
              // Update existing inventory
              await tx.bloodInventory.update({
                where: {
                  bloodType,
                },
                data: {
                  quantity: inventory.quantity + quantity,
                  lastUpdated: new Date(),
                },
              });
            } else {
              // Create new inventory
              await tx.bloodInventory.create({
                data: {
                  bloodType,
                  quantity,
                  lastUpdated: new Date(),
                },
              });
            }
          }
          
          // If changing from COMPLETED to something else, remove from inventory
          if (currentDonation.status === BloodDonationStatus.COMPLETED && updateData.status !== BloodDonationStatus.COMPLETED) {
            const bloodType = currentDonation.bloodType;
            const quantity = currentDonation.quantity;
            
            // Check if inventory exists for this blood type
            const inventory = await tx.bloodInventory.findUnique({
              where: {
                bloodType,
              },
            });
            
            if (inventory) {
              // Update existing inventory
              await tx.bloodInventory.update({
                where: {
                  bloodType,
                },
                data: {
                  quantity: Math.max(0, inventory.quantity - quantity), // Ensure quantity doesn't go below 0
                  lastUpdated: new Date(),
                },
              });
            }
          }
        }
        
        return donation;
      });
      
      return updatedDonation;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete a blood donation
   * @param id Blood donation ID
   * @returns The deleted blood donation
   */
  async deleteDonation(id: string) {
    try {
      // Get the current donation
      const currentDonation = await prisma.bloodDonation.findUnique({
        where: { id },
      });
      
      if (!currentDonation) {
        throw new Error(`Blood donation with ID ${id} not found`);
      }
      
      // Delete the donation and update inventory in a transaction if needed
      const deletedDonation = await prisma.$transaction(async (tx) => {
        // Delete the donation
        const donation = await tx.bloodDonation.delete({
          where: { id },
        });
        
        // If the donation was COMPLETED, update the inventory
        if (currentDonation.status === BloodDonationStatus.COMPLETED) {
          // Check if inventory exists for this blood type
          const inventory = await tx.bloodInventory.findUnique({
            where: {
              bloodType: currentDonation.bloodType,
            },
          });
          
          if (inventory) {
            // Update existing inventory
            await tx.bloodInventory.update({
              where: {
                bloodType: currentDonation.bloodType,
              },
              data: {
                quantity: Math.max(0, inventory.quantity - currentDonation.quantity), // Ensure quantity doesn't go below 0
                lastUpdated: new Date(),
              },
            });
          }
        }
        
        return donation;
      });
      
      return deletedDonation;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new blood request
   * @param data Blood request data
   * @returns The created blood request
   */
  async createRequest(data: CreateBloodRequestInput) {
    try {
      // Validate input data
      const validatedData = createBloodRequestSchema.parse(data);
      
      // Create the request
      const request = await prisma.bloodRequest.create({
        data: validatedData,
      });
      
      return request;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get all blood requests with optional filtering
   * @param filters Optional filters for status, bloodType, patientId, or priority
   * @returns Array of blood requests matching the filters
   */
  async getRequests(filters?: {
    status?: string;
    bloodType?: string;
    patientId?: string;
    priority?: string;
    fromDate?: Date;
    toDate?: Date;
  }) {
    try {
      const where: any = {};
      
      if (filters) {
        if (filters.status) {
          where.status = filters.status;
        }
        if (filters.bloodType) {
          where.bloodType = filters.bloodType;
        }
        if (filters.patientId) {
          where.patientId = filters.patientId;
        }
        if (filters.priority) {
          where.priority = filters.priority;
        }
        if (filters.fromDate || filters.toDate) {
          where.requestDate = {};
          if (filters.fromDate) {
            where.requestDate.gte = filters.fromDate;
          }
          if (filters.toDate) {
            where.requestDate.lte = filters.toDate;
          }
        }
      }
      
      const requests = await prisma.bloodRequest.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { requestDate: 'asc' },
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
      
      return requests;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single blood request by ID
   * @param id Blood request ID
   * @returns The blood request or null if not found
   */
  async getRequestById(id: string) {
    try {
      const request = await prisma.bloodRequest.findUnique({
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
      
      return request;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a blood request
   * @param id Blood request ID
   * @param data Updated blood request data
   * @returns The updated blood request
   */
  async updateRequest(id: string, data: UpdateBloodRequestInput) {
    try {
      // Validate input data
      const validatedData = updateBloodRequestSchema.parse({ ...data, id });
      
      // Remove id from the data to be updated
      const { id: _, ...updateData } = validatedData;
      
      // Get the current request
      const currentRequest = await prisma.bloodRequest.findUnique({
        where: { id },
      });
      
      if (!currentRequest) {
        throw new Error(`Blood request with ID ${id} not found`);
      }
      
      // Update the request and inventory in a transaction if status changes to FULFILLED
      const updatedRequest = await prisma.$transaction(async (tx) => {
        // Special handling for status transitions
        if (updateData.status === BloodRequestStatus.FULFILLED && currentRequest.status !== BloodRequestStatus.FULFILLED) {
          updateData.fulfilledDate = new Date();
          
          // Check if there's enough inventory
          const bloodType = updateData.bloodType || currentRequest.bloodType;
          const quantity = updateData.quantity || currentRequest.quantity;
          
          const inventory = await tx.bloodInventory.findUnique({
            where: {
              bloodType,
            },
          });
          
          if (!inventory || inventory.quantity < quantity) {
            throw new Error(`Not enough ${bloodType} blood in inventory to fulfill this request`);
          }
          
          // Update inventory
          await tx.bloodInventory.update({
            where: {
              bloodType,
            },
            data: {
              quantity: inventory.quantity - quantity,
              lastUpdated: new Date(),
            },
          });
        }
        
        // If changing from FULFILLED to something else, add back to inventory
        if (currentRequest.status === BloodRequestStatus.FULFILLED && updateData.status && updateData.status !== BloodRequestStatus.FULFILLED) {
          updateData.fulfilledDate = null;
          
          // Check if inventory exists for this blood type
          const inventory = await tx.bloodInventory.findUnique({
            where: {
              bloodType: currentRequest.bloodType,
            },
          });
          
          if (inventory) {
            // Update existing inventory
            await tx.bloodInventory.update({
              where: {
                bloodType: currentRequest.bloodType,
              },
              data: {
                quantity: inventory.quantity + currentRequest.quantity,
                lastUpdated: new Date(),
              },
            });
          } else {
            // Create new inventory
            await tx.bloodInventory.create({
              data: {
                bloodType: currentRequest.bloodType,
                quantity: currentRequest.quantity,
                lastUpdated: new Date(),
              },
            });
          }
        }
        
        // Update the request
        const request = await tx.bloodRequest.update({
          where: { id },
          data: updateData,
        });
        
        return request;
      });
      
      return updatedRequest;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete a blood request
   * @param id Blood request ID
   * @returns The deleted blood request
   */
  async deleteRequest(id: string) {
    try {
      // Get the current request
      const currentRequest = await prisma.bloodRequest.findUnique({
        where: { id },
      });
      
      if (!currentRequest) {
        throw new Error(`Blood request with ID ${id} not found`);
      }
      
      // Delete the request and update inventory in a transaction if needed
      const deletedRequest = await prisma.$transaction(async (tx) => {
        // Delete the request
        const request = await tx.bloodRequest.delete({
          where: { id },
        });
        
        // If the request was FULFILLED, update the inventory
        if (currentRequest.status === BloodRequestStatus.FULFILLED) {
          // Check if inventory exists for this blood type
          const inventory = await tx.bloodInventory.findUnique({
            where: {
              bloodType: currentRequest.bloodType,
            },
          });
          
          if (inventory) {
            // Update existing inventory
            await tx.bloodInventory.update({
              where: {
                bloodType: currentRequest.bloodType,
              },
              data: {
                quantity: inventory.quantity + currentRequest.quantity,
                lastUpdated: new Date(),
              },
            });
          } else {
            // Create new inventory
            await tx.bloodInventory.create({
              data: {
                bloodType: currentRequest.bloodType,
                quantity: currentRequest.quantity,
                lastUpdated: new Date(),
              },
            });
          }
        }
        
        return request;
      });
      
      return deletedRequest;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get blood inventory
   * @param bloodType Optional blood type to filter by
   * @returns Array of blood inventory records
   */
  async getInventory(bloodType?: string) {
    try {
      const where: any = {};
      
      if (bloodType) {
        where.bloodType = bloodType;
      }
      
      const inventory = await prisma.bloodInventory.findMany({
        where,
        orderBy: [
          { bloodType: 'asc' },
        ],
      });
      
      return inventory;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if there's enough blood of a specific type in inventory
   * @param bloodType Blood type to check
   * @param quantity Quantity needed
   * @returns Boolean indicating if there's enough blood
   */
  async checkInventoryAvailability(bloodType: string, quantity: number) {
    try {
      const inventory = await prisma.bloodInventory.findUnique({
        where: {
          bloodType: bloodType as BloodType,
        },
      });
      
      return !!inventory && inventory.quantity >= quantity;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fulfill a blood request
   * @param id Blood request ID
   * @returns The updated blood request
   */
  async fulfillRequest(id: string) {
    try {
      // Get the current request
      const request = await prisma.bloodRequest.findUnique({
        where: { id },
      });
      
      if (!request) {
        throw new Error(`Blood request with ID ${id} not found`);
      }
      
      if (request.status === BloodRequestStatus.FULFILLED) {
        throw new Error(`Blood request with ID ${id} is already fulfilled`);
      }
      
      if (request.status === BloodRequestStatus.CANCELLED || request.status === BloodRequestStatus.REJECTED) {
        throw new Error(`Cannot fulfill a ${request.status.toLowerCase()} blood request`);
      }
      
      // Check if there's enough inventory
      const inventory = await prisma.bloodInventory.findUnique({
        where: {
          bloodType: request.bloodType,
        },
      });
      
      if (!inventory || inventory.quantity < request.quantity) {
        throw new Error(`Not enough ${request.bloodType} blood in inventory to fulfill this request`);
      }
      
      // Fulfill the request and update inventory in a transaction
      const fulfilledRequest = await prisma.$transaction(async (tx) => {
        // Update the request
        const updatedRequest = await tx.bloodRequest.update({
          where: { id },
          data: {
            status: BloodRequestStatus.FULFILLED,
            fulfilledDate: new Date(),
          },
        });
        
        // Update inventory
        await tx.bloodInventory.update({
          where: {
            bloodType: request.bloodType,
          },
          data: {
            quantity: inventory.quantity - request.quantity,
            lastUpdated: new Date(),
          },
        });
        
        return updatedRequest;
      });
      
      return fulfilledRequest;
    } catch (error) {
      throw error;
    }
  }
}

// Export a singleton instance
export const bloodBankService = new BloodBankService();
