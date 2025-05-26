import { MarketingCampaign, CampaignChannel, MarketingMessage, Contact, ContactSegment, Lead } from '@/lib/models/marketing';
import { prisma } from '@/lib/prisma';
import { encryptData, decryptData } from '@/lib/encryption';
import { FhirResourceGenerator } from '@/lib/fhir';
import { AuditLogger } from '@/lib/audit';
import { NotificationService } from '@/lib/notifications';
import { ValidationError, DatabaseError, NotFoundError } from '@/lib/errors';

/**
 * Service for managing marketing campaigns and related operations
 */
export class MarketingCampaignService {
  private auditLogger = new AuditLogger('marketing-campaign');
  private notificationService = new NotificationService();
  private fhirGenerator = new FhirResourceGenerator();

  /**
   * Create a new marketing campaign
   */
  async createCampaign(data: Omit<MarketingCampaign, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<MarketingCampaign> {
    try {
      // Validate campaign data
      this.validateCampaignData(data);
      
      // Create campaign in database
      const campaign = await prisma.marketingCampaign.create({
        data: {
          name: data.name,
          description: data.description,
          type: data.type,
          status: data.status || 'DRAFT',
          startDate: data.startDate,
          endDate: data.endDate,
          budget: data.budget,
          targetAudience: data.targetAudience,
          goals: data.goals,
          kpis: data.kpis,
          createdById: userId,
          updatedById: userId,
        },
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'campaign.create',
        resourceId: campaign.id,
        userId,
        details: { campaignName: campaign.name, campaignType: campaign.type }
      });
      
      // Notify relevant users
      await this.notificationService.sendNotification({
        type: 'CAMPAIGN_CREATED',
        title: 'New Marketing Campaign Created',
        message: `A new marketing campaign "${campaign.name}" has been created`,
        recipientRoles: ['MARKETING_MANAGER', 'MARKETING_STAFF'],
        metadata: { campaignId: campaign.id }
      });
      
      return campaign;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create marketing campaign', error);
    }
  }

  /**
   * Get a marketing campaign by ID
   */
  async getCampaignById(id: string, includeFHIR = false): Promise<MarketingCampaign & { fhir?: any }> {
    try {
      const campaign = await prisma.marketingCampaign.findUnique({
        where: { id },
        include: {
          channels: true,
          segments: {
            include: {
              segment: true
            }
          },
          leads: {
            take: 10,
            orderBy: {
              createdAt: 'desc'
            }
          },
          analytics: {
            take: 5,
            orderBy: {
              date: 'desc'
            }
          },
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      if (!campaign) {
        throw new NotFoundError(`Marketing campaign with ID ${id} not found`);
      }
      
      // Generate FHIR representation if requested
      const result: any = campaign;
      if (includeFHIR) {
        result.fhir = this.generateCampaignFHIR(campaign);
      }
      
      return result;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve marketing campaign', error);
    }
  }

  /**
   * Get all marketing campaigns with optional filtering
   */
  async getCampaigns(filters: {
    type?: string;
    status?: string;
    startDateFrom?: Date;
    startDateTo?: Date;
    endDateFrom?: Date;
    endDateTo?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ data: MarketingCampaign[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    try {
      const { 
        type, 
        status, 
        startDateFrom, 
        startDateTo, 
        endDateFrom, 
        endDateTo,
        page = 1, 
        limit = 10 
      } = filters;
      
      // Build where clause based on filters
      const where: any = {};
      
      if (type) {
        where.type = type;
      }
      
      if (status) {
        where.status = status;
      }
      
      if (startDateFrom || startDateTo) {
        where.startDate = {};
        if (startDateFrom) {
          where.startDate.gte = startDateFrom;
        }
        if (startDateTo) {
          where.startDate.lte = startDateTo;
        }
      }
      
      if (endDateFrom || endDateTo) {
        where.endDate = {};
        if (endDateFrom) {
          where.endDate.gte = endDateFrom;
        }
        if (endDateTo) {
          where.endDate.lte = endDateTo;
        }
      }
      
      // Get total count for pagination
      const total = await prisma.marketingCampaign.count({ where });
      
      // Get campaigns with pagination
      const campaigns = await prisma.marketingCampaign.findMany({
        where,
        include: {
          channels: true,
          segments: {
            include: {
              segment: true
            }
          },
          _count: {
            select: {
              leads: true,
              activities: true
            }
          },
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
        data: campaigns,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new DatabaseError('Failed to retrieve marketing campaigns', error);
    }
  }

  /**
   * Update a marketing campaign
   */
  async updateCampaign(id: string, data: Partial<MarketingCampaign>, userId: string): Promise<MarketingCampaign> {
    try {
      // Check if campaign exists
      const existingCampaign = await prisma.marketingCampaign.findUnique({
        where: { id }
      });
      
      if (!existingCampaign) {
        throw new NotFoundError(`Marketing campaign with ID ${id} not found`);
      }
      
      // Update campaign
      const updatedCampaign = await prisma.marketingCampaign.update({
        where: { id },
        data: {
          ...data,
          updatedById: userId
        }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'campaign.update',
        resourceId: id,
        userId,
        details: { 
          campaignName: updatedCampaign.name, 
          updatedFields: Object.keys(data) 
        }
      });
      
      return updatedCampaign;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update marketing campaign', error);
    }
  }

  /**
   * Delete a marketing campaign
   */
  async deleteCampaign(id: string, userId: string): Promise<void> {
    try {
      // Check if campaign exists
      const existingCampaign = await prisma.marketingCampaign.findUnique({
        where: { id }
      });
      
      if (!existingCampaign) {
        throw new NotFoundError(`Marketing campaign with ID ${id} not found`);
      }
      
      // Delete campaign
      await prisma.marketingCampaign.delete({
        where: { id }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'campaign.delete',
        resourceId: id,
        userId,
        details: { 
          campaignName: existingCampaign.name,
          campaignType: existingCampaign.type
        }
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete marketing campaign', error);
    }
  }

  /**
   * Add a channel to a campaign
   */
  async addCampaignChannel(campaignId: string, channelData: Omit<CampaignChannel, 'id' | 'campaignId' | 'createdAt' | 'updatedAt'>, userId: string): Promise<CampaignChannel> {
    try {
      // Check if campaign exists
      const existingCampaign = await prisma.marketingCampaign.findUnique({
        where: { id: campaignId }
      });
      
      if (!existingCampaign) {
        throw new NotFoundError(`Marketing campaign with ID ${campaignId} not found`);
      }
      
      // Create channel
      const channel = await prisma.campaignChannel.create({
        data: {
          campaignId,
          channelType: channelData.channelType,
          channelName: channelData.channelName,
          content: channelData.content,
          schedule: channelData.schedule,
          status: channelData.status || 'DRAFT',
          metrics: channelData.metrics
        }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'campaign.channel.add',
        resourceId: campaignId,
        userId,
        details: { 
          channelId: channel.id,
          channelType: channel.channelType,
          channelName: channel.channelName
        }
      });
      
      return channel;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to add campaign channel', error);
    }
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string): Promise<any> {
    try {
      // Check if campaign exists
      const existingCampaign = await prisma.marketingCampaign.findUnique({
        where: { id: campaignId }
      });
      
      if (!existingCampaign) {
        throw new NotFoundError(`Marketing campaign with ID ${campaignId} not found`);
      }
      
      // Get analytics data
      const analytics = await prisma.campaignAnalytics.findMany({
        where: { campaignId },
        orderBy: { date: 'asc' }
      });
      
      // Get channel metrics
      const channels = await prisma.campaignChannel.findMany({
        where: { campaignId },
        include: {
          messages: {
            include: {
              _count: {
                select: {
                  interactions: true
                }
              }
            }
          }
        }
      });
      
      // Get lead conversion metrics
      const leads = await prisma.lead.findMany({
        where: { campaignId },
        select: {
          status: true,
          convertedToPatientId: true,
          conversionDate: true
        }
      });
      
      // Calculate conversion rate
      const totalLeads = leads.length;
      const convertedLeads = leads.filter(lead => lead.convertedToPatientId).length;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
      
      // Aggregate analytics data
      const aggregatedData = {
        campaign: {
          id: campaignId,
          name: existingCampaign.name,
          type: existingCampaign.type,
          startDate: existingCampaign.startDate,
          endDate: existingCampaign.endDate,
          status: existingCampaign.status
        },
        metrics: analytics.map(item => item.metrics),
        channels: channels.map(channel => ({
          id: channel.id,
          type: channel.channelType,
          name: channel.channelName,
          status: channel.status,
          messageCount: channel.messages.length,
          interactionCount: channel.messages.reduce((sum, msg) => sum + msg._count.interactions, 0),
          metrics: channel.metrics
        })),
        leads: {
          total: totalLeads,
          converted: convertedLeads,
          conversionRate: conversionRate.toFixed(2) + '%',
          byStatus: this.groupLeadsByStatus(leads)
        },
        timeSeriesData: this.aggregateTimeSeriesData(analytics)
      };
      
      return aggregatedData;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve campaign analytics', error);
    }
  }

  /**
   * Add a segment to a campaign
   */
  async addCampaignSegment(campaignId: string, segmentId: string, userId: string): Promise<any> {
    try {
      // Check if campaign exists
      const existingCampaign = await prisma.marketingCampaign.findUnique({
        where: { id: campaignId }
      });
      
      if (!existingCampaign) {
        throw new NotFoundError(`Marketing campaign with ID ${campaignId} not found`);
      }
      
      // Check if segment exists
      const existingSegment = await prisma.contactSegment.findUnique({
        where: { id: segmentId }
      });
      
      if (!existingSegment) {
        throw new NotFoundError(`Contact segment with ID ${segmentId} not found`);
      }
      
      // Check if segment is already added to campaign
      const existingRelation = await prisma.campaignSegment.findFirst({
        where: {
          campaignId,
          segmentId
        }
      });
      
      if (existingRelation) {
        return existingRelation;
      }
      
      // Add segment to campaign
      const campaignSegment = await prisma.campaignSegment.create({
        data: {
          campaignId,
          segmentId
        }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'campaign.segment.add',
        resourceId: campaignId,
        userId,
        details: { 
          segmentId,
          segmentName: existingSegment.name
        }
      });
      
      return campaignSegment;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to add segment to campaign', error);
    }
  }

  /**
   * Generate FHIR representation of a marketing campaign
   * Maps to FHIR Communication and CommunicationRequest resources
   */
  private generateCampaignFHIR(campaign: any): any {
    // Create FHIR Communication resource for the campaign
    const communicationResource = {
      resourceType: 'Communication',
      id: `marketing-campaign-${campaign.id}`,
      status: this.mapCampaignStatusToFHIR(campaign.status),
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/communication-category',
              code: 'marketing',
              display: 'Marketing'
            }
          ]
        }
      ],
      subject: {
        reference: 'Group/marketing-segment',
        display: 'Marketing Target Audience'
      },
      sent: campaign.startDate,
      received: campaign.endDate,
      recipient: [],
      sender: {
        reference: `Organization/hospital`,
        display: 'Hospital Marketing Department'
      },
      payload: [
        {
          contentString: campaign.description
        }
      ],
      note: [
        {
          text: `Marketing campaign: ${campaign.name}`
        }
      ]
    };
    
    // Create FHIR CommunicationRequest resource for campaign planning
    const communicationRequestResource = {
      resourceType: 'CommunicationRequest',
      id: `marketing-campaign-request-${campaign.id}`,
      status: this.mapCampaignStatusToFHIRRequest(campaign.status),
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/communication-category',
              code: 'marketing',
              display: 'Marketing'
            }
          ]
        }
      ],
      priority: 'routine',
      subject: {
        reference: 'Group/marketing-segment',
        display: 'Marketing Target Audience'
      },
      requester: {
        reference: `Practitioner/${campaign.createdById}`,
        display: campaign.createdByUser?.name || 'Marketing Staff'
      },
      recipient: [],
      occurrencePeriod: {
        start: campaign.startDate,
        end: campaign.endDate
      },
      authoredOn: campaign.createdAt,
      payload: [
        {
          contentString: campaign.description
        }
      ]
    };
    
    return {
      communication: communicationResource,
      communicationRequest: communicationRequestResource
    };
  }

  /**
   * Map campaign status to FHIR Communication status
   */
  private mapCampaignStatusToFHIR(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'preparation';
      case 'SCHEDULED':
        return 'preparation';
      case 'ACTIVE':
        return 'in-progress';
      case 'PAUSED':
        return 'suspended';
      case 'COMPLETED':
        return 'completed';
      case 'CANCELLED':
        return 'stopped';
      default:
        return 'unknown';
    }
  }

  /**
   * Map campaign status to FHIR CommunicationRequest status
   */
  private mapCampaignStatusToFHIRRequest(status: string): string {
    switch (status) {
      case 'DRAFT':
        return 'draft';
      case 'SCHEDULED':
        return 'active';
      case 'ACTIVE':
        return 'active';
      case 'PAUSED':
        return 'on-hold';
      case 'COMPLETED':
        return 'completed';
      case 'CANCELLED':
        return 'revoked';
      default:
        return 'unknown';
    }
  }

  /**
   * Group leads by status
   */
  private groupLeadsByStatus(leads: any[]): Record<string, number> {
    const result: Record<string, number> = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      CONVERTED: 0,
      LOST: 0
    };
    
    leads.forEach(lead => {
      if (result[lead.status] !== undefined) {
        result[lead.status]++;
      }
    });
    
    return result;
  }

  /**
   * Aggregate time series data from analytics
   */
  private aggregateTimeSeriesData(analytics: any[]): any {
    // Implementation depends on the structure of metrics in analytics
    // This is a simplified example
    return analytics.map(item => ({
      date: item.date,
      ...item.metrics
    }));
  }

  /**
   * Validate campaign data
   */
  private validateCampaignData(data: any): void {
    const errors = [];
    
    if (!data.name || data.name.trim() === '') {
      errors.push('Campaign name is required');
    }
    
    if (!data.type) {
      errors.push('Campaign type is required');
    }
    
    if (!data.startDate) {
      errors.push('Campaign start date is required');
    }
    
    if (data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
      errors.push('End date cannot be before start date');
    }
    
    if (errors.length > 0) {
      throw new ValidationError('Campaign validation failed', errors);
    }
  }
}

/**
 * Service for managing contacts and segments
 */
export class ContactService {
  private auditLogger = new AuditLogger('marketing-contact');
  
  /**
   * Create a new contact
   */
  async createContact(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Contact> {
    try {
      // Validate contact data
      this.validateContactData(data);
      
      // Encrypt sensitive data if present
      const encryptedData = this.encryptSensitiveData(data);
      
      // Create contact in database
      const contact = await prisma.contact.create({
        data: encryptedData
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'contact.create',
        resourceId: contact.id,
        userId,
        details: { 
          contactEmail: data.email,
          contactSource: data.source
        }
      });
      
      return this.decryptSensitiveData(contact);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create contact', error);
    }
  }

  /**
   * Get a contact by ID
   */
  async getContactById(id: string): Promise<Contact> {
    try {
      const contact = await prisma.contact.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true
            }
          },
          notes: {
            include: {
              createdByUser: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          segmentMembers: {
            where: {
              isActive: true
            },
            include: {
              segment: true
            }
          },
          _count: {
            select: {
              interactions: true,
              activities: true,
              leads: true
            }
          }
        }
      });
      
      if (!contact) {
        throw new NotFoundError(`Contact with ID ${id} not found`);
      }
      
      return this.decryptSensitiveData(contact);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve contact', error);
    }
  }

  /**
   * Get all contacts with optional filtering
   */
  async getContacts(filters: {
    search?: string;
    status?: string;
    source?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<{ data: Contact[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    try {
      const { 
        search, 
        status, 
        source, 
        tags,
        page = 1, 
        limit = 10 
      } = filters;
      
      // Build where clause based on filters
      const where: any = {};
      
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } }
        ];
      }
      
      if (status) {
        where.status = status;
      }
      
      if (source) {
        where.source = source;
      }
      
      if (tags && tags.length > 0) {
        where.tags = {
          hasSome: tags
        };
      }
      
      // Get total count for pagination
      const total = await prisma.contact.count({ where });
      
      // Get contacts with pagination
      const contacts = await prisma.contact.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true
            }
          },
          _count: {
            select: {
              interactions: true,
              activities: true,
              leads: true,
              segmentMembers: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      // Decrypt sensitive data
      const decryptedContacts = contacts.map(contact => this.decryptSensitiveData(contact));
      
      return {
        data: decryptedContacts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new DatabaseError('Failed to retrieve contacts', error);
    }
  }

  /**
   * Update a contact
   */
  async updateContact(id: string, data: Partial<Contact>, userId: string): Promise<Contact> {
    try {
      // Check if contact exists
      const existingContact = await prisma.contact.findUnique({
        where: { id }
      });
      
      if (!existingContact) {
        throw new NotFoundError(`Contact with ID ${id} not found`);
      }
      
      // Encrypt sensitive data if present
      const encryptedData = this.encryptSensitiveData(data);
      
      // Update contact
      const updatedContact = await prisma.contact.update({
        where: { id },
        data: encryptedData
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'contact.update',
        resourceId: id,
        userId,
        details: { 
          updatedFields: Object.keys(data) 
        }
      });
      
      return this.decryptSensitiveData(updatedContact);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update contact', error);
    }
  }

  /**
   * Delete a contact
   */
  async deleteContact(id: string, userId: string): Promise<void> {
    try {
      // Check if contact exists
      const existingContact = await prisma.contact.findUnique({
        where: { id }
      });
      
      if (!existingContact) {
        throw new NotFoundError(`Contact with ID ${id} not found`);
      }
      
      // Delete contact
      await prisma.contact.delete({
        where: { id }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'contact.delete',
        resourceId: id,
        userId,
        details: { 
          contactEmail: existingContact.email
        }
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete contact', error);
    }
  }

  /**
   * Add a note to a contact
   */
  async addContactNote(contactId: string, content: string, userId: string): Promise<any> {
    try {
      // Check if contact exists
      const existingContact = await prisma.contact.findUnique({
        where: { id: contactId }
      });
      
      if (!existingContact) {
        throw new NotFoundError(`Contact with ID ${contactId} not found`);
      }
      
      // Create note
      const note = await prisma.contactNote.create({
        data: {
          contactId,
          content,
          createdById: userId
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'contact.note.add',
        resourceId: contactId,
        userId,
        details: { 
          noteId: note.id
        }
      });
      
      return note;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to add contact note', error);
    }
  }

  /**
   * Create a new contact segment
   */
  async createSegment(data: Omit<ContactSegment, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<ContactSegment> {
    try {
      // Validate segment data
      if (!data.name || data.name.trim() === '') {
        throw new ValidationError('Segment validation failed', ['Segment name is required']);
      }
      
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
          segmentName: segment.name
        }
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
   * Get all segments with optional filtering
   */
  async getSegments(filters: {
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: ContactSegment[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    try {
      const { 
        isActive, 
        page = 1, 
        limit = 10 
      } = filters;
      
      // Build where clause based on filters
      const where: any = {};
      
      if (isActive !== undefined) {
        where.isActive = isActive;
      }
      
      // Get total count for pagination
      const total = await prisma.contactSegment.count({ where });
      
      // Get segments with pagination
      const segments = await prisma.contactSegment.findMany({
        where,
        include: {
          _count: {
            select: {
              members: true,
              campaigns: true
            }
          },
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
        data: segments,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new DatabaseError('Failed to retrieve segments', error);
    }
  }

  /**
   * Add a contact to a segment
   */
  async addContactToSegment(segmentId: string, contactId: string, userId: string): Promise<any> {
    try {
      // Check if segment exists
      const existingSegment = await prisma.contactSegment.findUnique({
        where: { id: segmentId }
      });
      
      if (!existingSegment) {
        throw new NotFoundError(`Segment with ID ${segmentId} not found`);
      }
      
      // Check if contact exists
      const existingContact = await prisma.contact.findUnique({
        where: { id: contactId }
      });
      
      if (!existingContact) {
        throw new NotFoundError(`Contact with ID ${contactId} not found`);
      }
      
      // Check if contact is already in segment
      const existingMembership = await prisma.segmentMember.findFirst({
        where: {
          segmentId,
          contactId,
          isActive: true
        }
      });
      
      if (existingMembership) {
        return existingMembership;
      }
      
      // If contact was previously removed from segment, reactivate
      const inactiveMemebership = await prisma.segmentMember.findFirst({
        where: {
          segmentId,
          contactId,
          isActive: false
        }
      });
      
      if (inactiveMemebership) {
        const updatedMembership = await prisma.segmentMember.update({
          where: { id: inactiveMemebership.id },
          data: {
            isActive: true,
            removedAt: null
          }
        });
        
        // Log audit event
        await this.auditLogger.log({
          action: 'segment.contact.reactivate',
          resourceId: segmentId,
          userId,
          details: { 
            contactId,
            segmentName: existingSegment.name
          }
        });
        
        return updatedMembership;
      }
      
      // Add contact to segment
      const membership = await prisma.segmentMember.create({
        data: {
          segmentId,
          contactId,
          isActive: true
        }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'segment.contact.add',
        resourceId: segmentId,
        userId,
        details: { 
          contactId,
          segmentName: existingSegment.name
        }
      });
      
      return membership;
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
  async removeContactFromSegment(segmentId: string, contactId: string, userId: string): Promise<any> {
    try {
      // Check if segment exists
      const existingSegment = await prisma.contactSegment.findUnique({
        where: { id: segmentId }
      });
      
      if (!existingSegment) {
        throw new NotFoundError(`Segment with ID ${segmentId} not found`);
      }
      
      // Check if contact exists
      const existingContact = await prisma.contact.findUnique({
        where: { id: contactId }
      });
      
      if (!existingContact) {
        throw new NotFoundError(`Contact with ID ${contactId} not found`);
      }
      
      // Check if contact is in segment
      const membership = await prisma.segmentMember.findFirst({
        where: {
          segmentId,
          contactId,
          isActive: true
        }
      });
      
      if (!membership) {
        throw new NotFoundError(`Contact is not a member of this segment`);
      }
      
      // Remove contact from segment (soft delete)
      const updatedMembership = await prisma.segmentMember.update({
        where: { id: membership.id },
        data: {
          isActive: false,
          removedAt: new Date()
        }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'segment.contact.remove',
        resourceId: segmentId,
        userId,
        details: { 
          contactId,
          segmentName: existingSegment.name
        }
      });
      
      return updatedMembership;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to remove contact from segment', error);
    }
  }

  /**
   * Encrypt sensitive contact data
   */
  private encryptSensitiveData(data: any): any {
    const result = { ...data };
    
    // Encrypt address if present
    if (result.address) {
      result.address = encryptData(JSON.stringify(result.address));
    }
    
    // Encrypt preferences if present
    if (result.preferences) {
      result.preferences = encryptData(JSON.stringify(result.preferences));
    }
    
    return result;
  }

  /**
   * Decrypt sensitive contact data
   */
  private decryptSensitiveData(data: any): any {
    const result = { ...data };
    
    // Decrypt address if present
    if (result.address && typeof result.address === 'string') {
      try {
        result.address = JSON.parse(decryptData(result.address));
      } catch (error) {
        console.error('Failed to decrypt address data', error);
      }
    }
    
    // Decrypt preferences if present
    if (result.preferences && typeof result.preferences === 'string') {
      try {
        result.preferences = JSON.parse(decryptData(result.preferences));
      } catch (error) {
        console.error('Failed to decrypt preferences data', error);
      }
    }
    
    return result;
  }

  /**
   * Validate contact data
   */
  private validateContactData(data: any): void {
    const errors = [];
    
    // Either email or phone is required
    if (!data.email && !data.phone) {
      errors.push('Either email or phone is required');
    }
    
    // Validate email format if provided
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }
    
    if (errors.length > 0) {
      throw new ValidationError('Contact validation failed', errors);
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/**
 * Service for managing leads
 */
export class LeadService {
  private auditLogger = new AuditLogger('marketing-lead');
  private notificationService = new NotificationService();
  
  /**
   * Create a new lead
   */
  async createLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Lead> {
    try {
      // Validate lead data
      this.validateLeadData(data);
      
      // Create lead in database
      const lead = await prisma.lead.create({
        data: {
          contactId: data.contactId,
          campaignId: data.campaignId,
          source: data.source,
          status: data.status || 'NEW',
          score: data.score,
          assignedToId: data.assignedToId,
          notes: data.notes,
          convertedToPatientId: data.convertedToPatientId,
          conversionDate: data.conversionDate
        },
        include: {
          contact: true,
          campaign: true,
          assignedToUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'lead.create',
        resourceId: lead.id,
        userId,
        details: { 
          contactId: lead.contactId,
          source: lead.source,
          status: lead.status
        }
      });
      
      // Notify assigned user if applicable
      if (lead.assignedToId) {
        await this.notificationService.sendNotification({
          type: 'LEAD_ASSIGNED',
          title: 'New Lead Assigned',
          message: `A new lead has been assigned to you: ${lead.contact.firstName || ''} ${lead.contact.lastName || ''}`,
          recipientIds: [lead.assignedToId],
          metadata: { leadId: lead.id }
        });
      }
      
      return lead;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create lead', error);
    }
  }

  /**
   * Get a lead by ID
   */
  async getLeadById(id: string): Promise<Lead> {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id },
        include: {
          contact: true,
          campaign: true,
          assignedToUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          convertedToPatient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true
            }
          },
          activities: {
            include: {
              performedByUser: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              timestamp: 'desc'
            }
          }
        }
      });
      
      if (!lead) {
        throw new NotFoundError(`Lead with ID ${id} not found`);
      }
      
      return lead;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve lead', error);
    }
  }

  /**
   * Get all leads with optional filtering
   */
  async getLeads(filters: {
    status?: string;
    source?: string;
    campaignId?: string;
    assignedToId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Lead[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    try {
      const { 
        status, 
        source, 
        campaignId,
        assignedToId,
        page = 1, 
        limit = 10 
      } = filters;
      
      // Build where clause based on filters
      const where: any = {};
      
      if (status) {
        where.status = status;
      }
      
      if (source) {
        where.source = source;
      }
      
      if (campaignId) {
        where.campaignId = campaignId;
      }
      
      if (assignedToId) {
        where.assignedToId = assignedToId;
      }
      
      // Get total count for pagination
      const total = await prisma.lead.count({ where });
      
      // Get leads with pagination
      const leads = await prisma.lead.findMany({
        where,
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          },
          campaign: {
            select: {
              id: true,
              name: true
            }
          },
          assignedToUser: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              activities: true
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
        data: leads,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new DatabaseError('Failed to retrieve leads', error);
    }
  }

  /**
   * Update a lead
   */
  async updateLead(id: string, data: Partial<Lead>, userId: string): Promise<Lead> {
    try {
      // Check if lead exists
      const existingLead = await prisma.lead.findUnique({
        where: { id },
        include: {
          assignedToUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      if (!existingLead) {
        throw new NotFoundError(`Lead with ID ${id} not found`);
      }
      
      // Check if status is changing to CONVERTED and set conversion date
      if (data.status === 'CONVERTED' && existingLead.status !== 'CONVERTED') {
        data.conversionDate = new Date();
      }
      
      // Update lead
      const updatedLead = await prisma.lead.update({
        where: { id },
        data,
        include: {
          contact: true,
          campaign: true,
          assignedToUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'lead.update',
        resourceId: id,
        userId,
        details: { 
          updatedFields: Object.keys(data) 
        }
      });
      
      // Create activity for status change if applicable
      if (data.status && data.status !== existingLead.status) {
        await this.addLeadActivity(id, {
          activityType: 'STATUS_CHANGE',
          description: `Status changed from ${existingLead.status} to ${data.status}`,
          performedById: userId
        });
      }
      
      // Notify newly assigned user if applicable
      if (data.assignedToId && data.assignedToId !== existingLead.assignedToId) {
        await this.notificationService.sendNotification({
          type: 'LEAD_ASSIGNED',
          title: 'Lead Assigned',
          message: `A lead has been assigned to you: ${updatedLead.contact.firstName || ''} ${updatedLead.contact.lastName || ''}`,
          recipientIds: [data.assignedToId],
          metadata: { leadId: id }
        });
      }
      
      return updatedLead;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update lead', error);
    }
  }

  /**
   * Add an activity to a lead
   */
  async addLeadActivity(leadId: string, data: { activityType: string; description: string; performedById: string; metadata?: any }): Promise<any> {
    try {
      // Check if lead exists
      const existingLead = await prisma.lead.findUnique({
        where: { id: leadId }
      });
      
      if (!existingLead) {
        throw new NotFoundError(`Lead with ID ${leadId} not found`);
      }
      
      // Create activity
      const activity = await prisma.leadActivity.create({
        data: {
          leadId,
          activityType: data.activityType,
          description: data.description,
          performedById: data.performedById,
          metadata: data.metadata
        },
        include: {
          performedByUser: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'lead.activity.add',
        resourceId: leadId,
        userId: data.performedById,
        details: { 
          activityId: activity.id,
          activityType: data.activityType
        }
      });
      
      return activity;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to add lead activity', error);
    }
  }

  /**
   * Convert a lead to a patient
   */
  async convertLeadToPatient(leadId: string, patientData: any, userId: string): Promise<any> {
    try {
      // Check if lead exists
      const existingLead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          contact: true
        }
      });
      
      if (!existingLead) {
        throw new NotFoundError(`Lead with ID ${leadId} not found`);
      }
      
      // Check if lead is already converted
      if (existingLead.convertedToPatientId) {
        throw new ValidationError('Lead conversion failed', ['Lead is already converted']);
      }
      
      // Create patient from lead data
      const patient = await prisma.patient.create({
        data: {
          firstName: patientData.firstName || existingLead.contact.firstName,
          lastName: patientData.lastName || existingLead.contact.lastName,
          email: patientData.email || existingLead.contact.email,
          phone: patientData.phone || existingLead.contact.phone,
          dateOfBirth: patientData.dateOfBirth || existingLead.contact.dateOfBirth,
          gender: patientData.gender || existingLead.contact.gender,
          address: patientData.address || existingLead.contact.address,
          // Add other patient fields as needed
        }
      });
      
      // Update lead with conversion data
      const updatedLead = await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: 'CONVERTED',
          convertedToPatientId: patient.id,
          conversionDate: new Date()
        }
      });
      
      // Log audit event
      await this.auditLogger.log({
        action: 'lead.convert',
        resourceId: leadId,
        userId,
        details: { 
          patientId: patient.id
        }
      });
      
      // Add lead activity
      await this.addLeadActivity(leadId, {
        activityType: 'CONVERSION',
        description: `Lead converted to patient`,
        performedById: userId,
        metadata: { patientId: patient.id }
      });
      
      return {
        lead: updatedLead,
        patient
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to convert lead to patient', error);
    }
  }

  /**
   * Validate lead data
   */
  private validateLeadData(data: any): void {
    const errors = [];
    
    if (!data.contactId) {
      errors.push('Contact ID is required');
    }
    
    if (!data.source) {
      errors.push('Lead source is required');
    }
    
    if (errors.length > 0) {
      throw new ValidationError('Lead validation failed', errors);
    }
  }
}
