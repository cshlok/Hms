import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Service for managing attendance records and biometric verification
 */
export class AttendanceService {
  /**
   * Record employee check-in
   */
  async recordCheckIn(data: {
    employeeId: string;
    date: Date;
    checkInTime: Date;
    biometricVerified: boolean;
    notes?: string;
  }) {
    const { employeeId, date, checkInTime, biometricVerified, notes } = data;
    
    // Format date to remove time component for unique constraint
    const formattedDate = new Date(date);
    formattedDate.setHours(0, 0, 0, 0);
    
    // Check if attendance record already exists for this employee and date
    const existingRecord = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: formattedDate,
        },
      },
    });
    
    if (existingRecord) {
      // Update existing record with check-in time
      return prisma.attendance.update({
        where: {
          id: existingRecord.id,
        },
        data: {
          checkInTime,
          biometricVerified,
          notes,
          status: this.determineAttendanceStatus(checkInTime, null),
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              employeeId: true,
            },
          },
        },
      });
    } else {
      // Create new attendance record
      return prisma.attendance.create({
        data: {
          employeeId,
          date: formattedDate,
          checkInTime,
          biometricVerified,
          notes,
          status: this.determineAttendanceStatus(checkInTime, null),
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              employeeId: true,
            },
          },
        },
      });
    }
  }
  
  /**
   * Record employee check-out
   */
  async recordCheckOut(data: {
    employeeId: string;
    date: Date;
    checkOutTime: Date;
    biometricVerified: boolean;
    notes?: string;
  }) {
    const { employeeId, date, checkOutTime, biometricVerified, notes } = data;
    
    // Format date to remove time component for unique constraint
    const formattedDate = new Date(date);
    formattedDate.setHours(0, 0, 0, 0);
    
    // Find attendance record for this employee and date
    const existingRecord = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: formattedDate,
        },
      },
    });
    
    if (!existingRecord) {
      throw new Error('No check-in record found for this date');
    }
    
    // Update record with check-out time
    return prisma.attendance.update({
      where: {
        id: existingRecord.id,
      },
      data: {
        checkOutTime,
        biometricVerified: existingRecord.biometricVerified || biometricVerified,
        notes: notes ? (existingRecord.notes ? `${existingRecord.notes}; ${notes}` : notes) : existingRecord.notes,
        status: this.determineAttendanceStatus(existingRecord.checkInTime, checkOutTime),
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });
  }
  
  /**
   * Get attendance record by ID
   */
  async getAttendanceById(id: string) {
    return prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
          },
        },
      },
    });
  }
  
  /**
   * Get attendance records for an employee
   */
  async getEmployeeAttendance(employeeId: string, startDate?: Date, endDate?: Date) {
    const where: any = { employeeId };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startDate;
      }
      if (endDate) {
        where.date.lte = endDate;
      }
    }
    
    return prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });
  }
  
  /**
   * List attendance records with filtering and pagination
   */
  async listAttendance({
    skip = 0,
    take = 10,
    date,
    startDate,
    endDate,
    departmentId,
    status,
    biometricVerified,
  }: {
    skip?: number;
    take?: number;
    date?: Date;
    startDate?: Date;
    endDate?: Date;
    departmentId?: string;
    status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
    biometricVerified?: boolean;
  }) {
    const where: any = {};
    
    // Date filters
    if (date) {
      const formattedDate = new Date(date);
      formattedDate.setHours(0, 0, 0, 0);
      where.date = formattedDate;
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startDate;
      }
      if (endDate) {
        where.date.lte = endDate;
      }
    }
    
    // Department filter
    if (departmentId) {
      where.employee = {
        departmentId,
      };
    }
    
    // Status filter
    if (status) {
      where.status = status;
    }
    
    // Biometric verification filter
    if (biometricVerified !== undefined) {
      where.biometricVerified = biometricVerified;
    }
    
    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take,
        orderBy: [
          { date: 'desc' },
          { checkInTime: 'desc' },
        ],
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              department: true,
            },
          },
        },
      }),
      prisma.attendance.count({ where }),
    ]);
    
    return {
      records,
      total,
      skip,
      take,
    };
  }
  
  /**
   * Update attendance record
   */
  async updateAttendance(
    id: string,
    data: {
      checkInTime?: Date;
      checkOutTime?: Date;
      status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
      biometricVerified?: boolean;
      notes?: string;
    }
  ) {
    // If both check-in and check-out times are provided, determine status
    let status = data.status;
    if (data.checkInTime && data.checkOutTime && !status) {
      status = this.determineAttendanceStatus(data.checkInTime, data.checkOutTime);
    }
    
    return prisma.attendance.update({
      where: { id },
      data: {
        ...data,
        status,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
          },
        },
      },
    });
  }
  
  /**
   * Mark employee as absent
   */
  async markAbsent(data: {
    employeeId: string;
    date: Date;
    notes?: string;
  }) {
    const { employeeId, date, notes } = data;
    
    // Format date to remove time component for unique constraint
    const formattedDate = new Date(date);
    formattedDate.setHours(0, 0, 0, 0);
    
    // Check if attendance record already exists for this employee and date
    const existingRecord = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: formattedDate,
        },
      },
    });
    
    if (existingRecord) {
      // Update existing record
      return prisma.attendance.update({
        where: {
          id: existingRecord.id,
        },
        data: {
          status: 'ABSENT',
          notes: notes ? (existingRecord.notes ? `${existingRecord.notes}; ${notes}` : notes) : existingRecord.notes,
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              employeeId: true,
            },
          },
        },
      });
    } else {
      // Create new attendance record
      return prisma.attendance.create({
        data: {
          employeeId,
          date: formattedDate,
          status: 'ABSENT',
          notes,
          biometricVerified: false,
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              employeeId: true,
            },
          },
        },
      });
    }
  }
  
  /**
   * Get attendance statistics for a department
   */
  async getDepartmentAttendanceStats(departmentId: string, startDate: Date, endDate: Date) {
    // Get all employees in the department
    const employees = await prisma.employee.findMany({
      where: {
        departmentId,
        active: true,
      },
      select: {
        id: true,
      },
    });
    
    const employeeIds = employees.map(emp => emp.id);
    
    // Get attendance records for these employees in the date range
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        employeeId: {
          in: employeeIds,
        },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    
    // Calculate statistics
    const totalEmployees = employeeIds.length;
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalPossibleAttendance = totalEmployees * totalDays;
    
    const presentCount = attendanceRecords.filter(record => record.status === 'PRESENT').length;
    const lateCount = attendanceRecords.filter(record => record.status === 'LATE').length;
    const absentCount = attendanceRecords.filter(record => record.status === 'ABSENT').length;
    const halfDayCount = attendanceRecords.filter(record => record.status === 'HALF_DAY').length;
    const onLeaveCount = attendanceRecords.filter(record => record.status === 'ON_LEAVE').length;
    
    // Calculate percentages
    const presentPercentage = (presentCount / totalPossibleAttendance) * 100;
    const latePercentage = (lateCount / totalPossibleAttendance) * 100;
    const absentPercentage = (absentCount / totalPossibleAttendance) * 100;
    const halfDayPercentage = (halfDayCount / totalPossibleAttendance) * 100;
    const onLeavePercentage = (onLeaveCount / totalPossibleAttendance) * 100;
    
    return {
      departmentId,
      startDate,
      endDate,
      totalEmployees,
      totalDays,
      totalPossibleAttendance,
      presentCount,
      lateCount,
      absentCount,
      halfDayCount,
      onLeaveCount,
      presentPercentage,
      latePercentage,
      absentPercentage,
      halfDayPercentage,
      onLeavePercentage,
    };
  }
  
  /**
   * Verify biometric data
   * This is a placeholder for actual biometric verification logic
   */
  async verifyBiometric(employeeId: string, biometricData: string): Promise<boolean> {
    // In a real implementation, this would:
    // 1. Retrieve the employee's stored biometric template
    // 2. Compare the provided biometric data with the stored template
    // 3. Return true if the match is above a certain threshold
    
    // For demonstration purposes, we'll simulate verification
    // In production, this would integrate with a biometric verification service
    
    // Simulate 95% success rate for verification
    const randomSuccess = Math.random() < 0.95;
    
    // Log the verification attempt
    await prisma.auditLog.create({
      data: {
        userId: null,
        eventType: 'BIOMETRIC_VERIFICATION',
        details: {
          employeeId,
          success: randomSuccess,
          timestamp: new Date(),
        },
      },
    });
    
    return randomSuccess;
  }
  
  /**
   * Determine attendance status based on check-in and check-out times
   * This is a simplified implementation and would be more complex in a real system
   */
  private determineAttendanceStatus(
    checkInTime: Date | null,
    checkOutTime: Date | null
  ): 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' {
    if (!checkInTime) {
      return 'ABSENT';
    }
    
    // Define standard work hours (e.g., 9:00 AM to 5:00 PM)
    const workStartHour = 9;
    const workEndHour = 17;
    
    // Check if employee is late (more than 15 minutes after start time)
    const checkInHour = checkInTime.getHours();
    const checkInMinute = checkInTime.getMinutes();
    const isLate = checkInHour > workStartHour || (checkInHour === workStartHour && checkInMinute > 15);
    
    // If check-out time is provided, calculate total hours worked
    if (checkOutTime) {
      const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      
      // If worked less than half a day (4 hours), mark as half-day
      if (hoursWorked < 4) {
        return 'HALF_DAY';
      }
    }
    
    // If check-in is late, mark as late
    if (isLate) {
      return 'LATE';
    }
    
    // Otherwise, mark as present
    return 'PRESENT';
  }
}

export const attendanceService = new AttendanceService();
