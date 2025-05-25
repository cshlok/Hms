import { NextRequest, NextResponse } from 'next/server';
import { attendanceService } from '@/lib/hr/attendance-service';
import { z } from 'zod';

// Schema for check-in request
const checkInSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid date format"
  }),
  checkInTime: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid time format"
  }),
  biometricData: z.string().optional(),
  notes: z.string().optional(),
});

// POST handler for check-in
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = checkInSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { employeeId, date, checkInTime, biometricData, notes } = validationResult.data;
    
    // Verify biometric data if provided
    let biometricVerified = false;
    if (biometricData) {
      biometricVerified = await attendanceService.verifyBiometric(employeeId, biometricData);
      if (!biometricVerified) {
        return NextResponse.json(
          { error: "Biometric verification failed" },
          { status: 401 }
        );
      }
    }
    
    // Record check-in
    const attendance = await attendanceService.recordCheckIn({
      employeeId,
      date: new Date(date),
      checkInTime: new Date(checkInTime),
      biometricVerified,
      notes,
    });
    
    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Error recording check-in:", error);
    return NextResponse.json(
      { error: "Failed to record check-in", details: error.message },
      { status: 500 }
    );
  }
}

// GET handler for attendance records
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse pagination parameters
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '10');
    
    // Parse filter parameters
    const date = searchParams.get('date') ? new Date(searchParams.get('date')) : undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')) : undefined;
    const departmentId = searchParams.get('departmentId') || undefined;
    const status = searchParams.get('status') as any || undefined;
    const biometricVerified = searchParams.get('biometricVerified') 
      ? searchParams.get('biometricVerified') === 'true' 
      : undefined;
    
    // Get attendance records
    const result = await attendanceService.listAttendance({
      skip,
      take,
      date,
      startDate,
      endDate,
      departmentId,
      status,
      biometricVerified,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance records", details: error.message },
      { status: 500 }
    );
  }
}
