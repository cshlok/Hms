import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { payrollService } from '@/lib/hr/payroll-service';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    payrollPeriod: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    payrollEntry: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    attendance: {
      findMany: jest.fn(),
    },
    salaryStructure: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };
  
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

describe('Payroll Service', () => {
  let prisma;
  
  beforeEach(() => {
    prisma = new PrismaClient();
    // Clear all mocks before each test
    jest.clearAllMocks();
  });
  
  describe('createPayrollPeriod', () => {
    it('should create a payroll period successfully', async () => {
      // Arrange
      const periodData = {
        name: 'May 2025',
        startDate: new Date('2025-05-01'),
        endDate: new Date('2025-05-31'),
        paymentDate: new Date('2025-06-05'),
        status: 'DRAFT',
      };
      
      const mockCreatedPeriod = {
        id: 'period1',
        ...periodData,
      };
      
      prisma.payrollPeriod.create.mockResolvedValue(mockCreatedPeriod);
      
      // Act
      const result = await payrollService.createPayrollPeriod(periodData);
      
      // Assert
      expect(prisma.payrollPeriod.create).toHaveBeenCalledWith({
        data: expect.objectContaining(periodData),
        include: expect.any(Object),
      });
      expect(result).toEqual(mockCreatedPeriod);
    });
    
    it('should throw an error if dates are invalid', async () => {
      // Arrange
      const periodData = {
        name: 'Invalid Period',
        startDate: new Date('2025-05-31'),
        endDate: new Date('2025-05-01'), // End date before start date
        paymentDate: new Date('2025-06-05'),
        status: 'DRAFT',
      };
      
      // Act & Assert
      await expect(payrollService.createPayrollPeriod(periodData))
        .rejects
        .toThrow('End date must be after start date');
      
      expect(prisma.payrollPeriod.create).not.toHaveBeenCalled();
    });
  });
  
  describe('generatePayrollEntries', () => {
    it('should generate payroll entries for all active employees', async () => {
      // Arrange
      const periodId = 'period1';
      const mockPeriod = {
        id: periodId,
        name: 'May 2025',
        startDate: new Date('2025-05-01'),
        endDate: new Date('2025-05-31'),
        status: 'DRAFT',
      };
      
      const mockEmployees = [
        {
          id: 'emp1',
          firstName: 'John',
          lastName: 'Doe',
          employeeId: 'E001',
          isActive: true,
          departmentId: 'dept1',
          department: { name: 'Cardiology' },
        },
        {
          id: 'emp2',
          firstName: 'Jane',
          lastName: 'Smith',
          employeeId: 'E002',
          isActive: true,
          departmentId: 'dept2',
          department: { name: 'Radiology' },
        },
      ];
      
      const mockSalaryStructures = [
        {
          id: 'sal1',
          employeeId: 'emp1',
          baseSalary: 5000,
          components: [
            { name: 'Housing Allowance', type: 'ALLOWANCE', amount: 1000, calculationType: 'FIXED' },
            { name: 'Transport Allowance', type: 'ALLOWANCE', amount: 500, calculationType: 'FIXED' },
          ],
        },
        {
          id: 'sal2',
          employeeId: 'emp2',
          baseSalary: 6000,
          components: [
            { name: 'Housing Allowance', type: 'ALLOWANCE', amount: 1200, calculationType: 'FIXED' },
            { name: 'Transport Allowance', type: 'ALLOWANCE', amount: 600, calculationType: 'FIXED' },
          ],
        },
      ];
      
      const mockAttendance = [
        { employeeId: 'emp1', date: new Date('2025-05-01'), status: 'PRESENT' },
        { employeeId: 'emp1', date: new Date('2025-05-02'), status: 'PRESENT' },
        // More attendance records would be here
      ];
      
      const mockCreatedEntries = [
        {
          id: 'entry1',
          periodId,
          employeeId: 'emp1',
          baseSalary: 5000,
          grossSalary: 6500,
          deductions: 1000,
          netSalary: 5500,
          components: [
            { name: 'Housing Allowance', type: 'ALLOWANCE', amount: 1000 },
            { name: 'Transport Allowance', type: 'ALLOWANCE', amount: 500 },
            { name: 'Income Tax', type: 'DEDUCTION', amount: 1000 },
          ],
        },
        {
          id: 'entry2',
          periodId,
          employeeId: 'emp2',
          baseSalary: 6000,
          grossSalary: 7800,
          deductions: 1200,
          netSalary: 6600,
          components: [
            { name: 'Housing Allowance', type: 'ALLOWANCE', amount: 1200 },
            { name: 'Transport Allowance', type: 'ALLOWANCE', amount: 600 },
            { name: 'Income Tax', type: 'DEDUCTION', amount: 1200 },
          ],
        },
      ];
      
      prisma.payrollPeriod.findUnique.mockResolvedValue(mockPeriod);
      prisma.employee.findMany.mockResolvedValue(mockEmployees);
      prisma.salaryStructure.findMany.mockResolvedValue(mockSalaryStructures);
      prisma.attendance.findMany.mockResolvedValue(mockAttendance);
      prisma.payrollEntry.create.mockImplementation((data) => {
        const employee = mockEmployees.find(e => e.id === data.data.employeeId);
        const salaryStructure = mockSalaryStructures.find(s => s.employeeId === data.data.employeeId);
        
        return Promise.resolve({
          id: employee.id === 'emp1' ? 'entry1' : 'entry2',
          periodId,
          employeeId: employee.id,
          baseSalary: salaryStructure.baseSalary,
          grossSalary: employee.id === 'emp1' ? 6500 : 7800,
          deductions: employee.id === 'emp1' ? 1000 : 1200,
          netSalary: employee.id === 'emp1' ? 5500 : 6600,
          components: [
            ...salaryStructure.components,
            { name: 'Income Tax', type: 'DEDUCTION', amount: employee.id === 'emp1' ? 1000 : 1200 },
          ],
        });
      });
      
      // Act
      const result = await payrollService.generatePayrollEntries(periodId);
      
      // Assert
      expect(prisma.payrollPeriod.findUnique).toHaveBeenCalledWith({
        where: { id: periodId },
      });
      expect(prisma.employee.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: expect.any(Object),
      });
      expect(prisma.salaryStructure.findMany).toHaveBeenCalled();
      expect(prisma.attendance.findMany).toHaveBeenCalled();
      expect(prisma.payrollEntry.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual(expect.arrayContaining(mockCreatedEntries));
    });
    
    it('should throw an error if payroll period not found', async () => {
      // Arrange
      const periodId = 'invalid-period';
      
      prisma.payrollPeriod.findUnique.mockResolvedValue(null);
      
      // Act & Assert
      await expect(payrollService.generatePayrollEntries(periodId))
        .rejects
        .toThrow('Payroll period not found');
      
      expect(prisma.payrollPeriod.findUnique).toHaveBeenCalledWith({
        where: { id: periodId },
      });
      expect(prisma.employee.findMany).not.toHaveBeenCalled();
    });
    
    it('should throw an error if payroll period is not in DRAFT status', async () => {
      // Arrange
      const periodId = 'period1';
      const mockPeriod = {
        id: periodId,
        name: 'May 2025',
        startDate: new Date('2025-05-01'),
        endDate: new Date('2025-05-31'),
        status: 'APPROVED', // Not in DRAFT status
      };
      
      prisma.payrollPeriod.findUnique.mockResolvedValue(mockPeriod);
      
      // Act & Assert
      await expect(payrollService.generatePayrollEntries(periodId))
        .rejects
        .toThrow('Payroll entries can only be generated for periods in DRAFT status');
      
      expect(prisma.payrollPeriod.findUnique).toHaveBeenCalledWith({
        where: { id: periodId },
      });
      expect(prisma.employee.findMany).not.toHaveBeenCalled();
    });
  });
  
  describe('calculatePayroll', () => {
    it('should calculate payroll correctly based on attendance and salary structure', () => {
      // Arrange
      const employee = {
        id: 'emp1',
        firstName: 'John',
        lastName: 'Doe',
      };
      
      const salaryStructure = {
        baseSalary: 5000,
        components: [
          { name: 'Housing Allowance', type: 'ALLOWANCE', amount: 1000, calculationType: 'FIXED' },
          { name: 'Transport Allowance', type: 'ALLOWANCE', amount: 500, calculationType: 'FIXED' },
          { name: 'Income Tax', type: 'DEDUCTION', amount: 20, calculationType: 'PERCENTAGE' },
        ],
      };
      
      const attendance = [
        { status: 'PRESENT', date: new Date('2025-05-01') },
        { status: 'PRESENT', date: new Date('2025-05-02') },
        { status: 'ABSENT', date: new Date('2025-05-03') },
        { status: 'PRESENT', date: new Date('2025-05-04') },
        { status: 'HALF_DAY', date: new Date('2025-05-05') },
      ];
      
      const workingDays = 5;
      
      // Act
      const result = payrollService.calculatePayroll(employee, salaryStructure, attendance, workingDays);
      
      // Assert
      // 3.5 days present out of 5 working days = 70% attendance
      // Base salary: 5000 * 0.7 = 3500
      // Housing Allowance: 1000 (fixed)
      // Transport Allowance: 500 (fixed)
      // Gross salary: 3500 + 1000 + 500 = 5000
      // Income Tax: 5000 * 0.2 = 1000
      // Net salary: 5000 - 1000 = 4000
      expect(result).toEqual({
        baseSalary: 3500,
        grossSalary: 5000,
        deductions: 1000,
        netSalary: 4000,
        components: [
          { name: 'Base Salary', type: 'BASE', amount: 3500, calculationType: 'ATTENDANCE_BASED', originalAmount: 5000 },
          { name: 'Housing Allowance', type: 'ALLOWANCE', amount: 1000, calculationType: 'FIXED' },
          { name: 'Transport Allowance', type: 'ALLOWANCE', amount: 500, calculationType: 'FIXED' },
          { name: 'Income Tax', type: 'DEDUCTION', amount: 1000, calculationType: 'PERCENTAGE', originalAmount: 20 },
        ],
      });
    });
  });
  
  describe('approvePayrollPeriod', () => {
    it('should approve a payroll period successfully', async () => {
      // Arrange
      const periodId = 'period1';
      const mockPeriod = {
        id: periodId,
        name: 'May 2025',
        status: 'PROCESSING',
      };
      
      const mockUpdatedPeriod = {
        ...mockPeriod,
        status: 'APPROVED',
        approvedBy: 'admin@example.com',
        approvedAt: expect.any(Date),
      };
      
      prisma.payrollPeriod.findUnique.mockResolvedValue(mockPeriod);
      prisma.payrollPeriod.update.mockResolvedValue(mockUpdatedPeriod);
      
      // Act
      const result = await payrollService.approvePayrollPeriod(periodId, 'admin@example.com');
      
      // Assert
      expect(prisma.payrollPeriod.findUnique).toHaveBeenCalledWith({
        where: { id: periodId },
      });
      expect(prisma.payrollPeriod.update).toHaveBeenCalledWith({
        where: { id: periodId },
        data: {
          status: 'APPROVED',
          approvedBy: 'admin@example.com',
          approvedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockUpdatedPeriod);
    });
    
    it('should throw an error if payroll period not found', async () => {
      // Arrange
      const periodId = 'invalid-period';
      
      prisma.payrollPeriod.findUnique.mockResolvedValue(null);
      
      // Act & Assert
      await expect(payrollService.approvePayrollPeriod(periodId, 'admin@example.com'))
        .rejects
        .toThrow('Payroll period not found');
      
      expect(prisma.payrollPeriod.findUnique).toHaveBeenCalledWith({
        where: { id: periodId },
      });
      expect(prisma.payrollPeriod.update).not.toHaveBeenCalled();
    });
    
    it('should throw an error if payroll period is not in PROCESSING status', async () => {
      // Arrange
      const periodId = 'period1';
      const mockPeriod = {
        id: periodId,
        name: 'May 2025',
        status: 'DRAFT', // Not in PROCESSING status
      };
      
      prisma.payrollPeriod.findUnique.mockResolvedValue(mockPeriod);
      
      // Act & Assert
      await expect(payrollService.approvePayrollPeriod(periodId, 'admin@example.com'))
        .rejects
        .toThrow('Payroll period must be in PROCESSING status to approve');
      
      expect(prisma.payrollPeriod.findUnique).toHaveBeenCalledWith({
        where: { id: periodId },
      });
      expect(prisma.payrollPeriod.update).not.toHaveBeenCalled();
    });
  });
  
  // Additional tests for other methods would follow the same pattern
});
