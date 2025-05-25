import { PrismaClient } from '@prisma/client';
import { Practitioner, PractitionerRole, Qualification as PractitionerQualification } from '@/lib/hr/types';
import { cache } from '@/lib/cache';

const prisma = new PrismaClient();

/**
 * Service for managing employee data following FHIR Practitioner resource standards
 * Enhanced with caching and query optimization for improved performance
 */
export class EmployeeService {
  // Cache TTL in seconds
  private CACHE_TTL = 3600; // 1 hour
  private CACHE_PREFIX = 'employee:';

  /**
   * Create a new employee record
   */
  async createEmployee(data: {
    employeeId: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
    birthDate?: Date;
    email?: string;
    phone?: string;
    address?: any;
    joiningDate: Date;
    departmentId?: string;
    userId?: string;
    photo?: string;
    emergencyContact?: any;
    qualifications?: {
      code: string;
      name: string;
      issuer?: string;
      identifier?: string;
      startDate: Date;
      endDate?: Date;
      attachment?: string;
    }[];
    positions?: {
      positionId: string;
      isPrimary: boolean;
      startDate: Date;
      endDate?: Date;
    }[];
  }) {
    const result = await prisma.$transaction(async (tx) => {
      // Create the employee record
      const employee = await tx.employee.create({
        data: {
          employeeId: data.employeeId,
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          gender: data.gender,
          birthDate: data.birthDate,
          email: data.email,
          phone: data.phone,
          address: data.address,
          joiningDate: data.joiningDate,
          departmentId: data.departmentId,
          userId: data.userId,
          photo: data.photo,
          emergencyContact: data.emergencyContact,
        },
      });

      // Add qualifications if provided
      if (data.qualifications && data.qualifications.length > 0) {
        await Promise.all(
          data.qualifications.map((qual) =>
            tx.qualification.create({
              data: {
                employeeId: employee.id,
                code: qual.code,
                name: qual.name,
                issuer: qual.issuer,
                identifier: qual.identifier,
                startDate: qual.startDate,
                endDate: qual.endDate,
                attachment: qual.attachment,
              },
            })
          )
        );
      }

      // Add positions if provided
      if (data.positions && data.positions.length > 0) {
        await Promise.all(
          data.positions.map((pos) =>
            tx.employeePosition.create({
              data: {
                employeeId: employee.id,
                positionId: pos.positionId,
                isPrimary: pos.isPrimary,
                startDate: pos.startDate,
                endDate: pos.endDate,
              },
            })
          )
        );
      }

      return this.getEmployeeById(employee.id);
    });

    // Invalidate relevant caches
    await this.invalidateEmployeeCache();
    
    return result;
  }

  /**
   * Get employee by ID with related data
   * Enhanced with caching for improved performance
   */
  async getEmployeeById(id: string) {
    const cacheKey = `${this.CACHE_PREFIX}id:${id}`;
    
    // Try to get from cache first
    const cachedEmployee = await cache.get(cacheKey);
    if (cachedEmployee) {
      return JSON.parse(cachedEmployee);
    }
    
    // If not in cache, fetch from database
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        positions: {
          include: {
            position: true,
          },
        },
        qualifications: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });
    
    // Store in cache if found
    if (employee) {
      await cache.set(cacheKey, JSON.stringify(employee), this.CACHE_TTL);
    }
    
    return employee;
  }

  /**
   * Get employee by employee ID with related data
   * Enhanced with caching for improved performance
   */
  async getEmployeeByEmployeeId(employeeId: string) {
    const cacheKey = `${this.CACHE_PREFIX}employeeId:${employeeId}`;
    
    // Try to get from cache first
    const cachedEmployee = await cache.get(cacheKey);
    if (cachedEmployee) {
      return JSON.parse(cachedEmployee);
    }
    
    // If not in cache, fetch from database
    const employee = await prisma.employee.findUnique({
      where: { employeeId },
      include: {
        department: true,
        positions: {
          include: {
            position: true,
          },
        },
        qualifications: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });
    
    // Store in cache if found
    if (employee) {
      await cache.set(cacheKey, JSON.stringify(employee), this.CACHE_TTL);
    }
    
    return employee;
  }

  /**
   * Update an employee record
   */
  async updateEmployee(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      middleName?: string;
      gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
      birthDate?: Date;
      email?: string;
      phone?: string;
      address?: any;
      departmentId?: string;
      photo?: string;
      emergencyContact?: any;
      active?: boolean;
      terminationDate?: Date;
    }
  ) {
    const result = await prisma.employee.update({
      where: { id },
      data,
      include: {
        department: true,
        positions: {
          include: {
            position: true,
          },
        },
        qualifications: true,
      },
    });
    
    // Invalidate relevant caches
    await this.invalidateEmployeeCache(id);
    
    return result;
  }

  /**
   * List employees with filtering and pagination
   * Optimized with cursor-based pagination and selective field loading
   */
  async listEmployees({
    skip = 0,
    take = 10,
    cursor,
    departmentId,
    positionId,
    search,
    active = true,
    includeDetails = false,
  }: {
    skip?: number;
    take?: number;
    cursor?: string;
    departmentId?: string;
    positionId?: string;
    search?: string;
    active?: boolean;
    includeDetails?: boolean;
  }) {
    const where: any = { active };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (positionId) {
      where.positions = {
        some: {
          positionId,
          endDate: null, // Only current positions
        },
      };
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Generate cache key based on query parameters
    const cacheKey = `${this.CACHE_PREFIX}list:${JSON.stringify({
      skip, take, cursor, departmentId, positionId, search, active, includeDetails
    })}`;
    
    // Try to get from cache first
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    // Determine what to include based on the detail level requested
    const include: any = {
      department: true,
    };
    
    if (includeDetails) {
      include.positions = {
        include: {
          position: true,
        },
        where: {
          endDate: null, // Only current positions
        },
      };
      
      include.qualifications = {
        where: {
          OR: [
            { endDate: null }, // No end date
            { endDate: { gt: new Date() } }, // End date in future
          ],
        },
      };
    } else {
      // For list views, just include primary position
      include.positions = {
        include: {
          position: true,
        },
        where: {
          isPrimary: true,
          endDate: null, // Only current positions
        },
        take: 1,
      };
    }

    // Use cursor-based pagination if cursor is provided
    const cursorObj = cursor ? { id: cursor } : undefined;

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take,
        cursor: cursorObj,
        orderBy: { lastName: 'asc' },
        include,
      }),
      prisma.employee.count({ where }),
    ]);

    const result = {
      employees,
      total,
      skip,
      take,
      nextCursor: employees.length === take ? employees[employees.length - 1].id : null,
    };
    
    // Store in cache
    await cache.set(cacheKey, JSON.stringify(result), 300); // 5 minutes TTL for lists
    
    return result;
  }

  /**
   * Add a qualification to an employee
   */
  async addQualification(
    employeeId: string,
    data: {
      code: string;
      name: string;
      issuer?: string;
      identifier?: string;
      startDate: Date;
      endDate?: Date;
      attachment?: string;
    }
  ) {
    const result = await prisma.qualification.create({
      data: {
        employeeId,
        ...data,
      },
    });
    
    // Invalidate relevant caches
    await this.invalidateEmployeeCache(employeeId);
    
    return result;
  }

  /**
   * Update a qualification
   */
  async updateQualification(
    id: string,
    data: {
      code?: string;
      name?: string;
      issuer?: string;
      identifier?: string;
      startDate?: Date;
      endDate?: Date;
      attachment?: string;
    }
  ) {
    // First get the qualification to find the employee ID
    const qualification = await prisma.qualification.findUnique({
      where: { id },
      select: { employeeId: true },
    });
    
    const result = await prisma.qualification.update({
      where: { id },
      data,
    });
    
    // Invalidate relevant caches
    if (qualification) {
      await this.invalidateEmployeeCache(qualification.employeeId);
    }
    
    return result;
  }

  /**
   * Delete a qualification
   */
  async deleteQualification(id: string) {
    // First get the qualification to find the employee ID
    const qualification = await prisma.qualification.findUnique({
      where: { id },
      select: { employeeId: true },
    });
    
    const result = await prisma.qualification.delete({
      where: { id },
    });
    
    // Invalidate relevant caches
    if (qualification) {
      await this.invalidateEmployeeCache(qualification.employeeId);
    }
    
    return result;
  }

  /**
   * Assign a position to an employee
   */
  async assignPosition(
    employeeId: string,
    data: {
      positionId: string;
      isPrimary: boolean;
      startDate: Date;
      endDate?: Date;
    }
  ) {
    // If this is a primary position, update any existing primary positions to non-primary
    if (data.isPrimary) {
      await prisma.employeePosition.updateMany({
        where: {
          employeeId,
          isPrimary: true,
          endDate: null, // Only current positions
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const result = await prisma.employeePosition.create({
      data: {
        employeeId,
        ...data,
      },
      include: {
        position: true,
      },
    });
    
    // Invalidate relevant caches
    await this.invalidateEmployeeCache(employeeId);
    
    return result;
  }

  /**
   * Update a position assignment
   */
  async updatePositionAssignment(
    id: string,
    data: {
      isPrimary?: boolean;
      endDate?: Date;
    }
  ) {
    const positionAssignment = await prisma.employeePosition.findUnique({
      where: { id },
      select: { employeeId: true },
    });

    // If making this primary, update any existing primary positions to non-primary
    if (data.isPrimary) {
      await prisma.employeePosition.updateMany({
        where: {
          employeeId: positionAssignment?.employeeId,
          isPrimary: true,
          id: { not: id },
          endDate: null, // Only current positions
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const result = await prisma.employeePosition.update({
      where: { id },
      data,
      include: {
        position: true,
      },
    });
    
    // Invalidate relevant caches
    if (positionAssignment) {
      await this.invalidateEmployeeCache(positionAssignment.employeeId);
    }
    
    return result;
  }

  /**
   * End a position assignment
   */
  async endPositionAssignment(id: string, endDate: Date) {
    const positionAssignment = await prisma.employeePosition.findUnique({
      where: { id },
      select: { employeeId: true },
    });
    
    const result = await prisma.employeePosition.update({
      where: { id },
      data: {
        endDate,
        isPrimary: false, // No longer primary if ended
      },
    });
    
    // Invalidate relevant caches
    if (positionAssignment) {
      await this.invalidateEmployeeCache(positionAssignment.employeeId);
    }
    
    return result;
  }

  /**
   * Convert database employee to FHIR Practitioner
   * Updated to support FHIR R5 enhancements
   */
  toFhirPractitioner(employee: any): Practitioner {
    // Create the FHIR Practitioner resource
    const practitioner: Practitioner = {
      resourceType: "Practitioner", // Added for FHIR R5 compliance
      id: employee.id,
      meta: {
        profile: ["http://hl7.org/fhir/r5/StructureDefinition/Practitioner"]
      },
      identifier: [
        {
          use: 'official',
          system: 'http://hospital.example.org/employees',
          value: employee.employeeId,
        },
      ],
      active: employee.active,
      name: [
        {
          use: 'official',
          family: employee.lastName,
          given: [employee.firstName],
          prefix: employee.middleName ? [employee.middleName] : undefined,
        },
      ],
      telecom: [],
      address: [],
      gender: employee.gender?.toLowerCase() as any,
      birthDate: employee.birthDate?.toISOString().split('T')[0],
      qualification: [],
    };

    // Add contact information
    if (employee.email) {
      practitioner.telecom.push({
        system: 'email',
        value: employee.email,
        use: 'work',
      });
    }

    if (employee.phone) {
      practitioner.telecom.push({
        system: 'phone',
        value: employee.phone,
        use: 'work',
      });
    }

    // Add address if available
    if (employee.address) {
      practitioner.address.push({
        use: 'work',
        type: 'both',
        text: employee.address.text,
        line: employee.address.line,
        city: employee.address.city,
        state: employee.address.state,
        postalCode: employee.address.postalCode,
        country: employee.address.country,
      });
    }

    // Add photo if available
    if (employee.photo) {
      practitioner.photo = [
        {
          url: employee.photo,
          contentType: this.getContentType(employee.photo),
        },
      ];
    }

    // Add qualifications
    if (employee.qualifications && employee.qualifications.length > 0) {
      practitioner.qualification = employee.qualifications.map((qual: any) => ({
        identifier: qual.identifier
          ? [
              {
                system: 'http://hospital.example.org/qualifications',
                value: qual.identifier,
              },
            ]
          : undefined,
        code: {
          coding: [
            {
              system: 'http://hospital.example.org/qualification-codes',
              code: qual.code,
              display: qual.name,
            },
          ],
          text: qual.name,
        },
        period: {
          start: qual.startDate.toISOString(),
          end: qual.endDate?.toISOString(),
        },
        issuer: qual.issuer
          ? {
              display: qual.issuer,
            }
          : undefined,
      }));
    }

    return practitioner;
  }

  /**
   * Convert database employee position to FHIR PractitionerRole
   * Updated to support FHIR R5 enhancements
   */
  toFhirPractitionerRole(employee: any, position: any): PractitionerRole {
    // Create the FHIR PractitionerRole resource
    const practitionerRole: PractitionerRole = {
      resourceType: "PractitionerRole", // Added for FHIR R5 compliance
      id: position.id,
      meta: {
        profile: ["http://hl7.org/fhir/r5/StructureDefinition/PractitionerRole"]
      },
      identifier: [
        {
          system: 'http://hospital.example.org/positions',
          value: `${employee.employeeId}-${position.position.code}`,
        },
      ],
      active: position.endDate === null,
      period: {
        start: position.startDate.toISOString(),
        end: position.endDate?.toISOString(),
      },
      practitioner: {
        reference: `Practitioner/${employee.id}`,
        display: `${employee.firstName} ${employee.lastName}`,
      },
      organization: {
        reference: 'Organization/hospital',
        display: 'Example Hospital',
      },
      code: [
        {
          coding: [
            {
              system: 'http://hospital.example.org/position-codes',
              code: position.position.code,
              display: position.position.title,
            },
          ],
          text: position.position.title,
        },
      ],
      specialty: [],
      location: [],
      healthcareService: [],
      telecom: [],
      availableTime: [], // Added for FHIR R5 scheduling support
      notAvailable: [], // Added for FHIR R5 scheduling support
    };

    // Add department as specialty if available
    if (employee.department) {
      practitionerRole.specialty = [
        {
          coding: [
            {
              system: 'http://hospital.example.org/department-codes',
              code: employee.department.code,
              display: employee.department.name,
            },
          ],
          text: employee.department.name,
        },
      ];
    }

    // Add contact information
    if (employee.email) {
      practitionerRole.telecom.push({
        system: 'email',
        value: employee.email,
        use: 'work',
      });
    }

    if (employee.phone) {
      practitionerRole.telecom.push({
        system: 'phone',
        value: employee.phone,
        use: 'work',
      });
    }

    return practitionerRole;
  }
  
  /**
   * Get content type from file URL
   * Helper method for FHIR R5 compliance
   */
  private getContentType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }
  
  /**
   * Invalidate employee-related caches
   * @param employeeId Optional specific employee ID to invalidate
   */
  private async invalidateEmployeeCache(employeeId?: string) {
    if (employeeId) {
      // Get the employee to find all IDs
      const employee = await prisma.employee.findFirst({
        where: { id: employeeId },
        select: { id: true, employeeId: true }
      });
      
      if (employee) {
        // Invalidate specific employee caches
        await Promise.all([
          cache.del(`${this.CACHE_PREFIX}id:${employee.id}`),
          cache.del(`${this.CACHE_PREFIX}employeeId:${employee.employeeId}`)
        ]);
      }
    }
    
    // Invalidate list caches with pattern matching
    await cache.delPattern(`${this.CACHE_PREFIX}list:*`);
  }
  
  /**
   * Get employees with expiring qualifications
   * New method to support predictive alerts
   */
  async getEmployeesWithExpiringQualifications(daysThreshold: number = 30) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    
    return prisma.qualification.findMany({
      where: {
        endDate: {
          gte: new Date(),
          lte: thresholdDate
        }
      },
      include: {
        employee: {
          include: {
            department: true
          }
        }
      },
      orderBy: {
        endDate: 'asc'
      }
    });
  }
  
  /**
   * Predict staffing needs based on historical data
   * New method to support AI-driven workforce planning
   */
  async predictStaffingNeeds(departmentId: string, date: Date) {
    // This would integrate with an ML model in production
    // For now, we'll implement a simple algorithm based on historical patterns
    
    const dayOfWeek = date.getDay();
    const month = date.getMonth();
    
    // Get historical attendance data for this department on similar days
    const historicalData = await prisma.attendance.findMany({
      where: {
        employee: {
          departmentId
        },
        checkInTime: {
          gte: new Date(date.getFullYear() - 1, 0, 1) // Last year's data
        }
      },
      include: {
        employee: {
          include: {
            positions: {
              include: {
                position: true
              },
              where: {
                isPrimary: true
              }
            }
          }
        }
      }
    });
    
    // Group by position and day of week
    const positionDayStats: Record<string, Record<number, number>> = {};
    
    historicalData.forEach(record => {
      const recordDayOfWeek = new Date(record.checkInTime).getDay();
      const recordMonth = new Date(record.checkInTime).getMonth();
      const position = record.employee.positions[0]?.position.code || 'unknown';
      
      if (!positionDayStats[position]) {
        positionDayStats[position] = {};
      }
      
      if (!positionDayStats[position][recordDayOfWeek]) {
        positionDayStats[position][recordDayOfWeek] = 0;
      }
      
      positionDayStats[position][recordDayOfWeek]++;
    });
    
    // Calculate average staffing needs by position
    const staffingPrediction: Record<string, number> = {};
    
    Object.entries(positionDayStats).forEach(([position, dayStats]) => {
      const totalForDay = dayStats[dayOfWeek] || 0;
      const daysWithData = Object.values(dayStats).filter(count => count > 0).length;
      
      if (daysWithData > 0) {
        staffingPrediction[position] = Math.ceil(totalForDay / daysWithData);
      } else {
        staffingPrediction[position] = 0;
      }
    });
    
    // Get current staffing levels
    const currentStaffing = await prisma.employee.findMany({
      where: {
        departmentId,
        active: true,
        positions: {
          some: {
            endDate: null
          }
        }
      },
      include: {
        positions: {
          include: {
            position: true
          },
          where: {
            isPrimary: true
          }
        }
      }
    });
    
    // Calculate current staffing by position
    const currentStaffingByPosition: Record<string, number> = {};
    
    currentStaffing.forEach(employee => {
      const position = employee.positions[0]?.position.code || 'unknown';
      
      if (!currentStaffingByPosition[position]) {
        currentStaffingByPosition[position] = 0;
      }
      
      currentStaffingByPosition[position]++;
    });
    
    // Calculate staffing gaps
    const staffingGaps: Record<string, number> = {};
    
    Object.keys({...staffingPrediction, ...currentStaffingByPosition}).forEach(position => {
      const predicted = staffingPrediction[position] || 0;
      const current = currentStaffingByPosition[position] || 0;
      staffingGaps[position] = predicted - current;
    });
    
    return {
      date: date.toISOString(),
      departmentId,
      predicted: staffingPrediction,
      current: currentStaffingByPosition,
      gaps: staffingGaps
    };
  }
}

export const employeeService = new EmployeeService();
