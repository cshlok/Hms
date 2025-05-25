import { NextRequest, NextResponse } from 'next/server';
import { assetService } from '@/lib/hr/asset-service';
import { z } from 'zod';

// Schema for maintenance record
const maintenanceSchema = z.object({
  maintenanceType: z.enum(['PREVENTIVE', 'CORRECTIVE', 'CALIBRATION', 'INSPECTION'], {
    errorMap: () => ({ message: "Invalid maintenance type" })
  }),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid date format"
  }),
  performedBy: z.string().optional(),
  cost: z.number().optional(),
  description: z.string().min(1, "Description is required"),
  nextMaintenanceDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "Invalid date format"
  }),
});

// POST handler for recording maintenance
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = maintenanceSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Convert date strings to Date objects
    const maintenanceData = {
      assetId: params.id,
      maintenanceType: data.maintenanceType,
      date: new Date(data.date),
      performedBy: data.performedBy,
      cost: data.cost,
      description: data.description,
      nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : undefined,
    };
    
    // Record maintenance
    const maintenanceRecord = await assetService.recordMaintenance(maintenanceData);
    
    return NextResponse.json(maintenanceRecord);
  } catch (error) {
    console.error("Error recording maintenance:", error);
    return NextResponse.json(
      { error: "Failed to record maintenance", details: error.message },
      { status: 500 }
    );
  }
}

// GET handler for listing maintenance records
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const asset = await assetService.getAsset(params.id);
    
    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(asset.maintenanceRecords || []);
  } catch (error) {
    console.error("Error fetching maintenance records:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance records", details: error.message },
      { status: 500 }
    );
  }
}
