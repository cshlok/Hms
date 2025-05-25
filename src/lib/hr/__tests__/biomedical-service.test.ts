import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { BiomedicalService } from '../biomedical-service';
import { PrismaClient } from '@prisma/client';
import { cache } from '@/lib/cache';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    biomedicalEquipment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    calibrationRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    maintenanceRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
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

describe('BiomedicalService', () => {
  let biomedicalService: BiomedicalService;
  let prisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    biomedicalService = new BiomedicalService();
    prisma = new PrismaClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBiomedicalEquipmentById', () => {
    it('should return cached equipment if available', async () => {
      const mockEquipment = { id: '123', serialNumber: 'SN123', manufacturer: 'TestMfg' };
      (cache.get as jest.Mock).mockResolvedValue(JSON.stringify(mockEquipment));

      const result = await biomedicalService.getBiomedicalEquipmentById('123');

      expect(cache.get).toHaveBeenCalledWith('biomedical:id:123');
      expect(prisma.biomedicalEquipment.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(mockEquipment);
    });

    it('should fetch from database and cache if not in cache', async () => {
      const mockEquipment = { id: '123', serialNumber: 'SN123', manufacturer: 'TestMfg' };
      (cache.get as jest.Mock).mockResolvedValue(null);
      (prisma.biomedicalEquipment.findUnique as jest.Mock).mockResolvedValue(mockEquipment);

      const result = await biomedicalService.getBiomedicalEquipmentById('123');

      expect(cache.get).toHaveBeenCalledWith('biomedical:id:123');
      expect(prisma.biomedicalEquipment.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        include: expect.any(Object),
      });
      expect(cache.set).toHaveBeenCalledWith(
        'biomedical:id:123',
        JSON.stringify(mockEquipment),
        expect.any(Number)
      );
      expect(result).toEqual(mockEquipment);
    });
  });

  describe('listBiomedicalEquipment', () => {
    it('should return cached list if available', async () => {
      const mockResult = {
        equipment: [{ id: '123', serialNumber: 'SN123' }],
        total: 1,
        skip: 0,
        take: 10,
        nextCursor: null,
      };
      (cache.get as jest.Mock).mockResolvedValue(JSON.stringify(mockResult));

      const result = await biomedicalService.listBiomedicalEquipment({});

      expect(cache.get).toHaveBeenCalled();
      expect(prisma.biomedicalEquipment.findMany).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should fetch from database and cache if not in cache', async () => {
      const mockEquipment = [{ id: '123', serialNumber: 'SN123' }];
      (cache.get as jest.Mock).mockResolvedValue(null);
      (prisma.biomedicalEquipment.findMany as jest.Mock).mockResolvedValue(mockEquipment);
      (prisma.biomedicalEquipment.count as jest.Mock).mockResolvedValue(1);

      const result = await biomedicalService.listBiomedicalEquipment({});

      expect(cache.get).toHaveBeenCalled();
      expect(prisma.biomedicalEquipment.findMany).toHaveBeenCalled();
      expect(prisma.biomedicalEquipment.count).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
      expect(result.equipment).toEqual(mockEquipment);
      expect(result.total).toEqual(1);
    });

    it('should use cursor-based pagination when cursor is provided', async () => {
      const mockEquipment = [{ id: '123', serialNumber: 'SN123' }];
      (cache.get as jest.Mock).mockResolvedValue(null);
      (prisma.biomedicalEquipment.findMany as jest.Mock).mockResolvedValue(mockEquipment);
      (prisma.biomedicalEquipment.count as jest.Mock).mockResolvedValue(1);

      await biomedicalService.listBiomedicalEquipment({ cursor: '456' });

      expect(prisma.biomedicalEquipment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: '456' },
        })
      );
    });
  });

  describe('createBiomedicalEquipment', () => {
    it('should create equipment and invalidate cache', async () => {
      const mockEquipment = { id: '123', serialNumber: 'SN123', manufacturer: 'TestMfg' };
      (prisma.biomedicalEquipment.create as jest.Mock).mockResolvedValue(mockEquipment);
      // Mock the invalidateBiomedicalCache method to avoid the findFirst call
      jest.spyOn(BiomedicalService.prototype, 'invalidateBiomedicalCache' as any).mockResolvedValue(undefined);

      await biomedicalService.createBiomedicalEquipment({
        serialNumber: 'SN123',
        modelNumber: 'MDL123',
        manufacturer: 'TestMfg',
        type: 'Monitor',
        category: 'Diagnostic',
        status: 'ACTIVE',
      });

      expect(prisma.biomedicalEquipment.create).toHaveBeenCalled();
      expect(BiomedicalService.prototype.invalidateBiomedicalCache).toHaveBeenCalled();
    });
  });

  describe('updateBiomedicalEquipment', () => {
    it('should update equipment and invalidate cache', async () => {
      const mockEquipment = { id: '123', serialNumber: 'SN123', manufacturer: 'TestMfg' };
      (prisma.biomedicalEquipment.findUnique as jest.Mock).mockResolvedValue({ serialNumber: 'SN123' });
      (prisma.biomedicalEquipment.update as jest.Mock).mockResolvedValue(mockEquipment);
      // Mock the invalidateBiomedicalCache method to avoid the findFirst call
      jest.spyOn(BiomedicalService.prototype, 'invalidateBiomedicalCache' as any).mockResolvedValue(undefined);

      await biomedicalService.updateBiomedicalEquipment('123', { manufacturer: 'UpdatedMfg' });

      expect(prisma.biomedicalEquipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '123' },
          data: { manufacturer: 'UpdatedMfg' },
        })
      );
      expect(BiomedicalService.prototype.invalidateBiomedicalCache).toHaveBeenCalled();
    });
  });

  describe('recordCalibration', () => {
    it('should record calibration and update equipment', async () => {
      const mockCalibration = { id: '456', equipmentId: '123', date: new Date(), result: 'PASS' };
      (prisma.calibrationRecord.create as jest.Mock).mockResolvedValue(mockCalibration);
      (prisma.$transaction as jest.Mock).mockImplementation((callback) => callback(prisma));
      // Mock the invalidateBiomedicalCache method to avoid the findFirst call
      jest.spyOn(BiomedicalService.prototype, 'invalidateBiomedicalCache' as any).mockResolvedValue(undefined);

      await biomedicalService.recordCalibration('123', {
        date: new Date(),
        performedBy: 'Technician',
        result: 'PASS',
        nextCalibrationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });

      expect(prisma.calibrationRecord.create).toHaveBeenCalled();
      expect(prisma.biomedicalEquipment.update).toHaveBeenCalled();
      expect(BiomedicalService.prototype.invalidateBiomedicalCache).toHaveBeenCalled();
    });
  });

  describe('FHIR conversion', () => {
    it('should convert equipment to FHIR Device with R5 compliance', () => {
      const mockEquipment = {
        id: '123',
        serialNumber: 'SN123',
        manufacturer: 'TestMfg',
        modelNumber: 'MDL123',
        type: 'Monitor',
        status: 'ACTIVE',
        location: 'Ward 1',
        department: 'Cardiology',
        properties: { weight: '5kg', power: '110V' },
      };

      const result = biomedicalService.toFhirDevice(mockEquipment);

      expect(result.resourceType).toEqual('Device');
      expect(result.meta.profile).toContain('http://hl7.org/fhir/r5/StructureDefinition/Device');
      expect(result.id).toEqual('123');
      expect(result.identifier[0].value).toEqual('SN123');
      expect(result.manufacturer).toEqual('TestMfg');
      expect(result.serialNumber).toEqual('SN123');
      expect(result.modelNumber).toEqual('MDL123');
      expect(result.type.coding[0].code).toEqual('Monitor');
      expect(result.location.display).toEqual('Ward 1');
      expect(result.owner.display).toEqual('Cardiology');
      expect(result.property.length).toEqual(2);
      expect(result.safety.length).toBeGreaterThan(0);
    });

    it('should create FHIR DeviceDefinition with R5 compliance', () => {
      const result = biomedicalService.createFhirDeviceDefinition({
        type: 'Monitor',
        manufacturer: 'TestMfg',
        modelNumber: 'MDL123',
        description: 'Patient Monitor',
        category: 'Diagnostic',
      });

      expect(result.resourceType).toEqual('DeviceDefinition');
      expect(result.meta.profile).toContain('http://hl7.org/fhir/r5/StructureDefinition/DeviceDefinition');
      expect(result.manufacturer.display).toEqual('TestMfg');
      expect(result.modelNumber).toEqual('MDL123');
      expect(result.description).toEqual('Patient Monitor');
      expect(result.type.coding[0].code).toEqual('Monitor');
    });
  });

  describe('calculateReliabilityMetrics', () => {
    it('should calculate reliability metrics based on maintenance history', async () => {
      const mockEquipment = {
        id: '123',
        serialNumber: 'SN123',
        purchaseDate: new Date('2023-01-01'),
      };
      
      const mockMaintenanceRecords = [
        {
          date: new Date('2023-03-01'),
          type: 'CORRECTIVE',
          status: 'COMPLETED',
          cost: 100,
        },
        {
          date: new Date('2023-06-01'),
          type: 'CORRECTIVE',
          status: 'COMPLETED',
          cost: 150,
        },
        {
          date: new Date('2023-09-01'),
          type: 'PREVENTIVE',
          status: 'COMPLETED',
          cost: 50,
        },
      ];
      
      const mockCalibrationRecords = [
        {
          date: new Date('2023-02-01'),
          result: 'PASS',
        },
        {
          date: new Date('2023-08-01'),
          result: 'FAIL',
        },
        {
          date: new Date('2023-08-15'),
          result: 'PASS',
        },
      ];

      (prisma.biomedicalEquipment.findUnique as jest.Mock).mockResolvedValue(mockEquipment);
      (prisma.maintenanceRecord.findMany as jest.Mock).mockResolvedValue(mockMaintenanceRecords);
      (prisma.calibrationRecord.findMany as jest.Mock).mockResolvedValue(mockCalibrationRecords);

      const result = await biomedicalService.calculateReliabilityMetrics('123');

      expect(result.serialNumber).toEqual('SN123');
      expect(result.mtbf).toBeGreaterThan(0);
      expect(result.calibrationSuccessRate).toBeCloseTo(66.67, 1);
      expect(result.totalMaintenanceCost).toEqual(300);
      expect(result.corrective).toEqual(2);
      expect(result.preventive).toEqual(1);
    });
  });

  describe('predictMaintenanceNeeds', () => {
    it('should predict maintenance needs based on historical data', async () => {
      const mockEquipment = {
        id: '123',
        serialNumber: 'SN123',
        purchaseDate: new Date('2023-01-01'),
        calibrationFrequency: 90,
      };
      
      const mockMaintenanceRecords = [
        {
          date: new Date('2023-03-01'),
          type: 'CORRECTIVE',
          status: 'COMPLETED',
        },
        {
          date: new Date('2023-06-01'),
          type: 'CORRECTIVE',
          status: 'COMPLETED',
        },
        {
          date: new Date('2023-09-01'),
          type: 'CORRECTIVE',
          status: 'COMPLETED',
        },
      ];

      (prisma.biomedicalEquipment.findUnique as jest.Mock).mockResolvedValue(mockEquipment);
      (prisma.maintenanceRecord.findMany as jest.Mock).mockResolvedValue(mockMaintenanceRecords);

      const result = await biomedicalService.predictMaintenanceNeeds('123');

      expect(result.serialNumber).toEqual('SN123');
      expect(result.meanTimeBetweenFailures).toBeCloseTo(92, 0);
      expect(result.nextPredictedFailureDate).toBeDefined();
      expect(result.recommendedMaintenanceDate).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.dataPoints).toEqual(3);
    });

    it('should use manufacturer recommendations when no historical data exists', async () => {
      const mockEquipment = {
        id: '123',
        serialNumber: 'SN123',
        purchaseDate: new Date('2023-01-01'),
        calibrationFrequency: 90,
      };
      
      const mockMaintenanceRecords: any[] = [];

      (prisma.biomedicalEquipment.findUnique as jest.Mock).mockResolvedValue(mockEquipment);
      (prisma.maintenanceRecord.findMany as jest.Mock).mockResolvedValue(mockMaintenanceRecords);

      const result = await biomedicalService.predictMaintenanceNeeds('123');

      expect(result.serialNumber).toEqual('SN123');
      expect(result.meanTimeBetweenFailures).toEqual(90);
      expect(result.nextPredictedFailureDate).toBeDefined();
      expect(result.reliability).toEqual('Based on manufacturer recommendations');
      expect(result.dataPoints).toEqual(0);
    });
  });
});
