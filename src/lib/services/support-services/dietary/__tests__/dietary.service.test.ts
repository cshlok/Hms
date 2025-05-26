import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DietaryService } from '../dietary.service';
import { prisma } from '@/lib/prisma';
import { SecurityService } from '@/lib/security.service';
import { ErrorHandler } from '@/lib/error-handler';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    dietaryRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    dietaryMenu: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn()
    },
    dietaryMenuItem: {
      findMany: vi.fn()
    },
    patient: {
      findUnique: vi.fn()
    },
    location: {
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

describe('DietaryService', () => {
  let dietaryService: DietaryService;
  
  beforeEach(() => {
    dietaryService = new DietaryService();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('getDietaryRequests', () => {
    it('should return dietary requests with pagination', async () => {
      // Mock data
      const mockRequests = [
        {
          id: '1',
          patientId: 'patient1',
          mealType: 'BREAKFAST',
          dietType: 'DIABETIC',
          scheduledTime: new Date(),
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          patientId: 'patient2',
          mealType: 'LUNCH',
          dietType: 'VEGETARIAN',
          scheduledTime: new Date(),
          status: 'PREPARING',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.dietaryRequest.findMany as any).mockResolvedValue(mockRequests);
      (prisma.dietaryRequest.count as any).mockResolvedValue(2);
      
      // Call the service method
      const result = await dietaryService.getDietaryRequests({
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct arguments
      expect(prisma.dietaryRequest.findMany).toHaveBeenCalledWith(
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
          patientId: 'patient1',
          mealType: 'BREAKFAST',
          dietType: 'DIABETIC',
          scheduledTime: new Date(),
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.dietaryRequest.findMany as any).mockResolvedValue(mockRequests);
      (prisma.dietaryRequest.count as any).mockResolvedValue(1);
      
      // Call the service method with filters
      const result = await dietaryService.getDietaryRequests({
        status: 'PENDING',
        patientId: 'patient1',
        mealType: 'BREAKFAST',
        dietType: 'DIABETIC',
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct filters
      expect(prisma.dietaryRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'PENDING',
            patientId: 'patient1',
            mealType: 'BREAKFAST',
            dietType: 'DIABETIC'
          }
        })
      );
      
      // Verify result
      expect(result.data).toEqual(mockRequests);
      expect(result.pagination.totalItems).toBe(1);
    });
  });
  
  describe('createDietaryRequest', () => {
    it('should create a new dietary request', async () => {
      // Mock data
      const mockRequest = {
        patientId: 'patient1',
        mealType: 'BREAKFAST',
        dietType: 'DIABETIC',
        customDietDetails: 'Low sugar, high protein',
        allergies: ['NUTS', 'DAIRY'],
        preferences: ['NO_SPICY'],
        scheduledTime: new Date(),
        notes: 'Patient prefers warm food',
        requestedById: 'user1',
        locationId: 'location1'
      };
      
      const mockCreatedRequest = {
        id: '1',
        ...mockRequest,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.patient.findUnique as any).mockResolvedValue({ id: 'patient1', name: 'John Doe' });
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user1', name: 'Jane Smith' });
      (prisma.location.findUnique as any).mockResolvedValue({ id: 'location1', name: 'Room 101' });
      (prisma.dietaryRequest.create as any).mockResolvedValue(mockCreatedRequest);
      
      // Call the service method
      const result = await dietaryService.createDietaryRequest(mockRequest);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.dietaryRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: 'patient1',
          mealType: 'BREAKFAST',
          dietType: 'DIABETIC',
          customDietDetails: 'Low sugar, high protein',
          allergies: ['NUTS', 'DAIRY'],
          preferences: ['NO_SPICY'],
          scheduledTime: expect.any(Date),
          notes: 'Patient prefers warm food',
          requestedById: 'user1',
          locationId: 'location1',
          status: 'PENDING'
        })
      });
      
      // Verify result
      expect(result).toEqual(mockCreatedRequest);
    });
    
    it('should throw an error if patient does not exist', async () => {
      // Mock data
      const mockRequest = {
        patientId: 'invalid-patient',
        mealType: 'BREAKFAST',
        dietType: 'DIABETIC',
        scheduledTime: new Date(),
        requestedById: 'user1',
        locationId: 'location1'
      };
      
      // Mock Prisma response
      (prisma.patient.findUnique as any).mockResolvedValue(null);
      
      // Expect the creation to throw an error
      await expect(dietaryService.createDietaryRequest(mockRequest)).rejects.toThrow();
    });
  });
  
  describe('getDietaryRequestById', () => {
    it('should return a dietary request by ID', async () => {
      // Mock data
      const mockRequest = {
        id: '1',
        patientId: 'patient1',
        mealType: 'BREAKFAST',
        dietType: 'DIABETIC',
        scheduledTime: new Date(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.dietaryRequest.findUnique as any).mockResolvedValue(mockRequest);
      
      // Call the service method
      const result = await dietaryService.getDietaryRequestById('1');
      
      // Verify Prisma was called with correct arguments
      expect(prisma.dietaryRequest.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual(mockRequest);
    });
    
    it('should throw an error if request does not exist', async () => {
      // Mock Prisma response
      (prisma.dietaryRequest.findUnique as any).mockResolvedValue(null);
      
      // Expect the retrieval to throw an error
      await expect(dietaryService.getDietaryRequestById('invalid-id')).rejects.toThrow();
    });
    
    it('should return FHIR format when requested', async () => {
      // Mock data
      const mockRequest = {
        id: '1',
        patientId: 'patient1',
        patient: { id: 'patient1', name: 'John Doe' },
        mealType: 'BREAKFAST',
        dietType: 'DIABETIC',
        customDietDetails: 'Low sugar, high protein',
        allergies: ['NUTS', 'DAIRY'],
        preferences: ['NO_SPICY'],
        scheduledTime: new Date('2025-05-25T08:00:00Z'),
        status: 'PENDING',
        requestedById: 'user1',
        requestedBy: { id: 'user1', name: 'Jane Smith' },
        locationId: 'location1',
        location: { id: 'location1', name: 'Room 101' },
        createdAt: new Date('2025-05-24T20:00:00Z'),
        updatedAt: new Date('2025-05-24T20:00:00Z')
      };
      
      // Mock Prisma response
      (prisma.dietaryRequest.findUnique as any).mockResolvedValue(mockRequest);
      
      // Call the service method with FHIR flag
      const result = await dietaryService.getDietaryRequestById('1', true);
      
      // Verify result is in FHIR format
      expect(result).toHaveProperty('resourceType', 'NutritionOrder');
      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('status', 'active');
      expect(result).toHaveProperty('intent', 'order');
      expect(result).toHaveProperty('patient');
      expect(result).toHaveProperty('dateTime', '2025-05-24T20:00:00Z');
      expect(result).toHaveProperty('foodPreferenceModifier');
      expect(result).toHaveProperty('excludeFoodModifier');
      expect(result).toHaveProperty('oralDiet');
      expect(result).toHaveProperty('oralDiet.type');
      expect(result).toHaveProperty('oralDiet.schedule');
    });
  });
  
  describe('updateDietaryRequest', () => {
    it('should update a dietary request', async () => {
      // Mock data
      const mockExistingRequest = {
        id: '1',
        patientId: 'patient1',
        mealType: 'BREAKFAST',
        dietType: 'DIABETIC',
        scheduledTime: new Date(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockUpdateData = {
        dietType: 'GLUTEN_FREE',
        notes: 'Patient now requires gluten-free diet',
        status: 'PREPARING'
      };
      
      const mockUpdatedRequest = {
        ...mockExistingRequest,
        ...mockUpdateData,
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.dietaryRequest.findUnique as any).mockResolvedValue(mockExistingRequest);
      (prisma.dietaryRequest.update as any).mockResolvedValue(mockUpdatedRequest);
      
      // Call the service method
      const result = await dietaryService.updateDietaryRequest('1', mockUpdateData);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.dietaryRequest.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: mockUpdateData,
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual(mockUpdatedRequest);
    });
    
    it('should throw an error if request does not exist', async () => {
      // Mock Prisma response
      (prisma.dietaryRequest.findUnique as any).mockResolvedValue(null);
      
      // Expect the update to throw an error
      await expect(dietaryService.updateDietaryRequest('invalid-id', { dietType: 'VEGAN' })).rejects.toThrow();
    });
  });
  
  describe('prepareDietaryRequest', () => {
    it('should mark a dietary request as preparing', async () => {
      // Mock data
      const mockExistingRequest = {
        id: '1',
        patientId: 'patient1',
        mealType: 'BREAKFAST',
        dietType: 'DIABETIC',
        scheduledTime: new Date(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockStaff = {
        id: 'staff1',
        name: 'Chef Smith'
      };
      
      const mockUpdatedRequest = {
        ...mockExistingRequest,
        status: 'PREPARING',
        preparedById: 'staff1',
        preparedBy: mockStaff,
        preparedAt: expect.any(Date),
        notes: 'Starting meal preparation',
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.dietaryRequest.findUnique as any).mockResolvedValue(mockExistingRequest);
      (prisma.user.findUnique as any).mockResolvedValue(mockStaff);
      (prisma.dietaryRequest.update as any).mockResolvedValue(mockUpdatedRequest);
      
      // Call the service method
      const result = await dietaryService.prepareDietaryRequest('1', 'staff1', 'Starting meal preparation');
      
      // Verify Prisma was called with correct arguments
      expect(prisma.dietaryRequest.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: 'PREPARING',
          preparedById: 'staff1',
          preparedAt: expect.any(Date),
          notes: 'Starting meal preparation'
        },
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual(mockUpdatedRequest);
    });
    
    it('should throw an error if request is not in PENDING status', async () => {
      // Mock data
      const mockExistingRequest = {
        id: '1',
        patientId: 'patient1',
        mealType: 'BREAKFAST',
        dietType: 'DIABETIC',
        scheduledTime: new Date(),
        status: 'DELIVERED', // Already delivered
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.dietaryRequest.findUnique as any).mockResolvedValue(mockExistingRequest);
      
      // Expect the preparation to throw an error
      await expect(dietaryService.prepareDietaryRequest('1', 'staff1', 'Notes')).rejects.toThrow();
    });
  });
  
  describe('deliverDietaryRequest', () => {
    it('should mark a dietary request as delivered', async () => {
      // Mock data
      const mockExistingRequest = {
        id: '1',
        patientId: 'patient1',
        mealType: 'BREAKFAST',
        dietType: 'DIABETIC',
        scheduledTime: new Date(),
        status: 'READY',
        preparedById: 'staff1',
        preparedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockStaff = {
        id: 'staff2',
        name: 'Nurse Johnson'
      };
      
      const mockUpdatedRequest = {
        ...mockExistingRequest,
        status: 'DELIVERED',
        deliveredById: 'staff2',
        deliveredBy: mockStaff,
        deliveredAt: expect.any(Date),
        notes: 'Delivered to patient',
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.dietaryRequest.findUnique as any).mockResolvedValue(mockExistingRequest);
      (prisma.user.findUnique as any).mockResolvedValue(mockStaff);
      (prisma.dietaryRequest.update as any).mockResolvedValue(mockUpdatedRequest);
      
      // Call the service method
      const result = await dietaryService.deliverDietaryRequest('1', 'staff2', 'Delivered to patient');
      
      // Verify Prisma was called with correct arguments
      expect(prisma.dietaryRequest.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: 'DELIVERED',
          deliveredById: 'staff2',
          deliveredAt: expect.any(Date),
          notes: 'Delivered to patient'
        },
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual(mockUpdatedRequest);
    });
    
    it('should throw an error if request is not in READY status', async () => {
      // Mock data
      const mockExistingRequest = {
        id: '1',
        patientId: 'patient1',
        mealType: 'BREAKFAST',
        dietType: 'DIABETIC',
        scheduledTime: new Date(),
        status: 'PENDING', // Not ready yet
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.dietaryRequest.findUnique as any).mockResolvedValue(mockExistingRequest);
      
      // Expect the delivery to throw an error
      await expect(dietaryService.deliverDietaryRequest('1', 'staff2', 'Notes')).rejects.toThrow();
    });
  });
  
  describe('getDietaryMenus', () => {
    it('should return dietary menus with pagination', async () => {
      // Mock data
      const mockMenus = [
        {
          id: '1',
          name: 'Standard Breakfast Menu',
          dietType: 'REGULAR',
          mealType: 'BREAKFAST',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          name: 'Diabetic Lunch Menu',
          dietType: 'DIABETIC',
          mealType: 'LUNCH',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.dietaryMenu.findMany as any).mockResolvedValue(mockMenus);
      (prisma.dietaryMenu.count as any).mockResolvedValue(2);
      
      // Call the service method
      const result = await dietaryService.getDietaryMenus({
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct arguments
      expect(prisma.dietaryMenu.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { name: 'asc' }
        })
      );
      
      // Verify result
      expect(result).toEqual({
        data: mockMenus,
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
      const mockMenus = [
        {
          id: '1',
          name: 'Standard Breakfast Menu',
          dietType: 'REGULAR',
          mealType: 'BREAKFAST',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.dietaryMenu.findMany as any).mockResolvedValue(mockMenus);
      (prisma.dietaryMenu.count as any).mockResolvedValue(1);
      
      // Call the service method with filters
      const result = await dietaryService.getDietaryMenus({
        dietType: 'REGULAR',
        mealType: 'BREAKFAST',
        isActive: true,
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct filters
      expect(prisma.dietaryMenu.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dietType: 'REGULAR',
            mealType: 'BREAKFAST',
            isActive: true
          }
        })
      );
      
      // Verify result
      expect(result.data).toEqual(mockMenus);
      expect(result.pagination.totalItems).toBe(1);
    });
  });
  
  describe('getDietaryAnalytics', () => {
    it('should return analytics data', async () => {
      // Mock data for status counts
      const mockStatusCounts = [
        { status: 'PENDING', count: 5 },
        { status: 'PREPARING', count: 3 },
        { status: 'READY', count: 2 },
        { status: 'DELIVERED', count: 10 },
        { status: 'COMPLETED', count: 8 },
        { status: 'CANCELLED', count: 1 }
      ];
      
      // Mock data for meal types
      const mockMealTypes = [
        { mealType: 'BREAKFAST', count: 10 },
        { mealType: 'LUNCH', count: 12 },
        { mealType: 'DINNER', count: 8 },
        { mealType: 'SNACK', count: 5 }
      ];
      
      // Mock data for diet types
      const mockDietTypes = [
        { dietType: 'REGULAR', count: 15 },
        { dietType: 'VEGETARIAN', count: 5 },
        { dietType: 'DIABETIC', count: 8 },
        { dietType: 'GLUTEN_FREE', count: 3 },
        { dietType: 'LOW_SODIUM', count: 4 }
      ];
      
      // Mock Prisma response for each query
      (prisma.dietaryRequest.groupBy as any) = vi.fn();
      (prisma.dietaryRequest.groupBy as any)
        .mockResolvedValueOnce(mockStatusCounts)
        .mockResolvedValueOnce(mockMealTypes)
        .mockResolvedValueOnce(mockDietTypes);
      
      (prisma.dietaryRequest.count as any).mockResolvedValue(35);
      
      // Call the service method
      const result = await dietaryService.getDietaryAnalytics();
      
      // Verify result structure
      expect(result).toHaveProperty('totalRequests', 35);
      expect(result).toHaveProperty('statusDistribution');
      expect(result).toHaveProperty('mealTypeDistribution');
      expect(result).toHaveProperty('dietTypeDistribution');
      
      // Verify specific data
      expect(result.statusDistribution).toEqual(expect.arrayContaining([
        { status: 'PENDING', count: 5 },
        { status: 'DELIVERED', count: 10 }
      ]));
      
      expect(result.mealTypeDistribution).toEqual(expect.arrayContaining([
        { mealType: 'BREAKFAST', count: 10 },
        { mealType: 'LUNCH', count: 12 }
      ]));
      
      expect(result.dietTypeDistribution).toEqual(expect.arrayContaining([
        { dietType: 'REGULAR', count: 15 },
        { dietType: 'DIABETIC', count: 8 }
      ]));
    });
    
    it('should apply date filters when provided', async () => {
      // Mock dates
      const fromDate = new Date('2025-05-01');
      const toDate = new Date('2025-05-25');
      
      // Mock Prisma response
      (prisma.dietaryRequest.groupBy as any) = vi.fn().mockResolvedValue([]);
      (prisma.dietaryRequest.count as any).mockResolvedValue(0);
      
      // Call the service method with date filters
      await dietaryService.getDietaryAnalytics(fromDate, toDate);
      
      // Verify Prisma was called with date filters
      expect(prisma.dietaryRequest.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate
          }
        }
      });
      
      expect(prisma.dietaryRequest.groupBy).toHaveBeenCalledWith(
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
