import { NextRequest, NextResponse } from 'next/server';
import { biomedicalService } from '@/lib/hr/biomedical-service';
import { z } from 'zod';

// Schema for calibration record
const calibrationSchema = z.object({
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid date format"
  }),
  performedBy: z.string().optional(),
  result: z.enum(['PASS', 'FAIL', 'ADJUSTED'], {
    errorMap: () => ({ message: "Invalid result" })
  }),
  notes: z.string().optional(),
  nextCalibrationDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "Invalid date format"
  }),
  attachments: z.array(z.string()).optional(),
});

// POST handler for recording calibration
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = calibrationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Convert date strings to Date objects
    const calibrationData = {
      biomedicalEquipmentId: params.id,
      date: new Date(data.date),
      performedBy: data.performedBy,
      result: data.result,
      notes: data.notes,
      nextCalibrationDate: data.nextCalibrationDate ? new Date(data.nextCalibrationDate) : undefined,
      attachments: data.attachments,
    };
    
    // Record calibration
    const calibrationRecord = await biomedicalService.recordCalibration(calibrationData);
    
    return NextResponse.json(calibrationRecord);
  } catch (error) {
    console.error("Error recording calibration:", error);
    return NextResponse.json(
      { error: "Failed to record calibration", details: error.message },
      { status: 500 }
    );
  }
}

// GET handler for listing calibration records
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const calibrationRecords = await biomedicalService.getCalibrationRecords(params.id);
    
    return NextResponse.json(calibrationRecords);
  } catch (error) {
    console.error("Error fetching calibration records:", error);
    return NextResponse.json(
      { error: "Failed to fetch calibration records", details: error.message },
      { status: 500 }
    );
  }
}
