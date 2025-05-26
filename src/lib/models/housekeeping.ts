import { HousekeepingRequest, HousekeepingTask, HousekeepingSchedule, HousekeepingInspection } from '@prisma/client';

// FHIR-compliant interfaces for Housekeeping Management

/**
 * FHIR-compliant Housekeeping Request
 * Maps to FHIR ServiceRequest resource
 */
export interface FHIRHousekeepingRequest {
  resourceType: 'ServiceRequest';
  id: string;
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  intent: 'proposal' | 'plan' | 'directive' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  priority: 'routine' | 'urgent' | 'asap' | 'stat';
  category: {
    coding: {
      system: string;
      code: string;
      display: string;
    }[];
  }[];
  code: {
    coding: {
      system: string;
      code: string;
      display: string;
    }[];
    text: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  requester: {
    reference: string;
    display?: string;
  };
  performer?: {
    reference: string;
    display?: string;
  }[];
  locationReference: {
    reference: string;
    display?: string;
  }[];
  occurrenceDateTime?: string;
  authoredOn: string;
  note?: {
    text: string;
  }[];
}

/**
 * FHIR-compliant Housekeeping Task
 * Maps to FHIR Task resource
 */
export interface FHIRHousekeepingTask {
  resourceType: 'Task';
  id: string;
  basedOn: {
    reference: string;
  }[];
  status: 'draft' | 'requested' | 'received' | 'accepted' | 'rejected' | 'ready' | 'cancelled' | 'in-progress' | 'on-hold' | 'failed' | 'completed' | 'entered-in-error';
  intent: 'unknown' | 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  priority: 'routine' | 'urgent' | 'asap' | 'stat';
  description: string;
  focus: {
    reference: string;
  };
  for: {
    reference: string;
  };
  authoredOn: string;
  lastModified: string;
  requester: {
    reference: string;
    display?: string;
  };
  owner?: {
    reference: string;
    display?: string;
  };
  note?: {
    text: string;
  }[];
  executionPeriod?: {
    start?: string;
    end?: string;
  };
}

/**
 * FHIR-compliant Housekeeping Location
 * Maps to FHIR Location resource
 */
export interface FHIRHousekeepingLocation {
  resourceType: 'Location';
  id: string;
  status: 'active' | 'suspended' | 'inactive';
  name: string;
  description?: string;
  mode: 'instance' | 'kind';
  type?: {
    coding: {
      system: string;
      code: string;
      display: string;
    }[];
  }[];
  physicalType?: {
    coding: {
      system: string;
      code: string;
      display: string;
    }[];
  };
  managingOrganization?: {
    reference: string;
  };
  partOf?: {
    reference: string;
  };
}

/**
 * FHIR-compliant Housekeeping Inspection
 * Maps to FHIR Observation resource
 */
export interface FHIRHousekeepingInspection {
  resourceType: 'Observation';
  id: string;
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category: {
    coding: {
      system: string;
      code: string;
      display: string;
    }[];
  }[];
  code: {
    coding: {
      system: string;
      code: string;
      display: string;
    }[];
    text: string;
  };
  subject?: {
    reference: string;
  };
  effectiveDateTime: string;
  performer: {
    reference: string;
    display?: string;
  }[];
  valueQuantity?: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
  component?: {
    code: {
      coding: {
        system: string;
        code: string;
        display: string;
      }[];
      text: string;
    };
    valueString?: string;
    valueQuantity?: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
  }[];
}

/**
 * Convert database HousekeepingRequest to FHIR ServiceRequest
 */
export function toFHIRHousekeepingRequest(request: HousekeepingRequest & {
  location: any;
  requestedByUser: any;
  tasks?: any[];
}): FHIRHousekeepingRequest {
  // Map status from internal to FHIR status
  const statusMap: Record<string, 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown'> = {
    'PENDING': 'draft',
    'ASSIGNED': 'active',
    'IN_PROGRESS': 'active',
    'COMPLETED': 'completed',
    'CANCELLED': 'revoked'
  };

  // Map priority from internal to FHIR priority
  const priorityMap: Record<string, 'routine' | 'urgent' | 'asap' | 'stat'> = {
    'LOW': 'routine',
    'MEDIUM': 'routine',
    'HIGH': 'urgent',
    'URGENT': 'stat'
  };

  // Map request type to FHIR coding
  const requestTypeMap: Record<string, { code: string, display: string }> = {
    'REGULAR_CLEANING': { code: 'regular-cleaning', display: 'Regular Cleaning' },
    'DEEP_CLEANING': { code: 'deep-cleaning', display: 'Deep Cleaning' },
    'SPILL_CLEANUP': { code: 'spill-cleanup', display: 'Spill Cleanup' },
    'TERMINAL_CLEANING': { code: 'terminal-cleaning', display: 'Terminal Cleaning' }
  };

  return {
    resourceType: 'ServiceRequest',
    id: request.id,
    status: statusMap[request.status] || 'unknown',
    intent: 'order',
    priority: priorityMap[request.priority] || 'routine',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/service-category',
        code: 'housekeeping',
        display: 'Housekeeping'
      }]
    }],
    code: {
      coding: [{
        system: 'http://hms.local/fhir/CodeSystem/housekeeping-request-type',
        code: requestTypeMap[request.requestType]?.code || request.requestType.toLowerCase(),
        display: requestTypeMap[request.requestType]?.display || request.requestType
      }],
      text: request.description
    },
    subject: {
      reference: `Location/${request.locationId}`,
      display: request.location?.name || 'Unknown Location'
    },
    requester: {
      reference: `User/${request.requestedById}`,
      display: request.requestedByUser?.name || 'Unknown User'
    },
    performer: request.tasks?.filter(t => t.assignedToId)?.map(task => ({
      reference: `User/${task.assignedToId}`,
      display: task.assignedToUser?.name || 'Unknown User'
    })) || [],
    locationReference: [{
      reference: `Location/${request.locationId}`,
      display: request.location?.name || 'Unknown Location'
    }],
    occurrenceDateTime: request.scheduledDate?.toISOString(),
    authoredOn: request.createdAt.toISOString(),
    note: request.notes ? [{ text: request.notes }] : []
  };
}

/**
 * Convert database HousekeepingTask to FHIR Task
 */
export function toFHIRHousekeepingTask(task: HousekeepingTask & {
  request: HousekeepingRequest;
  assignedToUser?: any;
  createdByUser: any;
}): FHIRHousekeepingTask {
  // Map status from internal to FHIR status
  const statusMap: Record<string, 'draft' | 'requested' | 'received' | 'accepted' | 'rejected' | 'ready' | 'cancelled' | 'in-progress' | 'on-hold' | 'failed' | 'completed' | 'entered-in-error'> = {
    'PENDING': 'requested',
    'IN_PROGRESS': 'in-progress',
    'COMPLETED': 'completed',
    'CANCELLED': 'cancelled'
  };

  return {
    resourceType: 'Task',
    id: task.id,
    basedOn: [{
      reference: `ServiceRequest/${task.requestId}`
    }],
    status: statusMap[task.status] || 'requested',
    intent: 'order',
    priority: priorityMap[task.request?.priority] || 'routine',
    description: task.description,
    focus: {
      reference: `ServiceRequest/${task.requestId}`
    },
    for: {
      reference: `Location/${task.request?.locationId}`
    },
    authoredOn: task.createdAt.toISOString(),
    lastModified: task.updatedAt.toISOString(),
    requester: {
      reference: `User/${task.createdById}`,
      display: task.createdByUser?.name || 'Unknown User'
    },
    owner: task.assignedToId ? {
      reference: `User/${task.assignedToId}`,
      display: task.assignedToUser?.name || 'Unknown User'
    } : undefined,
    note: task.notes ? [{ text: task.notes }] : [],
    executionPeriod: {
      start: task.startTime?.toISOString(),
      end: task.endTime?.toISOString()
    }
  };
}

/**
 * Convert database HousekeepingInspection to FHIR Observation
 */
export function toFHIRHousekeepingInspection(inspection: HousekeepingInspection & {
  location: any;
  inspector: any;
}): FHIRHousekeepingInspection {
  // Map status from internal to FHIR status
  const statusMap: Record<string, 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown'> = {
    'SCHEDULED': 'registered',
    'COMPLETED': 'final',
    'FAILED': 'final'
  };

  return {
    resourceType: 'Observation',
    id: inspection.id,
    status: statusMap[inspection.status] || 'unknown',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'survey',
        display: 'Survey'
      }]
    }],
    code: {
      coding: [{
        system: 'http://hms.local/fhir/CodeSystem/housekeeping-inspection-type',
        code: inspection.inspectionType.toLowerCase(),
        display: inspection.inspectionType
      }],
      text: `Housekeeping Inspection - ${inspection.inspectionType}`
    },
    subject: {
      reference: `Location/${inspection.locationId}`
    },
    effectiveDateTime: inspection.inspectionDate.toISOString(),
    performer: [{
      reference: `User/${inspection.inspectorId}`,
      display: inspection.inspector?.name || 'Unknown Inspector'
    }],
    valueQuantity: inspection.score ? {
      value: inspection.score,
      unit: 'score',
      system: 'http://unitsofmeasure.org',
      code: 'score'
    } : undefined,
    component: [
      ...(inspection.findings ? [{
        code: {
          coding: [{
            system: 'http://hms.local/fhir/CodeSystem/housekeeping-inspection',
            code: 'findings',
            display: 'Findings'
          }],
          text: 'Findings'
        },
        valueString: inspection.findings
      }] : []),
      ...(inspection.recommendations ? [{
        code: {
          coding: [{
            system: 'http://hms.local/fhir/CodeSystem/housekeeping-inspection',
            code: 'recommendations',
            display: 'Recommendations'
          }],
          text: 'Recommendations'
        },
        valueString: inspection.recommendations
      }] : [])
    ]
  };
}

// Helper function to map priority
function priorityMap(priority: string): 'routine' | 'urgent' | 'asap' | 'stat' {
  const map: Record<string, 'routine' | 'urgent' | 'asap' | 'stat'> = {
    'LOW': 'routine',
    'MEDIUM': 'routine',
    'HIGH': 'urgent',
    'URGENT': 'stat'
  };
  return map[priority] || 'routine';
}
