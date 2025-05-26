import { NextRequest, NextResponse } from 'next/server';
import { payrollService } from '@/lib/hr/payroll-service';
import { z } from 'zod';

// Schema for payroll period creation
const payrollPeriodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid start date format"
  }),
  endDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid end date format"
  }),
  paymentDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid payment date format"
  }),
  notes: z.string().optional(),
});

// POST handler for creating payroll period
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = payrollPeriodSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { name, startDate, endDate, paymentDate, notes } = validationResult.data;
    
    // Create payroll period
    const payrollPeriod = await payrollService.createPayrollPeriod({
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      paymentDate: new Date(paymentDate),
      status: 'DRAFT',
      notes,
    });
    
    return NextResponse.json(payrollPeriod);
  } catch (error) {
    console.error("Error creating payroll period:", error);
    return NextResponse.json(
      { error: "Failed to create payroll period", details: error.message },
      { status: 500 }
    );
  }
}

// GET handler for listing payroll periods
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse pagination parameters
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '10');
    
    // Parse filter parameters
    const status = searchParams.get('status') as any || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')) : undefined;
    
    // Get payroll periods
    const result = await payrollService.listPayrollPeriods({
      skip,
      take,
      status,
      startDate,
      endDate,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching payroll periods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payroll periods", details: error.message },
      { status: 500 }
    );
  }
}
