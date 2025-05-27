/**
 * Surgical Documentation API
 * 
 * This file implements the API endpoints for managing surgical notes and documentation,
 * including templates, structured operative notes, and procedure-specific documentation.
 * 
 * FHIR Compliance: Uses Composition and DocumentReference resources for surgical documentation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';
import { encryptSensitiveData } from '@/lib/encryption';

// Validation schema for creating a new surgical note
const createSurgicalNoteSchema = z.object({
  scheduleId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  noteType: z.enum(['Pre-Op', 'Intra-Op', 'Post-Op']),
  content: z.string(),
});

/**
 * POST /api/ot/surgical-notes
 * 
 * Creates a new surgical note for a scheduled operation.
 * 
 * @param request - The incoming request object
 * @returns The newly created surgical note
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_CREATE_SURGICAL_NOTE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = createSurgicalNoteSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const { scheduleId, templateId, noteType, content } = validationResult.data;
    
    // Check if the schedule exists
    const schedule = await prisma.otSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        patient: true,
        surgeryType: true,
      },
    });
    
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    
    // If template ID is provided, check if it exists
    if (templateId) {
      const template = await prisma.surgicalNoteTemplate.findUnique({
        where: { id: templateId },
      });
      
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
    }
    
    // Encrypt sensitive data if needed
    const encryptedContent = await encryptSensitiveData({ content });
    
    // Create the surgical note
    const surgicalNote = await prisma.surgicalNote.create({
      data: {
        scheduleId,
        templateId,
        noteType,
        content: encryptedContent.content,
        authorId: session.user.id,
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
        template: true,
        author: {
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
      'OT_SURGICAL_NOTE_CREATE',
      'SurgicalNote',
      surgicalNote.id,
      { 
        scheduleId,
        noteType,
        templateId: templateId || null,
      }
    );
    
    return NextResponse.json(surgicalNote, { status: 201 });
  } catch (error) {
    console.error('Error creating surgical note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/ot/surgical-notes/[scheduleId]
 * 
 * Retrieves all surgical notes for a specific scheduled operation.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the schedule ID
 * @returns List of surgical notes for the scheduled operation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_VIEW_SURGICAL_NOTES')) {
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
    
    // Fetch all surgical notes for the schedule
    const surgicalNotes = await prisma.surgicalNote.findMany({
      where: { scheduleId },
      include: {
        template: true,
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_SURGICAL_NOTES_VIEW',
      'OtSchedule',
      scheduleId,
      { scheduleId }
    );
    
    return NextResponse.json(surgicalNotes);
  } catch (error) {
    console.error('Error fetching surgical notes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for creating a new surgical note template
const createTemplateSchema = z.object({
  name: z.string(),
  surgeryTypeId: z.string().uuid(),
  noteType: z.enum(['Pre-Op', 'Intra-Op', 'Post-Op']),
  template: z.string(),
});

/**
 * POST /api/ot/surgical-note-templates
 * 
 * Creates a new surgical note template.
 * 
 * @param request - The incoming request object
 * @returns The newly created surgical note template
 */
export async function POST_template(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_CREATE_TEMPLATE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = createTemplateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const { name, surgeryTypeId, noteType, template } = validationResult.data;
    
    // Check if the surgery type exists
    const surgeryType = await prisma.surgeryType.findUnique({
      where: { id: surgeryTypeId },
    });
    
    if (!surgeryType) {
      return NextResponse.json({ error: 'Surgery type not found' }, { status: 404 });
    }
    
    // Create the template
    const surgicalNoteTemplate = await prisma.surgicalNoteTemplate.create({
      data: {
        name,
        surgeryTypeId,
        noteType,
        template,
      },
      include: {
        surgeryType: true,
      },
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_TEMPLATE_CREATE',
      'SurgicalNoteTemplate',
      surgicalNoteTemplate.id,
      { 
        name,
        surgeryTypeId,
        noteType,
      }
    );
    
    return NextResponse.json(surgicalNoteTemplate, { status: 201 });
  } catch (error) {
    console.error('Error creating surgical note template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/ot/surgical-note-templates
 * 
 * Retrieves all surgical note templates with filtering options.
 * 
 * @param request - The incoming request object
 * @returns List of surgical note templates
 */
export async function GET_templates(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_VIEW_TEMPLATES')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const surgeryTypeId = url.searchParams.get('surgeryTypeId');
    const noteType = url.searchParams.get('noteType');
    
    // Build filter conditions
    const where: any = {};
    
    if (surgeryTypeId) {
      where.surgeryTypeId = surgeryTypeId;
    }
    
    if (noteType) {
      where.noteType = noteType;
    }
    
    // Fetch templates
    const templates = await prisma.surgicalNoteTemplate.findMany({
      where,
      include: {
        surgeryType: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_TEMPLATES_VIEW',
      'SurgicalNoteTemplate',
      null,
      { filters: { surgeryTypeId, noteType } }
    );
    
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching surgical note templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for creating a surgical consent
const createConsentSchema = z.object({
  scheduleId: z.string().uuid(),
  procedureExplained: z.boolean(),
  alternativesExplained: z.boolean(),
  risksExplained: z.boolean(),
  questionsAnswered: z.boolean(),
  patientAgreed: z.boolean(),
  consentForm: z.string().optional(),
  witness: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/ot/consent
 * 
 * Records surgical consent for a scheduled operation.
 * 
 * @param request - The incoming request object
 * @returns The newly created surgical consent record
 */
export async function POST_consent(request: NextRequest) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_RECORD_CONSENT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = createConsentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
    }
    
    const consentData = validationResult.data;
    
    // Check if the schedule exists
    const schedule = await prisma.otSchedule.findUnique({
      where: { id: consentData.scheduleId },
      include: {
        consent: true,
      },
    });
    
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    
    // Check if consent already exists
    if (schedule.consent) {
      return NextResponse.json({ error: 'Consent already recorded for this schedule' }, { status: 409 });
    }
    
    // Create the consent record
    const consent = await prisma.surgicalConsent.create({
      data: {
        ...consentData,
        obtainedById: session.user.id,
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
        obtainedBy: {
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
      'OT_CONSENT_RECORD',
      'SurgicalConsent',
      consent.id,
      { 
        scheduleId: consentData.scheduleId,
        patientAgreed: consentData.patientAgreed,
      }
    );
    
    return NextResponse.json(consent, { status: 201 });
  } catch (error) {
    console.error('Error recording surgical consent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/ot/consent/[scheduleId]
 * 
 * Retrieves surgical consent information for a specific scheduled operation.
 * 
 * @param request - The incoming request object
 * @param params - The route parameters containing the schedule ID
 * @returns Surgical consent information for the scheduled operation
 */
export async function GET_consent(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    // Get session and check permissions
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session, 'OT_VIEW_CONSENT')) {
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
    
    // Fetch consent information
    const consent = await prisma.surgicalConsent.findUnique({
      where: { scheduleId },
      include: {
        obtainedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    if (!consent) {
      return NextResponse.json({ error: 'Consent not found for this schedule' }, { status: 404 });
    }
    
    // Log audit event
    await logAuditEvent(
      session.user.id,
      'OT_CONSENT_VIEW',
      'SurgicalConsent',
      consent.id,
      { scheduleId }
    );
    
    return NextResponse.json(consent);
  } catch (error) {
    console.error('Error fetching surgical consent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
