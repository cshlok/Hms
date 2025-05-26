import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SegmentService } from '@/lib/services/support-services/marketing';
import { withErrorHandling } from '@/lib/middleware/error-handling.middleware';

const segmentService = new SegmentService();

/**
 * POST /api/support-services/marketing/segments/:id/apply-criteria
 * Apply segment criteria to find matching contacts
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(
    request,
    async (req: NextRequest) => {
      const session = await getServerSession(authOptions);
      
      const result = await segmentService.applySegmentCriteria(
        params.id,
        session?.user?.id as string
      );
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'marketing.segments.update',
      auditAction: 'SEGMENT_CRITERIA_APPLY',
    }
  );
}
