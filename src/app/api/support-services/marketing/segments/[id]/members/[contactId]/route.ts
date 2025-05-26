import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SegmentService } from '@/lib/services/support-services/marketing';
import { withErrorHandling } from '@/lib/middleware/error-handling.middleware';

const segmentService = new SegmentService();

/**
 * POST /api/support-services/marketing/segments/:id/members
 * Add a contact to a segment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(
    request,
    async (req: NextRequest) => {
      const session = await getServerSession(authOptions);
      const { contactId } = await req.json();
      
      if (!contactId) {
        return NextResponse.json(
          { error: 'Contact ID is required' },
          { status: 400 }
        );
      }
      
      const member = await segmentService.addContactToSegment(
        params.id,
        contactId,
        session?.user?.id as string
      );
      
      return NextResponse.json(member, { status: 201 });
    },
    {
      requiredPermission: 'marketing.segments.update',
      auditAction: 'SEGMENT_MEMBER_ADD',
    }
  );
}

/**
 * DELETE /api/support-services/marketing/segments/:id/members/:contactId
 * Remove a contact from a segment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  return withErrorHandling(
    request,
    async (req: NextRequest) => {
      const session = await getServerSession(authOptions);
      
      const member = await segmentService.removeContactFromSegment(
        params.id,
        params.contactId,
        session?.user?.id as string
      );
      
      return NextResponse.json(member);
    },
    {
      requiredPermission: 'marketing.segments.update',
      auditAction: 'SEGMENT_MEMBER_REMOVE',
    }
  );
}
