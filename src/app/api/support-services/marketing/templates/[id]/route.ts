import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TemplateService } from '@/lib/services/support-services/marketing';
import { withErrorHandling } from '@/lib/middleware/error-handling.middleware';

const templateService = new TemplateService();

/**
 * GET /api/support-services/marketing/templates/:id
 * Get a specific template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(
    request,
    async (req: NextRequest) => {
      const session = await getServerSession(authOptions);
      
      const template = await templateService.getTemplateById(params.id);
      
      return NextResponse.json(template);
    },
    {
      requiredPermission: 'marketing.templates.read',
      auditAction: 'TEMPLATE_VIEW',
    }
  );
}

/**
 * PUT /api/support-services/marketing/templates/:id
 * Update a specific template
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
      
      const template = await templateService.updateTemplate(
        params.id,
        data,
        session?.user?.id as string
      );
      
      return NextResponse.json(template);
    },
    {
      requiredPermission: 'marketing.templates.update',
      auditAction: 'TEMPLATE_UPDATE',
    }
  );
}

/**
 * DELETE /api/support-services/marketing/templates/:id
 * Delete a specific template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(
    request,
    async (req: NextRequest) => {
      const session = await getServerSession(authOptions);
      
      await templateService.deleteTemplate(
        params.id,
        session?.user?.id as string
      );
      
      return NextResponse.json({ success: true }, { status: 200 });
    },
    {
      requiredPermission: 'marketing.templates.delete',
      auditAction: 'TEMPLATE_DELETE',
    }
  );
}
