import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { AssetService } from '../asset-service';
import { PrismaClient } from '@prisma/client';
import { cache } from '@/lib/cache';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    asset: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    assetMaintenance: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    assetAssignment: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaClient)),
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock cache service
jest.mock('@/lib/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    clear: jest.fn(),
  },
}));

describe('AssetService', () => {
  let assetService: AssetService;
  let prisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    assetService = new AssetService();
    prisma = new PrismaClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAssetById', () => {
    it('should return cached asset if available', async () => {
      const mockAsset = { id: '123', assetId: 'ASSET123', name: 'Test Asset' };
      (cache.get as jest.Mock).mockResolvedValue(JSON.stringify(mockAsset));

      const result = await assetService.getAssetById('123');

      expect(cache.get).toHaveBeenCalledWith('asset:id:123');
      expect(prisma.asset.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(mockAsset);
    });

    it('should fetch from database and cache if not in cache', async () => {
      const mockAsset = { id: '123', assetId: 'ASSET123', name: 'Test Asset' };
      (cache.get as jest.Mock).mockResolvedValue(null);
      (prisma.asset.findUnique as jest.Mock).mockResolvedValue(mockAsset);

      const result = await assetService.getAssetById('123');

      expect(cache.get).toHaveBeenCalledWith('asset:id:123');
      expect(prisma.asset.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        include: expect.any(Object),
      });
      expect(cache.set).toHaveBeenCalledWith(
        'asset:id:123',
        JSON.stringify(mockAsset),
        expect.any(Number)
      );
      expect(result).toEqual(mockAsset);
    });
  });

  describe('listAssets', () => {
    it('should return cached list if available', async () => {
      const mockResult = {
        assets: [{ id: '123', assetId: 'ASSET123' }],
        total: 1,
        skip: 0,
        take: 10,
        nextCursor: null,
      };
      (cache.get as jest.Mock).mockResolvedValue(JSON.stringify(mockResult));

      const result = await assetService.listAssets({});

      expect(cache.get).toHaveBeenCalled();
      expect(prisma.asset.findMany).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should fetch from database and cache if not in cache', async () => {
      const mockAssets = [{ id: '123', assetId: 'ASSET123' }];
      (cache.get as jest.Mock).mockResolvedValue(null);
      (prisma.asset.findMany as jest.Mock).mockResolvedValue(mockAssets);
      (prisma.asset.count as jest.Mock).mockResolvedValue(1);

      const result = await assetService.listAssets({});

      expect(cache.get).toHaveBeenCalled();
      expect(prisma.asset.findMany).toHaveBeenCalled();
      expect(prisma.asset.count).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
      expect(result.assets).toEqual(mockAssets);
      expect(result.total).toEqual(1);
    });

    it('should use cursor-based pagination when cursor is provided', async () => {
      const mockAssets = [{ id: '123', assetId: 'ASSET123' }];
      (cache.get as jest.Mock).mockResolvedValue(null);
      (prisma.asset.findMany as jest.Mock).mockResolvedValue(mockAssets);
      (prisma.asset.count as jest.Mock).mockResolvedValue(1);

      await assetService.listAssets({ cursor: '456' });

      expect(prisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: '456' },
        })
      );
    });
  });

  describe('createAsset', () => {
    it('should create asset and invalidate cache', async () => {
      const mockAsset = { id: '123', assetId: 'ASSET123', name: 'Test Asset' };
      (prisma.asset.create as jest.Mock).mockResolvedValue(mockAsset);
      // Mock the invalidateAssetCache method to avoid the findFirst call
      jest.spyOn(AssetService.prototype, 'invalidateAssetCache' as any).mockResolvedValue(undefined);

      await assetService.createAsset({
        assetId: 'ASSET123',
        name: 'Test Asset',
        category: 'IT',
        type: 'Computer',
        status: 'AVAILABLE',
      });

      expect(prisma.asset.create).toHaveBeenCalled();
      expect(AssetService.prototype.invalidateAssetCache).toHaveBeenCalled();
    });
  });

  describe('updateAsset', () => {
    it('should update asset and invalidate cache', async () => {
      const mockAsset = { id: '123', assetId: 'ASSET123', name: 'Test Asset' };
      (prisma.asset.findUnique as jest.Mock).mockResolvedValue({ assetId: 'ASSET123' });
      (prisma.asset.update as jest.Mock).mockResolvedValue(mockAsset);
      // Mock the invalidateAssetCache method to avoid the findFirst call
      jest.spyOn(AssetService.prototype, 'invalidateAssetCache' as any).mockResolvedValue(undefined);

      await assetService.updateAsset('123', { name: 'Updated Asset' });

      expect(prisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '123' },
          data: { name: 'Updated Asset' },
        })
      );
      expect(AssetService.prototype.invalidateAssetCache).toHaveBeenCalled();
    });
  });

  describe('recordMaintenance', () => {
    it('should record maintenance and update asset', async () => {
      const mockMaintenance = { id: '456', assetId: '123', date: new Date(), type: 'PREVENTIVE' };
      (prisma.assetMaintenance.create as jest.Mock).mockResolvedValue(mockMaintenance);
      (prisma.$transaction as jest.Mock).mockImplementation((callback) => callback(prisma));
      // Mock the invalidateAssetCache method to avoid the findFirst call
      jest.spyOn(AssetService.prototype, 'invalidateAssetCache' as any).mockResolvedValue(undefined);

      await assetService.recordMaintenance('123', {
        date: new Date(),
        type: 'PREVENTIVE',
        performedBy: 'Technician',
        description: 'Regular maintenance',
        status: 'COMPLETED',
        nextMaintenanceDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      expect(prisma.assetMaintenance.create).toHaveBeenCalled();
      expect(prisma.asset.update).toHaveBeenCalled();
      expect(AssetService.prototype.invalidateAssetCache).toHaveBeenCalled();
    });
  });

  describe('assignAsset', () => {
    it('should assign asset to employee and update status', async () => {
      const mockAssignment = { 
        id: '456', 
        assetId: '123', 
        employeeId: '789',
        startDate: new Date(),
        employee: { firstName: 'John', lastName: 'Doe' }
      };
      (prisma.assetAssignment.create as jest.Mock).mockResolvedValue(mockAssignment);
      (prisma.$transaction as jest.Mock).mockImplementation((callback) => callback(prisma));
      // Mock the invalidateAssetCache method to avoid the findFirst call
      jest.spyOn(AssetService.prototype, 'invalidateAssetCache' as any).mockResolvedValue(undefined);

      await assetService.assignAsset('123', {
        employeeId: '789',
        startDate: new Date(),
      });

      expect(prisma.assetAssignment.updateMany).toHaveBeenCalled();
      expect(prisma.assetAssignment.create).toHaveBeenCalled();
      expect(prisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '123' },
          data: { status: 'IN_USE' },
        })
      );
      expect(AssetService.prototype.invalidateAssetCache).toHaveBeenCalled();
    });
  });

  describe('calculateUtilizationMetrics', () => {
    it('should calculate utilization metrics based on assignment and maintenance history', async () => {
      const mockAsset = {
        id: '123',
        assetId: 'ASSET123',
        purchaseDate: new Date('2023-01-01'),
        purchasePrice: 1000,
      };
      
      const mockAssignments = [
        {
          startDate: new Date('2023-03-01'),
          endDate: new Date('2023-06-01'),
        },
        {
          startDate: new Date('2023-07-01'),
          endDate: null, // Current assignment
        },
      ];
      
      const mockMaintenanceRecords = [
        {
          date: new Date('2023-02-01'),
          status: 'COMPLETED',
          cost: 100,
        },
        {
          date: new Date('2023-06-15'),
          status: 'COMPLETED',
          cost: 150,
        },
      ];

      (prisma.asset.findUnique as jest.Mock).mockResolvedValue(mockAsset);
      (prisma.assetAssignment.findMany as jest.Mock).mockResolvedValue(mockAssignments);
      (prisma.assetMaintenance.findMany as jest.Mock).mockResolvedValue(mockMaintenanceRecords);

      const result = await assetService.calculateUtilizationMetrics('123');

      expect(result.assetIdentifier).toEqual('ASSET123');
      expect(result.totalTimeInUse).toBeGreaterThan(0);
      expect(result.utilizationRate).toBeGreaterThan(0);
      expect(result.totalMaintenanceCost).toEqual(250);
      expect(result.assignmentCount).toEqual(2);
      expect(result.maintenanceCount).toEqual(2);
    });
  });

  describe('predictOptimalMaintenanceSchedule', () => {
    it('should predict optimal maintenance schedule based on historical data', async () => {
      const mockAsset = {
        id: '123',
        assetId: 'ASSET123',
        purchaseDate: new Date('2023-01-01'),
      };
      
      const mockPreventiveRecords = [
        {
          date: new Date('2023-03-01'),
          type: 'PREVENTIVE',
          status: 'COMPLETED',
        },
        {
          date: new Date('2023-06-01'),
          type: 'PREVENTIVE',
          status: 'COMPLETED',
        },
        {
          date: new Date('2023-09-01'),
          type: 'PREVENTIVE',
          status: 'COMPLETED',
        },
      ];
      
      const mockCorrectiveRecords = [
        {
          date: new Date('2023-05-01'),
          type: 'CORRECTIVE',
          status: 'COMPLETED',
          cost: 200,
        },
        {
          date: new Date('2023-08-15'),
          type: 'CORRECTIVE',
          status: 'COMPLETED',
          cost: 300,
        },
      ];

      (prisma.asset.findUnique as jest.Mock).mockResolvedValue(mockAsset);
      (prisma.assetMaintenance.findMany as jest.Mock)
        .mockResolvedValueOnce(mockPreventiveRecords)
        .mockResolvedValueOnce(mockCorrectiveRecords);

      const result = await assetService.predictOptimalMaintenanceSchedule('123');

      expect(result.assetIdentifier).toEqual('ASSET123');
      expect(result.currentMaintenanceInterval).toBeCloseTo(92, 0);
      expect(result.recommendedMaintenanceInterval).toBeDefined();
      expect(result.nextRecommendedMaintenanceDate).toBeDefined();
      expect(result.failureRisk).toBeDefined();
      expect(result.confidenceLevel).toBeDefined();
      expect(result.potentialCostSavings).toEqual(250);
      expect(result.preventiveMaintenanceCount).toEqual(3);
      expect(result.correctiveMaintenanceCount).toEqual(2);
    });

    it('should handle assets with no maintenance history', async () => {
      const mockAsset = {
        id: '123',
        assetId: 'ASSET123',
        purchaseDate: new Date('2023-01-01'),
      };
      
      (prisma.asset.findUnique as jest.Mock).mockResolvedValue(mockAsset);
      (prisma.assetMaintenance.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await assetService.predictOptimalMaintenanceSchedule('123');

      expect(result.assetIdentifier).toEqual('ASSET123');
      expect(result.currentMaintenanceInterval).toEqual(90);
      expect(result.recommendedMaintenanceInterval).toEqual(90);
      expect(result.nextRecommendedMaintenanceDate).toBeDefined();
      expect(result.failureRisk).toEqual('LOW');
      expect(result.confidenceLevel).toEqual('LOW');
      expect(result.dataPoints).toEqual(0);
    });
  });
});
