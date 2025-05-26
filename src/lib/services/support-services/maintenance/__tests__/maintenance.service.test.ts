import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MaintenanceService } from '../maintenance.service';
import { prisma } from '@/lib/prisma';
import { SecurityService } from '@/lib/security.service';
import { ErrorHandler } from '@/lib/error-handler';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    maintenanceRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    maintenanceAsset: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn()
    },
    maintenanceTechnician: {
      findUnique: vi.fn()
    },
    maintenancePart: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    department: {
      findUnique: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    }
  }
}));

// Mock Security Service
vi.mock('@/lib/security.service', () => ({
  SecurityService: {
    sanitizeInput: vi.fn(input => input),
    sanitizeObject: vi.fn(obj => obj),
    encryptSensitiveData: vi.fn(data => `encrypted_${data}`),
    decryptSensitiveData: vi.fn(data => data.replace('encrypted_', '')),
    validateHipaaCompliance: vi.fn(() => true)
  }
}));

describe('MaintenanceService', () => {
  let maintenanceService: MaintenanceService;
  
  beforeEach(() => {
    maintenanceService = new MaintenanceService();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('getMaintenanceRequests', () => {
    it('should return maintenance requests with pagination', async () => {
      // Mock data
      const mockRequests = [
        {
          id: '1',
          assetId: 'asset1',
          requestType: 'CORRECTIVE',
          priority: 'HIGH',
          description: 'Fix broken AC unit',
          scheduledTime: new Date(),
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          assetId: 'asset2',
          requestType: 'PREVENTIVE',
          priority: 'MEDIUM',
          description: 'Regular maintenance check',
          scheduledTime: new Date(),
          status: 'ASSIGNED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.maintenanceRequest.findMany as any).mockResolvedValue(mockRequests);
      (prisma.maintenanceRequest.count as any).mockResolvedValue(2);
      
      // Call the service method
      const result = await maintenanceService.getMaintenanceRequests({
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct arguments
      expect(prisma.maintenanceRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { scheduledTime: 'asc' }
        })
      );
      
      // Verify result
      expect(result).toEqual({
        data: mockRequests,
        pagination: {
          page: 1,
          limit: 10,
          totalItems: 2,
          totalPages: 1
        }
      });
    });
    
    it('should apply filters correctly', async () => {
      // Mock data
      const mockRequests = [
        {
          id: '1',
          assetId: 'asset1',
          requestType: 'CORRECTIVE',
          priority: 'HIGH',
          description: 'Fix broken AC unit',
          scheduledTime: new Date(),
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.maintenanceRequest.findMany as any).mockResolvedValue(mockRequests);
      (prisma.maintenanceRequest.count as any).mockResolvedValue(1);
      
      // Call the service method with filters
      const result = await maintenanceService.getMaintenanceRequests({
        status: 'PENDING',
        priority: 'HIGH',
        requestType: 'CORRECTIVE',
        assetId: 'asset1',
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct filters
      expect(prisma.maintenanceRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'PENDING',
            priority: 'HIGH',
            requestType: 'CORRECTIVE',
            assetId: 'asset1'
          }
        })
      );
      
      // Verify result
      expect(result.data).toEqual(mockRequests);
      expect(result.pagination.totalItems).toBe(1);
    });
  });
  
  describe('createMaintenanceRequest', () => {
    it('should create a new maintenance request', async () => {
      // Mock data
      const mockRequest = {
        assetId: 'asset1',
        requestType: 'CORRECTIVE',
        priority: 'HIGH',
        description: 'Fix broken AC unit',
        scheduledTime: new Date(),
        notes: 'Unit is making strange noises',
        requestedById: 'user1',
        departmentId: 'dept1',
        estimatedDuration: 120 // minutes
      };
      
      const mockCreatedRequest = {
        id: '1',
        ...mockRequest,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.maintenanceAsset.findUnique as any).mockResolvedValue({ id: 'asset1', name: 'AC Unit 101' });
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user1', name: 'John Doe' });
      (prisma.department.findUnique as any).mockResolvedValue({ id: 'dept1', name: 'Cardiology' });
      (prisma.maintenanceRequest.create as any).mockResolvedValue(mockCreatedRequest);
      
      // Call the service method
      const result = await maintenanceService.createMaintenanceRequest(mockRequest);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.maintenanceRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          assetId: 'asset1',
          requestType: 'CORRECTIVE',
          priority: 'HIGH',
          description: 'Fix broken AC unit',
          scheduledTime: expect.any(Date),
          notes: 'Unit is making strange noises',
          requestedById: 'user1',
          departmentId: 'dept1',
          estimatedDuration: 120,
          status: 'PENDING'
        })
      });
      
      // Verify result
      expect(result).toEqual(mockCreatedRequest);
    });
    
    it('should throw an error if asset does not exist', async () => {
      // Mock data
      const mockRequest = {
        assetId: 'invalid-asset',
        requestType: 'CORRECTIVE',
        priority: 'HIGH',
        description: 'Fix broken AC unit',
        scheduledTime: new Date(),
        requestedById: 'user1'
      };
      
      // Mock Prisma response
      (prisma.maintenanceAsset.findUnique as any).mockResolvedValue(null);
      
      // Expect the creation to throw an error
      await expect(maintenanceService.createMaintenanceRequest(mockRequest)).rejects.toThrow();
    });
  });
  
  describe('getMaintenanceRequestById', () => {
    it('should return a maintenance request by ID', async () => {
      // Mock data
      const mockRequest = {
        id: '1',
        assetId: 'asset1',
        requestType: 'CORRECTIVE',
        priority: 'HIGH',
        description: 'Fix broken AC unit',
        scheduledTime: new Date(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.maintenanceRequest.findUnique as any).mockResolvedValue(mockRequest);
      
      // Call the service method
      const result = await maintenanceService.getMaintenanceRequestById('1');
      
      // Verify Prisma was called with correct arguments
      expect(prisma.maintenanceRequest.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual(mockRequest);
    });
    
    it('should throw an error if request does not exist', async () => {
      // Mock Prisma response
      (prisma.maintenanceRequest.findUnique as any).mockResolvedValue(null);
      
      // Expect the retrieval to throw an error
      await expect(maintenanceService.getMaintenanceRequestById('invalid-id')).rejects.toThrow();
    });
    
    it('should return FHIR format when requested', async () => {
      // Mock data
      const mockRequest = {
        id: '1',
        assetId: 'asset1',
        asset: { id: 'asset1', name: 'AC Unit 101', type: 'HVAC' },
        requestType: 'CORRECTIVE',
        priority: 'HIGH',
        description: 'Fix broken AC unit',
        scheduledTime: new Date('2025-05-25T12:00:00Z'),
        status: 'PENDING',
        requestedById: 'user1',
        requestedBy: { id: 'user1', name: 'John Doe' },
        departmentId: 'dept1',
        department: { id: 'dept1', name: 'Cardiology' },
        createdAt: new Date('2025-05-25T10:00:00Z'),
        updatedAt: new Date('2025-05-25T10:00:00Z')
      };
      
      // Mock Prisma response
      (prisma.maintenanceRequest.findUnique as any).mockResolvedValue(mockRequest);
      
      // Call the service method with FHIR flag
      const result = await maintenanceService.getMaintenanceRequestById('1', true);
      
      // Verify result is in FHIR format
      expect(result).toHaveProperty('resourceType', 'Task');
      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('status', 'requested');
      expect(result).toHaveProperty('intent', 'order');
      expect(result).toHaveProperty('priority', 'urgent');
      expect(result).toHaveProperty('description', 'Fix broken AC unit');
      expect(result).toHaveProperty('authoredOn', '2025-05-25T10:00:00Z');
      expect(result).toHaveProperty('executionPeriod');
      expect(result).toHaveProperty('requester');
      expect(result).toHaveProperty('focus');
      expect(result).toHaveProperty('for');
    });
  });
  
  describe('updateMaintenanceRequest', () => {
    it('should update a maintenance request', async () => {
      // Mock data
      const mockExistingRequest = {
        id: '1',
        assetId: 'asset1',
        requestType: 'CORRECTIVE',
        priority: 'HIGH',
        description: 'Fix broken AC unit',
        scheduledTime: new Date(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockUpdateData = {
        priority: 'URGENT',
        description: 'Fix broken AC unit immediately',
        status: 'ASSIGNED'
      };
      
      const mockUpdatedRequest = {
        ...mockExistingRequest,
        ...mockUpdateData,
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.maintenanceRequest.findUnique as any).mockResolvedValue(mockExistingRequest);
      (prisma.maintenanceRequest.update as any).mockResolvedValue(mockUpdatedRequest);
      
      // Call the service method
      const result = await maintenanceService.updateMaintenanceRequest('1', mockUpdateData);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.maintenanceRequest.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: mockUpdateData,
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual(mockUpdatedRequest);
    });
    
    it('should throw an error if request does not exist', async () => {
      // Mock Prisma response
      (prisma.maintenanceRequest.findUnique as any).mockResolvedValue(null);
      
      // Expect the update to throw an error
      await expect(maintenanceService.updateMaintenanceRequest('invalid-id', { priority: 'LOW' })).rejects.toThrow();
    });
  });
  
  describe('assignMaintenanceRequest', () => {
    it('should assign a technician to a maintenance request', async () => {
      // Mock data
      const mockExistingRequest = {
        id: '1',
        assetId: 'asset1',
        requestType: 'CORRECTIVE',
        priority: 'HIGH',
        description: 'Fix broken AC unit',
        scheduledTime: new Date(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockTechnician = {
        id: 'tech1',
        name: 'Jane Doe',
        specialization: 'HVAC'
      };
      
      const mockUpdatedRequest = {
        ...mockExistingRequest,
        status: 'ASSIGNED',
        assignedToId: 'tech1',
        assignedTo: mockTechnician,
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.maintenanceRequest.findUnique as any).mockResolvedValue(mockExistingRequest);
      (prisma.maintenanceTechnician.findUnique as any).mockResolvedValue(mockTechnician);
      (prisma.maintenanceRequest.update as any).mockResolvedValue(mockUpdatedRequest);
      
      // Call the service method
      const result = await maintenanceService.assignMaintenanceRequest('1', 'tech1');
      
      // Verify Prisma was called with correct arguments
      expect(prisma.maintenanceRequest.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: 'ASSIGNED',
          assignedToId: 'tech1'
        },
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual(mockUpdatedRequest);
    });
    
    it('should throw an error if technician does not exist', async () => {
      // Mock data
      const mockExistingRequest = {
        id: '1',
        assetId: 'asset1',
        requestType: 'CORRECTIVE',
        priority: 'HIGH',
        description: 'Fix broken AC unit',
        scheduledTime: new Date(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.maintenanceRequest.findUnique as any).mockResolvedValue(mockExistingRequest);
      (prisma.maintenanceTechnician.findUnique as any).mockResolvedValue(null);
      
      // Expect the assignment to throw an error
      await expect(maintenanceService.assignMaintenanceRequest('1', 'invalid-tech')).rejects.toThrow();
    });
  });
  
  describe('startMaintenanceWork', () => {
    it('should mark a maintenance request as in progress', async () => {
      // Mock data
      const mockExistingRequest = {
        id: '1',
        assetId: 'asset1',
        requestType: 'CORRECTIVE',
        priority: 'HIGH',
        description: 'Fix broken AC unit',
        scheduledTime: new Date(),
        status: 'ASSIGNED',
        assignedToId: 'tech1',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockTechnician = {
        id: 'tech1',
        name: 'Jane Doe',
        specialization: 'HVAC'
      };
      
      const mockUpdatedRequest = {
        ...mockExistingRequest,
        status: 'IN_PROGRESS',
        startedAt: expect.any(Date),
        notes: 'Starting work on the AC unit',
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.maintenanceRequest.findUnique as any).mockResolvedValue(mockExistingRequest);
      (prisma.maintenanceTechnician.findUnique as any).mockResolvedValue(mockTechnician);
      (prisma.maintenanceRequest.update as any).mockResolvedValue(mockUpdatedRequest);
      
      // Call the service method
      const result = await maintenanceService.startMaintenanceWork('1', 'tech1', 'Starting work on the AC unit');
      
      // Verify Prisma was called with correct arguments
      expect(prisma.maintenanceRequest.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: 'IN_PROGRESS',
          startedAt: expect.any(Date),
          notes: 'Starting work on the AC unit'
        },
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual(mockUpdatedRequest);
    });
    
    it('should throw an error if request is not in ASSIGNED status', async () => {
      // Mock data
      const mockExistingRequest = {
        id: '1',
        assetId: 'asset1',
        requestType: 'CORRECTIVE',
        priority: 'HIGH',
        description: 'Fix broken AC unit',
        scheduledTime: new Date(),
        status: 'PENDING', // Not assigned yet
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.maintenanceRequest.findUnique as any).mockResolvedValue(mockExistingRequest);
      
      // Expect the start work to throw an error
      await expect(maintenanceService.startMaintenanceWork('1', 'tech1', 'Notes')).rejects.toThrow();
    });
  });
  
  describe('completeMaintenanceRequest', () => {
    it('should mark a maintenance request as completed', async () => {
      // Mock data
      const mockExistingRequest = {
        id: '1',
        assetId: 'asset1',
        requestType: 'CORRECTIVE',
        priority: 'HIGH',
        description: 'Fix broken AC unit',
        scheduledTime: new Date(),
        status: 'IN_PROGRESS',
        assignedToId: 'tech1',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockTechnician = {
        id: 'tech1',
        name: 'Jane Doe',
        specialization: 'HVAC'
      };
      
      const mockPartsUsed = [
        { partId: 'part1', quantity: 2 },
        { partId: 'part2', quantity: 1 }
      ];
      
      const mockUpdatedRequest = {
        ...mockExistingRequest,
        status: 'COMPLETED',
        completedById: 'tech1',
        completedBy: mockTechnician,
        completedAt: expect.any(Date),
        notes: 'Replaced fan motor and capacitor',
        laborHours: 2.5,
        partsUsed: mockPartsUsed,
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.maintenanceRequest.findUnique as any).mockResolvedValue(mockExistingRequest);
      (prisma.maintenanceTechnician.findUnique as any).mockResolvedValue(mockTechnician);
      (prisma.maintenancePart.findUnique as any)
        .mockResolvedValueOnce({ id: 'part1', name: 'Fan Motor', currentStock: 10 })
        .mockResolvedValueOnce({ id: 'part2', name: 'Capacitor', currentStock: 5 });
      (prisma.maintenancePart.update as any).mockResolvedValue({});
      (prisma.maintenanceRequest.update as any).mockResolvedValue(mockUpdatedRequest);
      
      // Call the service method
      const result = await maintenanceService.completeMaintenanceRequest(
        '1', 
        'tech1', 
        'Replaced fan motor and capacitor',
        mockPartsUsed,
        2.5
      );
      
      // Verify Prisma was called with correct arguments
      expect(prisma.maintenanceRequest.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          completedById: 'tech1',
          completedAt: expect.any(Date),
          notes: 'Replaced fan motor and capacitor',
          laborHours: 2.5
        }),
        include: expect.any(Object)
      });
      
      // Verify parts stock was updated
      expect(prisma.maintenancePart.update).toHaveBeenCalledTimes(2);
      expect(prisma.maintenancePart.update).toHaveBeenCalledWith({
        where: { id: 'part1' },
        data: { currentStock: 8 } // 10 - 2
      });
      expect(prisma.maintenancePart.update).toHaveBeenCalledWith({
        where: { id: 'part2' },
        data: { currentStock: 4 } // 5 - 1
      });
      
      // Verify result
      expect(result).toEqual(mockUpdatedRequest);
    });
    
    it('should throw an error if request is not in IN_PROGRESS status', async () => {
      // Mock data
      const mockExistingRequest = {
        id: '1',
        assetId: 'asset1',
        requestType: 'CORRECTIVE',
        priority: 'HIGH',
        description: 'Fix broken AC unit',
        scheduledTime: new Date(),
        status: 'COMPLETED', // Already completed
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.maintenanceRequest.findUnique as any).mockResolvedValue(mockExistingRequest);
      
      // Expect the completion to throw an error
      await expect(maintenanceService.completeMaintenanceRequest('1', 'tech1', 'Notes', [], 1)).rejects.toThrow();
    });
    
    it('should throw an error if insufficient parts stock', async () => {
      // Mock data
      const mockExistingRequest = {
        id: '1',
        assetId: 'asset1',
        requestType: 'CORRECTIVE',
        priority: 'HIGH',
        description: 'Fix broken AC unit',
        scheduledTime: new Date(),
        status: 'IN_PROGRESS',
        assignedToId: 'tech1',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockTechnician = {
        id: 'tech1',
        name: 'Jane Doe',
        specialization: 'HVAC'
      };
      
      const mockPartsUsed = [
        { partId: 'part1', quantity: 20 } // More than available
      ];
      
      // Mock Prisma response
      (prisma.maintenanceRequest.findUnique as any).mockResolvedValue(mockExistingRequest);
      (prisma.maintenanceTechnician.findUnique as any).mockResolvedValue(mockTechnician);
      (prisma.maintenancePart.findUnique as any).mockResolvedValue({ 
        id: 'part1', 
        name: 'Fan Motor', 
        currentStock: 10 // Less than requested
      });
      
      // Expect the completion to throw an error
      await expect(maintenanceService.completeMaintenanceRequest(
        '1', 
        'tech1', 
        'Notes', 
        mockPartsUsed, 
        1
      )).rejects.toThrow();
    });
  });
  
  describe('getMaintenanceAssets', () => {
    it('should return maintenance assets with pagination', async () => {
      // Mock data
      const mockAssets = [
        {
          id: 'asset1',
          name: 'AC Unit 101',
          type: 'HVAC',
          status: 'OPERATIONAL',
          location: 'Room 101',
          lastMaintenanceDate: new Date(),
          nextMaintenanceDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'asset2',
          name: 'X-Ray Machine',
          type: 'MEDICAL_EQUIPMENT',
          status: 'OPERATIONAL',
          location: 'Radiology',
          lastMaintenanceDate: new Date(),
          nextMaintenanceDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.maintenanceAsset.findMany as any).mockResolvedValue(mockAssets);
      (prisma.maintenanceAsset.count as any).mockResolvedValue(2);
      
      // Call the service method
      const result = await maintenanceService.getMaintenanceAssets({
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct arguments
      expect(prisma.maintenanceAsset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { name: 'asc' }
        })
      );
      
      // Verify result
      expect(result).toEqual({
        data: mockAssets,
        pagination: {
          page: 1,
          limit: 10,
          totalItems: 2,
          totalPages: 1
        }
      });
    });
    
    it('should apply filters correctly', async () => {
      // Mock data
      const mockAssets = [
        {
          id: 'asset1',
          name: 'AC Unit 101',
          type: 'HVAC',
          status: 'OPERATIONAL',
          location: 'Room 101',
          lastMaintenanceDate: new Date(),
          nextMaintenanceDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.maintenanceAsset.findMany as any).mockResolvedValue(mockAssets);
      (prisma.maintenanceAsset.count as any).mockResolvedValue(1);
      
      // Call the service method with filters
      const result = await maintenanceService.getMaintenanceAssets({
        type: 'HVAC',
        status: 'OPERATIONAL',
        locationId: 'Room 101',
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct filters
      expect(prisma.maintenanceAsset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            type: 'HVAC',
            status: 'OPERATIONAL',
            locationId: 'Room 101'
          }
        })
      );
      
      // Verify result
      expect(result.data).toEqual(mockAssets);
      expect(result.pagination.totalItems).toBe(1);
    });
  });
  
  describe('getMaintenanceAnalytics', () => {
    it('should return analytics data', async () => {
      // Mock data for status counts
      const mockStatusCounts = [
        { status: 'PENDING', count: 5 },
        { status: 'ASSIGNED', count: 3 },
        { status: 'IN_PROGRESS', count: 2 },
        { status: 'COMPLETED', count: 10 },
        { status: 'CANCELLED', count: 1 }
      ];
      
      // Mock data for request types
      const mockRequestTypes = [
        { requestType: 'PREVENTIVE', count: 8 },
        { requestType: 'CORRECTIVE', count: 10 },
        { requestType: 'EMERGENCY', count: 3 }
      ];
      
      // Mock data for priority distribution
      const mockPriorities = [
        { priority: 'LOW', count: 2 },
        { priority: 'MEDIUM', count: 8 },
        { priority: 'HIGH', count: 6 },
        { priority: 'URGENT', count: 5 }
      ];
      
      // Mock Prisma response for each query
      (prisma.maintenanceRequest.groupBy as any) = vi.fn();
      (prisma.maintenanceRequest.groupBy as any)
        .mockResolvedValueOnce(mockStatusCounts)
        .mockResolvedValueOnce(mockRequestTypes)
        .mockResolvedValueOnce(mockPriorities);
      
      (prisma.maintenanceRequest.count as any).mockResolvedValue(21);
      
      // Call the service method
      const result = await maintenanceService.getMaintenanceAnalytics();
      
      // Verify result structure
      expect(result).toHaveProperty('totalRequests', 21);
      expect(result).toHaveProperty('statusDistribution');
      expect(result).toHaveProperty('requestTypeDistribution');
      expect(result).toHaveProperty('priorityDistribution');
      
      // Verify specific data
      expect(result.statusDistribution).toEqual(expect.arrayContaining([
        { status: 'PENDING', count: 5 },
        { status: 'COMPLETED', count: 10 }
      ]));
      
      expect(result.requestTypeDistribution).toEqual(expect.arrayContaining([
        { requestType: 'PREVENTIVE', count: 8 },
        { requestType: 'CORRECTIVE', count: 10 }
      ]));
      
      expect(result.priorityDistribution).toEqual(expect.arrayContaining([
        { priority: 'MEDIUM', count: 8 },
        { priority: 'HIGH', count: 6 }
      ]));
    });
    
    it('should apply date filters when provided', async () => {
      // Mock dates
      const fromDate = new Date('2025-05-01');
      const toDate = new Date('2025-05-25');
      
      // Mock Prisma response
      (prisma.maintenanceRequest.groupBy as any) = vi.fn().mockResolvedValue([]);
      (prisma.maintenanceRequest.count as any).mockResolvedValue(0);
      
      // Call the service method with date filters
      await maintenanceService.getMaintenanceAnalytics(fromDate, toDate);
      
      // Verify Prisma was called with date filters
      expect(prisma.maintenanceRequest.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate
          }
        }
      });
      
      expect(prisma.maintenanceRequest.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              gte: fromDate,
              lte: toDate
            }
          }
        })
      );
    });
  });
});
