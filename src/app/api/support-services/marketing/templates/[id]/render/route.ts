import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TemplateService } from '@/lib/services/support-services/marketing';
import { withErrorHandling } from '@/lib/middleware/error-handling.middleware';

const templateService = new TemplateService();

/**
 * POST /api/support-services/marketing/templates/:id/render
 * Render a template with variables
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(
    request,
    async (req: NextRequest) => {
      const session = await getServerSession(authOptions);
      const { variables } = await req.json();
      
      if (!variables || typeof variables !== 'object') {
        return NextResponse.json(
          { error: 'Variables must be a valid object' },
          { status: 400 }
        );
      }
      
      const renderedContent = await templateService.renderTemplate(
        params.id,
        variables
      );
      
      return NextResponse.json({ renderedContent });
    },
    {
      requiredPermission: 'marketing.templates.read',
      auditAction: 'TEMPLATE_RENDER',
    }
  );
}
