import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MarketingService } from '../marketing.service';
import { prisma } from '@/lib/prisma';
import { SecurityService } from '@/lib/security.service';
import { ErrorHandler } from '@/lib/error-handler';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    marketingCampaign: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    marketingContact: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    marketingSegment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
    },
    marketingCommunication: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn()
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

describe('MarketingService', () => {
  let marketingService: MarketingService;
  
  beforeEach(() => {
    marketingService = new MarketingService();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('getCampaigns', () => {
    it('should return campaigns with pagination', async () => {
      // Mock data
      const mockCampaigns = [
        {
          id: '1',
          name: 'Health Awareness Campaign',
          description: 'Campaign to raise awareness about heart health',
          type: 'AWARENESS',
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(),
          budget: 5000,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          name: 'New Service Promotion',
          description: 'Promoting our new radiology services',
          type: 'PROMOTION',
          status: 'PLANNED',
          startDate: new Date(),
          endDate: new Date(),
          budget: 3000,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.marketingCampaign.findMany as any).mockResolvedValue(mockCampaigns);
      (prisma.marketingCampaign.count as any).mockResolvedValue(2);
      
      // Call the service method
      const result = await marketingService.getCampaigns({
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct arguments
      expect(prisma.marketingCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { startDate: 'desc' }
        })
      );
      
      // Verify result
      expect(result).toEqual({
        data: mockCampaigns,
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
      const mockCampaigns = [
        {
          id: '1',
          name: 'Health Awareness Campaign',
          description: 'Campaign to raise awareness about heart health',
          type: 'AWARENESS',
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(),
          budget: 5000,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.marketingCampaign.findMany as any).mockResolvedValue(mockCampaigns);
      (prisma.marketingCampaign.count as any).mockResolvedValue(1);
      
      // Call the service method with filters
      const result = await marketingService.getCampaigns({
        status: 'ACTIVE',
        type: 'AWARENESS',
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct filters
      expect(prisma.marketingCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'ACTIVE',
            type: 'AWARENESS'
          }
        })
      );
      
      // Verify result
      expect(result.data).toEqual(mockCampaigns);
      expect(result.pagination.totalItems).toBe(1);
    });
  });
  
  describe('createCampaign', () => {
    it('should create a new campaign', async () => {
      // Mock data
      const mockCampaign = {
        name: 'Health Awareness Campaign',
        description: 'Campaign to raise awareness about heart health',
        type: 'AWARENESS',
        status: 'PLANNED',
        startDate: new Date(),
        endDate: new Date(),
        budget: 5000,
        targetAudience: 'Adults 40+',
        goals: 'Increase awareness of heart disease prevention',
        channels: ['EMAIL', 'SOCIAL_MEDIA', 'PRINT'],
        createdById: 'user1'
      };
      
      const mockCreatedCampaign = {
        id: '1',
        ...mockCampaign,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user1', name: 'Marketing Manager' });
      (prisma.marketingCampaign.create as any).mockResolvedValue(mockCreatedCampaign);
      
      // Call the service method
      const result = await marketingService.createCampaign(mockCampaign);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.marketingCampaign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Health Awareness Campaign',
          description: 'Campaign to raise awareness about heart health',
          type: 'AWARENESS',
          status: 'PLANNED',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          budget: 5000,
          targetAudience: 'Adults 40+',
          goals: 'Increase awareness of heart disease prevention',
          channels: ['EMAIL', 'SOCIAL_MEDIA', 'PRINT'],
          createdById: 'user1'
        })
      });
      
      // Verify result
      expect(result).toEqual(mockCreatedCampaign);
    });
    
    it('should throw an error if end date is before start date', async () => {
      // Mock data with invalid dates
      const mockCampaign = {
        name: 'Health Awareness Campaign',
        description: 'Campaign to raise awareness about heart health',
        type: 'AWARENESS',
        status: 'PLANNED',
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-05-01'), // Before start date
        budget: 5000,
        createdById: 'user1'
      };
      
      // Mock Prisma response
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user1', name: 'Marketing Manager' });
      
      // Expect the creation to throw an error
      await expect(marketingService.createCampaign(mockCampaign)).rejects.toThrow();
    });
  });
  
  describe('getCampaignById', () => {
    it('should return a campaign by ID', async () => {
      // Mock data
      const mockCampaign = {
        id: '1',
        name: 'Health Awareness Campaign',
        description: 'Campaign to raise awareness about heart health',
        type: 'AWARENESS',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(),
        budget: 5000,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.marketingCampaign.findUnique as any).mockResolvedValue(mockCampaign);
      
      // Call the service method
      const result = await marketingService.getCampaignById('1');
      
      // Verify Prisma was called with correct arguments
      expect(prisma.marketingCampaign.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual(mockCampaign);
    });
    
    it('should throw an error if campaign does not exist', async () => {
      // Mock Prisma response
      (prisma.marketingCampaign.findUnique as any).mockResolvedValue(null);
      
      // Expect the retrieval to throw an error
      await expect(marketingService.getCampaignById('invalid-id')).rejects.toThrow();
    });
  });
  
  describe('updateCampaign', () => {
    it('should update a campaign', async () => {
      // Mock data
      const mockExistingCampaign = {
        id: '1',
        name: 'Health Awareness Campaign',
        description: 'Campaign to raise awareness about heart health',
        type: 'AWARENESS',
        status: 'PLANNED',
        startDate: new Date(),
        endDate: new Date(),
        budget: 5000,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockUpdateData = {
        status: 'ACTIVE',
        budget: 6000,
        description: 'Updated campaign description'
      };
      
      const mockUpdatedCampaign = {
        ...mockExistingCampaign,
        ...mockUpdateData,
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.marketingCampaign.findUnique as any).mockResolvedValue(mockExistingCampaign);
      (prisma.marketingCampaign.update as any).mockResolvedValue(mockUpdatedCampaign);
      
      // Call the service method
      const result = await marketingService.updateCampaign('1', mockUpdateData);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.marketingCampaign.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: mockUpdateData,
        include: expect.any(Object)
      });
      
      // Verify result
      expect(result).toEqual(mockUpdatedCampaign);
    });
    
    it('should throw an error if campaign does not exist', async () => {
      // Mock Prisma response
      (prisma.marketingCampaign.findUnique as any).mockResolvedValue(null);
      
      // Expect the update to throw an error
      await expect(marketingService.updateCampaign('invalid-id', { status: 'ACTIVE' })).rejects.toThrow();
    });
  });
  
  describe('getContacts', () => {
    it('should return contacts with pagination', async () => {
      // Mock data
      const mockContacts = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'encrypted_john.doe@example.com',
          phone: 'encrypted_555-1234',
          type: 'PATIENT',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'encrypted_jane.smith@example.com',
          phone: 'encrypted_555-5678',
          type: 'REFERRER',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.marketingContact.findMany as any).mockResolvedValue(mockContacts);
      (prisma.marketingContact.count as any).mockResolvedValue(2);
      
      // Call the service method
      const result = await marketingService.getContacts({
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct arguments
      expect(prisma.marketingContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { lastName: 'asc' }
        })
      );
      
      // Verify result
      expect(result).toEqual({
        data: mockContacts.map(contact => ({
          ...contact,
          email: contact.email.replace('encrypted_', ''),
          phone: contact.phone.replace('encrypted_', '')
        })),
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
      const mockContacts = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'encrypted_john.doe@example.com',
          phone: 'encrypted_555-1234',
          type: 'PATIENT',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.marketingContact.findMany as any).mockResolvedValue(mockContacts);
      (prisma.marketingContact.count as any).mockResolvedValue(1);
      
      // Call the service method with filters
      const result = await marketingService.getContacts({
        status: 'ACTIVE',
        type: 'PATIENT',
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct filters
      expect(prisma.marketingContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'ACTIVE',
            type: 'PATIENT'
          }
        })
      );
      
      // Verify result
      expect(result.data.length).toBe(1);
      expect(result.pagination.totalItems).toBe(1);
    });
  });
  
  describe('createContact', () => {
    it('should create a new contact', async () => {
      // Mock data
      const mockContact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-1234',
        type: 'PATIENT',
        status: 'ACTIVE',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        dateOfBirth: new Date('1980-01-01'),
        gender: 'MALE',
        preferredContactMethod: 'EMAIL',
        marketingConsent: true,
        notes: 'Interested in cardiology services',
        tags: ['heart-health', 'preventive-care']
      };
      
      const mockCreatedContact = {
        id: '1',
        ...mockContact,
        email: 'encrypted_john.doe@example.com',
        phone: 'encrypted_555-1234',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.marketingContact.create as any).mockResolvedValue(mockCreatedContact);
      
      // Call the service method
      const result = await marketingService.createContact(mockContact);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.marketingContact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          email: expect.stringContaining('encrypted_'),
          phone: expect.stringContaining('encrypted_'),
          type: 'PATIENT',
          status: 'ACTIVE',
          marketingConsent: true
        })
      });
      
      // Verify result - should have decrypted sensitive data
      expect(result).toEqual({
        ...mockCreatedContact,
        email: 'john.doe@example.com',
        phone: '555-1234'
      });
    });
    
    it('should throw an error if email is invalid', async () => {
      // Mock data with invalid email
      const mockContact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        phone: '555-1234',
        type: 'PATIENT',
        status: 'ACTIVE'
      };
      
      // Expect the creation to throw an error
      await expect(marketingService.createContact(mockContact)).rejects.toThrow();
    });
  });
  
  describe('getSegments', () => {
    it('should return segments with pagination', async () => {
      // Mock data
      const mockSegments = [
        {
          id: '1',
          name: 'Seniors',
          description: 'Patients over 65 years old',
          criteria: { age: { gte: 65 } },
          type: 'DEMOGRAPHIC',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          name: 'Heart Health Interest',
          description: 'Contacts interested in heart health',
          criteria: { tags: { contains: 'heart-health' } },
          type: 'INTEREST',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Mock Prisma response
      (prisma.marketingSegment.findMany as any).mockResolvedValue(mockSegments);
      (prisma.marketingSegment.count as any).mockResolvedValue(2);
      
      // Call the service method
      const result = await marketingService.getSegments({
        page: 1,
        limit: 10
      });
      
      // Verify Prisma was called with correct arguments
      expect(prisma.marketingSegment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { name: 'asc' }
        })
      );
      
      // Verify result
      expect(result).toEqual({
        data: mockSegments,
        pagination: {
          page: 1,
          limit: 10,
          totalItems: 2,
          totalPages: 1
        }
      });
    });
  });
  
  describe('createSegment', () => {
    it('should create a new segment', async () => {
      // Mock data
      const mockSegment = {
        name: 'Seniors',
        description: 'Patients over 65 years old',
        criteria: { age: { gte: 65 } },
        type: 'DEMOGRAPHIC',
        status: 'ACTIVE',
        createdById: 'user1'
      };
      
      const mockCreatedSegment = {
        id: '1',
        ...mockSegment,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user1', name: 'Marketing Manager' });
      (prisma.marketingSegment.create as any).mockResolvedValue(mockCreatedSegment);
      
      // Call the service method
      const result = await marketingService.createSegment(mockSegment);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.marketingSegment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Seniors',
          description: 'Patients over 65 years old',
          criteria: { age: { gte: 65 } },
          type: 'DEMOGRAPHIC',
          status: 'ACTIVE',
          createdById: 'user1'
        })
      });
      
      // Verify result
      expect(result).toEqual(mockCreatedSegment);
    });
  });
  
  describe('createCommunication', () => {
    it('should create a new communication', async () => {
      // Mock data
      const mockCommunication = {
        campaignId: 'campaign1',
        type: 'EMAIL',
        subject: 'Heart Health Awareness',
        content: 'Learn about heart health...',
        segmentId: 'segment1',
        scheduledDate: new Date(),
        status: 'SCHEDULED',
        createdById: 'user1'
      };
      
      const mockCreatedCommunication = {
        id: '1',
        ...mockCommunication,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Mock Prisma response
      (prisma.marketingCampaign.findUnique as any).mockResolvedValue({ id: 'campaign1', name: 'Health Campaign' });
      (prisma.marketingSegment.findUnique as any).mockResolvedValue({ id: 'segment1', name: 'Seniors' });
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user1', name: 'Marketing Manager' });
      (prisma.marketingCommunication.create as any).mockResolvedValue(mockCreatedCommunication);
      
      // Call the service method
      const result = await marketingService.createCommunication(mockCommunication);
      
      // Verify Prisma was called with correct arguments
      expect(prisma.marketingCommunication.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          campaignId: 'campaign1',
          type: 'EMAIL',
          subject: 'Heart Health Awareness',
          content: 'Learn about heart health...',
          segmentId: 'segment1',
          scheduledDate: expect.any(Date),
          status: 'SCHEDULED',
          createdById: 'user1'
        })
      });
      
      // Verify result
      expect(result).toEqual(mockCreatedCommunication);
    });
    
    it('should throw an error if campaign does not exist', async () => {
      // Mock data
      const mockCommunication = {
        campaignId: 'invalid-campaign',
        type: 'EMAIL',
        subject: 'Heart Health Awareness',
        content: 'Learn about heart health...',
        segmentId: 'segment1',
        scheduledDate: new Date(),
        status: 'SCHEDULED',
        createdById: 'user1'
      };
      
      // Mock Prisma response
      (prisma.marketingCampaign.findUnique as any).mockResolvedValue(null);
      
      // Expect the creation to throw an error
      await expect(marketingService.createCommunication(mockCommunication)).rejects.toThrow();
    });
  });
  
  describe('getMarketingAnalytics', () => {
    it('should return marketing analytics data', async () => {
      // Mock data for campaign types
      const mockCampaignTypes = [
        { type: 'AWARENESS', count: 5 },
        { type: 'PROMOTION', count: 3 },
        { type: 'EVENT', count: 2 },
        { type: 'EDUCATION', count: 4 }
      ];
      
      // Mock data for campaign statuses
      const mockCampaignStatuses = [
        { status: 'PLANNED', count: 3 },
        { status: 'ACTIVE', count: 6 },
        { status: 'COMPLETED', count: 4 },
        { status: 'CANCELLED', count: 1 }
      ];
      
      // Mock data for contact types
      const mockContactTypes = [
        { type: 'PATIENT', count: 150 },
        { type: 'REFERRER', count: 30 },
        { type: 'PARTNER', count: 15 },
        { type: 'OTHER', count: 25 }
      ];
      
      // Mock data for communication types
      const mockCommunicationTypes = [
        { type: 'EMAIL', count: 50 },
        { type: 'SMS', count: 20 },
        { type: 'DIRECT_MAIL', count: 15 },
        { type: 'PHONE', count: 10 }
      ];
      
      // Mock Prisma response for each query
      (prisma.marketingCampaign.groupBy as any) = vi.fn();
      (prisma.marketingCampaign.groupBy as any)
        .mockResolvedValueOnce(mockCampaignTypes)
        .mockResolvedValueOnce(mockCampaignStatuses);
      
      (prisma.marketingContact.groupBy as any).mockResolvedValue(mockContactTypes);
      (prisma.marketingContact.count as any).mockResolvedValue(220);
      
      (prisma.marketingCommunication.groupBy as any).mockResolvedValue(mockCommunicationTypes);
      (prisma.marketingCommunication.count as any).mockResolvedValue(95);
      
      (prisma.marketingCampaign.count as any).mockResolvedValue(14);
      
      // Call the service method
      const result = await marketingService.getMarketingAnalytics();
      
      // Verify result structure
      expect(result).toHaveProperty('totalCampaigns', 14);
      expect(result).toHaveProperty('totalContacts', 220);
      expect(result).toHaveProperty('totalCommunications', 95);
      expect(result).toHaveProperty('campaignTypeDistribution');
      expect(result).toHaveProperty('campaignStatusDistribution');
      expect(result).toHaveProperty('contactTypeDistribution');
      expect(result).toHaveProperty('communicationTypeDistribution');
      
      // Verify specific data
      expect(result.campaignTypeDistribution).toEqual(expect.arrayContaining([
        { type: 'AWARENESS', count: 5 },
        { type: 'EDUCATION', count: 4 }
      ]));
      
      expect(result.campaignStatusDistribution).toEqual(expect.arrayContaining([
        { status: 'ACTIVE', count: 6 },
        { status: 'COMPLETED', count: 4 }
      ]));
      
      expect(result.contactTypeDistribution).toEqual(expect.arrayContaining([
        { type: 'PATIENT', count: 150 },
        { type: 'REFERRER', count: 30 }
      ]));
      
      expect(result.communicationTypeDistribution).toEqual(expect.arrayContaining([
        { type: 'EMAIL', count: 50 },
        { type: 'SMS', count: 20 }
      ]));
    });
    
    it('should apply date filters when provided', async () => {
      // Mock dates
      const fromDate = new Date('2025-05-01');
      const toDate = new Date('2025-05-25');
      
      // Mock Prisma response
      (prisma.marketingCampaign.groupBy as any) = vi.fn().mockResolvedValue([]);
      (prisma.marketingContact.groupBy as any) = vi.fn().mockResolvedValue([]);
      (prisma.marketingCommunication.groupBy as any) = vi.fn().mockResolvedValue([]);
      (prisma.marketingCampaign.count as any).mockResolvedValue(0);
      (prisma.marketingContact.count as any).mockResolvedValue(0);
      (prisma.marketingCommunication.count as any).mockResolvedValue(0);
      
      // Call the service method with date filters
      await marketingService.getMarketingAnalytics(fromDate, toDate);
      
      // Verify Prisma was called with date filters
      expect(prisma.marketingCampaign.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate
          }
        }
      });
      
      expect(prisma.marketingCampaign.groupBy).toHaveBeenCalledWith(
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
