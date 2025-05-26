import { NextRequest, NextResponse } from 'next/server';
import { salaryService } from '@/lib/hr/salary-service';
import { z } from 'zod';

// Schema for salary structure creation
const salaryStructureSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  components: z.array(
    z.object({
      name: z.string().min(1, "Component name is required"),
      type: z.enum(['EARNING', 'DEDUCTION', 'TAX'], {
        errorMap: () => ({ message: "Type must be EARNING, DEDUCTION, or TAX" })
      }),
      calculationType: z.enum(['FIXED', 'PERCENTAGE', 'FORMULA'], {
        errorMap: () => ({ message: "Calculation type must be FIXED, PERCENTAGE, or FORMULA" })
      }),
      value: z.number(),
      formula: z.string().optional(),
      taxable: z.boolean(),
      isBase: z.boolean().optional(),
    })
  ).min(1, "At least one component is required"),
});

// POST handler for creating salary structure
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = salaryStructureSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Create salary structure
    const salaryStructure = await salaryService.createSalaryStructure(validationResult.data);
    
    return NextResponse.json(salaryStructure);
  } catch (error) {
    console.error("Error creating salary structure:", error);
    return NextResponse.json(
      { error: "Failed to create salary structure", details: error.message },
      { status: 500 }
    );
  }
}

// GET handler for listing salary structures
export async function GET(request: NextRequest) {
  try {
    const salaryStructures = await salaryService.listSalaryStructures();
    
    return NextResponse.json({ salaryStructures });
  } catch (error) {
    console.error("Error fetching salary structures:", error);
    return NextResponse.json(
      { error: "Failed to fetch salary structures", details: error.message },
      { status: 500 }
    );
  }
}
