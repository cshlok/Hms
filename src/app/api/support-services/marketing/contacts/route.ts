import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ContactService } from '@/lib/services/support-services/marketing';
import { withErrorHandling } from '@/lib/middleware/error-handling.middleware';

const contactService = new ContactService();

/**
 * GET /api/support-services/marketing/contacts
 * Get all contacts with optional filtering
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req: NextRequest) => {
      const session = await getServerSession(authOptions);
      const { searchParams } = new URL(req.url);
      
      // Parse query parameters
      const filters = {
        status: searchParams.get('status') || undefined,
        source: searchParams.get('source') || undefined,
        search: searchParams.get('search') || undefined,
        segmentId: searchParams.get('segmentId') || undefined,
        hasPatient: searchParams.has('hasPatient') 
          ? searchParams.get('hasPatient') === 'true'
          : undefined,
        page: searchParams.has('page')
          ? parseInt(searchParams.get('page') || '1', 10)
          : 1,
        limit: searchParams.has('limit')
          ? parseInt(searchParams.get('limit') || '10', 10)
          : 10,
      };
      
      const result = await contactService.getContacts(filters);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'marketing.contacts.read',
      auditAction: 'CONTACTS_LIST',
    }
  );
}

/**
 * POST /api/support-services/marketing/contacts
 * Create a new contact
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req: NextRequest) => {
      const session = await getServerSession(authOptions);
      const data = await req.json();
      
      const contact = await contactService.createContact(
        data,
        session?.user?.id as string
      );
      
      return NextResponse.json(contact, { status: 201 });
    },
    {
      requiredPermission: 'marketing.contacts.create',
      auditAction: 'CONTACT_CREATE',
    }
  );
}
