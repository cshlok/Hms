import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Service for managing department and position data
 */
export class DepartmentService {
  /**
   * Create a new department
   */
  async createDepartment(data: {
    name: string;
    code: string;
    description?: string;
    parentId?: string;
  }) {
    return prisma.department.create({
      data,
      include: {
        parent: true,
      },
    });
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(id: string) {
    return prisma.department.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            active: true,
          },
        },
        positions: true,
      },
    });
  }

  /**
   * Update a department
   */
  async updateDepartment(
    id: string,
    data: {
      name?: string;
      code?: string;
      description?: string;
      parentId?: string;
    }
  ) {
    return prisma.department.update({
      where: { id },
      data,
      include: {
        parent: true,
      },
    });
  }

  /**
   * List departments with filtering and pagination
   */
  async listDepartments({
    skip = 0,
    take = 10,
    search,
    parentId,
  }: {
    skip?: number;
    take?: number;
    search?: string;
    parentId?: string;
  }) {
    const where: any = {};

    if (parentId) {
      where.parentId = parentId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          parent: true,
          _count: {
            select: {
              children: true,
              employees: true,
              positions: true,
            },
          },
        },
      }),
      prisma.department.count({ where }),
    ]);

    return {
      departments,
      total,
      skip,
      take,
    };
  }

  /**
   * Get department hierarchy
   */
  async getDepartmentHierarchy() {
    // Get all departments
    const allDepartments = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    // Build hierarchy
    const departmentMap = new Map();
    const rootDepartments = [];

    // First pass: create map of all departments
    allDepartments.forEach(dept => {
      departmentMap.set(dept.id, {
        ...dept,
        children: [],
      });
    });

    // Second pass: build hierarchy
    allDepartments.forEach(dept => {
      const departmentWithChildren = departmentMap.get(dept.id);
      
      if (dept.parentId) {
        const parent = departmentMap.get(dept.parentId);
        if (parent) {
          parent.children.push(departmentWithChildren);
        }
      } else {
        rootDepartments.push(departmentWithChildren);
      }
    });

    return rootDepartments;
  }

  /**
   * Create a new position
   */
  async createPosition(data: {
    title: string;
    code: string;
    description?: string;
    departmentId?: string;
  }) {
    return prisma.position.create({
      data,
      include: {
        department: true,
      },
    });
  }

  /**
   * Get position by ID
   */
  async getPositionById(id: string) {
    return prisma.position.findUnique({
      where: { id },
      include: {
        department: true,
        employeePositions: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeId: true,
                active: true,
              },
            },
          },
          where: {
            endDate: null, // Only current assignments
          },
        },
      },
    });
  }

  /**
   * Update a position
   */
  async updatePosition(
    id: string,
    data: {
      title?: string;
      code?: string;
      description?: string;
      departmentId?: string;
    }
  ) {
    return prisma.position.update({
      where: { id },
      data,
      include: {
        department: true,
      },
    });
  }

  /**
   * List positions with filtering and pagination
   */
  async listPositions({
    skip = 0,
    take = 10,
    search,
    departmentId,
  }: {
    skip?: number;
    take?: number;
    search?: string;
    departmentId?: string;
  }) {
    const where: any = {};

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [positions, total] = await Promise.all([
      prisma.position.findMany({
        where,
        skip,
        take,
        orderBy: { title: 'asc' },
        include: {
          department: true,
          _count: {
            select: {
              employeePositions: {
                where: {
                  endDate: null, // Only current assignments
                },
              },
            },
          },
        },
      }),
      prisma.position.count({ where }),
    ]);

    return {
      positions,
      total,
      skip,
      take,
    };
  }
}

export const departmentService = new DepartmentService();
