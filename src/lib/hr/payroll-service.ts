import { PrismaClient } from '@prisma/client';
import { salaryService } from './salary-service';

const prisma = new PrismaClient();

/**
 * Service for managing payroll processing and calculations
 */
export class PayrollService {
  /**
   * Create a new payroll period
   */
  async createPayrollPeriod(data: {
    name: string;
    startDate: Date;
    endDate: Date;
    paymentDate: Date;
    status: 'DRAFT' | 'PROCESSING' | 'APPROVED' | 'PAID';
    notes?: string;
  }) {
    const { name, startDate, endDate, paymentDate, status, notes } = data;
    
    // Validate dates
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }
    
    if (paymentDate < endDate) {
      throw new Error('Payment date must be after end date');
    }
    
    // Create payroll period
    return prisma.payrollPeriod.create({
      data: {
        name,
        startDate,
        endDate,
        paymentDate,
        status,
        notes,
      },
    });
  }
  
  /**
   * Get a payroll period by ID
   */
  async getPayrollPeriod(id: string) {
    return prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        payrollEntries: {
          include: {
            employee: {
              select: {
                firstName: true,
                lastName: true,
                employeeId: true,
                department: true,
              },
            },
          },
        },
      },
    });
  }
  
  /**
   * List payroll periods with filtering and pagination
   */
  async listPayrollPeriods({
    skip = 0,
    take = 10,
    status,
    startDate,
    endDate,
  }: {
    skip?: number;
    take?: number;
    status?: 'DRAFT' | 'PROCESSING' | 'APPROVED' | 'PAID';
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) {
        where.startDate.gte = startDate;
      }
      if (endDate) {
        where.endDate = {};
        where.endDate.lte = endDate;
      }
    }
    
    const [periods, total] = await Promise.all([
      prisma.payrollPeriod.findMany({
        where,
        skip,
        take,
        orderBy: { startDate: 'desc' },
        include: {
          _count: {
            select: {
              payrollEntries: true,
            },
          },
        },
      }),
      prisma.payrollPeriod.count({ where }),
    ]);
    
    return {
      periods,
      total,
      skip,
      take,
    };
  }
  
  /**
   * Update a payroll period
   */
  async updatePayrollPeriod(id: string, data: {
    name?: string;
    startDate?: Date;
    endDate?: Date;
    paymentDate?: Date;
    status?: 'DRAFT' | 'PROCESSING' | 'APPROVED' | 'PAID';
    notes?: string;
  }) {
    // Validate status transition
    if (data.status) {
      const currentPeriod = await prisma.payrollPeriod.findUnique({
        where: { id },
      });
      
      if (!currentPeriod) {
        throw new Error('Payroll period not found');
      }
      
      // Validate status transitions
      const validTransitions = {
        'DRAFT': ['PROCESSING'],
        'PROCESSING': ['DRAFT', 'APPROVED'],
        'APPROVED': ['PROCESSING', 'PAID'],
        'PAID': [],
      };
      
      if (!validTransitions[currentPeriod.status].includes(data.status)) {
        throw new Error(`Invalid status transition from ${currentPeriod.status} to ${data.status}`);
      }
    }
    
    return prisma.payrollPeriod.update({
      where: { id },
      data,
    });
  }
  
  /**
   * Generate payroll entries for a period
   */
  async generatePayrollEntries(payrollPeriodId: string, departmentId?: string) {
    // Get payroll period
    const payrollPeriod = await prisma.payrollPeriod.findUnique({
      where: { id: payrollPeriodId },
    });
    
    if (!payrollPeriod) {
      throw new Error('Payroll period not found');
    }
    
    if (payrollPeriod.status !== 'DRAFT') {
      throw new Error('Payroll entries can only be generated for periods in DRAFT status');
    }
    
    // Get active employees
    const whereClause: any = {
      active: true,
    };
    
    if (departmentId) {
      whereClause.departmentId = departmentId;
    }
    
    const employees = await prisma.employee.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeId: true,
      },
    });
    
    // Generate entries for each employee
    const entries = [];
    
    for (const employee of employees) {
      try {
        // Calculate gross salary
        const salaryCalculation = await salaryService.calculateGrossSalary(
          employee.id,
          payrollPeriod.endDate
        );
        
        // Get attendance for the period
        const attendance = await prisma.attendance.findMany({
          where: {
            employeeId: employee.id,
            date: {
              gte: payrollPeriod.startDate,
              lte: payrollPeriod.endDate,
            },
          },
        });
        
        // Calculate attendance metrics
        const workingDays = this.getWorkingDaysInPeriod(payrollPeriod.startDate, payrollPeriod.endDate);
        const presentDays = attendance.filter(a => a.status === 'PRESENT').length;
        const lateDays = attendance.filter(a => a.status === 'LATE').length;
        const absentDays = attendance.filter(a => a.status === 'ABSENT').length;
        const halfDays = attendance.filter(a => a.status === 'HALF_DAY').length;
        const leaveDays = attendance.filter(a => a.status === 'ON_LEAVE').length;
        
        // Calculate attendance-based deductions
        const attendanceDeduction = this.calculateAttendanceDeduction(
          salaryCalculation.baseSalary,
          workingDays,
          absentDays,
          halfDays
        );
        
        // Calculate net salary
        const netSalary = salaryCalculation.grossSalary - attendanceDeduction;
        
        // Create payroll entry
        const entry = await prisma.payrollEntry.create({
          data: {
            payrollPeriodId,
            employeeId: employee.id,
            baseSalary: salaryCalculation.baseSalary,
            grossSalary: salaryCalculation.grossSalary,
            deductions: attendanceDeduction,
            netSalary,
            workingDays,
            presentDays,
            absentDays,
            halfDays,
            lateDays,
            leaveDays,
            status: 'PENDING',
            componentBreakdown: salaryCalculation.componentBreakdown,
          },
        });
        
        entries.push(entry);
      } catch (error) {
        console.error(`Error generating payroll for employee ${employee.id}:`, error);
        // Continue with next employee
      }
    }
    
    // Update payroll period status
    await prisma.payrollPeriod.update({
      where: { id: payrollPeriodId },
      data: {
        status: 'PROCESSING',
      },
    });
    
    return {
      payrollPeriodId,
      entriesGenerated: entries.length,
      totalEmployees: employees.length,
    };
  }
  
  /**
   * Get payroll entry by ID
   */
  async getPayrollEntry(id: string) {
    return prisma.payrollEntry.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
          },
        },
        payrollPeriod: true,
      },
    });
  }
  
  /**
   * Update payroll entry
   */
  async updatePayrollEntry(id: string, data: {
    baseSalary?: number;
    grossSalary?: number;
    deductions?: number;
    netSalary?: number;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
    notes?: string;
  }) {
    return prisma.payrollEntry.update({
      where: { id },
      data,
    });
  }
  
  /**
   * Approve all payroll entries for a period
   */
  async approvePayrollPeriod(payrollPeriodId: string) {
    // Get payroll period
    const payrollPeriod = await prisma.payrollPeriod.findUnique({
      where: { id: payrollPeriodId },
      include: {
        payrollEntries: true,
      },
    });
    
    if (!payrollPeriod) {
      throw new Error('Payroll period not found');
    }
    
    if (payrollPeriod.status !== 'PROCESSING') {
      throw new Error('Only payroll periods in PROCESSING status can be approved');
    }
    
    // Update all entries to APPROVED
    await prisma.payrollEntry.updateMany({
      where: {
        payrollPeriodId,
        status: 'PENDING',
      },
      data: {
        status: 'APPROVED',
      },
    });
    
    // Update payroll period status
    await prisma.payrollPeriod.update({
      where: { id: payrollPeriodId },
      data: {
        status: 'APPROVED',
      },
    });
    
    return {
      payrollPeriodId,
      entriesApproved: payrollPeriod.payrollEntries.filter(e => e.status === 'PENDING').length,
      totalEntries: payrollPeriod.payrollEntries.length,
    };
  }
  
  /**
   * Mark payroll period as paid
   */
  async markPayrollPeriodAsPaid(payrollPeriodId: string, paymentDate: Date = new Date()) {
    // Get payroll period
    const payrollPeriod = await prisma.payrollPeriod.findUnique({
      where: { id: payrollPeriodId },
      include: {
        payrollEntries: true,
      },
    });
    
    if (!payrollPeriod) {
      throw new Error('Payroll period not found');
    }
    
    if (payrollPeriod.status !== 'APPROVED') {
      throw new Error('Only approved payroll periods can be marked as paid');
    }
    
    // Update all approved entries to PAID
    await prisma.payrollEntry.updateMany({
      where: {
        payrollPeriodId,
        status: 'APPROVED',
      },
      data: {
        status: 'PAID',
        paymentDate,
      },
    });
    
    // Update payroll period status
    await prisma.payrollPeriod.update({
      where: { id: payrollPeriodId },
      data: {
        status: 'PAID',
        paymentDate,
      },
    });
    
    return {
      payrollPeriodId,
      entriesPaid: payrollPeriod.payrollEntries.filter(e => e.status === 'APPROVED').length,
      totalEntries: payrollPeriod.payrollEntries.length,
      paymentDate,
    };
  }
  
  /**
   * Get payroll summary by department
   */
  async getPayrollSummaryByDepartment(payrollPeriodId: string) {
    // Get payroll period
    const payrollPeriod = await prisma.payrollPeriod.findUnique({
      where: { id: payrollPeriodId },
    });
    
    if (!payrollPeriod) {
      throw new Error('Payroll period not found');
    }
    
    // Get all entries for the period
    const entries = await prisma.payrollEntry.findMany({
      where: {
        payrollPeriodId,
      },
      include: {
        employee: {
          select: {
            department: true,
          },
        },
      },
    });
    
    // Group by department
    const departmentSummary = {};
    
    for (const entry of entries) {
      const departmentId = entry.employee.department?.id || 'unassigned';
      const departmentName = entry.employee.department?.name || 'Unassigned';
      
      if (!departmentSummary[departmentId]) {
        departmentSummary[departmentId] = {
          departmentId,
          departmentName,
          employeeCount: 0,
          totalBaseSalary: 0,
          totalGrossSalary: 0,
          totalDeductions: 0,
          totalNetSalary: 0,
        };
      }
      
      departmentSummary[departmentId].employeeCount++;
      departmentSummary[departmentId].totalBaseSalary += entry.baseSalary;
      departmentSummary[departmentId].totalGrossSalary += entry.grossSalary;
      departmentSummary[departmentId].totalDeductions += entry.deductions;
      departmentSummary[departmentId].totalNetSalary += entry.netSalary;
    }
    
    return {
      payrollPeriodId,
      periodName: payrollPeriod.name,
      startDate: payrollPeriod.startDate,
      endDate: payrollPeriod.endDate,
      status: payrollPeriod.status,
      departments: Object.values(departmentSummary),
      totalEmployees: entries.length,
      totalBaseSalary: entries.reduce((sum, entry) => sum + entry.baseSalary, 0),
      totalGrossSalary: entries.reduce((sum, entry) => sum + entry.grossSalary, 0),
      totalDeductions: entries.reduce((sum, entry) => sum + entry.deductions, 0),
      totalNetSalary: entries.reduce((sum, entry) => sum + entry.netSalary, 0),
    };
  }
  
  /**
   * Calculate number of working days in a period
   * This is a simplified implementation and would be more complex in a real system
   */
  private getWorkingDaysInPeriod(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    
    // Loop through each day in the period
    const currentDate = new Date(start);
    while (currentDate <= end) {
      // Check if it's a weekday (Monday-Friday)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  }
  
  /**
   * Calculate attendance-based deductions
   * This is a simplified implementation and would be more complex in a real system
   */
  private calculateAttendanceDeduction(
    baseSalary: number,
    workingDays: number,
    absentDays: number,
    halfDays: number
  ): number {
    // Calculate daily rate
    const dailyRate = baseSalary / workingDays;
    
    // Calculate deductions
    const absentDeduction = dailyRate * absentDays;
    const halfDayDeduction = dailyRate * 0.5 * halfDays;
    
    return absentDeduction + halfDayDeduction;
  }
}

export const payrollService = new PayrollService();
