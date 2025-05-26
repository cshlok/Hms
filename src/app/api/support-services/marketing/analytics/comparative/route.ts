import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AnalyticsService } from '@/lib/services/support-services/marketing';
import { withErrorHandling } from '@/lib/middleware/error-handling.middleware';

const analyticsService = new AnalyticsService();

/**
 * GET /api/support-services/marketing/analytics/comparative
 * Get comparative analytics for multiple campaigns
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(
    request,
    async (req: NextRequest) => {
      const session = await getServerSession(authOptions);
      const { searchParams } = new URL(req.url);
      
      // Parse query parameters
      const campaignIds = searchParams.get('campaignIds')?.split(',') || [];
      
      if (campaignIds.length === 0) {
        return NextResponse.json(
          { error: 'At least one campaign ID is required' },
          { status: 400 }
        );
      }
      
      const filters = {
        startDate: searchParams.has('startDate')
          ? new Date(searchParams.get('startDate') as string)
          : undefined,
        endDate: searchParams.has('endDate')
          ? new Date(searchParams.get('endDate') as string)
          : undefined,
        metrics: searchParams.has('metrics')
          ? (searchParams.get('metrics') as string).split(',')
          : undefined,
      };
      
      const result = await analyticsService.getComparativeAnalytics(
        campaignIds,
        filters
      );
      
      return NextResponse.json(result);
    },
    {
      requiredPermission: 'marketing.analytics.read',
      auditAction: 'CAMPAIGN_ANALYTICS_COMPARATIVE',
    }
  );
}
