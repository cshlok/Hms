import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SegmentService } from '@/lib/services/support-services/marketing';
import { withErrorHandling } from '@/lib/middleware/error-handling.middleware';

const segmentService = new SegmentService();

/**
 * GET /api/support-services/marketing/segments/:id
 * Get a specific segment by ID
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
      
      const includeMembers = searchParams.get('includeMembers') === 'true';
      
      const segment = await segmentService.getSegmentById(params.id, includeMembers);
      
      return NextResponse.json(segment);
    },
    {
      requiredPermission: 'marketing.segments.read',
      auditAction: 'SEGMENT_VIEW',
    }
  );
}

/**
 * PUT /api/support-services/marketing/segments/:id
 * Update a specific segment
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
      
      const segment = await segmentService.updateSegment(
        params.id,
        data,
        session?.user?.id as string
      );
      
      return NextResponse.json(segment);
    },
    {
      requiredPermission: 'marketing.segments.update',
      auditAction: 'SEGMENT_UPDATE',
    }
  );
}
