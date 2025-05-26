import { AnalyticsService } from '../analytics.service';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { ValidationError, DatabaseError, NotFoundError } from '@/lib/errors';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  marketingCampaign: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  campaignActivity: {
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  contactActivity: {
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
}));

jest.mock('@/lib/audit', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  const mockUserId = 'user-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsService();
  });
  
  describe('getCampaignAnalytics', () => {
    const mockCampaign = {
      id: 'campaign-123',
      name: 'Test Campaign',
      type: 'EMAIL',
      status: 'ACTIVE',
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-01-31'),
    };
    
    const mockActivities = [
      { id: 'activity-1', type: 'EMAIL_SENT', timestamp: new Date('2023-01-02') },
      { id: 'activity-2', type: 'EMAIL_OPEN', timestamp: new Date('2023-01-03') },
      { id: 'activity-3', type: 'EMAIL_CLICK', timestamp: new Date('2023-01-04') },
      { id: 'activity-4', type: 'EMAIL_OPEN', timestamp: new Date('2023-01-05') },
      { id: 'activity-5', type: 'CONVERSION', timestamp: new Date('2023-01-06') },
    ];
    
    const mockActivityCounts = [
      { type: 'EMAIL_SENT', count: 100 },
      { type: 'EMAIL_OPEN', count: 45 },
      { type: 'EMAIL_CLICK', count: 20 },
      { type: 'CONVERSION', count: 5 },
    ];
    
    const mockDailyStats = [
      { date: '2023-01-02', type: 'EMAIL_SENT', count: 100 },
      { date: '2023-01-03', type: 'EMAIL_OPEN', count: 30 },
      { date: '2023-01-04', type: 'EMAIL_OPEN', count: 15 },
      { date: '2023-01-04', type: 'EMAIL_CLICK', count: 10 },
      { date: '2023-01-05', type: 'EMAIL_CLICK', count: 10 },
      { date: '2023-01-06', type: 'CONVERSION', count: 5 },
    ];
    
    it('should retrieve campaign analytics successfully', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.campaignActivity.count as jest.Mock).mockResolvedValue(mockActivities.length);
      (prisma.campaignActivity.groupBy as jest.Mock).mockImplementation((args) => {
        if (args.by.includes('type') && !args.by.includes('date')) {
          return Promise.resolve(mockActivityCounts);
        } else if (args.by.includes('date')) {
          return Promise.resolve(mockDailyStats);
        }
        return Promise.resolve([]);
      });
      
      // Act
      const result = await service.getCampaignAnalytics('campaign-123');
      
      // Assert
      expect(prisma.marketingCampaign.findUnique).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
      });
      
      expect(result).toEqual(expect.objectContaining({
        campaignId: 'campaign-123',
        campaignName: 'Test Campaign',
        totalActivities: mockActivities.length,
        metrics: expect.objectContaining({
          sent: 100,
          opens: 45,
          clicks: 20,
          conversions: 5,
          openRate: 45,
          clickRate: 20,
          conversionRate: 5,
        }),
        timeSeriesData: expect.any(Array),
      }));
      
      // Check time series data format
      expect(result.timeSeriesData).toEqual(expect.arrayContaining([
        expect.objectContaining({
          date: expect.any(String),
          metrics: expect.objectContaining({
            sent: expect.any(Number),
            opens: expect.any(Number),
            clicks: expect.any(Number),
            conversions: expect.any(Number),
          }),
        }),
      ]));
    });
    
    it('should throw NotFoundError if campaign does not exist', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.getCampaignAnalytics('non-existent-id'))
        .rejects
        .toThrow(NotFoundError);
    });
    
    it('should apply date range filters correctly', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.campaignActivity.count as jest.Mock).mockResolvedValue(mockActivities.length);
      (prisma.campaignActivity.groupBy as jest.Mock).mockResolvedValue(mockActivityCounts);
      
      const startDate = '2023-01-05';
      const endDate = '2023-01-10';
      
      // Act
      await service.getCampaignAnalytics('campaign-123', { startDate, endDate });
      
      // Assert
      expect(prisma.campaignActivity.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          campaignId: 'campaign-123',
          timestamp: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      });
      
      expect(prisma.campaignActivity.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaignId: 'campaign-123',
            timestamp: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
        })
      );
    });
    
    it('should log audit event after retrieving analytics', async () => {
      // Arrange
      (prisma.marketingCampaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign);
      (prisma.campaignActivity.count as jest.Mock).mockResolvedValue(mockActivities.length);
      (prisma.campaignActivity.groupBy as jest.Mock).mockImplementation((args) => {
        if (args.by.includes('type') && !args.by.includes('date')) {
          return Promise.resolve(mockActivityCounts);
        } else if (args.by.includes('date')) {
          return Promise.resolve(mockDailyStats);
        }
        return Promise.resolve([]);
      });
      
      // Act
      await service.getCampaignAnalytics('campaign-123', undefined, mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'analytics.campaign.view',
        resourceId: 'campaign-123',
        userId: mockUserId,
        details: expect.any(Object),
      });
    });
  });
  
  describe('getComparativeCampaignAnalytics', () => {
    const mockCampaigns = [
      {
        id: 'campaign-1',
        name: 'Campaign 1',
        type: 'EMAIL',
        status: 'COMPLETED',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
      },
      {
        id: 'campaign-2',
        name: 'Campaign 2',
        type: 'EMAIL',
        status: 'COMPLETED',
        startDate: new Date('2023-02-01'),
        endDate: new Date('2023-02-28'),
      },
    ];
    
    const mockCampaignMetrics = [
      {
        campaignId: 'campaign-1',
        metrics: {
          sent: 100,
          opens: 50,
          clicks: 25,
          conversions: 10,
          openRate: 50,
          clickRate: 25,
          conversionRate: 10,
        },
      },
      {
        campaignId: 'campaign-2',
        metrics: {
          sent: 150,
          opens: 60,
          clicks: 30,
          conversions: 15,
          openRate: 40,
          clickRate: 20,
          conversionRate: 10,
        },
      },
    ];
    
    it('should retrieve comparative campaign analytics successfully', async () => {
      // Arrange
      (prisma.marketingCampaign.findMany as jest.Mock).mockResolvedValue(mockCampaigns);
      
      // Mock the getCampaignAnalytics method
      jest.spyOn(service, 'getCampaignAnalytics').mockImplementation((campaignId) => {
        const metrics = mockCampaignMetrics.find(m => m.campaignId === campaignId);
        return Promise.resolve({
          campaignId,
          campaignName: mockCampaigns.find(c => c.id === campaignId)?.name || '',
          totalActivities: 100,
          metrics: metrics?.metrics || {},
          timeSeriesData: [],
        });
      });
      
      // Act
      const result = await service.getComparativeCampaignAnalytics(['campaign-1', 'campaign-2']);
      
      // Assert
      expect(prisma.marketingCampaign.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['campaign-1', 'campaign-2'] },
        },
      });
      
      expect(service.getCampaignAnalytics).toHaveBeenCalledTimes(2);
      expect(service.getCampaignAnalytics).toHaveBeenCalledWith('campaign-1', undefined, undefined);
      expect(service.getCampaignAnalytics).toHaveBeenCalledWith('campaign-2', undefined, undefined);
      
      expect(result).toEqual({
        campaigns: expect.arrayContaining([
          expect.objectContaining({
            id: 'campaign-1',
            name: 'Campaign 1',
            metrics: mockCampaignMetrics[0].metrics,
          }),
          expect.objectContaining({
            id: 'campaign-2',
            name: 'Campaign 2',
            metrics: mockCampaignMetrics[1].metrics,
          }),
        ]),
        comparisons: expect.objectContaining({
          sent: expect.any(Object),
          opens: expect.any(Object),
          clicks: expect.any(Object),
          conversions: expect.any(Object),
          openRate: expect.any(Object),
          clickRate: expect.any(Object),
          conversionRate: expect.any(Object),
        }),
      });
      
      // Check comparison calculations
      expect(result.comparisons.sent).toEqual({
        'campaign-1': 100,
        'campaign-2': 150,
        difference: 50,
        percentageChange: 50,
      });
    });
    
    it('should throw ValidationError if no campaign IDs are provided', async () => {
      // Act & Assert
      await expect(service.getComparativeCampaignAnalytics([]))
        .rejects
        .toThrow(ValidationError);
    });
    
    it('should throw ValidationError if only one campaign ID is provided', async () => {
      // Act & Assert
      await expect(service.getComparativeCampaignAnalytics(['campaign-1']))
        .rejects
        .toThrow(ValidationError);
    });
    
    it('should log audit event after retrieving comparative analytics', async () => {
      // Arrange
      (prisma.marketingCampaign.findMany as jest.Mock).mockResolvedValue(mockCampaigns);
      
      // Mock the getCampaignAnalytics method
      jest.spyOn(service, 'getCampaignAnalytics').mockImplementation((campaignId) => {
        const metrics = mockCampaignMetrics.find(m => m.campaignId === campaignId);
        return Promise.resolve({
          campaignId,
          campaignName: mockCampaigns.find(c => c.id === campaignId)?.name || '',
          totalActivities: 100,
          metrics: metrics?.metrics || {},
          timeSeriesData: [],
        });
      });
      
      // Act
      await service.getComparativeCampaignAnalytics(['campaign-1', 'campaign-2'], mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'analytics.campaign.compare',
        resourceId: expect.any(String), // Generated ID
        userId: mockUserId,
        details: expect.objectContaining({
          campaignIds: ['campaign-1', 'campaign-2'],
        }),
      });
    });
  });
  
  describe('getContactActivityAnalytics', () => {
    const mockContact = {
      id: 'contact-123',
      name: 'John Doe',
      email: 'john.doe@example.com',
    };
    
    const mockActivities = [
      { id: 'activity-1', type: 'EMAIL_OPEN', timestamp: new Date('2023-01-02'), campaignId: 'campaign-1' },
      { id: 'activity-2', type: 'EMAIL_CLICK', timestamp: new Date('2023-01-03'), campaignId: 'campaign-1' },
      { id: 'activity-3', type: 'FORM_SUBMISSION', timestamp: new Date('2023-01-04'), campaignId: null },
      { id: 'activity-4', type: 'PAGE_VIEW', timestamp: new Date('2023-01-05'), campaignId: null },
      { id: 'activity-5', type: 'CONVERSION', timestamp: new Date('2023-01-06'), campaignId: 'campaign-2' },
    ];
    
    const mockActivityCounts = [
      { type: 'EMAIL_OPEN', count: 10 },
      { type: 'EMAIL_CLICK', count: 5 },
      { type: 'FORM_SUBMISSION', count: 2 },
      { type: 'PAGE_VIEW', count: 15 },
      { type: 'CONVERSION', count: 1 },
    ];
    
    const mockCampaignActivities = [
      { campaignId: 'campaign-1', count: 3 },
      { campaignId: 'campaign-2', count: 2 },
    ];
    
    it('should retrieve contact activity analytics successfully', async () => {
      // Arrange
      (prisma.contactActivity.findMany as jest.Mock).mockResolvedValue(mockActivities);
      (prisma.contactActivity.count as jest.Mock).mockResolvedValue(mockActivities.length);
      (prisma.contactActivity.groupBy as jest.Mock).mockImplementation((args) => {
        if (args.by.includes('type')) {
          return Promise.resolve(mockActivityCounts);
        } else if (args.by.includes('campaignId')) {
          return Promise.resolve(mockCampaignActivities);
        }
        return Promise.resolve([]);
      });
      
      // Act
      const result = await service.getContactActivityAnalytics('contact-123');
      
      // Assert
      expect(prisma.contactActivity.count).toHaveBeenCalledWith({
        where: { contactId: 'contact-123' },
      });
      
      expect(prisma.contactActivity.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['type'],
          where: { contactId: 'contact-123' },
          _count: true,
        })
      );
      
      expect(result).toEqual(expect.objectContaining({
        contactId: 'contact-123',
        totalActivities: mockActivities.length,
        activityBreakdown: expect.objectContaining({
          EMAIL_OPEN: 10,
          EMAIL_CLICK: 5,
          FORM_SUBMISSION: 2,
          PAGE_VIEW: 15,
          CONVERSION: 1,
        }),
        campaignEngagement: expect.arrayContaining([
          expect.objectContaining({
            campaignId: 'campaign-1',
            activityCount: 3,
          }),
          expect.objectContaining({
            campaignId: 'campaign-2',
            activityCount: 2,
          }),
        ]),
        recentActivities: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            type: expect.any(String),
            timestamp: expect.any(Date),
          }),
        ]),
      }));
    });
    
    it('should apply date range filters correctly', async () => {
      // Arrange
      (prisma.contactActivity.findMany as jest.Mock).mockResolvedValue(mockActivities);
      (prisma.contactActivity.count as jest.Mock).mockResolvedValue(mockActivities.length);
      (prisma.contactActivity.groupBy as jest.Mock).mockResolvedValue(mockActivityCounts);
      
      const startDate = '2023-01-03';
      const endDate = '2023-01-05';
      
      // Act
      await service.getContactActivityAnalytics('contact-123', { startDate, endDate });
      
      // Assert
      expect(prisma.contactActivity.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          contactId: 'contact-123',
          timestamp: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      });
      
      expect(prisma.contactActivity.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contactId: 'contact-123',
            timestamp: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
        })
      );
    });
    
    it('should log audit event after retrieving contact analytics', async () => {
      // Arrange
      (prisma.contactActivity.findMany as jest.Mock).mockResolvedValue(mockActivities);
      (prisma.contactActivity.count as jest.Mock).mockResolvedValue(mockActivities.length);
      (prisma.contactActivity.groupBy as jest.Mock).mockImplementation((args) => {
        if (args.by.includes('type')) {
          return Promise.resolve(mockActivityCounts);
        } else if (args.by.includes('campaignId')) {
          return Promise.resolve(mockCampaignActivities);
        }
        return Promise.resolve([]);
      });
      
      // Act
      await service.getContactActivityAnalytics('contact-123', undefined, mockUserId);
      
      // Assert
      expect(AuditLogger.prototype.log).toHaveBeenCalledWith({
        action: 'analytics.contact.view',
        resourceId: 'contact-123',
        userId: mockUserId,
        details: expect.any(Object),
      });
    });
  });
});
