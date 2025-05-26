import { NextRequest, NextResponse } from 'next/server';
import { MarketingCampaignService } from '@/lib/services/support-services/marketing/marketing.service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validatePermission } from '@/lib/permissions';
import { z } from 'zod';

const campaignService = new MarketingCampaignService();

// Campaign filter schema
const campaignFilterSchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  startDateFrom: z.string().optional().transform(val => val ? new Date(val) : undefined),
  startDateTo: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDateFrom: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDateTo: z.string().optional().transform(val => val ? new Date(val) : undefined),
  page: z.string().default('1').transform(Number),
  limit: z.string().default('10').transform(Number)
});

// Create campaign schema
const createCampaignSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  description: z.string().optional(),
  type: z.string(),
  status: z.string().default('DRAFT'),
  startDate: z.string().transform(val => new Date(val)),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  budget: z.number().optional(),
  targetAudience: z.any().optional(),
  goals: z.array(z.string()).optional(),
  kpis: z.any().optional()
});

// Update campaign schema
const updateCampaignSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters").optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().transform(val => new Date(val)).optional(),
  endDate: z.string().transform(val => val ? new Date(val) : undefined).optional(),
  budget: z.number().optional(),
  targetAudience: z.any().optional(),
  goals: z.array(z.string()).optional(),
  kpis: z.any().optional()
});

// GET /api/support-services/marketing/campaigns
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await validatePermission(session.user.id, 'marketing:read');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = Object.fromEntries(searchParams.entries());
    
    // Validate and transform parameters
    const validatedParams = campaignFilterSchema.parse(params);
    
    // Get campaigns with filters
    const result = await campaignService.getCampaigns(validatedParams);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in campaigns GET:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}

// POST /api/support-services/marketing/campaigns
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await validatePermission(session.user.id, 'marketing:create');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate request body
    const validatedData = createCampaignSchema.parse(body);
    
    // Create campaign
    const campaign = await campaignService.createCampaign(
      validatedData,
      session.user.id
    );
    
    return NextResponse.json(campaign, { status: 201 });
  } catch (error: any) {
    console.error('Error in campaigns POST:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}

// GET /api/support-services/marketing/campaigns/:id
export async function GET_BY_ID(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await validatePermission(session.user.id, 'marketing:read');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get campaign by ID
    const includeFHIR = request.nextUrl.searchParams.get('fhir') === 'true';
    const campaign = await campaignService.getCampaignById(params.id, includeFHIR);
    
    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error('Error in campaigns GET_BY_ID:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}

// PATCH /api/support-services/marketing/campaigns/:id
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await validatePermission(session.user.id, 'marketing:update');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate request body
    const validatedData = updateCampaignSchema.parse(body);
    
    // Update campaign
    const campaign = await campaignService.updateCampaign(
      params.id,
      validatedData,
      session.user.id
    );
    
    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error('Error in campaigns PATCH:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/support-services/marketing/campaigns/:id
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await validatePermission(session.user.id, 'marketing:delete');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete campaign
    await campaignService.deleteCampaign(params.id, session.user.id);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in campaigns DELETE:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}

// GET /api/support-services/marketing/campaigns/:id/analytics
export async function GET_ANALYTICS(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await validatePermission(session.user.id, 'marketing:analytics');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get campaign analytics
    const analytics = await campaignService.getCampaignAnalytics(params.id);
    
    return NextResponse.json(analytics);
  } catch (error: any) {
    console.error('Error in campaigns GET_ANALYTICS:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}

// POST /api/support-services/marketing/campaigns/:id/channels
export async function POST_CHANNEL(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await validatePermission(session.user.id, 'marketing:update');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    
    // Add channel to campaign
    const channel = await campaignService.addCampaignChannel(
      params.id,
      body,
      session.user.id
    );
    
    return NextResponse.json(channel, { status: 201 });
  } catch (error: any) {
    console.error('Error in campaigns POST_CHANNEL:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}

// POST /api/support-services/marketing/campaigns/:id/segments/:segmentId
export async function POST_SEGMENT(request: NextRequest, { params }: { params: { id: string; segmentId: string } }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await validatePermission(session.user.id, 'marketing:update');
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Add segment to campaign
    const result = await campaignService.addCampaignSegment(
      params.id,
      params.segmentId,
      session.user.id
    );
    
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error in campaigns POST_SEGMENT:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}
