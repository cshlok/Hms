import { MaintenanceRequest, MaintenanceWorkOrder, Asset, MaintenanceSchedule } from '@prisma/client';

// FHIR-compliant interfaces for Maintenance Management

/**
 * FHIR-compliant Maintenance Request
 * Maps to FHIR ServiceRequest resource
 */
export interface FHIRMaintenanceRequest {
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
 * FHIR-compliant Maintenance Work Order
 * Maps to FHIR Task resource
 */
export interface FHIRMaintenanceWorkOrder {
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
 * FHIR-compliant Asset
 * Maps to FHIR Device resource
 */
export interface FHIRAsset {
  resourceType: 'Device';
  id: string;
  identifier: {
    system: string;
    value: string;
  }[];
  status: 'active' | 'inactive' | 'entered-in-error' | 'unknown';
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  type: {
    coding: {
      system: string;
      code: string;
      display: string;
    }[];
    text: string;
  };
  location?: {
    reference: string;
    display?: string;
  };
  note?: {
    text: string;
  }[];
  manufactureDate?: string;
  expirationDate?: string;
}

/**
 * Convert database MaintenanceRequest to FHIR ServiceRequest
 */
export function toFHIRMaintenanceRequest(request: MaintenanceRequest & {
  location: any;
  asset?: any;
  requestedByUser: any;
  workOrders?: any[];
}): FHIRMaintenanceRequest {
  // Map status from internal to FHIR status
  const statusMap: Record<string, 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown'> = {
    'PENDING': 'draft',
    'ASSIGNED': 'active',
    'IN_PROGRESS': 'active',
    'ON_HOLD': 'on-hold',
    'COMPLETED': 'completed',
    'CANCELLED': 'revoked'
  };

  // Map priority from internal to FHIR priority
  const priorityMap: Record<string, 'routine' | 'urgent' | 'asap' | 'stat'> = {
    'LOW': 'routine',
    'MEDIUM': 'routine',
    'HIGH': 'urgent',
    'EMERGENCY': 'stat'
  };

  // Map request type to FHIR coding
  const requestTypeMap: Record<string, { code: string, display: string }> = {
    'REPAIR': { code: 'repair', display: 'Repair' },
    'PREVENTIVE': { code: 'preventive', display: 'Preventive Maintenance' },
    'INSTALLATION': { code: 'installation', display: 'Installation' },
    'INSPECTION': { code: 'inspection', display: 'Inspection' }
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
        code: 'maintenance',
        display: 'Maintenance'
      }]
    }],
    code: {
      coding: [{
        system: 'http://hms.local/fhir/CodeSystem/maintenance-request-type',
        code: requestTypeMap[request.requestType]?.code || request.requestType.toLowerCase(),
        display: requestTypeMap[request.requestType]?.display || request.requestType
      }],
      text: request.description
    },
    subject: request.assetId ? {
      reference: `Device/${request.assetId}`,
      display: request.asset?.name || 'Unknown Asset'
    } : {
      reference: `Location/${request.locationId}`,
      display: request.location?.name || 'Unknown Location'
    },
    requester: {
      reference: `User/${request.requestedById}`,
      display: request.requestedByUser?.name || 'Unknown User'
    },
    performer: request.workOrders?.filter(wo => wo.assignedToId)?.map(wo => ({
      reference: `User/${wo.assignedToId}`,
      display: wo.assignedToUser?.name || 'Unknown User'
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
 * Convert database MaintenanceWorkOrder to FHIR Task
 */
export function toFHIRMaintenanceWorkOrder(workOrder: MaintenanceWorkOrder & {
  request: MaintenanceRequest;
  assignedToUser?: any;
  createdByUser: any;
}): FHIRMaintenanceWorkOrder {
  // Map status from internal to FHIR status
  const statusMap: Record<string, 'draft' | 'requested' | 'received' | 'accepted' | 'rejected' | 'ready' | 'cancelled' | 'in-progress' | 'on-hold' | 'failed' | 'completed' | 'entered-in-error'> = {
    'PENDING': 'requested',
    'IN_PROGRESS': 'in-progress',
    'ON_HOLD': 'on-hold',
    'COMPLETED': 'completed',
    'CANCELLED': 'cancelled'
  };

  // Map priority from internal to FHIR priority
  const priorityMap: Record<string, 'routine' | 'urgent' | 'asap' | 'stat'> = {
    'LOW': 'routine',
    'MEDIUM': 'routine',
    'HIGH': 'urgent',
    'EMERGENCY': 'stat'
  };

  return {
    resourceType: 'Task',
    id: workOrder.id,
    basedOn: [{
      reference: `ServiceRequest/${workOrder.requestId}`
    }],
    status: statusMap[workOrder.status] || 'requested',
    intent: 'order',
    priority: priorityMap[workOrder.request?.priority] || 'routine',
    description: workOrder.description,
    focus: {
      reference: `ServiceRequest/${workOrder.requestId}`
    },
    for: {
      reference: workOrder.request?.assetId 
        ? `Device/${workOrder.request.assetId}` 
        : `Location/${workOrder.request?.locationId}`
    },
    authoredOn: workOrder.createdAt.toISOString(),
    lastModified: workOrder.updatedAt.toISOString(),
    requester: {
      reference: `User/${workOrder.createdById}`,
      display: workOrder.createdByUser?.name || 'Unknown User'
    },
    owner: workOrder.assignedToId ? {
      reference: `User/${workOrder.assignedToId}`,
      display: workOrder.assignedToUser?.name || 'Unknown User'
    } : undefined,
    note: workOrder.notes ? [{ text: workOrder.notes }] : [],
    executionPeriod: {
      start: workOrder.startTime?.toISOString(),
      end: workOrder.endTime?.toISOString()
    }
  };
}

/**
 * Convert database Asset to FHIR Device
 */
export function toFHIRAsset(asset: Asset & {
  location: any;
}): FHIRAsset {
  // Map status from internal to FHIR status
  const statusMap: Record<string, 'active' | 'inactive' | 'entered-in-error' | 'unknown'> = {
    'OPERATIONAL': 'active',
    'NEEDS_REPAIR': 'active',
    'UNDER_MAINTENANCE': 'inactive',
    'DECOMMISSIONED': 'inactive'
  };

  // Map asset type to FHIR coding
  const assetTypeMap: Record<string, { code: string, display: string }> = {
    'EQUIPMENT': { code: 'equipment', display: 'Medical Equipment' },
    'FACILITY': { code: 'facility', display: 'Facility Asset' },
    'VEHICLE': { code: 'vehicle', display: 'Vehicle' },
    'IT': { code: 'it', display: 'IT Equipment' }
  };

  return {
    resourceType: 'Device',
    id: asset.id,
    identifier: [
      {
        system: 'http://hms.local/identifier/asset',
        value: asset.id
      },
      ...(asset.serialNumber ? [{
        system: 'http://hms.local/identifier/serial-number',
        value: asset.serialNumber
      }] : [])
    ],
    status: statusMap[asset.status] || 'unknown',
    manufacturer: asset.manufacturer,
    model: asset.model,
    serialNumber: asset.serialNumber,
    type: {
      coding: [{
        system: 'http://hms.local/fhir/CodeSystem/asset-type',
        code: assetTypeMap[asset.assetType]?.code || asset.assetType.toLowerCase(),
        display: assetTypeMap[asset.assetType]?.display || asset.assetType
      }],
      text: asset.name
    },
    location: {
      reference: `Location/${asset.locationId}`,
      display: asset.location?.name || 'Unknown Location'
    },
    note: [],
    manufactureDate: asset.purchaseDate?.toISOString(),
    expirationDate: asset.warrantyExpiry?.toISOString()
  };
}
