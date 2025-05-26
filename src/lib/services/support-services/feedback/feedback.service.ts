import { prisma } from '@/lib/prisma';
import { Feedback, FeedbackResponse, FeedbackAttachment, Complaint, ComplaintActivity, ComplaintAttachment, FollowUpAction, FeedbackSurveyTemplate, FeedbackSurvey } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-logging';
import { toFHIRFeedback, toFHIRComplaint, toFHIRFollowUpAction, toFHIRFeedbackSurveyTemplate } from '@/lib/models/feedback';
import { NotificationService } from '@/lib/services/notification.service';

export interface FeedbackFilter {
  type?: string;
  source?: string;
  status?: string;
  departmentId?: string;
  serviceType?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

export interface ComplaintFilter {
  category?: string;
  severity?: string;
  status?: string;
  departmentId?: string;
  assignedToId?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

export interface CreateFeedbackData {
  type: string;
  source: string;
  rating: number;
  comments?: string;
  submittedById?: string;
  patientId?: string;
  departmentId?: string;
  serviceId?: string;
  serviceType?: string;
  tags?: string[];
  anonymous: boolean;
  contactInfo?: any;
}

export interface CreateComplaintData {
  title: string;
  description: string;
  category: string;
  severity: string;
  submittedById?: string;
  patientId?: string;
  departmentId?: string;
  anonymous: boolean;
  contactInfo?: any;
  dueDate?: Date;
}

export class FeedbackService {
  private notificationService: NotificationService;
  
  constructor() {
    this.notificationService = new NotificationService();
  }
  
  /**
   * Get feedback based on filters
   */
  async getFeedback(filter: FeedbackFilter) {
    const { type, source, status, departmentId, serviceType, startDate, endDate, page, limit } = filter;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (type) where.type = type;
    if (source) where.source = source;
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (serviceType) where.serviceType = serviceType;
    
    // Date range filter for createdAt
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    
    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          submittedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          patient: {
            select: {
              id: true,
              name: true,
              dateOfBirth: true,
              gender: true
            }
          },
          department: true,
          reviewedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          responses: {
            include: {
              respondedByUser: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          attachments: {
            include: {
              uploadedByUser: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          followUpActions: {
            where: {
              status: {
                in: ['PLANNED', 'IN_PROGRESS']
              }
            },
            include: {
              assignedToUser: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.feedback.count({ where })
    ]);
    
    // Convert to FHIR format
    const fhirFeedback = feedback.map(item => toFHIRFeedback(item));
    
    return {
      data: feedback,
      fhir: fhirFeedback,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get feedback by ID
   */
  async getFeedbackById(id: string, includeFHIR: boolean = false): Promise<any> {
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        submittedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true,
            dateOfBirth: true,
            gender: true
          }
        },
        department: true,
        reviewedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        responses: {
          include: {
            respondedByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        attachments: {
          include: {
            uploadedByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        followUpActions: {
          include: {
            assignedToUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!feedback) {
      return null;
    }
    
    if (includeFHIR) {
      return {
        data: feedback,
        fhir: toFHIRFeedback(feedback)
      };
    }
    
    return feedback;
  }
  
  /**
   * Create new feedback
   */
  async createFeedback(data: CreateFeedbackData, userId?: string): Promise<Feedback> {
    // Validate department if provided
    if (data.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: data.departmentId }
      });
      
      if (!department) {
        throw new Error('Department not found');
      }
    }
    
    // Validate patient if provided
    if (data.patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: data.patientId }
      });
      
      if (!patient) {
        throw new Error('Patient not found');
      }
    }
    
    // Create the feedback
    const feedback = await prisma.feedback.create({
      data: {
        type: data.type,
        source: data.source,
        rating: data.rating,
        comments: data.comments,
        submittedById: data.anonymous ? null : (data.submittedById || userId),
        patientId: data.patientId,
        departmentId: data.departmentId,
        serviceId: data.serviceId,
        serviceType: data.serviceType,
        status: 'NEW',
        tags: data.tags || [],
        anonymous: data.anonymous,
        contactInfo: data.anonymous && data.contactInfo ? data.contactInfo : null
      },
      include: {
        submittedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true
          }
        },
        department: true
      }
    });
    
    // Create audit log
    if (userId) {
      await createAuditLog({
        action: 'CREATE',
        entityType: 'FEEDBACK',
        entityId: feedback.id,
        userId,
        details: `Created ${data.type} feedback with rating ${data.rating}`
      });
    }
    
    // Send notification to department managers or service managers
    let recipientRoles = ['FEEDBACK_MANAGER'];
    let notificationTitle = 'New Feedback Received';
    let notificationMessage = `New ${data.type} feedback received`;
    
    if (data.departmentId) {
      recipientRoles.push('DEPARTMENT_MANAGER');
      notificationMessage += ` for ${feedback.department?.name || 'a department'}`;
    }
    
    if (data.serviceType) {
      recipientRoles.push(`${data.serviceType}_MANAGER`);
      notificationMessage += ` regarding ${data.serviceType} service`;
    }
    
    await this.notificationService.sendNotification({
      type: 'NEW_FEEDBACK',
      title: notificationTitle,
      message: notificationMessage,
      recipientRoles,
      entityId: feedback.id,
      metadata: {
        feedbackId: feedback.id,
        type: data.type,
        rating: data.rating,
        departmentId: data.departmentId,
        serviceType: data.serviceType
      }
    });
    
    return feedback;
  }
  
  /**
   * Update feedback status
   */
  async updateFeedbackStatus(id: string, status: string, reviewNotes: string | null, userId: string): Promise<Feedback> {
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        department: true
      }
    });
    
    if (!feedback) {
      throw new Error('Feedback not found');
    }
    
    // Update the feedback
    const updatedFeedback = await prisma.feedback.update({
      where: { id },
      data: {
        status,
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || undefined
      },
      include: {
        submittedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true
          }
        },
        department: true,
        reviewedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'FEEDBACK',
      entityId: id,
      userId,
      details: `Updated feedback status to ${status}`
    });
    
    // Send notification to submitter if not anonymous and has user account
    if (!feedback.anonymous && feedback.submittedById) {
      await this.notificationService.sendNotification({
        type: 'FEEDBACK_STATUS_UPDATE',
        title: 'Feedback Status Updated',
        message: `Your feedback has been ${status.toLowerCase()}`,
        recipientIds: [feedback.submittedById],
        entityId: feedback.id,
        metadata: {
          feedbackId: feedback.id,
          status
        }
      });
    }
    
    return updatedFeedback;
  }
  
  /**
   * Add response to feedback
   */
  async addFeedbackResponse(feedbackId: string, responseText: string, isPublic: boolean, userId: string): Promise<FeedbackResponse> {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: {
        submittedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!feedback) {
      throw new Error('Feedback not found');
    }
    
    // Create the response
    const response = await prisma.feedbackResponse.create({
      data: {
        feedbackId,
        responseText,
        respondedById: userId,
        isPublic
      },
      include: {
        respondedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entityType: 'FEEDBACK_RESPONSE',
      entityId: response.id,
      userId,
      details: `Added response to feedback ${feedbackId}`
    });
    
    // Send notification to submitter if not anonymous and has user account
    if (isPublic && !feedback.anonymous && feedback.submittedById) {
      await this.notificationService.sendNotification({
        type: 'FEEDBACK_RESPONSE',
        title: 'Response to Your Feedback',
        message: 'Your feedback has received a response',
        recipientIds: [feedback.submittedById],
        entityId: feedbackId,
        metadata: {
          feedbackId,
          responseId: response.id
        }
      });
    }
    
    return response;
  }
  
  /**
   * Add attachment to feedback
   */
  async addFeedbackAttachment(feedbackId: string, fileUrl: string, fileName: string, fileType: string, fileSize: number, userId: string): Promise<FeedbackAttachment> {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId }
    });
    
    if (!feedback) {
      throw new Error('Feedback not found');
    }
    
    // Create the attachment
    const attachment = await prisma.feedbackAttachment.create({
      data: {
        feedbackId,
        fileUrl,
        fileName,
        fileType,
        fileSize,
        uploadedById: userId
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entityType: 'FEEDBACK_ATTACHMENT',
      entityId: attachment.id,
      userId,
      details: `Added attachment ${fileName} to feedback ${feedbackId}`
    });
    
    return attachment;
  }
  
  /**
   * Get complaints based on filters
   */
  async getComplaints(filter: ComplaintFilter) {
    const { category, severity, status, departmentId, assignedToId, startDate, endDate, page, limit } = filter;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (category) where.category = category;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (assignedToId) where.assignedToId = assignedToId;
    
    // Date range filter for createdAt
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    
    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        include: {
          submittedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          patient: {
            select: {
              id: true,
              name: true,
              dateOfBirth: true,
              gender: true
            }
          },
          department: true,
          assignedToUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          resolvedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          escalatedToUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              activities: true,
              attachments: true,
              followUpActions: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.complaint.count({ where })
    ]);
    
    // Convert to FHIR format
    const fhirComplaints = complaints.map(complaint => toFHIRComplaint(complaint));
    
    return {
      data: complaints,
      fhir: fhirComplaints,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get complaint by ID
   */
  async getComplaintById(id: string, includeFHIR: boolean = false): Promise<any> {
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        submittedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true,
            dateOfBirth: true,
            gender: true
          }
        },
        department: true,
        assignedToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        resolvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        escalatedToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        activities: {
          include: {
            performedByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        attachments: {
          include: {
            uploadedByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        followUpActions: {
          include: {
            assignedToUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!complaint) {
      return null;
    }
    
    if (includeFHIR) {
      return {
        data: complaint,
        fhir: toFHIRComplaint(complaint)
      };
    }
    
    return complaint;
  }
  
  /**
   * Create new complaint
   */
  async createComplaint(data: CreateComplaintData, userId?: string): Promise<Complaint> {
    // Validate department if provided
    if (data.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: data.departmentId }
      });
      
      if (!department) {
        throw new Error('Department not found');
      }
    }
    
    // Validate patient if provided
    if (data.patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: data.patientId }
      });
      
      if (!patient) {
        throw new Error('Patient not found');
      }
    }
    
    // Create the complaint
    const complaint = await prisma.complaint.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        severity: data.severity,
        status: 'SUBMITTED',
        submittedById: data.anonymous ? null : (data.submittedById || userId),
        patientId: data.patientId,
        departmentId: data.departmentId,
        dueDate: data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default due date: 7 days from now
        anonymous: data.anonymous,
        contactInfo: data.anonymous && data.contactInfo ? data.contactInfo : null
      },
      include: {
        submittedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true
          }
        },
        department: true
      }
    });
    
    // Create initial activity
    await prisma.complaintActivity.create({
      data: {
        complaintId: complaint.id,
        activityType: 'STATUS_CHANGE',
        description: 'Complaint submitted',
        performedById: userId || 'system'
      }
    });
    
    // Create audit log
    if (userId) {
      await createAuditLog({
        action: 'CREATE',
        entityType: 'COMPLAINT',
        entityId: complaint.id,
        userId,
        details: `Created ${data.severity} ${data.category} complaint: ${data.title}`
      });
    }
    
    // Send notification to complaint managers
    let recipientRoles = ['COMPLAINT_MANAGER'];
    
    if (data.departmentId) {
      recipientRoles.push('DEPARTMENT_MANAGER');
    }
    
    // High and critical complaints should notify higher management
    if (data.severity === 'HIGH' || data.severity === 'CRITICAL') {
      recipientRoles.push('QUALITY_MANAGER');
      
      if (data.severity === 'CRITICAL') {
        recipientRoles.push('HOSPITAL_ADMINISTRATOR');
      }
    }
    
    await this.notificationService.sendNotification({
      type: 'NEW_COMPLAINT',
      title: `New ${data.severity} Complaint`,
      message: `New ${data.severity.toLowerCase()} ${data.category.toLowerCase()} complaint: ${data.title}`,
      recipientRoles,
      entityId: complaint.id,
      metadata: {
        complaintId: complaint.id,
        severity: data.severity,
        category: data.category,
        departmentId: data.departmentId
      }
    });
    
    return complaint;
  }
  
  /**
   * Update complaint status
   */
  async updateComplaintStatus(id: string, status: string, details: string | null, userId: string): Promise<Complaint> {
    const complaint = await prisma.complaint.findUnique({
      where: { id }
    });
    
    if (!complaint) {
      throw new Error('Complaint not found');
    }
    
    const updateData: any = { status };
    
    // Handle status-specific updates
    switch (status) {
      case 'RESOLVED':
        updateData.resolutionDetails = details || undefined;
        updateData.resolutionDate = new Date();
        updateData.resolvedById = userId;
        break;
      
      case 'ESCALATED':
        updateData.escalationReason = details || undefined;
        updateData.escalationDate = new Date();
        break;
    }
    
    // Update the complaint
    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: updateData,
      include: {
        submittedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true
          }
        },
        department: true,
        assignedToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        resolvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        escalatedToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Create activity
    await prisma.complaintActivity.create({
      data: {
        complaintId: id,
        activityType: 'STATUS_CHANGE',
        description: `Status changed to ${status}${details ? `: ${details}` : ''}`,
        performedById: userId
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'COMPLAINT',
      entityId: id,
      userId,
      details: `Updated complaint status to ${status}`
    });
    
    // Send notification to submitter if not anonymous and has user account
    if (!complaint.anonymous && complaint.submittedById) {
      await this.notificationService.sendNotification({
        type: 'COMPLAINT_STATUS_UPDATE',
        title: 'Complaint Status Updated',
        message: `Your complaint has been ${status.toLowerCase()}`,
        recipientIds: [complaint.submittedById],
        entityId: id,
        metadata: {
          complaintId: id,
          status
        }
      });
    }
    
    // Send notification to assigned user
    if (complaint.assignedToId) {
      await this.notificationService.sendNotification({
        type: 'COMPLAINT_STATUS_UPDATE',
        title: 'Complaint Status Updated',
        message: `Complaint ${id} has been ${status.toLowerCase()}`,
        recipientIds: [complaint.assignedToId],
        entityId: id,
        metadata: {
          complaintId: id,
          status
        }
      });
    }
    
    return updatedComplaint;
  }
  
  /**
   * Assign complaint to user
   */
  async assignComplaint(id: string, assignedToId: string, userId: string): Promise<Complaint> {
    const complaint = await prisma.complaint.findUnique({
      where: { id }
    });
    
    if (!complaint) {
      throw new Error('Complaint not found');
    }
    
    // Validate assigned user
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId }
    });
    
    if (!assignedUser) {
      throw new Error('Assigned user not found');
    }
    
    // Update the complaint
    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: {
        assignedToId,
        status: complaint.status === 'SUBMITTED' ? 'UNDER_INVESTIGATION' : complaint.status
      },
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
    
    // Create activity
    await prisma.complaintActivity.create({
      data: {
        complaintId: id,
        activityType: 'ASSIGNMENT',
        description: `Assigned to ${assignedUser.name}`,
        performedById: userId
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'COMPLAINT',
      entityId: id,
      userId,
      details: `Assigned complaint to ${assignedUser.name}`
    });
    
    // Send notification to assigned user
    await this.notificationService.sendNotification({
      type: 'COMPLAINT_ASSIGNED',
      title: 'Complaint Assigned',
      message: `A ${complaint.severity.toLowerCase()} complaint has been assigned to you`,
      recipientIds: [assignedToId],
      entityId: id,
      metadata: {
        complaintId: id,
        severity: complaint.severity,
        category: complaint.category
      }
    });
    
    return updatedComplaint;
  }
  
  /**
   * Escalate complaint to user
   */
  async escalateComplaint(id: string, escalatedToId: string, reason: string, userId: string): Promise<Complaint> {
    const complaint = await prisma.complaint.findUnique({
      where: { id }
    });
    
    if (!complaint) {
      throw new Error('Complaint not found');
    }
    
    // Validate escalated user
    const escalatedUser = await prisma.user.findUnique({
      where: { id: escalatedToId }
    });
    
    if (!escalatedUser) {
      throw new Error('Escalation user not found');
    }
    
    // Update the complaint
    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: {
        escalatedToId,
        escalationReason: reason,
        escalationDate: new Date(),
        status: 'ESCALATED'
      },
      include: {
        escalatedToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Create activity
    await prisma.complaintActivity.create({
      data: {
        complaintId: id,
        activityType: 'ESCALATION',
        description: `Escalated to ${escalatedUser.name}: ${reason}`,
        performedById: userId
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'COMPLAINT',
      entityId: id,
      userId,
      details: `Escalated complaint to ${escalatedUser.name}`
    });
    
    // Send notification to escalated user
    await this.notificationService.sendNotification({
      type: 'COMPLAINT_ESCALATED',
      title: 'Complaint Escalated',
      message: `A ${complaint.severity.toLowerCase()} complaint has been escalated to you`,
      recipientIds: [escalatedToId],
      entityId: id,
      metadata: {
        complaintId: id,
        severity: complaint.severity,
        category: complaint.category,
        reason
      }
    });
    
    return updatedComplaint;
  }
  
  /**
   * Add comment to complaint
   */
  async addComplaintComment(id: string, comment: string, userId: string): Promise<ComplaintActivity> {
    const complaint = await prisma.complaint.findUnique({
      where: { id }
    });
    
    if (!complaint) {
      throw new Error('Complaint not found');
    }
    
    // Create activity
    const activity = await prisma.complaintActivity.create({
      data: {
        complaintId: id,
        activityType: 'COMMENT',
        description: comment,
        performedById: userId
      },
      include: {
        performedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entityType: 'COMPLAINT_ACTIVITY',
      entityId: activity.id,
      userId,
      details: `Added comment to complaint ${id}`
    });
    
    // Send notification to assigned user if comment is from someone else
    if (complaint.assignedToId && complaint.assignedToId !== userId) {
      await this.notificationService.sendNotification({
        type: 'COMPLAINT_COMMENT',
        title: 'New Comment on Assigned Complaint',
        message: `A new comment has been added to complaint ${id}`,
        recipientIds: [complaint.assignedToId],
        entityId: id,
        metadata: {
          complaintId: id,
          activityId: activity.id
        }
      });
    }
    
    return activity;
  }
  
  /**
   * Add attachment to complaint
   */
  async addComplaintAttachment(complaintId: string, fileUrl: string, fileName: string, fileType: string, fileSize: number, userId: string): Promise<ComplaintAttachment> {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId }
    });
    
    if (!complaint) {
      throw new Error('Complaint not found');
    }
    
    // Create the attachment
    const attachment = await prisma.complaintAttachment.create({
      data: {
        complaintId,
        fileUrl,
        fileName,
        fileType,
        fileSize,
        uploadedById: userId
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Create activity
    await prisma.complaintActivity.create({
      data: {
        complaintId,
        activityType: 'COMMENT',
        description: `Attached file: ${fileName}`,
        performedById: userId
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entityType: 'COMPLAINT_ATTACHMENT',
      entityId: attachment.id,
      userId,
      details: `Added attachment ${fileName} to complaint ${complaintId}`
    });
    
    return attachment;
  }
  
  /**
   * Create follow-up action
   */
  async createFollowUpAction(data: any, userId: string): Promise<FollowUpAction> {
    // Validate that either feedback or complaint is provided
    if (!data.feedbackId && !data.complaintId) {
      throw new Error('Either feedback or complaint must be provided');
    }
    
    // Validate feedback if provided
    if (data.feedbackId) {
      const feedback = await prisma.feedback.findUnique({
        where: { id: data.feedbackId }
      });
      
      if (!feedback) {
        throw new Error('Feedback not found');
      }
    }
    
    // Validate complaint if provided
    if (data.complaintId) {
      const complaint = await prisma.complaint.findUnique({
        where: { id: data.complaintId }
      });
      
      if (!complaint) {
        throw new Error('Complaint not found');
      }
    }
    
    // Validate assigned user if provided
    if (data.assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: data.assignedToId }
      });
      
      if (!assignedUser) {
        throw new Error('Assigned user not found');
      }
    }
    
    // Create the follow-up action
    const action = await prisma.followUpAction.create({
      data: {
        actionType: data.actionType,
        description: data.description,
        status: 'PLANNED',
        dueDate: data.dueDate,
        assignedToId: data.assignedToId,
        feedbackId: data.feedbackId,
        complaintId: data.complaintId,
        createdById: userId
      },
      include: {
        assignedToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        feedback: true,
        complaint: true
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entityType: 'FOLLOW_UP_ACTION',
      entityId: action.id,
      userId,
      details: `Created ${data.actionType} follow-up action${data.feedbackId ? ` for feedback ${data.feedbackId}` : ''}${data.complaintId ? ` for complaint ${data.complaintId}` : ''}`
    });
    
    // If complaint, add activity
    if (data.complaintId) {
      await prisma.complaintActivity.create({
        data: {
          complaintId: data.complaintId,
          activityType: 'COMMENT',
          description: `Created follow-up action: ${data.actionType} - ${data.description}`,
          performedById: userId
        }
      });
    }
    
    // Send notification to assigned user
    if (data.assignedToId) {
      await this.notificationService.sendNotification({
        type: 'FOLLOW_UP_ACTION_ASSIGNED',
        title: 'Follow-up Action Assigned',
        message: `A ${data.actionType.toLowerCase()} follow-up action has been assigned to you`,
        recipientIds: [data.assignedToId],
        entityId: action.id,
        metadata: {
          actionId: action.id,
          actionType: data.actionType,
          feedbackId: data.feedbackId,
          complaintId: data.complaintId,
          dueDate: data.dueDate?.toISOString()
        }
      });
    }
    
    return action;
  }
  
  /**
   * Update follow-up action status
   */
  async updateFollowUpActionStatus(id: string, status: string, userId: string): Promise<FollowUpAction> {
    const action = await prisma.followUpAction.findUnique({
      where: { id },
      include: {
        feedback: true,
        complaint: true
      }
    });
    
    if (!action) {
      throw new Error('Follow-up action not found');
    }
    
    const updateData: any = { status };
    
    // If status is COMPLETED, set completedDate
    if (status === 'COMPLETED') {
      updateData.completedDate = new Date();
    }
    
    // Update the action
    const updatedAction = await prisma.followUpAction.update({
      where: { id },
      data: updateData,
      include: {
        assignedToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        feedback: true,
        complaint: true
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'FOLLOW_UP_ACTION',
      entityId: id,
      userId,
      details: `Updated follow-up action status to ${status}`
    });
    
    // If complaint, add activity
    if (action.complaintId) {
      await prisma.complaintActivity.create({
        data: {
          complaintId: action.complaintId,
          activityType: 'COMMENT',
          description: `Follow-up action status updated to ${status}: ${action.description}`,
          performedById: userId
        }
      });
    }
    
    // Send notification to creator
    await this.notificationService.sendNotification({
      type: 'FOLLOW_UP_ACTION_STATUS',
      title: 'Follow-up Action Status Updated',
      message: `Follow-up action status updated to ${status.toLowerCase()}`,
      recipientIds: [action.createdById],
      entityId: id,
      metadata: {
        actionId: id,
        status,
        feedbackId: action.feedbackId,
        complaintId: action.complaintId
      }
    });
    
    return updatedAction;
  }
  
  /**
   * Create feedback survey template
   */
  async createSurveyTemplate(data: any, userId: string): Promise<FeedbackSurveyTemplate> {
    // Create the template
    const template = await prisma.feedbackSurveyTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        serviceType: data.serviceType,
        questions: data.questions,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdById: userId
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      entityType: 'FEEDBACK_SURVEY_TEMPLATE',
      entityId: template.id,
      userId,
      details: `Created survey template: ${template.name}`
    });
    
    return template;
  }
  
  /**
   * Submit feedback survey
   */
  async submitSurvey(templateId: string, responses: any, data: any, userId?: string): Promise<FeedbackSurvey> {
    // Validate template
    const template = await prisma.feedbackSurveyTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (!template) {
      throw new Error('Survey template not found');
    }
    
    if (!template.isActive) {
      throw new Error('Survey template is not active');
    }
    
    // Validate patient if provided
    if (data.patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: data.patientId }
      });
      
      if (!patient) {
        throw new Error('Patient not found');
      }
    }
    
    // Create the survey
    const survey = await prisma.feedbackSurvey.create({
      data: {
        templateId,
        responses,
        submittedById: data.anonymous ? null : (data.submittedById || userId),
        patientId: data.patientId,
        serviceId: data.serviceId,
        serviceType: data.serviceType || template.serviceType,
        anonymous: data.anonymous,
        contactInfo: data.anonymous && data.contactInfo ? data.contactInfo : null
      },
      include: {
        template: true,
        submittedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    // Create audit log
    if (userId) {
      await createAuditLog({
        action: 'CREATE',
        entityType: 'FEEDBACK_SURVEY',
        entityId: survey.id,
        userId,
        details: `Submitted survey for template: ${template.name}`
      });
    }
    
    // Send notification to service managers
    let recipientRoles = ['FEEDBACK_MANAGER'];
    
    if (data.serviceType || template.serviceType) {
      const serviceType = data.serviceType || template.serviceType;
      recipientRoles.push(`${serviceType}_MANAGER`);
    }
    
    await this.notificationService.sendNotification({
      type: 'NEW_SURVEY',
      title: 'New Survey Submission',
      message: `New survey submitted for ${template.name}`,
      recipientRoles,
      entityId: survey.id,
      metadata: {
        surveyId: survey.id,
        templateId,
        serviceType: data.serviceType || template.serviceType
      }
    });
    
    return survey;
  }
  
  /**
   * Get feedback analytics
   */
  async getFeedbackAnalytics(period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY') {
    // Get date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'DAILY':
        startDate = new Date(now.setDate(now.getDate() - 30)); // Last 30 days
        break;
      case 'WEEKLY':
        startDate = new Date(now.setDate(now.getDate() - 90)); // Last 90 days
        break;
      case 'MONTHLY':
        startDate = new Date(now.setMonth(now.getMonth() - 12)); // Last 12 months
        break;
      case 'YEARLY':
        startDate = new Date(now.setFullYear(now.getFullYear() - 5)); // Last 5 years
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 30)); // Default to last 30 days
    }
    
    // Get feedback counts by type
    const feedbackByType = await prisma.feedback.groupBy({
      by: ['type'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true
    });
    
    // Get feedback counts by source
    const feedbackBySource = await prisma.feedback.groupBy({
      by: ['source'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true
    });
    
    // Get feedback counts by status
    const feedbackByStatus = await prisma.feedback.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true
    });
    
    // Get feedback counts by service type
    const feedbackByServiceType = await prisma.feedback.groupBy({
      by: ['serviceType'],
      where: {
        createdAt: {
          gte: startDate
        },
        serviceType: {
          not: null
        }
      },
      _count: true
    });
    
    // Get feedback counts by department
    const feedbackByDepartment = await prisma.$queryRaw`
      SELECT d.name as department, COUNT(*) as count
      FROM Feedback f
      JOIN Department d ON f.departmentId = d.id
      WHERE f.createdAt >= ${startDate}
      GROUP BY d.name
      ORDER BY count DESC
    `;
    
    // Get average ratings
    const ratings = await prisma.feedback.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      select: {
        rating: true,
        serviceType: true,
        departmentId: true,
        department: {
          select: {
            name: true
          }
        }
      }
    });
    
    // Calculate overall average rating
    const overallRating = ratings.length > 0
      ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length
      : 0;
    
    // Calculate average rating by service type
    const ratingsByServiceType: Record<string, { count: number, sum: number, avg: number }> = {};
    
    ratings.forEach(item => {
      if (item.serviceType) {
        if (!ratingsByServiceType[item.serviceType]) {
          ratingsByServiceType[item.serviceType] = { count: 0, sum: 0, avg: 0 };
        }
        
        ratingsByServiceType[item.serviceType].count++;
        ratingsByServiceType[item.serviceType].sum += item.rating;
      }
    });
    
    // Calculate averages
    Object.keys(ratingsByServiceType).forEach(type => {
      const data = ratingsByServiceType[type];
      data.avg = data.sum / data.count;
    });
    
    // Calculate average rating by department
    const ratingsByDepartment: Record<string, { count: number, sum: number, avg: number }> = {};
    
    ratings.forEach(item => {
      if (item.departmentId && item.department) {
        const deptName = item.department.name;
        
        if (!ratingsByDepartment[deptName]) {
          ratingsByDepartment[deptName] = { count: 0, sum: 0, avg: 0 };
        }
        
        ratingsByDepartment[deptName].count++;
        ratingsByDepartment[deptName].sum += item.rating;
      }
    });
    
    // Calculate averages
    Object.keys(ratingsByDepartment).forEach(dept => {
      const data = ratingsByDepartment[dept];
      data.avg = data.sum / data.count;
    });
    
    // Get complaint counts by category
    const complaintsByCategory = await prisma.complaint.groupBy({
      by: ['category'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true
    });
    
    // Get complaint counts by severity
    const complaintsBySeverity = await prisma.complaint.groupBy({
      by: ['severity'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true
    });
    
    // Get complaint counts by status
    const complaintsByStatus = await prisma.complaint.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: true
    });
    
    // Get complaint resolution time
    const resolvedComplaints = await prisma.complaint.findMany({
      where: {
        status: 'RESOLVED',
        createdAt: {
          gte: startDate
        },
        resolutionDate: {
          not: null
        }
      },
      select: {
        createdAt: true,
        resolutionDate: true,
        severity: true
      }
    });
    
    // Calculate average resolution time
    const resolutionTimes: Record<string, { count: number, totalDays: number, avgDays: number }> = {
      overall: { count: 0, totalDays: 0, avgDays: 0 },
      LOW: { count: 0, totalDays: 0, avgDays: 0 },
      MEDIUM: { count: 0, totalDays: 0, avgDays: 0 },
      HIGH: { count: 0, totalDays: 0, avgDays: 0 },
      CRITICAL: { count: 0, totalDays: 0, avgDays: 0 }
    };
    
    resolvedComplaints.forEach(complaint => {
      if (complaint.resolutionDate) {
        const days = (complaint.resolutionDate.getTime() - complaint.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        
        resolutionTimes.overall.count++;
        resolutionTimes.overall.totalDays += days;
        
        resolutionTimes[complaint.severity].count++;
        resolutionTimes[complaint.severity].totalDays += days;
      }
    });
    
    // Calculate averages
    Object.keys(resolutionTimes).forEach(key => {
      const data = resolutionTimes[key];
      data.avgDays = data.count > 0 ? data.totalDays / data.count : 0;
    });
    
    return {
      feedbackByType,
      feedbackBySource,
      feedbackByStatus,
      feedbackByServiceType,
      feedbackByDepartment,
      overallRating,
      ratingsByServiceType,
      ratingsByDepartment,
      complaintsByCategory,
      complaintsBySeverity,
      complaintsByStatus,
      resolutionTimes,
      period
    };
  }
}
