import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Service for managing salary structures and payroll components
 */
export class SalaryService {
  /**
   * Create a new salary structure
   */
  async createSalaryStructure(data: {
    name: string;
    description?: string;
    components: {
      name: string;
      type: 'EARNING' | 'DEDUCTION' | 'TAX';
      calculationType: 'FIXED' | 'PERCENTAGE' | 'FORMULA';
      value: number;
      formula?: string;
      taxable: boolean;
      isBase?: boolean;
    }[];
  }) {
    const { name, description, components } = data;
    
    // Create salary structure with components
    return prisma.salaryStructure.create({
      data: {
        name,
        description,
        components: {
          create: components.map(component => ({
            name: component.name,
            type: component.type,
            calculationType: component.calculationType,
            value: component.value,
            formula: component.formula,
            taxable: component.taxable,
            isBase: component.isBase || false,
          })),
        },
      },
      include: {
        components: true,
      },
    });
  }
  
  /**
   * Get a salary structure by ID
   */
  async getSalaryStructure(id: string) {
    return prisma.salaryStructure.findUnique({
      where: { id },
      include: {
        components: true,
      },
    });
  }
  
  /**
   * List all salary structures
   */
  async listSalaryStructures() {
    return prisma.salaryStructure.findMany({
      include: {
        components: true,
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });
  }
  
  /**
   * Update a salary structure
   */
  async updateSalaryStructure(id: string, data: {
    name?: string;
    description?: string;
    active?: boolean;
  }) {
    return prisma.salaryStructure.update({
      where: { id },
      data,
    });
  }
  
  /**
   * Add a component to a salary structure
   */
  async addSalaryComponent(structureId: string, data: {
    name: string;
    type: 'EARNING' | 'DEDUCTION' | 'TAX';
    calculationType: 'FIXED' | 'PERCENTAGE' | 'FORMULA';
    value: number;
    formula?: string;
    taxable: boolean;
    isBase?: boolean;
  }) {
    return prisma.salaryComponent.create({
      data: {
        ...data,
        salaryStructureId: structureId,
      },
    });
  }
  
  /**
   * Update a salary component
   */
  async updateSalaryComponent(id: string, data: {
    name?: string;
    type?: 'EARNING' | 'DEDUCTION' | 'TAX';
    calculationType?: 'FIXED' | 'PERCENTAGE' | 'FORMULA';
    value?: number;
    formula?: string;
    taxable?: boolean;
    isBase?: boolean;
    active?: boolean;
  }) {
    return prisma.salaryComponent.update({
      where: { id },
      data,
    });
  }
  
  /**
   * Delete a salary component
   */
  async deleteSalaryComponent(id: string) {
    return prisma.salaryComponent.delete({
      where: { id },
    });
  }
  
  /**
   * Assign a salary structure to an employee
   */
  async assignSalaryStructure(data: {
    employeeId: string;
    salaryStructureId: string;
    baseSalary: number;
    effectiveDate: Date;
    endDate?: Date;
    notes?: string;
  }) {
    const { employeeId, salaryStructureId, baseSalary, effectiveDate, endDate, notes } = data;
    
    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    // Check if salary structure exists
    const salaryStructure = await prisma.salaryStructure.findUnique({
      where: { id: salaryStructureId },
    });
    
    if (!salaryStructure) {
      throw new Error('Salary structure not found');
    }
    
    // If there's an existing active assignment, end it
    if (!endDate) {
      const existingAssignment = await prisma.employeeSalary.findFirst({
        where: {
          employeeId,
          endDate: null,
        },
      });
      
      if (existingAssignment) {
        await prisma.employeeSalary.update({
          where: { id: existingAssignment.id },
          data: {
            endDate: new Date(effectiveDate),
            notes: existingAssignment.notes 
              ? `${existingAssignment.notes}; Automatically ended due to new assignment.` 
              : 'Automatically ended due to new assignment.',
          },
        });
      }
    }
    
    // Create new assignment
    return prisma.employeeSalary.create({
      data: {
        employeeId,
        salaryStructureId,
        baseSalary,
        effectiveDate,
        endDate,
        notes,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
        salaryStructure: {
          include: {
            components: true,
          },
        },
      },
    });
  }
  
  /**
   * Get employee's current salary structure
   */
  async getEmployeeSalary(employeeId: string) {
    return prisma.employeeSalary.findFirst({
      where: {
        employeeId,
        endDate: null,
      },
      include: {
        salaryStructure: {
          include: {
            components: true,
          },
        },
      },
    });
  }
  
  /**
   * Get employee's salary history
   */
  async getEmployeeSalaryHistory(employeeId: string) {
    return prisma.employeeSalary.findMany({
      where: {
        employeeId,
      },
      orderBy: {
        effectiveDate: 'desc',
      },
      include: {
        salaryStructure: true,
      },
    });
  }
  
  /**
   * Calculate employee's gross salary
   */
  async calculateGrossSalary(employeeId: string, date: Date = new Date()) {
    // Get employee's salary structure for the given date
    const employeeSalary = await prisma.employeeSalary.findFirst({
      where: {
        employeeId,
        effectiveDate: {
          lte: date,
        },
        OR: [
          { endDate: null },
          { endDate: { gte: date } },
        ],
      },
      include: {
        salaryStructure: {
          include: {
            components: true,
          },
        },
      },
    });
    
    if (!employeeSalary) {
      throw new Error('No salary structure assigned for the given date');
    }
    
    const { baseSalary, salaryStructure } = employeeSalary;
    
    // Calculate each component
    let grossSalary = baseSalary;
    const componentBreakdown = [];
    
    for (const component of salaryStructure.components) {
      if (!component.active) continue;
      
      let componentValue = 0;
      
      switch (component.calculationType) {
        case 'FIXED':
          componentValue = component.value;
          break;
        case 'PERCENTAGE':
          componentValue = baseSalary * (component.value / 100);
          break;
        case 'FORMULA':
          // In a real implementation, this would evaluate the formula
          // For simplicity, we'll just use the value as a percentage of base salary
          componentValue = baseSalary * (component.value / 100);
          break;
      }
      
      // Add to gross salary if it's an earning, subtract if it's a deduction or tax
      if (component.type === 'EARNING') {
        grossSalary += componentValue;
      } else {
        grossSalary -= componentValue;
      }
      
      componentBreakdown.push({
        componentId: component.id,
        name: component.name,
        type: component.type,
        value: componentValue,
      });
    }
    
    return {
      employeeId,
      baseSalary,
      grossSalary,
      componentBreakdown,
      calculationDate: date,
    };
  }
}

export const salaryService = new SalaryService();
