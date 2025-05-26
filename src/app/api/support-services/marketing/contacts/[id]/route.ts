import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ContactService } from '@/lib/services/support-services/marketing';
import { withErrorHandling } from '@/lib/middleware/error-handling.middleware';

const contactService = new ContactService();

/**
 * GET /api/support-services/marketing/contacts/:id
 * Get a specific contact by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(
    request,
    async (req: NextRequest) => {
      const session = await getServerSession(authOptions);
      const { searchParams } = new URL(req.url);
      
      const includeFHIR = searchParams.get('includeFHIR') === 'true';
      
      const contact = await contactService.getContactById(params.id, includeFHIR);
      
      return NextResponse.json(contact);
    },
    {
      requiredPermission: 'marketing.contacts.read',
      auditAction: 'CONTACT_VIEW',
    }
  );
}

/**
 * PUT /api/support-services/marketing/contacts/:id
 * Update a specific contact
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(
    request,
    async (req: NextRequest) => {
      const session = await getServerSession(authOptions);
      const data = await req.json();
      
      const contact = await contactService.updateContact(
        params.id,
        data,
        session?.user?.id as string
      );
      
      return NextResponse.json(contact);
    },
    {
      requiredPermission: 'marketing.contacts.update',
      auditAction: 'CONTACT_UPDATE',
    }
  );
}

/**
 * POST /api/support-services/marketing/contacts/:id/notes
 * Add a note to a specific contact
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(
    request,
    async (req: NextRequest) => {
      const session = await getServerSession(authOptions);
      const { content } = await req.json();
      
      if (!content) {
        return NextResponse.json(
          { error: 'Note content is required' },
          { status: 400 }
        );
      }
      
      const note = await contactService.addContactNote(
        params.id,
        content,
        session?.user?.id as string
      );
      
      return NextResponse.json(note, { status: 201 });
    },
    {
      requiredPermission: 'marketing.contacts.update',
      auditAction: 'CONTACT_NOTE_ADD',
    }
  );
}
