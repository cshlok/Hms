import { NextRequest, NextResponse } from 'next/server';
import { biometricService } from '@/lib/hr/biometric-service';
import { z } from 'zod';

// Schema for biometric template registration
const biometricTemplateSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  templateType: z.enum(['FINGERPRINT', 'FACIAL', 'IRIS'], {
    errorMap: () => ({ message: "Template type must be FINGERPRINT, FACIAL, or IRIS" })
  }),
  templateData: z.string().min(1, "Template data is required"),
  deviceId: z.string().optional(),
  notes: z.string().optional(),
});

// POST handler for registering biometric template
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = biometricTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Register biometric template
    const template = await biometricService.registerBiometricTemplate(validationResult.data);
    
    return NextResponse.json(template);
  } catch (error) {
    console.error("Error registering biometric template:", error);
    return NextResponse.json(
      { error: "Failed to register biometric template", details: error.message },
      { status: 500 }
    );
  }
}

// GET handler for employee biometric templates
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    
    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }
    
    const templates = await biometricService.getEmployeeBiometricTemplates(employeeId);
    
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching biometric templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch biometric templates", details: error.message },
      { status: 500 }
    );
  }
}
