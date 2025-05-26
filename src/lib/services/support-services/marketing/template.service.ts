import { MarketingTemplate } from '@/lib/models/marketing';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { ValidationError, DatabaseError, NotFoundError } from '@/lib/errors';

/**
 * Service for managing marketing templates
 */
export class TemplateService {
  private auditLogger = new AuditLogger('marketing-template');

  /**
   * Create a new marketing template
   */
  async createTemplate(data: Omit<MarketingTemplate, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<MarketingTemplate> {
    try {
      // Validate template data
      this.validateTemplateData(data);
      
      // Create template in database
      const template = await prisma.marketingTemplate.create({
        data: {
          name: data.name,
          description: data.description,
          type: data.type,
          content: data.content,
          variables: data.variables,
          previewImage: data.previewImage,
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdById: userId
        }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'template.create',
        resourceId: template.id,
        userId,
        details: { 
          templateName: template.name,
          templateType: template.type
        }
      });
      
      return template;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create marketing template', error);
    }
  }

  /**
   * Get a template by ID
   */
  async getTemplateById(id: string): Promise<MarketingTemplate> {
    try {
      const template = await prisma.marketingTemplate.findUnique({
        where: { id },
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      if (!template) {
        throw new NotFoundError(`Marketing template with ID ${id} not found`);
      }
      
      return template;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve marketing template', error);
    }
  }

  /**
   * Get all templates with optional filtering
   */
  async getTemplates(filters: {
    type?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: MarketingTemplate[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    try {
      const { 
        type, 
        isActive,
        search,
        page = 1, 
        limit = 10 
      } = filters;
      
      // Build where clause based on filters
      const where: any = {};
      
      if (type) {
        where.type = type;
      }
      
      if (isActive !== undefined) {
        where.isActive = isActive;
      }
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      // Get total count for pagination
      const total = await prisma.marketingTemplate.count({ where });
      
      // Get templates with pagination
      const templates = await prisma.marketingTemplate.findMany({
        where,
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return {
        data: templates,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new DatabaseError('Failed to retrieve marketing templates', error);
    }
  }

  /**
   * Update a template
   */
  async updateTemplate(id: string, data: Partial<MarketingTemplate>, userId: string): Promise<MarketingTemplate> {
    try {
      // Check if template exists
      const existingTemplate = await prisma.marketingTemplate.findUnique({
        where: { id }
      });
      
      if (!existingTemplate) {
        throw new NotFoundError(`Marketing template with ID ${id} not found`);
      }
      
      // Update template
      const updatedTemplate = await prisma.marketingTemplate.update({
        where: { id },
        data
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'template.update',
        resourceId: id,
        userId,
        details: { 
          templateName: updatedTemplate.name,
          updatedFields: Object.keys(data)
        }
      });
      
      return updatedTemplate;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update marketing template', error);
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string, userId: string): Promise<void> {
    try {
      // Check if template exists
      const existingTemplate = await prisma.marketingTemplate.findUnique({
        where: { id }
      });
      
      if (!existingTemplate) {
        throw new NotFoundError(`Marketing template with ID ${id} not found`);
      }
      
      // Delete template
      await prisma.marketingTemplate.delete({
        where: { id }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'template.delete',
        resourceId: id,
        userId,
        details: { 
          templateName: existingTemplate.name,
          templateType: existingTemplate.type
        }
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete marketing template', error);
    }
  }

  /**
   * Render a template with variables
   */
  async renderTemplate(id: string, variables: Record<string, any>): Promise<string> {
    try {
      // Get template
      const template = await this.getTemplateById(id);
      
      // Render template content with variables
      let renderedContent = template.content;
      
      // Simple variable replacement
      if (variables && typeof variables === 'object') {
        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          renderedContent = renderedContent.replace(regex, String(value));
        });
      }
      
      return renderedContent;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to render template', error);
    }
  }

  /**
   * Validate template data
   */
  private validateTemplateData(data: Partial<MarketingTemplate>): void {
    const errors: string[] = [];
    
    // Name is required
    if (!data.name) {
      errors.push('Template name is required');
    }
    
    // Type is required
    if (!data.type) {
      errors.push('Template type is required');
    }
    
    // Content is required
    if (!data.content) {
      errors.push('Template content is required');
    }
    
    // Validate variables if provided
    if (data.variables && typeof data.variables !== 'object') {
      errors.push('Template variables must be a valid object');
    }
    
    if (errors.length > 0) {
      throw new ValidationError('Template validation failed', errors);
    }
  }
}
