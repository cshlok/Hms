import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { EmployeeService } from '../employee-service';
import { PrismaClient } from '@prisma/client';
import { cache } from '@/lib/cache';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    employee: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    qualification: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    employeePosition: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    attendance: {
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

describe('EmployeeService', () => {
  let employeeService: EmployeeService;
  let prisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    employeeService = new EmployeeService();
    prisma = new PrismaClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEmployeeById', () => {
    it('should return cached employee if available', async () => {
      const mockEmployee = { id: '123', firstName: 'John', lastName: 'Doe' };
      (cache.get as jest.Mock).mockResolvedValue(JSON.stringify(mockEmployee));

      const result = await employeeService.getEmployeeById('123');

      expect(cache.get).toHaveBeenCalledWith('employee:id:123');
      expect(prisma.employee.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(mockEmployee);
    });

    it('should fetch from database and cache if not in cache', async () => {
      const mockEmployee = { id: '123', firstName: 'John', lastName: 'Doe' };
      (cache.get as jest.Mock).mockResolvedValue(null);
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await employeeService.getEmployeeById('123');

      expect(cache.get).toHaveBeenCalledWith('employee:id:123');
      expect(prisma.employee.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        include: expect.any(Object),
      });
      expect(cache.set).toHaveBeenCalledWith(
        'employee:id:123',
        JSON.stringify(mockEmployee),
        expect.any(Number)
      );
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('listEmployees', () => {
    it('should return cached list if available', async () => {
      const mockResult = {
        employees: [{ id: '123', firstName: 'John' }],
        total: 1,
        skip: 0,
        take: 10,
        nextCursor: null,
      };
      (cache.get as jest.Mock).mockResolvedValue(JSON.stringify(mockResult));

      const result = await employeeService.listEmployees({});

      expect(cache.get).toHaveBeenCalled();
      expect(prisma.employee.findMany).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should fetch from database and cache if not in cache', async () => {
      const mockEmployees = [{ id: '123', firstName: 'John' }];
      (cache.get as jest.Mock).mockResolvedValue(null);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(mockEmployees);
      (prisma.employee.count as jest.Mock).mockResolvedValue(1);

      const result = await employeeService.listEmployees({});

      expect(cache.get).toHaveBeenCalled();
      expect(prisma.employee.findMany).toHaveBeenCalled();
      expect(prisma.employee.count).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
      expect(result.employees).toEqual(mockEmployees);
      expect(result.total).toEqual(1);
    });

    it('should use cursor-based pagination when cursor is provided', async () => {
      const mockEmployees = [{ id: '123', firstName: 'John' }];
      (cache.get as jest.Mock).mockResolvedValue(null);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(mockEmployees);
      (prisma.employee.count as jest.Mock).mockResolvedValue(1);

      await employeeService.listEmployees({ cursor: '456' });

      expect(prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: '456' },
        })
      );
    });
  });

  describe('createEmployee', () => {
    it('should create employee and invalidate cache', async () => {
      const mockEmployee = { id: '123', firstName: 'John', lastName: 'Doe' };
      (prisma.employee.create as jest.Mock).mockResolvedValue(mockEmployee);
      (prisma.$transaction as jest.Mock).mockImplementation((callback) => callback(prisma));
      // Mock the invalidateEmployeeCache method to avoid the findFirst call
      jest.spyOn(EmployeeService.prototype, 'invalidateEmployeeCache' as any).mockResolvedValue(undefined);

      await employeeService.createEmployee({
        employeeId: 'EMP123',
        firstName: 'John',
        lastName: 'Doe',
        joiningDate: new Date(),
      });

      expect(prisma.employee.create).toHaveBeenCalled();
      expect(EmployeeService.prototype.invalidateEmployeeCache).toHaveBeenCalled();
    });
  });

  describe('updateEmployee', () => {
    it('should update employee and invalidate cache', async () => {
      const mockEmployee = { id: '123', firstName: 'John', lastName: 'Doe' };
      (prisma.employee.update as jest.Mock).mockResolvedValue(mockEmployee);
      // Mock the invalidateEmployeeCache method to avoid the findFirst call
      jest.spyOn(EmployeeService.prototype, 'invalidateEmployeeCache' as any).mockResolvedValue(undefined);

      await employeeService.updateEmployee('123', { firstName: 'John Updated' });

      expect(prisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '123' },
          data: { firstName: 'John Updated' },
        })
      );
      expect(EmployeeService.prototype.invalidateEmployeeCache).toHaveBeenCalled();
    });
  });

  describe('predictStaffingNeeds', () => {
    it('should predict staffing needs based on historical data', async () => {
      const mockAttendance = [
        {
          checkInTime: new Date('2024-05-20T08:00:00Z'),
          employee: {
            positions: [{ position: { code: 'NURSE' } }],
          },
        },
        {
          checkInTime: new Date('2024-05-20T08:00:00Z'),
          employee: {
            positions: [{ position: { code: 'NURSE' } }],
          },
        },
        {
          checkInTime: new Date('2024-05-20T08:00:00Z'),
          employee: {
            positions: [{ position: { code: 'DOCTOR' } }],
          },
        },
      ];

      const mockCurrentStaff = [
        {
          positions: [{ position: { code: 'NURSE' } }],
        },
        {
          positions: [{ position: { code: 'DOCTOR' } }],
        },
      ];

      (prisma.attendance.findMany as jest.Mock).mockResolvedValue(mockAttendance);
      (prisma.employee.findMany as jest.Mock).mockResolvedValue(mockCurrentStaff);

      const result = await employeeService.predictStaffingNeeds('DEPT1', new Date('2025-05-20T08:00:00Z'));

      expect(prisma.attendance.findMany).toHaveBeenCalled();
      expect(prisma.employee.findMany).toHaveBeenCalled();
      expect(result).toHaveProperty('predicted');
      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('gaps');
      expect(result.departmentId).toEqual('DEPT1');
    });
  });

  describe('FHIR conversion', () => {
    it('should convert employee to FHIR Practitioner with R5 compliance', () => {
      const mockEmployee = {
        id: '123',
        employeeId: 'EMP123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        active: true,
        qualifications: [],
      };

      const result = employeeService.toFhirPractitioner(mockEmployee);

      expect(result.resourceType).toEqual('Practitioner');
      expect(result.meta.profile).toContain('http://hl7.org/fhir/r5/StructureDefinition/Practitioner');
      expect(result.id).toEqual('123');
      expect(result.identifier[0].value).toEqual('EMP123');
      expect(result.name[0].family).toEqual('Doe');
      expect(result.name[0].given[0]).toEqual('John');
      expect(result.telecom[0].value).toEqual('john@example.com');
    });

    it('should convert position to FHIR PractitionerRole with R5 compliance', () => {
      const mockEmployee = {
        id: '123',
        employeeId: 'EMP123',
        firstName: 'John',
        lastName: 'Doe',
        department: {
          code: 'CARDIO',
          name: 'Cardiology',
        },
      };

      const mockPosition = {
        id: '456',
        position: {
          code: 'NURSE',
          title: 'Registered Nurse',
        },
        startDate: new Date('2023-01-01'),
        endDate: null,
      };

      const result = employeeService.toFhirPractitionerRole(mockEmployee, mockPosition);

      expect(result.resourceType).toEqual('PractitionerRole');
      expect(result.meta.profile).toContain('http://hl7.org/fhir/r5/StructureDefinition/PractitionerRole');
      expect(result.id).toEqual('456');
      expect(result.practitioner.reference).toEqual('Practitioner/123');
      expect(result.code[0].coding[0].code).toEqual('NURSE');
      expect(result.specialty[0].coding[0].code).toEqual('CARDIO');
      expect(result.availableTime).toBeDefined();
      expect(result.notAvailable).toBeDefined();
    });
  });

  describe('getEmployeesWithExpiringQualifications', () => {
    it('should return employees with qualifications expiring within threshold', async () => {
      const mockQualifications = [
        {
          endDate: new Date('2025-06-15'),
          employee: {
            firstName: 'John',
            lastName: 'Doe',
            department: { name: 'Cardiology' },
          },
        },
      ];

      (prisma.qualification.findMany as jest.Mock).mockResolvedValue(mockQualifications);

      const result = await employeeService.getEmployeesWithExpiringQualifications(30);

      expect(prisma.qualification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            endDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
      expect(result).toEqual(mockQualifications);
    });
  });
});
