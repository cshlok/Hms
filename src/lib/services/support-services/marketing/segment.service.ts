import { ContactSegment, SegmentMember } from '@/lib/models/marketing';
import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { NotificationService } from '@/lib/notifications';
import { ValidationError, DatabaseError, NotFoundError } from '@/lib/errors';

/**
 * Service for managing contact segments and segmentation
 */
export class SegmentService {
  private auditLogger = new AuditLogger('marketing-segment');
  private notificationService = new NotificationService();

  /**
   * Create a new contact segment
   */
  async createSegment(data: Omit<ContactSegment, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<ContactSegment> {
    try {
      // Validate segment data
      this.validateSegmentData(data);
      
      // Create segment in database
      const segment = await prisma.contactSegment.create({
        data: {
          name: data.name,
          description: data.description,
          criteria: data.criteria,
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdById: userId
        }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'segment.create',
        resourceId: segment.id,
        userId,
        details: { 
          segmentName: segment.name,
          hasCriteria: !!segment.criteria
        }
      });
      
      // Notify relevant users
      await this.notificationService.sendNotification({
        type: 'SEGMENT_CREATED',
        title: 'New Contact Segment Created',
        message: `A new contact segment "${segment.name}" has been created`,
        recipientRoles: ['MARKETING_MANAGER', 'MARKETING_STAFF'],
        metadata: { segmentId: segment.id }
      });
      
      return segment;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create contact segment', error);
    }
  }

  /**
   * Get a segment by ID
   */
  async getSegmentById(id: string, includeMembers = false): Promise<ContactSegment> {
    try {
      const segment = await prisma.contactSegment.findUnique({
        where: { id },
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true
            }
          },
          members: includeMembers ? {
            where: {
              isActive: true
            },
            include: {
              contact: true
            }
          } : false,
          _count: {
            select: {
              members: {
                where: {
                  isActive: true
                }
              },
              campaigns: true
            }
          }
        }
      });
      
      if (!segment) {
        throw new NotFoundError(`Contact segment with ID ${id} not found`);
      }
      
      return segment;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve contact segment', error);
    }
  }

  /**
   * Get all segments with optional filtering
   */
  async getSegments(filters: {
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: ContactSegment[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    try {
      const { 
        isActive, 
        search,
        page = 1, 
        limit = 10 
      } = filters;
      
      // Build where clause based on filters
      const where: any = {};
      
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
      const total = await prisma.contactSegment.count({ where });
      
      // Get segments with pagination
      const segments = await prisma.contactSegment.findMany({
        where,
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              members: {
                where: {
                  isActive: true
                }
              },
              campaigns: true
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
        data: segments,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new DatabaseError('Failed to retrieve contact segments', error);
    }
  }

  /**
   * Update a segment
   */
  async updateSegment(id: string, data: Partial<ContactSegment>, userId: string): Promise<ContactSegment> {
    try {
      // Check if segment exists
      const existingSegment = await prisma.contactSegment.findUnique({
        where: { id }
      });
      
      if (!existingSegment) {
        throw new NotFoundError(`Contact segment with ID ${id} not found`);
      }
      
      // Update segment
      const updatedSegment = await prisma.contactSegment.update({
        where: { id },
        data
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'segment.update',
        resourceId: id,
        userId,
        details: { 
          segmentName: updatedSegment.name,
          updatedFields: Object.keys(data)
        }
      });
      
      return updatedSegment;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update contact segment', error);
    }
  }

  /**
   * Add a contact to a segment
   */
  async addContactToSegment(segmentId: string, contactId: string, userId: string): Promise<SegmentMember> {
    try {
      // Check if segment exists
      const existingSegment = await prisma.contactSegment.findUnique({
        where: { id: segmentId }
      });
      
      if (!existingSegment) {
        throw new NotFoundError(`Contact segment with ID ${segmentId} not found`);
      }
      
      // Check if contact exists
      const existingContact = await prisma.contact.findUnique({
        where: { id: contactId }
      });
      
      if (!existingContact) {
        throw new NotFoundError(`Contact with ID ${contactId} not found`);
      }
      
      // Check if contact is already in segment
      const existingMember = await prisma.segmentMember.findFirst({
        where: {
          segmentId,
          contactId
        }
      });
      
      if (existingMember) {
        // If member exists but is inactive, reactivate
        if (!existingMember.isActive) {
          const updatedMember = await prisma.segmentMember.update({
            where: { id: existingMember.id },
            data: {
              isActive: true,
              removedAt: null
            }
          });
          
          // Log audit event
          await this.auditLogger.log({
            action: 'segment.member.reactivate',
            resourceId: segmentId,
            userId,
            details: { 
              contactId,
              memberId: updatedMember.id
            }
          });
          
          return updatedMember;
        }
        
        return existingMember;
      }
      
      // Add contact to segment
      const member = await prisma.segmentMember.create({
        data: {
          segmentId,
          contactId,
          isActive: true
        }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'segment.member.add',
        resourceId: segmentId,
        userId,
        details: { 
          contactId,
          memberId: member.id
        }
      });
      
      return member;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to add contact to segment', error);
    }
  }

  /**
   * Remove a contact from a segment
   */
  async removeContactFromSegment(segmentId: string, contactId: string, userId: string): Promise<SegmentMember> {
    try {
      // Check if segment exists
      const existingSegment = await prisma.contactSegment.findUnique({
        where: { id: segmentId }
      });
      
      if (!existingSegment) {
        throw new NotFoundError(`Contact segment with ID ${segmentId} not found`);
      }
      
      // Check if contact exists
      const existingContact = await prisma.contact.findUnique({
        where: { id: contactId }
      });
      
      if (!existingContact) {
        throw new NotFoundError(`Contact with ID ${contactId} not found`);
      }
      
      // Check if contact is in segment
      const existingMember = await prisma.segmentMember.findFirst({
        where: {
          segmentId,
          contactId,
          isActive: true
        }
      });
      
      if (!existingMember) {
        throw new NotFoundError(`Contact is not a member of this segment`);
      }
      
      // Remove contact from segment (soft delete)
      const updatedMember = await prisma.segmentMember.update({
        where: { id: existingMember.id },
        data: {
          isActive: false,
          removedAt: new Date()
        }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'segment.member.remove',
        resourceId: segmentId,
        userId,
        details: { 
          contactId,
          memberId: existingMember.id
        }
      });
      
      return updatedMember;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to remove contact from segment', error);
    }
  }

  /**
   * Apply segment criteria to find matching contacts
   */
  async applySegmentCriteria(segmentId: string, userId: string): Promise<{ added: number; total: number }> {
    try {
      // Get segment with criteria
      const segment = await prisma.contactSegment.findUnique({
        where: { id: segmentId }
      });
      
      if (!segment) {
        throw new NotFoundError(`Contact segment with ID ${segmentId} not found`);
      }
      
      if (!segment.criteria) {
        throw new ValidationError('Segment has no criteria defined', ['No criteria']);
      }
      
      // Convert criteria to Prisma query
      const where = this.buildPrismaQueryFromCriteria(segment.criteria);
      
      // Find matching contacts
      const matchingContacts = await prisma.contact.findMany({
        where,
        select: {
          id: true
        }
      });
      
      // Add contacts to segment
      let addedCount = 0;
      
      for (const contact of matchingContacts) {
        try {
          // Check if already a member
          const existingMember = await prisma.segmentMember.findFirst({
            where: {
              segmentId,
              contactId: contact.id
            }
          });
          
          if (existingMember) {
            // If inactive, reactivate
            if (!existingMember.isActive) {
              await prisma.segmentMember.update({
                where: { id: existingMember.id },
                data: {
                  isActive: true,
                  removedAt: null
                }
              });
              addedCount++;
            }
          } else {
            // Add new member
            await prisma.segmentMember.create({
              data: {
                segmentId,
                contactId: contact.id,
                isActive: true
              }
            });
            addedCount++;
          }
        } catch (error) {
          console.error(`Failed to add contact ${contact.id} to segment:`, error);
          // Continue with next contact
        }
      }
      
      // Log audit event
      await this.auditLogger.log({
        action: 'segment.criteria.apply',
        resourceId: segmentId,
        userId,
        details: { 
          matchedContacts: matchingContacts.length,
          addedContacts: addedCount
        }
      });
      
      return {
        added: addedCount,
        total: matchingContacts.length
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to apply segment criteria', error);
    }
  }

  /**
   * Build Prisma query from segment criteria
   */
  private buildPrismaQueryFromCriteria(criteria: any): any {
    // Example implementation - would need to be expanded based on actual criteria structure
    const query: any = { AND: [] };
    
    // Process demographic criteria
    if (criteria.demographics) {
      if (criteria.demographics.gender) {
        query.AND.push({ gender: criteria.demographics.gender });
      }
      
      if (criteria.demographics.ageRange) {
        const { min, max } = criteria.demographics.ageRange;
        const today = new Date();
        
        if (min !== undefined) {
          const maxDate = new Date();
          maxDate.setFullYear(today.getFullYear() - min);
          query.AND.push({ dateOfBirth: { lte: maxDate } });
        }
        
        if (max !== undefined) {
          const minDate = new Date();
          minDate.setFullYear(today.getFullYear() - max);
          query.AND.push({ dateOfBirth: { gte: minDate } });
        }
      }
    }
    
    // Process source criteria
    if (criteria.source) {
      if (Array.isArray(criteria.source)) {
        query.AND.push({ source: { in: criteria.source } });
      } else {
        query.AND.push({ source: criteria.source });
      }
    }
    
    // Process status criteria
    if (criteria.status) {
      query.AND.push({ status: criteria.status });
    }
    
    // Process tag criteria
    if (criteria.tags && criteria.tags.length > 0) {
      query.AND.push({ tags: { hasSome: criteria.tags } });
    }
    
    // Process patient criteria
    if (criteria.isPatient !== undefined) {
      query.AND.push({ patientId: criteria.isPatient ? { not: null } : null });
    }
    
    // Process creation date criteria
    if (criteria.createdAt) {
      const createdAtQuery: any = {};
      
      if (criteria.createdAt.from) {
        createdAtQuery.gte = new Date(criteria.createdAt.from);
      }
      
      if (criteria.createdAt.to) {
        createdAtQuery.lte = new Date(criteria.createdAt.to);
      }
      
      if (Object.keys(createdAtQuery).length > 0) {
        query.AND.push({ createdAt: createdAtQuery });
      }
    }
    
    return query;
  }

  /**
   * Validate segment data
   */
  private validateSegmentData(data: Partial<ContactSegment>): void {
    const errors: string[] = [];
    
    // Name is required
    if (!data.name) {
      errors.push('Segment name is required');
    }
    
    // Name length validation
    if (data.name && (data.name.length < 3 || data.name.length > 100)) {
      errors.push('Segment name must be between 3 and 100 characters');
    }
    
    // Validate criteria if provided
    if (data.criteria && typeof data.criteria === 'object') {
      try {
        // Validate criteria structure
        this.validateCriteriaStructure(data.criteria);
      } catch (error) {
        errors.push(`Invalid criteria: ${error.message}`);
      }
    }
    
    if (errors.length > 0) {
      throw new ValidationError('Segment validation failed', errors);
    }
  }

  /**
   * Validate criteria structure
   */
  private validateCriteriaStructure(criteria: any): void {
    // This would be expanded based on the actual criteria structure
    // Just a basic check for now
    if (!criteria || typeof criteria !== 'object') {
      throw new Error('Criteria must be a valid object');
    }
  }
}
