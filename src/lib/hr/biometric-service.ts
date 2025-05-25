import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';

const prisma = new PrismaClient();

/**
 * Service for biometric integration and management
 */
export class BiometricService {
  /**
   * Register a new biometric template for an employee
   */
  async registerBiometricTemplate(data: {
    employeeId: string;
    templateType: 'FINGERPRINT' | 'FACIAL' | 'IRIS';
    templateData: string;
    deviceId?: string;
    notes?: string;
  }) {
    const { employeeId, templateType, templateData, deviceId, notes } = data;
    
    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    // Check if template already exists for this employee and type
    const existingTemplate = await prisma.biometricTemplate.findFirst({
      where: {
        employeeId,
        templateType,
      },
    });
    
    if (existingTemplate) {
      // Update existing template
      return prisma.biometricTemplate.update({
        where: {
          id: existingTemplate.id,
        },
        data: {
          templateData,
          deviceId,
          notes,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new template
      return prisma.biometricTemplate.create({
        data: {
          employeeId,
          templateType,
          templateData,
          deviceId,
          notes,
        },
      });
    }
  }
  
  /**
   * Get biometric templates for an employee
   */
  async getEmployeeBiometricTemplates(employeeId: string) {
    return prisma.biometricTemplate.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }
  
  /**
   * Delete a biometric template
   */
  async deleteBiometricTemplate(id: string) {
    return prisma.biometricTemplate.delete({
      where: { id },
    });
  }
  
  /**
   * Verify biometric data against stored template
   * This is a placeholder for actual biometric verification logic
   */
  async verifyBiometric(data: {
    employeeId: string;
    templateType: 'FINGERPRINT' | 'FACIAL' | 'IRIS';
    sampleData: string;
  }) {
    const { employeeId, templateType, sampleData } = data;
    
    // Get the stored template
    const template = await prisma.biometricTemplate.findFirst({
      where: {
        employeeId,
        templateType,
      },
    });
    
    if (!template) {
      throw new Error('No biometric template found for this employee');
    }
    
    // In a real implementation, this would:
    // 1. Use a biometric matching algorithm to compare the sample with the template
    // 2. Return a match score and a boolean indicating if the match is above threshold
    
    // For demonstration purposes, we'll simulate verification
    // In production, this would integrate with a biometric verification service
    
    // Simulate 95% success rate for verification
    const isMatch = Math.random() < 0.95;
    const matchScore = isMatch ? 0.8 + (Math.random() * 0.2) : Math.random() * 0.7;
    
    // Log the verification attempt
    await prisma.auditLog.create({
      data: {
        userId: null,
        eventType: 'BIOMETRIC_VERIFICATION',
        details: {
          employeeId,
          templateType,
          isMatch,
          matchScore,
          timestamp: new Date(),
        },
      },
    });
    
    return {
      isMatch,
      matchScore,
      timestamp: new Date(),
    };
  }
  
  /**
   * Register a biometric device
   */
  async registerBiometricDevice(data: {
    deviceId: string;
    deviceType: 'FINGERPRINT_SCANNER' | 'FACIAL_RECOGNITION' | 'IRIS_SCANNER';
    location: string;
    ipAddress?: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    notes?: string;
  }) {
    const { deviceId, deviceType, location, ipAddress, serialNumber, manufacturer, model, notes } = data;
    
    // Check if device already exists
    const existingDevice = await prisma.biometricDevice.findUnique({
      where: { deviceId },
    });
    
    if (existingDevice) {
      // Update existing device
      return prisma.biometricDevice.update({
        where: {
          id: existingDevice.id,
        },
        data: {
          deviceType,
          location,
          ipAddress,
          serialNumber,
          manufacturer,
          model,
          notes,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new device
      return prisma.biometricDevice.create({
        data: {
          deviceId,
          deviceType,
          location,
          ipAddress,
          serialNumber,
          manufacturer,
          model,
          notes,
        },
      });
    }
  }
  
  /**
   * Get all biometric devices
   */
  async getBiometricDevices() {
    return prisma.biometricDevice.findMany({
      orderBy: { location: 'asc' },
    });
  }
  
  /**
   * Get biometric verification logs
   */
  async getBiometricLogs(options: {
    employeeId?: string;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
  }) {
    const { employeeId, startDate, endDate, skip = 0, take = 50 } = options;
    
    // Build where clause
    const where: any = {
      eventType: 'BIOMETRIC_VERIFICATION',
    };
    
    if (employeeId) {
      where.details = {
        path: ['employeeId'],
        equals: employeeId,
      };
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }
    
    // Get logs
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);
    
    return {
      logs,
      total,
      skip,
      take,
    };
  }
}

export const biometricService = new BiometricService();
