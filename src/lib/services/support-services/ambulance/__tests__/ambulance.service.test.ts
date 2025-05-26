import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AmbulanceService } from '../ambulance.service';
import { prisma } from '@/lib/prisma';
import { SecurityService } from '@/lib/security.service';
import { ErrorHandler } from '@/lib/error-handler';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    ambulanceTrip: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    ambulance: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn()
    },
    ambulanceCrew: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn()
    },
    ambulanceTripLog: {
      create: vi.fn()
    },
    patient: {
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

describe('AmbulanceService', () => {
  let ambulanceService: AmbulanceService;
  
  beforeEach(() => {
    ambulanceService = new AmbulanceService();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('getAmbulanceTrips', () => {
    it('should return ambulance trips with pagination', async () => {
      // Mock data
      const mockTrips = [
        {
          id: '1',
          requestType: 'EMERGENCY',
          priority: 'URGENT',
          pickupLocation: 'Main Street 123',
          dropoffLocation: 'City Hospital',
          scheduledTime: new Date(),
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          requestType: 'TRANSFER',
          priority: 'MEDIUM',
          pickupLocation: 'City Hospital',
          dropoffLocation: 'Rehabilitation Center',
          scheduledTime: new Date(),
          status: 'ASSIGNED',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.ambulanceTrip.findMany as any).mockResolvedValue(mockTrips);
      (prisma.ambulanceTrip.count as any).mockResolvedValue(2);
      
      // Call the service method
      const result = await ambulanceService.getAmbulanceTrips({
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct arguments
      expect(prisma.ambulanceTrip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { scheduledTime: 'asc' }
        })
      );
      
      // Verify result
      expect(result).toEqual({
        data: mockTrips,
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
      const mockTrips = [
        {
          id: '1',
          requestType: 'EMERGENCY',
          priority: 'URGENT',
          pickupLocation: 'Main Street 123',
          dropoffLocation: 'City Hospital',
          scheduledTime: new Date(),
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.ambulanceTrip.findMany as any).mockResolvedValue(mockTrips);
      (prisma.ambulanceTrip.count as any).mockResolvedValue(1);
      
      // Call the service method with filters
      const result = await ambulanceService.getAmbulanceTrips({
        status: 'PENDING',
        priority: 'URGENT',
        requestType: 'EMERGENCY',
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct filters
      expect(prisma.ambulanceTrip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'PENDING',
            priority: 'URGENT',
            requestType: 'EMERGENCY'
          }
        })
      );
      
      // Verify result
      expect(result.data).toEqual(mockTrips);
      expect(result.pagination.totalItems).toBe(1);
    });
  });
  
  describe('createAmbulanceTrip', () => {
    it('should create a new ambulance trip', async () => {
      // Mock data
      const mockTrip = {
        requestType: 'EMERGENCY',
        priority: 'URGENT',
        pickupLocation: 'Main Street 123',
        dropoffLocation: 'City Hospital',
        patientId: 'patient1',
        scheduledTime: new Date(),
        notes: 'Patient with chest pain',
        requestedById: 'user1',
        contactName: 'John Doe',
        contactPhone: '555-1234',
        medicalEquipmentNeeded: ['OXYGEN', 'STRETCHER'],
        specialInstructions: 'Patient is elderly and has mobility issues'
      };
      
      const mockCreatedTrip = {
        id: '1',
        ...mockTrip,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.patient.findUnique as any).mockResolvedValue({ id: 'patient1', name: 'John Doe' });
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user1', name: 'Dr. Smith' });
      (prisma.ambulanceTrip.create as any).mockResolvedValue(mockCreatedTrip);
      
      // Call the service method
      const result = await ambulanceService.createAmbulanceTrip(mockTrip);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.ambulanceTrip.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requestType: 'EMERGENCY',
          priority: 'URGENT',
          pickupLocation: 'Main Street 123',
          dropoffLocation: 'City Hospital',
          patientId: 'patient1',
          scheduledTime: expect.any(Date),
          notes: 'Patient with chest pain',
          requestedById: 'user1',
          contactName: 'John Doe',
          contactPhone: '555-1234',
          medicalEquipmentNeeded: ['OXYGEN', 'STRETCHER'],
          specialInstructions: 'Patient is elderly and has mobility issues',
          status: 'PENDING'
        })
      });
      
      // Verify result
      expect(result).toEqual(mockCreatedTrip);
    });
    
    it('should throw an error if patient does not exist when patientId is provided', async () => {
      // Mock data
      const mockTrip = {
        requestType: 'EMERGENCY',
        priority: 'URGENT',
        pickupLocation: 'Main Street 123',
        dropoffLocation: 'City Hospital',
        patientId: 'invalid-patient',
        scheduledTime: new Date(),
        requestedById: 'user1'
      };
      
      // Mock Prisma response
      (prisma.patient.findUnique as any).mockResolvedValue(null);
      
      // Expect the creation to throw an error
      await expect(ambulanceService.createAmbulanceTrip(mockTrip)).rejects.toThrow();
    });
    
    it('should create trip without patient for non-patient transport', async () => {
      // Mock data without patientId
      const mockTrip = {
        requestType: 'NON_EMERGENCY',
        priority: 'MEDIUM',
        pickupLocation: 'Main Street 123',
        dropoffLocation: 'City Hospital',
        scheduledTime: new Date(),
        notes: 'Equipment transport',
        requestedById: 'user1'
      };
      
      const mockCreatedTrip = {
        id: '1',
        ...mockTrip,
        patientId: null,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user1', name: 'Dr. Smith' });
      (prisma.ambulanceTrip.create as any).mockResolvedValue(mockCreatedTrip);
      
      // Call the service method
      const result = await ambulanceService.createAmbulanceTrip(mockTrip);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.ambulanceTrip.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requestType: 'NON_EMERGENCY',
          priority: 'MEDIUM',
          patientId: undefined, // No patient ID
          status: 'PENDING'
        })
      });
      
      // Verify result
      expect(result).toEqual(mockCreatedTrip);
    });
  });
  
  describe('getAmbulanceTripById', () => {
    it('should return an ambulance trip by ID', async () => {
      // Mock data
      const mockTrip = {
        id: '1',
        requestType: 'EMERGENCY',
        priority: 'URGENT',
        pickupLocation: 'Main Street 123',
        dropoffLocation: 'City Hospital',
        scheduledTime: new Date(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.ambulanceTrip.findUnique as any).mockResolvedValue(mockTrip);
      
      // Call the service method
      const result = await ambulanceService.getAmbulanceTripById('1');
      
      // Verify Prisma was called with correct arguments
      expect(prisma.ambulanceTrip.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual(mockTrip);
    });
    
    it('should throw an error if trip does not exist', async () => {
      // Mock Prisma response
      (prisma.ambulanceTrip.findUnique as any).mockResolvedValue(null);
      
      // Expect the retrieval to throw an error
      await expect(ambulanceService.getAmbulanceTripById('invalid-id')).rejects.toThrow();
    });
    
    it('should return FHIR format when requested', async () => {
      // Mock data
      const mockTrip = {
        id: '1',
        requestType: 'EMERGENCY',
        priority: 'URGENT',
        pickupLocation: 'Main Street 123',
        dropoffLocation: 'City Hospital',
        patientId: 'patient1',
        patient: { id: 'patient1', name: 'John Doe' },
        scheduledTime: new Date('2025-05-25T10:00:00Z'),
        status: 'PENDING',
        requestedById: 'user1',
        requestedBy: { id: 'user1', name: 'Dr. Smith' },
        createdAt: new Date('2025-05-25T09:30:00Z'),
        updatedAt: new Date('2025-05-25T09:30:00Z')
      };
      
      // Mock Prisma response
      (prisma.ambulanceTrip.findUnique as any).mockResolvedValue(mockTrip);
      
      // Call the service method with FHIR flag
      const result = await ambulanceService.getAmbulanceTripById('1', true);
      
      // Verify result is in FHIR format
      expect(result).toHaveProperty('resourceType', 'ServiceRequest');
      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('status', 'active');
      expect(result).toHaveProperty('intent', 'order');
      expect(result).toHaveProperty('priority', 'urgent');
      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('requester');
      expect(result).toHaveProperty('authoredOn', '2025-05-25T09:30:00Z');
      expect(result).toHaveProperty('locationReference');
      expect(result).toHaveProperty('occurrenceDateTime', '2025-05-25T10:00:00Z');
    });
  });
  
  describe('updateAmbulanceTrip', () => {
    it('should update an ambulance trip', async () => {
      // Mock data
      const mockExistingTrip = {
        id: '1',
        requestType: 'EMERGENCY',
        priority: 'URGENT',
        pickupLocation: 'Main Street 123',
        dropoffLocation: 'City Hospital',
        scheduledTime: new Date(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockUpdateData = {
        priority: 'HIGH',
        notes: 'Patient condition stabilized',
        status: 'ASSIGNED'
      };
      
      const mockUpdatedTrip = {
        ...mockExistingTrip,
        ...mockUpdateData,
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.ambulanceTrip.findUnique as any).mockResolvedValue(mockExistingTrip);
      (prisma.ambulanceTrip.update as any).mockResolvedValue(mockUpdatedTrip);
      
      // Call the service method
      const result = await ambulanceService.updateAmbulanceTrip('1', mockUpdateData);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.ambulanceTrip.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: mockUpdateData,
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual(mockUpdatedTrip);
    });
    
    it('should throw an error if trip does not exist', async () => {
      // Mock Prisma response
      (prisma.ambulanceTrip.findUnique as any).mockResolvedValue(null);
      
      // Expect the update to throw an error
      await expect(ambulanceService.updateAmbulanceTrip('invalid-id', { priority: 'MEDIUM' })).rejects.toThrow();
    });
  });
  
  describe('assignAmbulanceTrip', () => {
    it('should assign an ambulance and crew to a trip', async () => {
      // Mock data
      const mockExistingTrip = {
        id: '1',
        requestType: 'EMERGENCY',
        priority: 'URGENT',
        pickupLocation: 'Main Street 123',
        dropoffLocation: 'City Hospital',
        scheduledTime: new Date(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockAmbulance = {
        id: 'amb1',
        registrationNumber: 'AMB-001',
        type: 'ADVANCED_LIFE_SUPPORT',
        status: 'AVAILABLE'
      };
      
      const mockCrews = [
        { id: 'crew1', name: 'John Driver', role: 'DRIVER', status: 'AVAILABLE' },
        { id: 'crew2', name: 'Jane Medic', role: 'PARAMEDIC', status: 'AVAILABLE' }
      ];
      
      const mockUpdatedTrip = {
        ...mockExistingTrip,
        status: 'ASSIGNED',
        ambulanceId: 'amb1',
        ambulance: mockAmbulance,
        crew: mockCrews,
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.ambulanceTrip.findUnique as any).mockResolvedValue(mockExistingTrip);
      (prisma.ambulance.findUnique as any).mockResolvedValue(mockAmbulance);
      (prisma.ambulanceCrew.findUnique as any)
        .mockResolvedValueOnce(mockCrews[0])
        .mockResolvedValueOnce(mockCrews[1]);
      (prisma.ambulance.update as any).mockResolvedValue({ ...mockAmbulance, status: 'ASSIGNED' });
      (prisma.ambulanceCrew.update as any).mockResolvedValue({ status: 'ASSIGNED' });
      (prisma.ambulanceTrip.update as any).mockResolvedValue(mockUpdatedTrip);
      (prisma.ambulanceTripLog.create as any).mockResolvedValue({});
      
      // Call the service method
      const result = await ambulanceService.assignAmbulanceTrip('1', 'amb1', ['crew1', 'crew2']);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.ambulanceTrip.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: 'ASSIGNED',
          ambulanceId: 'amb1',
          crew: {
            connect: [{ id: 'crew1' }, { id: 'crew2' }]
          }
        },
        include: expect.any(Object)
      });
      
      // Verify ambulance status was updated
      expect(prisma.ambulance.update).toHaveBeenCalledWith({
        where: { id: 'amb1' },
        data: { status: 'ASSIGNED' }
      });
      
      // Verify crew status was updated
      expect(prisma.ambulanceCrew.update).toHaveBeenCalledTimes(2);
      
      // Verify trip log was created
      expect(prisma.ambulanceTripLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tripId: '1',
          status: 'ASSIGNED',
          notes: expect.stringContaining('Ambulance AMB-001 assigned')
        })
      });
      
      // Verify result
      expect(result).toEqual(mockUpdatedTrip);
    });
    
    it('should throw an error if ambulance does not exist', async () => {
      // Mock data
      const mockExistingTrip = {
        id: '1',
        requestType: 'EMERGENCY',
        priority: 'URGENT',
        pickupLocation: 'Main Street 123',
        dropoffLocation: 'City Hospital',
        scheduledTime: new Date(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.ambulanceTrip.findUnique as any).mockResolvedValue(mockExistingTrip);
      (prisma.ambulance.findUnique as any).mockResolvedValue(null);
      
      // Expect the assignment to throw an error
      await expect(ambulanceService.assignAmbulanceTrip('1', 'invalid-ambulance', [])).rejects.toThrow();
    });
    
    it('should throw an error if ambulance is not available', async () => {
      // Mock data
      const mockExistingTrip = {
        id: '1',
        requestType: 'EMERGENCY',
        priority: 'URGENT',
        pickupLocation: 'Main Street 123',
        dropoffLocation: 'City Hospital',
        scheduledTime: new Date(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockAmbulance = {
        id: 'amb1',
        registrationNumber: 'AMB-001',
        type: 'ADVANCED_LIFE_SUPPORT',
        status: 'ASSIGNED' // Already assigned
      };
      
      // Mock Prisma response
      (prisma.ambulanceTrip.findUnique as any).mockResolvedValue(mockExistingTrip);
      (prisma.ambulance.findUnique as any).mockResolvedValue(mockAmbulance);
      
      // Expect the assignment to throw an error
      await expect(ambulanceService.assignAmbulanceTrip('1', 'amb1', [])).rejects.toThrow();
    });
  });
  
  describe('updateAmbulanceTripStatus', () => {
    it('should update the status of an ambulance trip', async () => {
      // Mock data
      const mockExistingTrip = {
        id: '1',
        requestType: 'EMERGENCY',
        priority: 'URGENT',
        pickupLocation: 'Main Street 123',
        dropoffLocation: 'City Hospital',
        scheduledTime: new Date(),
        status: 'ASSIGNED',
        ambulanceId: 'amb1',
        ambulance: { id: 'amb1', registrationNumber: 'AMB-001' },
        crew: [
          { id: 'crew1', name: 'John Driver' },
          { id: 'crew2', name: 'Jane Medic' }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockUpdatedTrip = {
        ...mockExistingTrip,
        status: 'EN_ROUTE_TO_PICKUP',
        currentLatitude: 40.7128,
        currentLongitude: -74.0060,
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.ambulanceTrip.findUnique as any).mockResolvedValue(mockExistingTrip);
      (prisma.ambulanceTrip.update as any).mockResolvedValue(mockUpdatedTrip);
      (prisma.ambulanceTripLog.create as any).mockResolvedValue({});
      
      // Call the service method
      const result = await ambulanceService.updateAmbulanceTripStatus(
        '1',
        'EN_ROUTE_TO_PICKUP',
        'Ambulance en route to pickup location',
        40.7128,
        -74.0060
      );
      
      // Verify Prisma was called with correct arguments
      expect(prisma.ambulanceTrip.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: 'EN_ROUTE_TO_PICKUP',
          currentLatitude: 40.7128,
          currentLongitude: -74.0060
        },
        include: expect.any(Object)
      });
      
      // Verify trip log was created
      expect(prisma.ambulanceTripLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tripId: '1',
          status: 'EN_ROUTE_TO_PICKUP',
          notes: 'Ambulance en route to pickup location',
          latitude: 40.7128,
          longitude: -74.0060
        })
      });
      
      // Verify result
      expect(result).toEqual(mockUpdatedTrip);
    });
    
    it('should handle trip completion and update resources', async () => {
      // Mock data
      const mockExistingTrip = {
        id: '1',
        requestType: 'EMERGENCY',
        priority: 'URGENT',
        pickupLocation: 'Main Street 123',
        dropoffLocation: 'City Hospital',
        scheduledTime: new Date(),
        status: 'EN_ROUTE_TO_DROPOFF',
        ambulanceId: 'amb1',
        ambulance: { id: 'amb1', registrationNumber: 'AMB-001' },
        crew: [
          { id: 'crew1', name: 'John Driver' },
          { id: 'crew2', name: 'Jane Medic' }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockUpdatedTrip = {
        ...mockExistingTrip,
        status: 'COMPLETED',
        completedAt: expect.any(Date),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.ambulanceTrip.findUnique as any).mockResolvedValue(mockExistingTrip);
      (prisma.ambulanceTrip.update as any).mockResolvedValue(mockUpdatedTrip);
      (prisma.ambulanceTripLog.create as any).mockResolvedValue({});
      (prisma.ambulance.update as any).mockResolvedValue({ status: 'AVAILABLE' });
      (prisma.ambulanceCrew.update as any).mockResolvedValue({ status: 'AVAILABLE' });
      
      // Call the service method
      const result = await ambulanceService.updateAmbulanceTripStatus(
        '1',
        'COMPLETED',
        'Trip completed successfully'
      );
      
      // Verify Prisma was called with correct arguments
      expect(prisma.ambulanceTrip.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date)
        },
        include: expect.any(Object)
      });
      
      // Verify ambulance status was updated
      expect(prisma.ambulance.update).toHaveBeenCalledWith({
        where: { id: 'amb1' },
        data: { status: 'AVAILABLE' }
      });
      
      // Verify crew status was updated
      expect(prisma.ambulanceCrew.update).toHaveBeenCalledTimes(2);
      
      // Verify trip log was created
      expect(prisma.ambulanceTripLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tripId: '1',
          status: 'COMPLETED',
          notes: 'Trip completed successfully'
        })
      });
      
      // Verify result
      expect(result).toEqual(mockUpdatedTrip);
    });
    
    it('should throw an error for invalid status transitions', async () => {
      // Mock data
      const mockExistingTrip = {
        id: '1',
        requestType: 'EMERGENCY',
        priority: 'URGENT',
        pickupLocation: 'Main Street 123',
        dropoffLocation: 'City Hospital',
        scheduledTime: new Date(),
        status: 'PENDING', // Not assigned yet
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.ambulanceTrip.findUnique as any).mockResolvedValue(mockExistingTrip);
      
      // Expect the status update to throw an error
      await expect(ambulanceService.updateAmbulanceTripStatus(
        '1',
        'EN_ROUTE_TO_PICKUP',
        'Notes'
      )).rejects.toThrow();
    });
  });
  
  describe('getAmbulanceVehicles', () => {
    it('should return ambulance vehicles with pagination', async () => {
      // Mock data
      const mockVehicles = [
        {
          id: 'amb1',
          registrationNumber: 'AMB-001',
          type: 'ADVANCED_LIFE_SUPPORT',
          status: 'AVAILABLE',
          lastMaintenanceDate: new Date(),
          nextMaintenanceDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'amb2',
          registrationNumber: 'AMB-002',
          type: 'BASIC_LIFE_SUPPORT',
          status: 'AVAILABLE',
          lastMaintenanceDate: new Date(),
          nextMaintenanceDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.ambulance.findMany as any).mockResolvedValue(mockVehicles);
      (prisma.ambulance.count as any).mockResolvedValue(2);
      
      // Call the service method
      const result = await ambulanceService.getAmbulanceVehicles({
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct arguments
      expect(prisma.ambulance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { registrationNumber: 'asc' }
        })
      );
      
      // Verify result
      expect(result).toEqual({
        data: mockVehicles,
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
      const mockVehicles = [
        {
          id: 'amb1',
          registrationNumber: 'AMB-001',
          type: 'ADVANCED_LIFE_SUPPORT',
          status: 'AVAILABLE',
          lastMaintenanceDate: new Date(),
          nextMaintenanceDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.ambulance.findMany as any).mockResolvedValue(mockVehicles);
      (prisma.ambulance.count as any).mockResolvedValue(1);
      
      // Call the service method with filters
      const result = await ambulanceService.getAmbulanceVehicles({
        status: 'AVAILABLE',
        type: 'ADVANCED_LIFE_SUPPORT',
        available: true,
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct filters
      expect(prisma.ambulance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'AVAILABLE',
            type: 'ADVANCED_LIFE_SUPPORT'
          }
        })
      );
      
      // Verify result
      expect(result.data).toEqual(mockVehicles);
      expect(result.pagination.totalItems).toBe(1);
    });
  });
  
  describe('getAmbulanceAnalytics', () => {
    it('should return analytics data', async () => {
      // Mock data for status counts
      const mockStatusCounts = [
        { status: 'PENDING', count: 5 },
        { status: 'ASSIGNED', count: 3 },
        { status: 'EN_ROUTE_TO_PICKUP', count: 2 },
        { status: 'AT_PICKUP', count: 1 },
        { status: 'EN_ROUTE_TO_DROPOFF', count: 2 },
        { status: 'COMPLETED', count: 10 },
        { status: 'CANCELLED', count: 1 }
      ];
      
      // Mock data for request types
      const mockRequestTypes = [
        { requestType: 'EMERGENCY', count: 8 },
        { requestType: 'NON_EMERGENCY', count: 5 },
        { requestType: 'TRANSFER', count: 7 },
        { requestType: 'DISCHARGE', count: 3 },
        { requestType: 'SCHEDULED', count: 1 }
      ];
      
      // Mock data for priority distribution
      const mockPriorities = [
        { priority: 'LOW', count: 2 },
        { priority: 'MEDIUM', count: 8 },
        { priority: 'HIGH', count: 6 },
        { priority: 'URGENT', count: 8 }
      ];
      
      // Mock Prisma response for each query
      (prisma.ambulanceTrip.groupBy as any) = vi.fn();
      (prisma.ambulanceTrip.groupBy as any)
        .mockResolvedValueOnce(mockStatusCounts)
        .mockResolvedValueOnce(mockRequestTypes)
        .mockResolvedValueOnce(mockPriorities);
      
      (prisma.ambulanceTrip.count as any).mockResolvedValue(24);
      
      // Call the service method
      const result = await ambulanceService.getAmbulanceAnalytics();
      
      // Verify result structure
      expect(result).toHaveProperty('totalTrips', 24);
      expect(result).toHaveProperty('statusDistribution');
      expect(result).toHaveProperty('requestTypeDistribution');
      expect(result).toHaveProperty('priorityDistribution');
      
      // Verify specific data
      expect(result.statusDistribution).toEqual(expect.arrayContaining([
        { status: 'PENDING', count: 5 },
        { status: 'COMPLETED', count: 10 }
      ]));
      
      expect(result.requestTypeDistribution).toEqual(expect.arrayContaining([
        { requestType: 'EMERGENCY', count: 8 },
        { requestType: 'TRANSFER', count: 7 }
      ]));
      
      expect(result.priorityDistribution).toEqual(expect.arrayContaining([
        { priority: 'MEDIUM', count: 8 },
        { priority: 'URGENT', count: 8 }
      ]));
    });
    
    it('should apply date filters when provided', async () => {
      // Mock dates
      const fromDate = new Date('2025-05-01');
      const toDate = new Date('2025-05-25');
      
      // Mock Prisma response
      (prisma.ambulanceTrip.groupBy as any) = vi.fn().mockResolvedValue([]);
      (prisma.ambulanceTrip.count as any).mockResolvedValue(0);
      
      // Call the service method with date filters
      await ambulanceService.getAmbulanceAnalytics(fromDate, toDate);
      
      // Verify Prisma was called with date filters
      expect(prisma.ambulanceTrip.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate
          }
        }
      });
      
      expect(prisma.ambulanceTrip.groupBy).toHaveBeenCalledWith(
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
