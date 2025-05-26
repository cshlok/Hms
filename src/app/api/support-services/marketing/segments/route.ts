import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SegmentService } from '@/lib/services/support-services/marketing';
import { withErrorHandling } from '@/lib/middleware/error-handling.middleware';

const segmentService = new SegmentService();

/**
 * GET /api/support-services/marketing/segments
 * Get all segments with optional filtering
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req: NextRequest) => {
      const session = await getServerSession(authOptions);
      const { searchParams } = new URL(req.url);
      
      // Parse query parameters
      const filters = {
        isActive: searchParams.has('isActive') 
          ? searchParams.get('isActive') === 'true'
          : undefined,
        search: searchParams.get('search') || undefined,
        page: searchParams.has('page')
          ? parseInt(searchParams.get('page') || '1', 10)
          : 1,
        limit: searchParams.has('limit')
          ? parseInt(searchParams.get('limit') || '10', 10)
          : 10,
      };
      
      const result = await segmentService.getSegments(filters);
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'marketing.segments.read',
      auditAction: 'SEGMENTS_LIST',
    }
  );
}

/**
 * POST /api/support-services/marketing/segments
 * Create a new segment
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req: NextRequest) => {
      const session = await getServerSession(authOptions);
      const data = await req.json();
      
      const segment = await segmentService.createSegment(
        data,
        session?.user?.id as string
      );
      
      return NextResponse.json(segment, { status: 201 });
    },
    {
      requiredPermission: 'marketing.segments.create',
      auditAction: 'SEGMENT_CREATE',
    }
  );
}
