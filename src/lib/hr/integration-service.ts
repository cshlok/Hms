import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/hr/auth-integration';

/**
 * Integration service for connecting HR & Asset Management with other HMS modules
 */
export class IntegrationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Get employee data for clinical module integration
   * This provides staff information to clinical modules for assignment
   */
  async getEmployeesForClinical() {
    return this.prisma.employee.findMany({
      where: {
        isActive: true,
        positions: {
          some: {
            endDate: null, // Current positions
            department: {
              type: 'CLINICAL'
            }
          }
        }
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        positions: {
          where: {
            endDate: null
          },
          select: {
            id: true,
            title: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        qualifications: {
          where: {
            expiryDate: {
              gt: new Date()
            }
          },
          select: {
            id: true,
            type: true,
            name: true,
            issuedBy: true,
            issuedDate: true,
            expiryDate: true
          }
        }
      }
    });
  }

  /**
   * Get biomedical equipment data for clinical module integration
   * This provides equipment information to clinical modules for usage
   */
  async getBiomedicalEquipmentForClinical() {
    return this.prisma.biomedicalEquipment.findMany({
      where: {
        asset: {
          status: 'AVAILABLE'
        }
      },
      select: {
        id: true,
        equipmentType: true,
        deviceIdentifier: true,
        regulatoryClass: true,
        riskLevel: true,
        lastCalibrationDate: true,
        nextCalibrationDate: true,
        asset: {
          select: {
            id: true,
            name: true,
            serialNumber: true,
            manufacturer: true,
            model: true,
            location: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get asset data for finance module integration
   * This provides asset information to finance modules for accounting
   */
  async getAssetsForFinance() {
    return this.prisma.asset.findMany({
      where: {
        status: {
          not: 'DISPOSED'
        }
      },
      select: {
        id: true,
        name: true,
        assetType: true,
        serialNumber: true,
        manufacturer: true,
        model: true,
        purchaseDate: true,
        purchasePrice: true,
        warrantyExpiryDate: true,
        location: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        status: true
      }
    });
  }

  /**
   * Get payroll data for finance module integration
   * This provides payroll information to finance modules for accounting
   */
  async getPayrollForFinance(periodId: string) {
    return this.prisma.payrollPeriod.findUnique({
      where: {
        id: periodId,
        status: 'PAID'
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        paymentDate: true,
        status: true,
        payrollEntries: {
          select: {
            id: true,
            employee: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                department: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
            baseSalary: true,
            grossSalary: true,
            deductions: true,
            netSalary: true,
            components: true
          }
        }
      }
    });
  }

  /**
   * Get employee attendance for scheduling module integration
   * This provides attendance information to scheduling modules
   */
  async getEmployeeAttendanceForScheduling(employeeId: string, startDate: Date, endDate: Date) {
    return this.prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
  }

  /**
   * Get employee leaves for scheduling module integration
   * This provides leave information to scheduling modules
   */
  async getEmployeeLeavesForScheduling(employeeId: string, startDate: Date, endDate: Date) {
    return this.prisma.leave.findMany({
      where: {
        employeeId,
        startDate: {
          lte: endDate
        },
        endDate: {
          gte: startDate
        },
        status: 'APPROVED'
      },
      orderBy: {
        startDate: 'asc'
      }
    });
  }

  /**
   * Update asset status from clinical module
   * This allows clinical modules to update equipment status
   */
  async updateAssetStatusFromClinical(assetId: string, status: 'AVAILABLE' | 'IN_USE' | 'UNDER_MAINTENANCE', notes?: string) {
    // Get current session for audit
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error('Unauthorized');
    }

    // Check if user has permission
    const hasPermission = session.user.roles.some(role => 
      ['ADMIN', 'CLINICAL_STAFF', 'DOCTOR', 'NURSE'].includes(role)
    );

    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }

    // Update asset status
    return this.prisma.asset.update({
      where: { id: assetId },
      data: {
        status,
        notes: notes ? `${notes}\nUpdated by: ${session.user.name} (${session.user.email})` : undefined,
        assetHistory: {
          create: {
            type: 'STATUS_CHANGE',
            date: new Date(),
            details: {
              previousStatus: 'UNKNOWN', // Will be replaced in service layer
              newStatus: status,
              notes,
              updatedBy: session.user.email,
              updatedByName: session.user.name,
              source: 'CLINICAL_MODULE'
            }
          }
        }
      }
    });
  }

  /**
   * Record maintenance from clinical module
   * This allows clinical modules to record equipment maintenance
   */
  async recordMaintenanceFromClinical(assetId: string, data: {
    maintenanceType: 'PREVENTIVE' | 'CORRECTIVE' | 'CALIBRATION' | 'INSPECTION';
    date: Date;
    performedBy?: string;
    cost?: number;
    description: string;
    nextMaintenanceDate?: Date;
  }) {
    // Get current session for audit
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error('Unauthorized');
    }

    // Check if user has permission
    const hasPermission = session.user.roles.some(role => 
      ['ADMIN', 'CLINICAL_STAFF', 'BIOMEDICAL_ENGINEER'].includes(role)
    );

    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }

    // Create maintenance record
    const maintenanceRecord = await this.prisma.maintenanceRecord.create({
      data: {
        assetId,
        maintenanceType: data.maintenanceType,
        date: data.date,
        performedBy: data.performedBy || `${session.user.name} (${session.user.email})`,
        cost: data.cost,
        description: data.description,
        nextMaintenanceDate: data.nextMaintenanceDate,
      },
    });

    // Create history record
    await this.prisma.assetHistory.create({
      data: {
        assetId,
        type: 'MAINTENANCE',
        date: new Date(),
        details: {
          maintenanceRecordId: maintenanceRecord.id,
          maintenanceType: data.maintenanceType,
          description: data.description,
          source: 'CLINICAL_MODULE',
          updatedBy: session.user.email,
          updatedByName: session.user.name
        },
        employeeId: session.user.employeeId || null,
      },
    });

    // Update asset status
    await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        status: 'AVAILABLE',
        lastMaintenanceDate: data.date,
        nextMaintenanceDate: data.nextMaintenanceDate,
      },
    });

    return maintenanceRecord;
  }

  /**
   * Get departments for all modules
   * This provides department information to all modules
   */
  async getDepartmentsForAllModules() {
    return this.prisma.department.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        parentDepartmentId: true,
        parentDepartment: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }
}

export const integrationService = new IntegrationService();
