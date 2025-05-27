/**
 * Transfusion Management System
 * 
 * This module implements advanced transfusion management features for the Blood Bank,
 * including transfusion request processing, product assignment, issue tracking,
 * transfusion documentation, and reaction management.
 */

import {
  BloodType,
  BloodProductType,
  BloodProductStatus,
  BloodProduct,
  TransfusionRequest,
  TransfusionRequestStatus,
  TransfusionReactionSeverity,
  getBloodProduct,
  updateBloodProduct,
  getTransfusionRequest,
  getTransfusionRequestsByPatient,
  getTransfusionRequestsByStatus,
  updateTransfusionRequest,
  assignBloodProducts,
  issueBloodProducts,
  recordTransfusionCompletion,
  recordTransfusionReaction,
  cancelTransfusionRequest
} from './core-data-models';

import {
  InventoryLocation,
  InventoryTransactionType,
  recordInventoryTransaction
} from './inventory-management';

import {
  isBloodProductCompatibleWithPatient,
  findCompatibleBloodProductsForPatient,
  generateCompatibilityReport
} from './compatibility-testing';

// Transfusion documentation
export interface TransfusionDocumentation {
  id: string;
  requestId: string;
  patientId: string;
  bloodProductId: string;
  startTime: string;
  endTime?: string;
  administeredBy: string;
  verifiedBy: string;
  vitalSigns: {
    time: string;
    temperature: number;
    heartRate: number;
    respiratoryRate: number;
    bloodPressure: {
      systolic: number;
      diastolic: number;
    };
    oxygenSaturation?: number;
    notes?: string;
  }[];
  volume: {
    ordered: number;
    administered: number;
    units: string;
  };
  administrationRate?: number;
  administrationMethod: string;
  premedications?: {
    medication: string;
    dose: string;
    route: string;
    time: string;
  }[];
  notes?: string;
  status: 'in_progress' | 'completed' | 'discontinued';
  discontinuedReason?: string;
}

// Transfusion reaction
export interface TransfusionReaction {
  id: string;
  requestId: string;
  patientId: string;
  bloodProductId: string;
  reactionTime: string;
  reportedBy: string;
  severity: TransfusionReactionSeverity;
  type: string;
  symptoms: string[];
  vitalSigns: {
    temperature: number;
    heartRate: number;
    respiratoryRate: number;
    bloodPressure: {
      systolic: number;
      diastolic: number;
    };
    oxygenSaturation?: number;
  };
  interventions: {
    action: string;
    time: string;
    performedBy: string;
  }[];
  outcome: string;
  followUpRequired: boolean;
  followUpDetails?: string;
  notes?: string;
}

// Transfusion verification
export interface TransfusionVerification {
  id: string;
  requestId: string;
  patientId: string;
  bloodProductId: string;
  verificationTime: string;
  verifiedBy: string;
  verificationItems: {
    item: string;
    verified: boolean;
    notes?: string;
  }[];
  isVerified: boolean;
  notes?: string;
}

// Mock data stores
const mockTransfusionDocumentations: TransfusionDocumentation[] = [];
const mockTransfusionReactions: TransfusionReaction[] = [];
const mockTransfusionVerifications: TransfusionVerification[] = [];

/**
 * Creates a new transfusion documentation
 */
export function createTransfusionDocumentation(
  requestId: string,
  patientId: string,
  bloodProductId: string,
  startTime: string,
  administeredBy: string,
  verifiedBy: string,
  initialVitalSigns: TransfusionDocumentation['vitalSigns'][0],
  volume: TransfusionDocumentation['volume'],
  administrationMethod: string,
  administrationRate?: number,
  premedications?: TransfusionDocumentation['premedications'],
  notes?: string
): TransfusionDocumentation {
  const id = Math.random().toString(36).substring(2, 15);
  
  // Validate request
  const request = getTransfusionRequest(requestId);
  
  if (!request) {
    throw new Error(`Transfusion request with ID ${requestId} not found`);
  }
  
  if (request.patientId !== patientId) {
    throw new Error(`Transfusion request with ID ${requestId} does not belong to patient with ID ${patientId}`);
  }
  
  if (request.status !== TransfusionRequestStatus.ISSUED) {
    throw new Error(`Transfusion request with ID ${requestId} is not in ISSUED status`);
  }
  
  // Validate blood product
  const product = getBloodProduct(bloodProductId);
  
  if (!product) {
    throw new Error(`Blood product with ID ${bloodProductId} not found`);
  }
  
  if (product.status !== BloodProductStatus.ISSUED) {
    throw new Error(`Blood product with ID ${bloodProductId} is not in ISSUED status`);
  }
  
  // Check if product is assigned to this request
  const isAssigned = request.assignedProducts?.some(p => p.productId === bloodProductId);
  
  if (!isAssigned) {
    throw new Error(`Blood product with ID ${bloodProductId} is not assigned to request with ID ${requestId}`);
  }
  
  // Create documentation
  const documentation: TransfusionDocumentation = {
    id,
    requestId,
    patientId,
    bloodProductId,
    startTime,
    administeredBy,
    verifiedBy,
    vitalSigns: [initialVitalSigns],
    volume,
    administrationRate,
    administrationMethod,
    premedications,
    notes,
    status: 'in_progress'
  };
  
  // Store the documentation
  mockTransfusionDocumentations.push(documentation);
  
  // Update request status
  updateTransfusionRequest(
    requestId,
    {
      status: TransfusionRequestStatus.IN_PROGRESS,
      transfusionStartTime: startTime,
      vitalSigns: [initialVitalSigns]
    }
  );
  
  return documentation;
}

/**
 * Gets a transfusion documentation by ID
 */
export function getTransfusionDocumentation(documentationId: string): TransfusionDocumentation | null {
  return mockTransfusionDocumentations.find(d => d.id === documentationId) || null;
}

/**
 * Gets transfusion documentations by request ID
 */
export function getTransfusionDocumentationsByRequest(requestId: string): TransfusionDocumentation[] {
  return mockTransfusionDocumentations.filter(d => d.requestId === requestId);
}

/**
 * Gets transfusion documentations by patient ID
 */
export function getTransfusionDocumentationsByPatient(patientId: string): TransfusionDocumentation[] {
  return mockTransfusionDocumentations.filter(d => d.patientId === patientId);
}

/**
 * Gets transfusion documentations by blood product ID
 */
export function getTransfusionDocumentationsByBloodProduct(bloodProductId: string): TransfusionDocumentation[] {
  return mockTransfusionDocumentations.filter(d => d.bloodProductId === bloodProductId);
}

/**
 * Updates a transfusion documentation
 */
export function updateTransfusionDocumentation(
  documentationId: string,
  updates: Partial<Omit<TransfusionDocumentation, 'id' | 'requestId' | 'patientId' | 'bloodProductId'>>
): TransfusionDocumentation | null {
  const documentationIndex = mockTransfusionDocumentations.findIndex(d => d.id === documentationId);
  
  if (documentationIndex === -1) {
    return null;
  }
  
  const existingDocumentation = mockTransfusionDocumentations[documentationIndex];
  
  if (existingDocumentation.status === 'completed' || existingDocumentation.status === 'discontinued') {
    throw new Error(`Transfusion documentation with ID ${documentationId} is already completed or discontinued`);
  }
  
  const updatedDocumentation: TransfusionDocumentation = {
    ...existingDocumentation,
    ...updates
  };
  
  // Store the updated documentation
  mockTransfusionDocumentations[documentationIndex] = updatedDocumentation;
  
  // Update request if necessary
  if (updates.vitalSigns) {
    updateTransfusionRequest(
      existingDocumentation.requestId,
      {
        vitalSigns: updates.vitalSigns
      }
    );
  }
  
  return updatedDocumentation;
}

/**
 * Adds vital signs to a transfusion documentation
 */
export function addVitalSignsToTransfusionDocumentation(
  documentationId: string,
  vitalSigns: TransfusionDocumentation['vitalSigns'][0]
): TransfusionDocumentation | null {
  const documentationIndex = mockTransfusionDocumentations.findIndex(d => d.id === documentationId);
  
  if (documentationIndex === -1) {
    return null;
  }
  
  const existingDocumentation = mockTransfusionDocumentations[documentationIndex];
  
  if (existingDocumentation.status === 'completed' || existingDocumentation.status === 'discontinued') {
    throw new Error(`Transfusion documentation with ID ${documentationId} is already completed or discontinued`);
  }
  
  const updatedVitalSigns = [...existingDocumentation.vitalSigns, vitalSigns];
  
  const updatedDocumentation: TransfusionDocumentation = {
    ...existingDocumentation,
    vitalSigns: updatedVitalSigns
  };
  
  // Store the updated documentation
  mockTransfusionDocumentations[documentationIndex] = updatedDocumentation;
  
  // Update request
  updateTransfusionRequest(
    existingDocumentation.requestId,
    {
      vitalSigns: updatedVitalSigns
    }
  );
  
  return updatedDocumentation;
}

/**
 * Completes a transfusion documentation
 */
export function completeTransfusionDocumentation(
  documentationId: string,
  endTime: string,
  finalVitalSigns: TransfusionDocumentation['vitalSigns'][0],
  notes?: string
): TransfusionDocumentation | null {
  const documentationIndex = mockTransfusionDocumentations.findIndex(d => d.id === documentationId);
  
  if (documentationIndex === -1) {
    return null;
  }
  
  const existingDocumentation = mockTransfusionDocumentations[documentationIndex];
  
  if (existingDocumentation.status !== 'in_progress') {
    throw new Error(`Transfusion documentation with ID ${documentationId} is not in progress`);
  }
  
  const updatedVitalSigns = [...existingDocumentation.vitalSigns, finalVitalSigns];
  
  const updatedDocumentation: TransfusionDocumentation = {
    ...existingDocumentation,
    endTime,
    vitalSigns: updatedVitalSigns,
    status: 'completed',
    notes: notes ? (existingDocumentation.notes ? `${existingDocumentation.notes}\n${notes}` : notes) : existingDocumentation.notes
  };
  
  // Store the updated documentation
  mockTransfusionDocumentations[documentationIndex] = updatedDocumentation;
  
  // Update request
  recordTransfusionCompletion(
    existingDocumentation.requestId,
    endTime,
    existingDocumentation.administeredBy,
    updatedVitalSigns
  );
  
  // Update blood product
  updateBloodProduct(
    existingDocumentation.bloodProductId,
    {
      status: BloodProductStatus.TRANSFUSED
    },
    existingDocumentation.administeredBy
  );
  
  // Record inventory transaction
  recordInventoryTransaction({
    productId: existingDocumentation.bloodProductId,
    transactionType: InventoryTransactionType.TRANSFUSION,
    fromLocation: InventoryLocation.ISSUED,
    quantity: 1,
    transactionDate: endTime,
    performedBy: existingDocumentation.administeredBy,
    requestId: existingDocumentation.requestId,
    patientId: existingDocumentation.patientId
  });
  
  return updatedDocumentation;
}

/**
 * Discontinues a transfusion documentation
 */
export function discontinueTransfusionDocumentation(
  documentationId: string,
  endTime: string,
  discontinuedReason: string,
  finalVitalSigns: TransfusionDocumentation['vitalSigns'][0],
  notes?: string
): TransfusionDocumentation | null {
  const documentationIndex = mockTransfusionDocumentations.findIndex(d => d.id === documentationId);
  
  if (documentationIndex === -1) {
    return null;
  }
  
  const existingDocumentation = mockTransfusionDocumentations[documentationIndex];
  
  if (existingDocumentation.status !== 'in_progress') {
    throw new Error(`Transfusion documentation with ID ${documentationId} is not in progress`);
  }
  
  const updatedVitalSigns = [...existingDocumentation.vitalSigns, finalVitalSigns];
  
  const updatedDocumentation: TransfusionDocumentation = {
    ...existingDocumentation,
    endTime,
    vitalSigns: updatedVitalSigns,
    status: 'discontinued',
    discontinuedReason,
    notes: notes ? (existingDocumentation.notes ? `${existingDocumentation.notes}\n${notes}` : notes) : existingDocumentation.notes
  };
  
  // Store the updated documentation
  mockTransfusionDocumentations[documentationIndex] = updatedDocumentation;
  
  // Update request
  updateTransfusionRequest(
    existingDocumentation.requestId,
    {
      status: TransfusionRequestStatus.DISCONTINUED,
      transfusionEndTime: endTime,
      vitalSigns: updatedVitalSigns,
      notes: `Transfusion discontinued: ${discontinuedReason}`
    }
  );
  
  // Update blood product
  updateBloodProduct(
    existingDocumentation.bloodProductId,
    {
      status: BloodProductStatus.PARTIALLY_USED
    },
    existingDocumentation.administeredBy
  );
  
  // Record inventory transaction
  recordInventoryTransaction({
    productId: existingDocumentation.bloodProductId,
    transactionType: InventoryTransactionType.RETURN,
    fromLocation: InventoryLocation.ISSUED,
    toLocation: InventoryLocation.QUARANTINE,
    quantity: 1,
    transactionDate: endTime,
    performedBy: existingDocumentation.administeredBy,
    reason: discontinuedReason,
    requestId: existingDocumentation.requestId,
    patientId: existingDocumentation.patientId
  });
  
  return updatedDocumentation;
}

/**
 * Creates a new transfusion reaction
 */
export function createTransfusionReaction(
  requestId: string,
  patientId: string,
  bloodProductId: string,
  reactionTime: string,
  reportedBy: string,
  severity: TransfusionReactionSeverity,
  type: string,
  symptoms: string[],
  vitalSigns: TransfusionReaction['vitalSigns'],
  interventions: TransfusionReaction['interventions'],
  outcome: string,
  followUpRequired: boolean,
  followUpDetails?: string,
  notes?: string
): TransfusionReaction {
  const id = Math.random().toString(36).substring(2, 15);
  
  // Validate request
  const request = getTransfusionRequest(requestId);
  
  if (!request) {
    throw new Error(`Transfusion request with ID ${requestId} not found`);
  }
  
  if (request.patientId !== patientId) {
    throw new Error(`Transfusion request with ID ${requestId} does not belong to patient with ID ${patientId}`);
  }
  
  // Validate blood product
  const product = getBloodProduct(bloodProductId);
  
  if (!product) {
    throw new Error(`Blood product with ID ${bloodProductId} not found`);
  }
  
  // Create reaction
  const reaction: TransfusionReaction = {
    id,
    requestId,
    patientId,
    bloodProductId,
    reactionTime,
    reportedBy,
    severity,
    type,
    symptoms,
    vitalSigns,
    interventions,
    outcome,
    followUpRequired,
    followUpDetails,
    notes
  };
  
  // Store the reaction
  mockTransfusionReactions.push(reaction);
  
  // Record reaction in request
  recordTransfusionReaction(
    requestId,
    {
      time: reactionTime,
      type,
      severity,
      symptoms,
      treatment: interventions.map(i => i.action).join(', '),
      outcome,
      reportedBy
    }
  );
  
  // Update blood product
  updateBloodProduct(
    bloodProductId,
    {
      status: BloodProductStatus.REACTION_REPORTED
    },
    reportedBy
  );
  
  // Record inventory transaction
  recordInventoryTransaction({
    productId: bloodProductId,
    transactionType: InventoryTransactionType.QUARANTINE,
    fromLocation: product.location as InventoryLocation,
    toLocation: InventoryLocation.QUARANTINE,
    quantity: 1,
    transactionDate: reactionTime,
    performedBy: reportedBy,
    reason: `Transfusion reaction: ${type} (${severity})`,
    requestId,
    patientId
  });
  
  return reaction;
}

/**
 * Gets a transfusion reaction by ID
 */
export function getTransfusionReaction(reactionId: string): TransfusionReaction | null {
  return mockTransfusionReactions.find(r => r.id === reactionId) || null;
}

/**
 * Gets transfusion reactions by request ID
 */
export function getTransfusionReactionsByRequest(requestId: string): TransfusionReaction[] {
  return mockTransfusionReactions.filter(r => r.requestId === requestId);
}

/**
 * Gets transfusion reactions by patient ID
 */
export function getTransfusionReactionsByPatient(patientId: string): TransfusionReaction[] {
  return mockTransfusionReactions.filter(r => r.patientId === patientId);
}

/**
 * Gets transfusion reactions by blood product ID
 */
export function getTransfusionReactionsByBloodProduct(bloodProductId: string): TransfusionReaction[] {
  return mockTransfusionReactions.filter(r => r.bloodProductId === bloodProductId);
}

/**
 * Updates a transfusion reaction
 */
export function updateTransfusionReaction(
  reactionId: string,
  updates: Partial<Omit<TransfusionReaction, 'id' | 'requestId' | 'patientId' | 'bloodProductId' | 'reactionTime' | 'reportedBy'>>
): TransfusionReaction | null {
  const reactionIndex = mockTransfusionReactions.findIndex(r => r.id === reactionId);
  
  if (reactionIndex === -1) {
    return null;
  }
  
  const existingReaction = mockTransfusionReactions[reactionIndex];
  
  const updatedReaction: TransfusionReaction = {
    ...existingReaction,
    ...updates
  };
  
  // Store the updated reaction
  mockTransfusionReactions[reactionIndex] = updatedReaction;
  
  return updatedReaction;
}

/**
 * Creates a new transfusion verification
 */
export function createTransfusionVerification(
  requestId: string,
  patientId: string,
  bloodProductId: string,
  verificationTime: string,
  verifiedBy: string,
  verificationItems: TransfusionVerification['verificationItems'],
  notes?: string
): TransfusionVerification {
  const id = Math.random().toString(36).substring(2, 15);
  
  // Validate request
  const request = getTransfusionRequest(requestId);
  
  if (!request) {
    throw new Error(`Transfusion request with ID ${requestId} not found`);
  }
  
  if (request.patientId !== patientId) {
    throw new Error(`Transfusion request with ID ${requestId} does not belong to patient with ID ${patientId}`);
  }
  
  // Validate blood product
  const product = getBloodProduct(bloodProductId);
  
  if (!product) {
    throw new Error(`Blood product with ID ${bloodProductId} not found`);
  }
  
  // Check if all items are verified
  const isVerified = verificationItems.every(item => item.verified);
  
  // Create verification
  const verification: TransfusionVerification = {
    id,
    requestId,
    patientId,
    bloodProductId,
    verificationTime,
    verifiedBy,
    verificationItems,
    isVerified,
    notes
  };
  
  // Store the verification
  mockTransfusionVerifications.push(verification);
  
  return verification;
}

/**
 * Gets a transfusion verification by ID
 */
export function getTransfusionVerification(verificationId: string): TransfusionVerification | null {
  return mockTransfusionVerifications.find(v => v.id === verificationId) || null;
}

/**
 * Gets transfusion verifications by request ID
 */
export function getTransfusionVerificationsByRequest(requestId: string): TransfusionVerification[] {
  return mockTransfusionVerifications.filter(v => v.requestId === requestId);
}

/**
 * Gets transfusion verifications by patient ID
 */
export function getTransfusionVerificationsByPatient(patientId: string): TransfusionVerification[] {
  return mockTransfusionVerifications.filter(v => v.patientId === patientId);
}

/**
 * Gets transfusion verifications by blood product ID
 */
export function getTransfusionVerificationsByBloodProduct(bloodProductId: string): TransfusionVerification[] {
  return mockTransfusionVerifications.filter(v => v.bloodProductId === bloodProductId);
}

/**
 * Gets the latest transfusion verification by request and blood product
 */
export function getLatestTransfusionVerification(
  requestId: string,
  bloodProductId: string
): TransfusionVerification | null {
  const verifications = mockTransfusionVerifications
    .filter(v => v.requestId === requestId && v.bloodProductId === bloodProductId)
    .sort((a, b) => b.verificationTime.localeCompare(a.verificationTime));
  
  return verifications.length > 0 ? verifications[0] : null;
}

/**
 * Processes a transfusion request
 */
export function processTransfusionRequest(
  requestId: string,
  processedBy: string
): {
  request: TransfusionRequest | null;
  compatibilityReport: ReturnType<typeof generateCompatibilityReport>;
  assignedProducts: BloodProduct[];
} {
  // Get request
  const request = getTransfusionRequest(requestId);
  
  if (!request) {
    throw new Error(`Transfusion request with ID ${requestId} not found`);
  }
  
  if (request.status !== TransfusionRequestStatus.PENDING) {
    throw new Error(`Transfusion request with ID ${requestId} is not in PENDING status`);
  }
  
  // Generate compatibility report
  const compatibilityReport = generateCompatibilityReport(requestId);
  
  // Find compatible products
  const assignedProducts: BloodProduct[] = [];
  
  for (const requestedProduct of request.requestedProducts) {
    const compatibleProducts = findCompatibleBloodProductsForPatient(
      request.patientId,
      requestedProduct.type,
      requestedProduct.quantity
    );
    
    if (compatibleProducts.length < requestedProduct.quantity) {
      throw new Error(`Insufficient compatible ${requestedProduct.type} products available`);
    }
    
    // Assign products
    assignedProducts.push(...compatibleProducts.slice(0, requestedProduct.quantity));
  }
  
  // Assign products to request
  assignBloodProducts(
    requestId,
    assignedProducts.map(p => p.id),
    processedBy
  );
  
  return {
    request: getTransfusionRequest(requestId),
    compatibilityReport,
    assignedProducts
  };
}

/**
 * Issues blood products for a transfusion request
 */
export function issueBloodProductsForTransfusion(
  requestId: string,
  issuedBy: string
): {
  request: TransfusionRequest | null;
  issuedProducts: BloodProduct[];
} {
  // Get request
  const request = getTransfusionRequest(requestId);
  
  if (!request) {
    throw new Error(`Transfusion request with ID ${requestId} not found`);
  }
  
  if (request.status !== TransfusionRequestStatus.ASSIGNED) {
    throw new Error(`Transfusion request with ID ${requestId} is not in ASSIGNED status`);
  }
  
  if (!request.assignedProducts || request.assignedProducts.length === 0) {
    throw new Error(`Transfusion request with ID ${requestId} has no assigned products`);
  }
  
  // Issue products
  issueBloodProducts(requestId, issuedBy);
  
  // Get updated request
  const updatedRequest = getTransfusionRequest(requestId);
  
  if (!updatedRequest) {
    return { request: null, issuedProducts: [] };
  }
  
  // Get issued products
  const issuedProducts: BloodProduct[] = [];
  
  for (const assignedProduct of updatedRequest.assignedProducts || []) {
    const product = getBloodProduct(assignedProduct.productId);
    
    if (product) {
      issuedProducts.push(product);
    }
  }
  
  return {
    request: updatedRequest,
    issuedProducts
  };
}

/**
 * Generates a transfusion report
 */
export function generateTransfusionReport(
  requestId: string
): {
  request: TransfusionRequest | null;
  documentations: TransfusionDocumentation[];
  reactions: TransfusionReaction[];
  verifications: TransfusionVerification[];
  products: BloodProduct[];
  summary: {
    patientId: string;
    patientBloodType: BloodType | null;
    totalProductsTransfused: number;
    totalVolumeTransfused: number;
    transfusionStartTime?: string;
    transfusionEndTime?: string;
    totalDuration?: number;
    hadReaction: boolean;
    reactionSeverity?: TransfusionReactionSeverity;
    status: TransfusionRequestStatus;
  };
} {
  // Get request
  const request = getTransfusionRequest(requestId);
  
  if (!request) {
    return {
      request: null,
      documentations: [],
      reactions: [],
      verifications: [],
      products: [],
      summary: {
        patientId: '',
        patientBloodType: null,
        totalProductsTransfused: 0,
        totalVolumeTransfused: 0,
        hadReaction: false,
        status: TransfusionRequestStatus.PENDING
      }
    };
  }
  
  // Get documentations
  const documentations = getTransfusionDocumentationsByRequest(requestId);
  
  // Get reactions
  const reactions = getTransfusionReactionsByRequest(requestId);
  
  // Get verifications
  const verifications = getTransfusionVerificationsByRequest(requestId);
  
  // Get products
  const products: BloodProduct[] = [];
  
  for (const assignedProduct of request.assignedProducts || []) {
    const product = getBloodProduct(assignedProduct.productId);
    
    if (product) {
      products.push(product);
    }
  }
  
  // Calculate summary
  const patientBloodType = request.patientBloodType;
  const totalProductsTransfused = documentations.filter(d => d.status === 'completed').length;
  
  let totalVolumeTransfused = 0;
  
  for (const doc of documentations) {
    if (doc.status === 'completed') {
      totalVolumeTransfused += doc.volume.administered;
    } else if (doc.status === 'discontinued') {
      // Estimate administered volume for discontinued transfusions
      totalVolumeTransfused += doc.volume.administered;
    }
  }
  
  const transfusionStartTime = request.transfusionStartTime;
  const transfusionEndTime = request.transfusionEndTime;
  
  let totalDuration: number | undefined;
  
  if (transfusionStartTime && transfusionEndTime) {
    const start = new Date(transfusionStartTime).getTime();
    const end = new Date(transfusionEndTime).getTime();
    totalDuration = Math.floor((end - start) / (1000 * 60)); // Duration in minutes
  }
  
  const hadReaction = reactions.length > 0;
  
  let reactionSeverity: TransfusionReactionSeverity | undefined;
  
  if (hadReaction) {
    // Get the most severe reaction
    const severities = reactions.map(r => r.severity);
    
    if (severities.includes(TransfusionReactionSeverity.SEVERE)) {
      reactionSeverity = TransfusionReactionSeverity.SEVERE;
    } else if (severities.includes(TransfusionReactionSeverity.MODERATE)) {
      reactionSeverity = TransfusionReactionSeverity.MODERATE;
    } else {
      reactionSeverity = TransfusionReactionSeverity.MILD;
    }
  }
  
  return {
    request,
    documentations,
    reactions,
    verifications,
    products,
    summary: {
      patientId: request.patientId,
      patientBloodType,
      totalProductsTransfused,
      totalVolumeTransfused,
      transfusionStartTime,
      transfusionEndTime,
      totalDuration,
      hadReaction,
      reactionSeverity,
      status: request.status
    }
  };
}

/**
 * Generates a transfusion statistics report
 */
export function generateTransfusionStatisticsReport(
  startDate: string,
  endDate: string
): {
  totalRequests: number;
  requestsByStatus: Record<TransfusionRequestStatus, number>;
  requestsByPriority: Record<string, number>;
  requestsByDepartment: Record<string, number>;
  totalProductsTransfused: number;
  productsByType: Record<BloodProductType, number>;
  reactionIncidence: number;
  reactionsBySeverity: Record<TransfusionReactionSeverity, number>;
  reactionsByType: Record<string, number>;
  averageTransfusionDuration: number;
  timeFromRequestToIssue: {
    average: number;
    min: number;
    max: number;
  };
} {
  // Get requests in date range
  const requests = getTransfusionRequestsByDateRange(startDate, endDate);
  
  // Initialize counters
  const requestsByStatus: Record<TransfusionRequestStatus, number> = {
    [TransfusionRequestStatus.PENDING]: 0,
    [TransfusionRequestStatus.ASSIGNED]: 0,
    [TransfusionRequestStatus.ISSUED]: 0,
    [TransfusionRequestStatus.IN_PROGRESS]: 0,
    [TransfusionRequestStatus.COMPLETED]: 0,
    [TransfusionRequestStatus.CANCELLED]: 0,
    [TransfusionRequestStatus.DISCONTINUED]: 0
  };
  
  const requestsByPriority: Record<string, number> = {};
  const requestsByDepartment: Record<string, number> = {};
  
  const productsByType: Record<BloodProductType, number> = {
    [BloodProductType.WHOLE_BLOOD]: 0,
    [BloodProductType.RED_BLOOD_CELLS]: 0,
    [BloodProductType.PLATELETS]: 0,
    [BloodProductType.PLASMA]: 0,
    [BloodProductType.CRYOPRECIPITATE]: 0,
    [BloodProductType.GRANULOCYTES]: 0
  };
  
  const reactionsBySeverity: Record<TransfusionReactionSeverity, number> = {
    [TransfusionReactionSeverity.MILD]: 0,
    [TransfusionReactionSeverity.MODERATE]: 0,
    [TransfusionReactionSeverity.SEVERE]: 0
  };
  
  const reactionsByType: Record<string, number> = {};
  
  let totalProductsTransfused = 0;
  let totalReactions = 0;
  let totalTransfusionDuration = 0;
  let totalTransfusionsWithDuration = 0;
  
  let totalTimeFromRequestToIssue = 0;
  let minTimeFromRequestToIssue = Number.MAX_SAFE_INTEGER;
  let maxTimeFromRequestToIssue = 0;
  let totalRequestsWithIssueTime = 0;
  
  // Process requests
  for (const request of requests) {
    // Count by status
    requestsByStatus[request.status]++;
    
    // Count by priority
    if (!requestsByPriority[request.priority]) {
      requestsByPriority[request.priority] = 0;
    }
    requestsByPriority[request.priority]++;
    
    // Count by department
    if (!requestsByDepartment[request.requestingDepartment]) {
      requestsByDepartment[request.requestingDepartment] = 0;
    }
    requestsByDepartment[request.requestingDepartment]++;
    
    // Count products
    if (request.status === TransfusionRequestStatus.COMPLETED) {
      for (const product of request.requestedProducts) {
        productsByType[product.type] += product.quantity;
        totalProductsTransfused += product.quantity;
      }
    }
    
    // Calculate transfusion duration
    if (request.transfusionStartTime && request.transfusionEndTime) {
      const start = new Date(request.transfusionStartTime).getTime();
      const end = new Date(request.transfusionEndTime).getTime();
      const duration = Math.floor((end - start) / (1000 * 60)); // Duration in minutes
      
      totalTransfusionDuration += duration;
      totalTransfusionsWithDuration++;
    }
    
    // Calculate time from request to issue
    if (request.requestDate && request.issuedAt) {
      const requestTime = new Date(request.requestDate).getTime();
      const issueTime = new Date(request.issuedAt).getTime();
      const timeToIssue = Math.floor((issueTime - requestTime) / (1000 * 60)); // Time in minutes
      
      totalTimeFromRequestToIssue += timeToIssue;
      minTimeFromRequestToIssue = Math.min(minTimeFromRequestToIssue, timeToIssue);
      maxTimeFromRequestToIssue = Math.max(maxTimeFromRequestToIssue, timeToIssue);
      totalRequestsWithIssueTime++;
    }
    
    // Count reactions
    if (request.transfusionReactions && request.transfusionReactions.length > 0) {
      totalReactions += request.transfusionReactions.length;
      
      for (const reaction of request.transfusionReactions) {
        reactionsBySeverity[reaction.severity]++;
        
        if (!reactionsByType[reaction.type]) {
          reactionsByType[reaction.type] = 0;
        }
        reactionsByType[reaction.type]++;
      }
    }
  }
  
  // Calculate averages
  const averageTransfusionDuration = totalTransfusionsWithDuration > 0 
    ? totalTransfusionDuration / totalTransfusionsWithDuration 
    : 0;
  
  const averageTimeFromRequestToIssue = totalRequestsWithIssueTime > 0 
    ? totalTimeFromRequestToIssue / totalRequestsWithIssueTime 
    : 0;
  
  const reactionIncidence = totalProductsTransfused > 0 
    ? (totalReactions / totalProductsTransfused) * 100 
    : 0;
  
  return {
    totalRequests: requests.length,
    requestsByStatus,
    requestsByPriority,
    requestsByDepartment,
    totalProductsTransfused,
    productsByType,
    reactionIncidence,
    reactionsBySeverity,
    reactionsByType,
    averageTransfusionDuration,
    timeFromRequestToIssue: {
      average: averageTimeFromRequestToIssue,
      min: minTimeFromRequestToIssue === Number.MAX_SAFE_INTEGER ? 0 : minTimeFromRequestToIssue,
      max: maxTimeFromRequestToIssue
    }
  };
}

/**
 * Gets transfusion requests by date range
 */
function getTransfusionRequestsByDateRange(
  startDate: string,
  endDate: string
): TransfusionRequest[] {
  // This is a helper function that would typically be in the core-data-models module
  // For this implementation, we'll simulate it
  return getTransfusionRequestsByStatus(TransfusionRequestStatus.PENDING)
    .filter(r => r.requestDate >= startDate && r.requestDate <= endDate);
}
