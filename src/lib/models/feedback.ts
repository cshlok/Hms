import { Feedback, FeedbackResponse, FeedbackAttachment, Complaint, ComplaintActivity, ComplaintAttachment, FollowUpAction, FeedbackSurveyTemplate, FeedbackSurvey } from '@prisma/client';

// FHIR-compliant interfaces for Feedback & Complaint Management

/**
 * FHIR-compliant Feedback
 * Maps to FHIR QuestionnaireResponse resource
 */
export interface FHIRFeedback {
  resourceType: 'QuestionnaireResponse';
  id: string;
  status: 'in-progress' | 'completed' | 'amended' | 'entered-in-error' | 'stopped';
  subject?: {
    reference: string;
    display?: string;
  };
  authored: string;
  author?: {
    reference: string;
    display?: string;
  };
  source?: {
    reference: string;
    display?: string;
  };
  item?: {
    linkId: string;
    text?: string;
    answer?: {
      valueString?: string;
      valueInteger?: number;
      valueBoolean?: boolean;
      valueDate?: string;
      valueDateTime?: string;
      valueTime?: string;
      valueUri?: string;
      valueAttachment?: {
        contentType?: string;
        data?: string;
        url?: string;
        size?: number;
        title?: string;
      };
    }[];
  }[];
  meta?: {
    tag?: {
      system: string;
      code: string;
      display: string;
    }[];
  };
}

/**
 * FHIR-compliant Complaint
 * Maps to FHIR Communication resource
 */
export interface FHIRComplaint {
  resourceType: 'Communication';
  id: string;
  status: 'preparation' | 'in-progress' | 'not-done' | 'on-hold' | 'stopped' | 'completed' | 'entered-in-error' | 'unknown';
  category: {
    coding: {
      system: string;
      code: string;
      display: string;
    }[];
  }[];
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  subject?: {
    reference: string;
    display?: string;
  };
  topic?: {
    text: string;
  };
  sender?: {
    reference: string;
    display?: string;
  };
  recipient?: {
    reference: string;
    display?: string;
  }[];
  sent?: string;
  received?: string;
  payload?: {
    contentString?: string;
    contentAttachment?: {
      contentType?: string;
      data?: string;
      url?: string;
      size?: number;
      title?: string;
    };
  }[];
  note?: {
    text: string;
  }[];
}

/**
 * FHIR-compliant Follow-up Action
 * Maps to FHIR Task resource
 */
export interface FHIRFollowUpAction {
  resourceType: 'Task';
  id: string;
  identifier: {
    system: string;
    value: string;
  }[];
  status: 'draft' | 'requested' | 'received' | 'accepted' | 'rejected' | 'ready' | 'cancelled' | 'in-progress' | 'on-hold' | 'failed' | 'completed' | 'entered-in-error';
  intent: 'unknown' | 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  code: {
    coding: {
      system: string;
      code: string;
      display: string;
    }[];
    text: string;
  };
  description?: string;
  focus?: {
    reference: string;
    display?: string;
  };
  for?: {
    reference: string;
    display?: string;
  };
  authoredOn: string;
  lastModified: string;
  requester?: {
    reference: string;
    display?: string;
  };
  owner?: {
    reference: string;
    display?: string;
  };
  executionPeriod?: {
    start?: string;
    end?: string;
  };
  note?: {
    text: string;
  }[];
}

/**
 * FHIR-compliant Feedback Survey Template
 * Maps to FHIR Questionnaire resource
 */
export interface FHIRFeedbackSurveyTemplate {
  resourceType: 'Questionnaire';
  id: string;
  url?: string;
  version?: string;
  name?: string;
  title?: string;
  status: 'draft' | 'active' | 'retired' | 'unknown';
  experimental?: boolean;
  date?: string;
  publisher?: string;
  description?: string;
  purpose?: string;
  item?: {
    linkId: string;
    text: string;
    type: 'group' | 'display' | 'boolean' | 'decimal' | 'integer' | 'date' | 'dateTime' | 'time' | 'string' | 'text' | 'url' | 'choice' | 'open-choice' | 'attachment' | 'reference' | 'quantity';
    required?: boolean;
    repeats?: boolean;
    readOnly?: boolean;
    answerOption?: {
      valueString?: string;
      valueInteger?: number;
      valueBoolean?: boolean;
      valueDate?: string;
      valueDateTime?: string;
      valueTime?: string;
      valueUri?: string;
    }[];
    item?: any[]; // For nested items
  }[];
}

/**
 * Convert database Feedback to FHIR QuestionnaireResponse
 */
export function toFHIRFeedback(feedback: Feedback & {
  submittedByUser?: any;
  patient?: any;
  department?: any;
  responses?: FeedbackResponse[];
  attachments?: FeedbackAttachment[];
}): FHIRFeedback {
  // Map status from internal to FHIR status
  const statusMap: Record<string, 'in-progress' | 'completed' | 'amended' | 'entered-in-error' | 'stopped'> = {
    'NEW': 'completed',
    'REVIEWED': 'completed',
    'ADDRESSED': 'completed',
    'CLOSED': 'completed'
  };

  // Create items array for feedback data
  const items = [
    {
      linkId: 'type',
      text: 'Feedback Type',
      answer: [{ valueString: feedback.type }]
    },
    {
      linkId: 'source',
      text: 'Feedback Source',
      answer: [{ valueString: feedback.source }]
    },
    {
      linkId: 'rating',
      text: 'Rating',
      answer: [{ valueInteger: feedback.rating }]
    }
  ];

  // Add comments if present
  if (feedback.comments) {
    items.push({
      linkId: 'comments',
      text: 'Comments',
      answer: [{ valueString: feedback.comments }]
    });
  }

  // Add responses if present
  if (feedback.responses && feedback.responses.length > 0) {
    feedback.responses.forEach((response, index) => {
      items.push({
        linkId: `response-${index}`,
        text: `Response from ${response.respondedByUser?.name || 'Staff'}`,
        answer: [{ valueString: response.responseText }]
      });
    });
  }

  // Add attachments if present
  if (feedback.attachments && feedback.attachments.length > 0) {
    feedback.attachments.forEach((attachment, index) => {
      items.push({
        linkId: `attachment-${index}`,
        text: `Attachment: ${attachment.fileName}`,
        answer: [{
          valueAttachment: {
            contentType: attachment.fileType,
            url: attachment.fileUrl,
            size: attachment.fileSize,
            title: attachment.fileName
          }
        }]
      });
    });
  }

  // Create tags for metadata
  const tags = [
    {
      system: 'http://hms.local/fhir/CodeSystem/feedback-status',
      code: feedback.status.toLowerCase(),
      display: feedback.status
    }
  ];

  // Add service type tag if present
  if (feedback.serviceType) {
    tags.push({
      system: 'http://hms.local/fhir/CodeSystem/service-type',
      code: feedback.serviceType.toLowerCase(),
      display: feedback.serviceType
    });
  }

  // Add department tag if present
  if (feedback.department) {
    tags.push({
      system: 'http://hms.local/fhir/CodeSystem/department',
      code: feedback.department.id,
      display: feedback.department.name
    });
  }

  return {
    resourceType: 'QuestionnaireResponse',
    id: feedback.id,
    status: statusMap[feedback.status] || 'completed',
    subject: feedback.patientId ? {
      reference: `Patient/${feedback.patientId}`,
      display: feedback.patient?.name || 'Unknown Patient'
    } : undefined,
    authored: feedback.createdAt.toISOString(),
    author: feedback.submittedById ? {
      reference: `User/${feedback.submittedById}`,
      display: feedback.submittedByUser?.name || 'Unknown User'
    } : undefined,
    source: feedback.anonymous ? undefined : (
      feedback.submittedById ? {
        reference: `User/${feedback.submittedById}`,
        display: feedback.submittedByUser?.name || 'Unknown User'
      } : undefined
    ),
    item: items,
    meta: {
      tag: tags
    }
  };
}

/**
 * Convert database Complaint to FHIR Communication
 */
export function toFHIRComplaint(complaint: Complaint & {
  submittedByUser?: any;
  patient?: any;
  department?: any;
  assignedToUser?: any;
  resolvedByUser?: any;
  escalatedToUser?: any;
  activities?: ComplaintActivity[];
  attachments?: ComplaintAttachment[];
}): FHIRComplaint {
  // Map status from internal to FHIR status
  const statusMap: Record<string, 'preparation' | 'in-progress' | 'not-done' | 'on-hold' | 'stopped' | 'completed' | 'entered-in-error' | 'unknown'> = {
    'SUBMITTED': 'preparation',
    'UNDER_INVESTIGATION': 'in-progress',
    'RESOLVED': 'completed',
    'CLOSED': 'completed',
    'ESCALATED': 'in-progress'
  };

  // Map severity to FHIR priority
  const priorityMap: Record<string, 'routine' | 'urgent' | 'asap' | 'stat'> = {
    'LOW': 'routine',
    'MEDIUM': 'routine',
    'HIGH': 'urgent',
    'CRITICAL': 'stat'
  };

  // Map category to FHIR category coding
  const categoryCoding = {
    system: 'http://hms.local/fhir/CodeSystem/complaint-category',
    code: complaint.category.toLowerCase(),
    display: complaint.category
  };

  // Create payload for complaint details
  const payload = [
    {
      contentString: complaint.description
    }
  ];

  // Add attachments if present
  if (complaint.attachments && complaint.attachments.length > 0) {
    complaint.attachments.forEach(attachment => {
      payload.push({
        contentAttachment: {
          contentType: attachment.fileType,
          url: attachment.fileUrl,
          size: attachment.fileSize,
          title: attachment.fileName
        }
      });
    });
  }

  // Create notes for activities and resolution details
  const notes = [];

  if (complaint.activities && complaint.activities.length > 0) {
    complaint.activities.forEach(activity => {
      notes.push({
        text: `${activity.createdAt.toISOString()} - ${activity.activityType}: ${activity.description} (by ${activity.performedByUser?.name || 'Unknown User'})`
      });
    });
  }

  if (complaint.resolutionDetails) {
    notes.push({
      text: `Resolution: ${complaint.resolutionDetails} ${complaint.resolutionDate ? `(on ${complaint.resolutionDate.toISOString()})` : ''}`
    });
  }

  if (complaint.escalationReason) {
    notes.push({
      text: `Escalation: ${complaint.escalationReason} ${complaint.escalationDate ? `(on ${complaint.escalationDate.toISOString()})` : ''}`
    });
  }

  // Create recipients array
  const recipients = [];

  if (complaint.assignedToId) {
    recipients.push({
      reference: `User/${complaint.assignedToId}`,
      display: complaint.assignedToUser?.name || 'Assigned Staff'
    });
  }

  if (complaint.escalatedToId) {
    recipients.push({
      reference: `User/${complaint.escalatedToId}`,
      display: complaint.escalatedToUser?.name || 'Escalation Manager'
    });
  }

  return {
    resourceType: 'Communication',
    id: complaint.id,
    status: statusMap[complaint.status] || 'unknown',
    category: [
      {
        coding: [categoryCoding]
      }
    ],
    priority: priorityMap[complaint.severity] || 'routine',
    subject: complaint.patientId ? {
      reference: `Patient/${complaint.patientId}`,
      display: complaint.patient?.name || 'Unknown Patient'
    } : undefined,
    topic: {
      text: complaint.title
    },
    sender: complaint.submittedById ? {
      reference: `User/${complaint.submittedById}`,
      display: complaint.submittedByUser?.name || 'Unknown User'
    } : undefined,
    recipient: recipients.length > 0 ? recipients : undefined,
    sent: complaint.createdAt.toISOString(),
    received: complaint.updatedAt.toISOString(),
    payload: payload,
    note: notes.length > 0 ? notes : undefined
  };
}

/**
 * Convert database FollowUpAction to FHIR Task
 */
export function toFHIRFollowUpAction(action: FollowUpAction & {
  assignedToUser?: any;
  feedback?: any;
  complaint?: any;
  createdByUser?: any;
}): FHIRFollowUpAction {
  // Map status from internal to FHIR status
  const statusMap: Record<string, 'draft' | 'requested' | 'received' | 'accepted' | 'rejected' | 'ready' | 'cancelled' | 'in-progress' | 'on-hold' | 'failed' | 'completed' | 'entered-in-error'> = {
    'PLANNED': 'requested',
    'IN_PROGRESS': 'in-progress',
    'COMPLETED': 'completed',
    'CANCELLED': 'cancelled'
  };

  // Map action type to FHIR code
  const actionTypeCode = {
    system: 'http://hms.local/fhir/CodeSystem/follow-up-action-type',
    code: action.actionType.toLowerCase(),
    display: action.actionType.replace(/_/g, ' ')
  };

  // Determine focus (feedback or complaint)
  let focus;
  if (action.feedbackId) {
    focus = {
      reference: `QuestionnaireResponse/${action.feedbackId}`,
      display: `Feedback ${action.feedbackId}`
    };
  } else if (action.complaintId) {
    focus = {
      reference: `Communication/${action.complaintId}`,
      display: `Complaint: ${action.complaint?.title || action.complaintId}`
    };
  }

  return {
    resourceType: 'Task',
    id: action.id,
    identifier: [
      {
        system: 'http://hms.local/fhir/identifier/follow-up-action',
        value: action.id
      }
    ],
    status: statusMap[action.status] || 'requested',
    intent: 'order',
    priority: action.dueDate && new Date(action.dueDate) < new Date() ? 'urgent' : 'routine',
    code: {
      coding: [actionTypeCode],
      text: action.actionType.replace(/_/g, ' ')
    },
    description: action.description,
    focus: focus,
    authoredOn: action.createdAt.toISOString(),
    lastModified: action.updatedAt.toISOString(),
    requester: {
      reference: `User/${action.createdById}`,
      display: action.createdByUser?.name || 'Unknown User'
    },
    owner: action.assignedToId ? {
      reference: `User/${action.assignedToId}`,
      display: action.assignedToUser?.name || 'Unknown User'
    } : undefined,
    executionPeriod: {
      start: action.createdAt.toISOString(),
      end: action.completedDate?.toISOString()
    },
    note: [
      {
        text: `Follow-up action ${action.status.toLowerCase()}: ${action.description}`
      }
    ]
  };
}

/**
 * Convert database FeedbackSurveyTemplate to FHIR Questionnaire
 */
export function toFHIRFeedbackSurveyTemplate(template: FeedbackSurveyTemplate & {
  createdByUser?: any;
}): FHIRFeedbackSurveyTemplate {
  // Parse questions from JSON
  const questions = template.questions as any[];
  
  // Map questions to FHIR items
  const items = questions.map(question => {
    const item: any = {
      linkId: question.id || `question-${Math.random().toString(36).substring(2, 11)}`,
      text: question.text,
      type: mapQuestionTypeToFHIR(question.type),
      required: question.required || false
    };

    // Add answer options if present
    if (question.options && Array.isArray(question.options) && question.options.length > 0) {
      item.answerOption = question.options.map((option: any) => {
        if (typeof option === 'string') {
          return { valueString: option };
        } else if (typeof option === 'number') {
          return { valueInteger: option };
        } else if (typeof option === 'boolean') {
          return { valueBoolean: option };
        } else if (option.value !== undefined) {
          if (typeof option.value === 'string') {
            return { valueString: option.value };
          } else if (typeof option.value === 'number') {
            return { valueInteger: option.value };
          } else if (typeof option.value === 'boolean') {
            return { valueBoolean: option.value };
          }
        }
        return { valueString: String(option) };
      });
    }

    return item;
  });

  return {
    resourceType: 'Questionnaire',
    id: template.id,
    url: `http://hms.local/fhir/Questionnaire/${template.id}`,
    name: template.name.replace(/\s+/g, ''),
    title: template.name,
    status: template.isActive ? 'active' : 'draft',
    date: template.updatedAt.toISOString(),
    publisher: 'Hospital Management System',
    description: template.description || `Survey template for ${template.serviceType}`,
    purpose: `Collect feedback for ${template.serviceType} services`,
    item: items
  };
}

/**
 * Helper function to map question types to FHIR item types
 */
function mapQuestionTypeToFHIR(type: string): string {
  switch (type.toLowerCase()) {
    case 'text':
    case 'textarea':
      return 'text';
    case 'number':
    case 'numeric':
      return 'integer';
    case 'boolean':
    case 'checkbox':
      return 'boolean';
    case 'date':
      return 'date';
    case 'datetime':
      return 'dateTime';
    case 'time':
      return 'time';
    case 'select':
    case 'radio':
    case 'dropdown':
      return 'choice';
    case 'multiselect':
    case 'checkboxes':
      return 'open-choice';
    case 'file':
    case 'attachment':
      return 'attachment';
    case 'url':
    case 'link':
      return 'url';
    case 'group':
    case 'section':
      return 'group';
    default:
      return 'string';
  }
}
