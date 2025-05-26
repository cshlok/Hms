import { MarketingCampaignService } from '../marketing.service';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { NotificationService } from '@/lib/notifications';
import { ValidationError, DatabaseError, NotFoundError } from '@/lib/errors';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  marketingCampaign: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  campaignChannel: {
    create: jest.fn(),
  },
  campaignAnalytics: {
    findMany: jest.fn(),
  },
  campaignSegment: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  contactSegment: {
    findUnique: jest.fn(),
  },
}));

jest.mock('@/lib/audit', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/lib/notifications', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    sendNotification: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('MarketingCampaignService', () => {
  let service: MarketingCampaignService;
  const mockUserId = 'user-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new MarketingCampaignService();
  });
  
  describe('createCampaign', () => {
    const mockCampaignData = {
      name: 'Test Campaign',
      description: 'Test Description',
      type: 'EMAIL',
      status: 'DRAFT',
      startDate: new Date(),
      goals: ['Increase patient awareness'],
    };
    
    const mockCreatedCampaign = {
      id: 'campaign-123',
      ...mockCampaignData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    it('should create a campaign successfully', async () => {
      // Arrange
      (prisma.marketingCampaign.create as jest.Mock).mockResolvedValue(mockCreatedCampaign);
      
      // Act
      const result = await service.createCampaign(mockCampaignData, mockUserId);
      
      // Assert
      expect(prisma.marketingCampaign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: mockCampaignData.name,
          description: mockCampaignData.description,
          type: mockCampaignData.type,
          status: mockCampaignData.status,
          startDate: mockCampaignData.startDate,
          goals: mockCampaignData.goals,
          createdById: mockUserId,
          updatedById: mockUserId,
        }),
      });
      
      expect(result).toEqual(mockCreatedCampaign);
    });
    
    it('should throw ValidationError if campaign data is invalid', async () => {
      // Arrange
      const invalidData = {
        ...mockCampaignData,
        name: '', // Invalid: empty name
      };
      
      // Act & Assert
      await expect(service.createCampaign(invalidData, mockUserId))
        .rejects
        .toThrow(ValidationError);
    });
    
    it('should throw DatabaseError if database operation fails', async () => {
      // Arrange
      (prisma.marketingCampaign.create as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      // Act & Assert
      await expect(service.createCampaign(mockCampaignData, mockUserId))
        .rejects
        .toThrow(DatabaseError);
    });
    
    it('should log audit event after creating campaign', async () => {
      // Arrange
      (prisma.marketingCampaign.create as jest.Mock).mockResolvedValue(mockCreatedCampaign);
      
      // Act
      await service.createCampaign(mockCampaignData, mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'campaign.create',
        resourceId: mockCreatedCampaign.id,
        userId: mockUserId,
        details: expect.any(Object),
      });
    });
    
    it('should send notification after creating campaign', async () => {
      // Arrange
      (prisma.marketingCampaign.create as jest.Mock).mockResolvedValue(mockCreatedCampaign);
      
      // Act
      await service.createCampaign(mockCampaignData, mockUserId);
      
      // Assert
      expect(NotificationService.prototype.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CAMPAIGN_CREATED',
          title: expect.any(String),
          message: expect.stringContaining(mockCampaignData.name),
          recipientRoles: expect.any(Array),
          metadata: { campaignId: mockCreatedCampaign.id },
        })
      );
    });
  });
  
  describe('getCampaignById', () => {
    const mockCampaign = {
      id: 'campaign-123',
      name: 'Test Campaign',
      description: 'Test Description',
      type: 'EMAIL',
      status: 'DRAFT',
      startDate: new Date(),
      goals: ['Increase patient awareness'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    it('should retrieve a campaign by ID', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);
      
      // Act
      const result = await service.getCampaignById('campaign-123');
      
      // Assert
      expect(prisma.marketingCampaign.findUnique).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
        include: expect.any(Object),
      });
      
      expect(result).toEqual(mockCampaign);
    });
    
    it('should throw NotFoundError if campaign does not exist', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.getCampaignById('non-existent-id'))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should include FHIR representation when requested', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);
      
      // Act
      const result = await service.getCampaignById('campaign-123', true);
      
      // Assert
      expect(result).toHaveProperty('fhir');
    });
  });
  
  describe('getCampaigns', () => {
    const mockCampaigns = [
      {
        id: 'campaign-1',
        name: 'Campaign 1',
        type: 'EMAIL',
        status: 'ACTIVE',
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'campaign-2',
        name: 'Campaign 2',
        type: 'SMS',
        status: 'DRAFT',
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    it('should retrieve campaigns with pagination', async () => {
      // Arrange
      (prisma.marketingCampaign.count as jest.Mock).mockResolvedValue(2);
      (prisma.marketingCampaign.findMany as jest.Mock).mockResolvedValue(mockCampaigns);
      
      // Act
      const result = await service.getCampaigns({ page: 1, limit: 10 });
      
      // Assert
      expect(prisma.marketingCampaign.count).toHaveBeenCalled();
      expect(prisma.marketingCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        })
      );
      
      expect(result).toEqual({
        data: mockCampaigns,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });
    
    it('should apply filters correctly', async () => {
      // Arrange
      const filters = {
        type: 'EMAIL',
        status: 'ACTIVE',
        startDateFrom: new Date('2023-01-01'),
        startDateTo: new Date('2023-12-31'),
        page: 2,
        limit: 5,
      };
      
      (prisma.marketingCampaign.count as jest.Mock).mockResolvedValue(10);
      (prisma.marketingCampaign.findMany as jest.Mock).mockResolvedValue(mockCampaigns);
      
      // Act
      const result = await service.getCampaigns(filters);
      
      // Assert
      expect(prisma.marketingCampaign.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          type: filters.type,
          status: filters.status,
          startDate: {
            gte: filters.startDateFrom,
            lte: filters.startDateTo,
          },
        }),
      });
      
      expect(prisma.marketingCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: filters.type,
            status: filters.status,
          }),
          skip: 5, // (page-1) * limit
          take: 5,
        })
      );
      
      expect(result.pagination).toEqual({
        total: 10,
        page: 2,
        limit: 5,
        totalPages: 2,
      });
    });
  });
  
  describe('updateCampaign', () => {
    const mockCampaign = {
      id: 'campaign-123',
      name: 'Test Campaign',
      description: 'Test Description',
      type: 'EMAIL',
      status: 'DRAFT',
      startDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const updateData = {
      name: 'Updated Campaign Name',
      status: 'ACTIVE',
    };
    
    it('should update a campaign successfully', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.marketingCampaign.update as jest.Mock).mockResolvedValue({
        ...mockCampaign,
        ...updateData,
      });
      
      // Act
      const result = await service.updateCampaign('campaign-123', updateData, mockUserId);
      
      // Assert
      expect(prisma.marketingCampaign.findUnique).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
      });
      
      expect(prisma.marketingCampaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
        data: {
          ...updateData,
          updatedById: mockUserId,
        },
      });
      
      expect(result).toEqual({
        ...mockCampaign,
        ...updateData,
      });
    });
    
    it('should throw NotFoundError if campaign does not exist', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.updateCampaign('non-existent-id', updateData, mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should log audit event after updating campaign', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.marketingCampaign.update as jest.Mock).mockResolvedValue({
        ...mockCampaign,
        ...updateData,
      });
      
      // Act
      await service.updateCampaign('campaign-123', updateData, mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'campaign.update',
        resourceId: 'campaign-123',
        userId: mockUserId,
        details: expect.objectContaining({
          updatedFields: Object.keys(updateData),
        }),
      });
    });
  });
  
  describe('deleteCampaign', () => {
    const mockCampaign = {
      id: 'campaign-123',
      name: 'Test Campaign',
      type: 'EMAIL',
    };
    
    it('should delete a campaign successfully', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.marketingCampaign.delete as jest.Mock).mockResolvedValue(undefined);
      
      // Act
      await service.deleteCampaign('campaign-123', mockUserId);
      
      // Assert
      expect(prisma.marketingCampaign.findUnique).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
      });
      
      expect(prisma.marketingCampaign.delete).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
      });
    });
    
    it('should throw NotFoundError if campaign does not exist', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.deleteCampaign('non-existent-id', mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should log audit event after deleting campaign', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.marketingCampaign.delete as jest.Mock).mockResolvedValue(undefined);
      
      // Act
      await service.deleteCampaign('campaign-123', mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'campaign.delete',
        resourceId: 'campaign-123',
        userId: mockUserId,
        details: expect.objectContaining({
          campaignName: mockCampaign.name,
          campaignType: mockCampaign.type,
        }),
      });
    });
  });
  
  describe('addCampaignChannel', () => {
    const mockCampaign = {
      id: 'campaign-123',
      name: 'Test Campaign',
    };
    
    const mockChannelData = {
      channelType: 'EMAIL',
      channelName: 'Email Newsletter',
      content: { template: 'newsletter-template' },
      schedule: { frequency: 'weekly' },
      status: 'DRAFT',
    };
    
    const mockCreatedChannel = {
      id: 'channel-123',
      campaignId: 'campaign-123',
      ...mockChannelData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    it('should add a channel to a campaign successfully', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.campaignChannel.create as jest.Mock).mockResolvedValue(mockCreatedChannel);
      
      // Act
      const result = await service.addCampaignChannel('campaign-123', mockChannelData, mockUserId);
      
      // Assert
      expect(prisma.marketingCampaign.findUnique).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
      });
      
      expect(prisma.campaignChannel.create).toHaveBeenCalledWith({
        data: {
          campaignId: 'campaign-123',
          ...mockChannelData,
        },
      });
      
      expect(result).toEqual(mockCreatedChannel);
    });
    
    it('should throw NotFoundError if campaign does not exist', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.addCampaignChannel('non-existent-id', mockChannelData, mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should log audit event after adding channel', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.campaignChannel.create as jest.Mock).mockResolvedValue(mockCreatedChannel);
      
      // Act
      await service.addCampaignChannel('campaign-123', mockChannelData, mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'campaign.channel.add',
        resourceId: 'campaign-123',
        userId: mockUserId,
        details: expect.objectContaining({
          channelId: mockCreatedChannel.id,
          channelType: mockChannelData.channelType,
          channelName: mockChannelData.channelName,
        }),
      });
    });
  });
  
  describe('addCampaignSegment', () => {
    const mockCampaign = {
      id: 'campaign-123',
      name: 'Test Campaign',
    };
    
    const mockSegment = {
      id: 'segment-123',
      name: 'Test Segment',
    };
    
    const mockCampaignSegment = {
      id: 'campaign-segment-123',
      campaignId: 'campaign-123',
      segmentId: 'segment-123',
      createdAt: new Date(),
    };
    
    it('should add a segment to a campaign successfully', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.contactSegment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.campaignSegment.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.campaignSegment.create as jest.Mock).mockResolvedValue(mockCampaignSegment);
      
      // Act
      const result = await service.addCampaignSegment('campaign-123', 'segment-123', mockUserId);
      
      // Assert
      expect(prisma.marketingCampaign.findUnique).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
      });
      
      expect(prisma.contactSegment.findUnique).toHaveBeenCalledWith({
        where: { id: 'segment-123' },
      });
      
      expect(prisma.campaignSegment.create).toHaveBeenCalledWith({
        data: {
          campaignId: 'campaign-123',
          segmentId: 'segment-123',
        },
      });
      
      expect(result).toEqual(mockCampaignSegment);
    });
    
    it('should return existing relation if segment is already added', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.contactSegment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.campaignSegment.findFirst as jest.Mock).mockResolvedValue(mockCampaignSegment);
      
      // Act
      const result = await service.addCampaignSegment('campaign-123', 'segment-123', mockUserId);
      
      // Assert
      expect(prisma.campaignSegment.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockCampaignSegment);
    });
    
    it('should throw NotFoundError if campaign does not exist', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.addCampaignSegment('non-existent-id', 'segment-123', mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should throw NotFoundError if segment does not exist', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.contactSegment.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.addCampaignSegment('campaign-123', 'non-existent-id', mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should log audit event after adding segment', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.contactSegment.findUnique as jest.Mock).mockResolvedValue(mockSegment);
      (prisma.campaignSegment.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.campaignSegment.create as jest.Mock).mockResolvedValue(mockCampaignSegment);
      
      // Act
      await service.addCampaignSegment('campaign-123', 'segment-123', mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'campaign.segment.add',
        resourceId: 'campaign-123',
        userId: mockUserId,
        details: expect.objectContaining({
          segmentId: 'segment-123',
          segmentName: mockSegment.name,
        }),
      });
    });
  });
});
