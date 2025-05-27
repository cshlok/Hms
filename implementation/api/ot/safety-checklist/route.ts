/**
 * Surgical Safety Checklist API
 * 
 * This file implements the API endpoints for managing surgical safety checklists,
 * including WHO-compliant checklists with specialty-specific adaptations.
 * 
 * FHIR Compliance: Uses QuestionnaireResponse resource for surgical safety checklists
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';
import { getWHOChecklistTemplate } from '@/lib/ot/checklist-templates';

// Validation schema for creating a new checklist
const createChecklistSchema = z.object({
  scheduleId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  checklistType: z.enum(['Pre-Op', 'Time-Out', 'Sign-Out']),
  items: z.array(z.object({
    itemId: z.string(),
    question: z.string(),
    response: z.boolean().or(z.string()),
    notes: z.string().optional(),
  })),
  completedById: z.string().uuid().optional(),
  witnessedById: z.string().uuid().optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/ot/safety-checklist
 * 
 * Creates a new surgical safety checklist for a scheduled operation.
 * 
 * @param request - The incoming request object
 * @returns The newly created surgical safety checklist
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_CREATE_SAFETY_CHECKLIST')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = createChecklistSchema.safeParse({
      ...body,
      completedById: body.completedById || session.user.id,
    });
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const checklistData = validationResult.data;
    
    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if the schedule exists
      const schedule = await tx.otSchedule.findUnique({
        where: { id: checklistData.scheduleId },
        include: {
          patient: true,
          surgeryType: true,
        },
      });
      
      if (!schedule) {
        throw new Error('Schedule not found');
      }
      
      // Check if a checklist of this type already exists for this schedule
      const existingChecklist = await tx.surgicalSafetyChecklist.findFirst({
        where: {
          scheduleId: checklistData.scheduleId,
          checklistType: checklistData.checklistType,
        },
      });
      
      if (existingChecklist) {
        throw new Error(`A ${checklistData.checklistType} checklist already exists for this schedule`);
      }
      
      // Create the checklist
      const checklist = await tx.surgicalSafetyChecklist.create({
        data: {
          scheduleId: checklistData.scheduleId,
          templateId: checklistData.templateId,
          checklistType: checklistData.checklistType,
          items: JSON.stringify(checklistData.items),
          completedById: checklistData.completedById,
          witnessedById: checklistData.witnessedById,
          notes: checklistData.notes,
        },
        include: {
          schedule: {
            include: {
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              surgeryType: true,
            },
          },
          completedBy: {
            select: {
              id: true,
              name: true,
            },
          },
          witnessedBy: checklistData.witnessedById ? {
            select: {
              id: true,
              name: true,
            },
          } : undefined,
        },
      });
      
      // Update schedule status based on checklist type
      if (checklistData.checklistType === 'Pre-Op') {
        await tx.otSchedule.update({
          where: { id: checklistData.scheduleId },
          data: {
            preOpChecklistCompleted: true,
          },
        });
      } else if (checklistData.checklistType === 'Sign-Out') {
        await tx.otSchedule.update({
          where: { id: checklistData.scheduleId },
          data: {
            status: 'Completed',
            actualEnd: new Date(),
          },
        });
      }
      
      return checklist;
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_SAFETY_CHECKLIST_CREATE',
      'SurgicalSafetyChecklist',
      result.id,
      { 
        checklistId: result.id,
        scheduleId: checklistData.scheduleId,
        checklistType: checklistData.checklistType,
      }
    );
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating safety checklist:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/ot/safety-checklist/[scheduleId]
 * 
 * Retrieves all safety checklists for a specific scheduled operation.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the schedule ID
 * @returns List of safety checklists for the scheduled operation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_VIEW_SAFETY_CHECKLISTS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { scheduleId } = params;
    
    // Check if the schedule exists
    const schedule = await prisma.otSchedule.findUnique({
      where: { id: scheduleId },
    });
    
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    
    // Fetch all checklists for the schedule
    const checklists = await prisma.surgicalSafetyChecklist.findMany({
      where: { scheduleId },
      include: {
        completedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        witnessedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_SAFETY_CHECKLISTS_VIEW',
      'OtSchedule',
      scheduleId,
      { scheduleId }
    );
    
    return NextResponse.json(checklists);
  } catch (error) {
    console.error('Error fetching safety checklists:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/ot/safety-checklist/template/[surgeryTypeId]
 * 
 * Retrieves a safety checklist template for a specific surgery type.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the surgery type ID
 * @returns Safety checklist template for the surgery type
 */
export async function GET_template(
  request: NextRequest,
  { params }: { params: { surgeryTypeId: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_VIEW_CHECKLIST_TEMPLATES')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { surgeryTypeId } = params;
    
    // Check if the surgery type exists
    const surgeryType = await prisma.surgeryType.findUnique({
      where: { id: surgeryTypeId },
    });
    
    if (!surgeryType) {
      return NextResponse.json({ error: 'Surgery type not found' }, { status: 404 });
    }
    
    // Get the checklist template for this surgery type
    const template = await prisma.checklistTemplate.findFirst({
      where: { surgeryTypeId },
    });
    
    // If no specific template exists, return the standard WHO checklist
    if (!template) {
      const whoTemplate = getWHOChecklistTemplate();
      
      // Log audit event
      await logAuditEvent(
        session.user.id,
        'OT_CHECKLIST_TEMPLATE_VIEW',
        'ChecklistTemplate',
        null,
        { surgeryTypeId, templateType: 'WHO Standard' }
      );
      
      return NextResponse.json({
        id: null,
        name: 'WHO Surgical Safety Checklist',
        surgeryTypeId,
        template: whoTemplate,
        isDefault: true,
      });
    }
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_CHECKLIST_TEMPLATE_VIEW',
      'ChecklistTemplate',
      template.id,
      { templateId: template.id, surgeryTypeId }
    );
    
    return NextResponse.json({
      ...template,
      isDefault: false,
    });
  } catch (error) {
    console.error('Error fetching checklist template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for creating a new checklist template
const createTemplateSchema = z.object({
  name: z.string(),
  surgeryTypeId: z.string().uuid(),
  template: z.object({
    preOp: z.array(z.object({
      itemId: z.string(),
      question: z.string(),
      required: z.boolean().optional(),
    })),
    timeOut: z.array(z.object({
      itemId: z.string(),
      question: z.string(),
      required: z.boolean().optional(),
    })),
    signOut: z.array(z.object({
      itemId: z.string(),
      question: z.string(),
      required: z.boolean().optional(),
    })),
  }),
});

/**
 * POST /api/ot/safety-checklist/template
 * 
 * Creates a new safety checklist template.
 * 
 * @param request - The incoming request object
 * @returns The newly created safety checklist template
 */
export async function POST_template(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_CREATE_CHECKLIST_TEMPLATE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = createTemplateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const templateData = validationResult.data;
    
    // Check if the surgery type exists
    const surgeryType = await prisma.surgeryType.findUnique({
      where: { id: templateData.surgeryTypeId },
    });
    
    if (!surgeryType) {
      return NextResponse.json({ error: 'Surgery type not found' }, { status: 404 });
    }
    
    // Check if a template already exists for this surgery type
    const existingTemplate = await prisma.checklistTemplate.findFirst({
      where: { surgeryTypeId: templateData.surgeryTypeId },
    });
    
    if (existingTemplate) {
      return NextResponse.json({ error: 'A template already exists for this surgery type' }, { status: 409 });
    }
    
    // Create the template
    const template = await prisma.checklistTemplate.create({
      data: {
        name: templateData.name,
        surgeryTypeId: templateData.surgeryTypeId,
        template: JSON.stringify(templateData.template),
        createdById: session.user.id,
      },
      include: {
        surgeryType: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_CHECKLIST_TEMPLATE_CREATE',
      'ChecklistTemplate',
      template.id,
      { 
        templateId: template.id,
        surgeryTypeId: templateData.surgeryTypeId,
      }
    );
    
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating checklist template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/ot/safety-checklist/compliance
 * 
 * Retrieves compliance statistics for surgical safety checklists.
 * 
 * @param request - The incoming request object
 * @returns Compliance statistics for surgical safety checklists
 */
export async function GET_compliance(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_VIEW_COMPLIANCE_REPORTS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate') ? new Date(url.searchParams.get('startDate')) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
    const endDate = url.searchParams.get('endDate') ? new Date(url.searchParams.get('endDate')) : new Date();
    
    // Get all completed surgeries in the date range
    const completedSurgeries = await prisma.otSchedule.count({
      where: {
        status: 'Completed',
        actualEnd: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    
    // Get surgeries with all three checklists completed
    const fullCompliance = await prisma.otSchedule.count({
      where: {
        status: 'Completed',
        actualEnd: {
          gte: startDate,
          lte: endDate,
        },
        safetyChecklists: {
          some: {
            checklistType: 'Pre-Op',
          },
        },
        AND: [
          {
            safetyChecklists: {
              some: {
                checklistType: 'Time-Out',
              },
            },
          },
          {
            safetyChecklists: {
              some: {
                checklistType: 'Sign-Out',
              },
            },
          },
        ],
      },
    });
    
    // Get surgeries with at least one checklist completed
    const partialCompliance = await prisma.otSchedule.count({
      where: {
        status: 'Completed',
        actualEnd: {
          gte: startDate,
          lte: endDate,
        },
        safetyChecklists: {
          some: {},
        },
        NOT: [
          {
            safetyChecklists: {
              some: {
                checklistType: 'Pre-Op',
              },
            },
            AND: [
              {
                safetyChecklists: {
                  some: {
                    checklistType: 'Time-Out',
                  },
                },
              },
              {
                safetyChecklists: {
                  some: {
                    checklistType: 'Sign-Out',
                  },
                },
              },
            ],
          },
        ],
      },
    });
    
    // Get surgeries with no checklists completed
    const nonCompliance = await prisma.otSchedule.count({
      where: {
        status: 'Completed',
        actualEnd: {
          gte: startDate,
          lte: endDate,
        },
        safetyChecklists: {
          none: {},
        },
      },
    });
    
    // Get compliance by checklist type
    const preOpCompliance = await prisma.otSchedule.count({
      where: {
        status: 'Completed',
        actualEnd: {
          gte: startDate,
          lte: endDate,
        },
        safetyChecklists: {
          some: {
            checklistType: 'Pre-Op',
          },
        },
      },
    });
    
    const timeOutCompliance = await prisma.otSchedule.count({
      where: {
        status: 'Completed',
        actualEnd: {
          gte: startDate,
          lte: endDate,
        },
        safetyChecklists: {
          some: {
            checklistType: 'Time-Out',
          },
        },
      },
    });
    
    const signOutCompliance = await prisma.otSchedule.count({
      where: {
        status: 'Completed',
        actualEnd: {
          gte: startDate,
          lte: endDate,
        },
        safetyChecklists: {
          some: {
            checklistType: 'Sign-Out',
          },
        },
      },
    });
    
    // Calculate compliance percentages
    const fullComplianceRate = completedSurgeries > 0 ? (fullCompliance / completedSurgeries) * 100 : 0;
    const partialComplianceRate = completedSurgeries > 0 ? (partialCompliance / completedSurgeries) * 100 : 0;
    const nonComplianceRate = completedSurgeries > 0 ? (nonCompliance / completedSurgeries) * 100 : 0;
    
    const preOpComplianceRate = completedSurgeries > 0 ? (preOpCompliance / completedSurgeries) * 100 : 0;
    const timeOutComplianceRate = completedSurgeries > 0 ? (timeOutCompliance / completedSurgeries) * 100 : 0;
    const signOutComplianceRate = completedSurgeries > 0 ? (signOutCompliance / completedSurgeries) * 100 : 0;
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_COMPLIANCE_REPORT_VIEW',
      'SurgicalSafetyChecklist',
      null,
      { dateRange: { startDate, endDate } }
    );
    
    return NextResponse.json({
      period: {
        startDate,
        endDate,
      },
      totalSurgeries: completedSurgeries,
      overallCompliance: {
        full: {
          count: fullCompliance,
          percentage: parseFloat(fullComplianceRate.toFixed(2)),
        },
        partial: {
          count: partialCompliance,
          percentage: parseFloat(partialComplianceRate.toFixed(2)),
        },
        none: {
          count: nonCompliance,
          percentage: parseFloat(nonComplianceRate.toFixed(2)),
        },
      },
      checklistCompliance: {
        preOp: {
          count: preOpCompliance,
          percentage: parseFloat(preOpComplianceRate.toFixed(2)),
        },
        timeOut: {
          count: timeOutCompliance,
          percentage: parseFloat(timeOutComplianceRate.toFixed(2)),
        },
        signOut: {
          count: signOutCompliance,
          percentage: parseFloat(signOutComplianceRate.toFixed(2)),
        },
      },
    });
  } catch (error) {
    console.error('Error generating compliance report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
