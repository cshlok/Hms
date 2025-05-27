/**
 * Blood Bank Management System - Core Data Models
 * 
 * This module implements the core data models for the Blood Bank Management System,
 * including blood products, donors, compatibility testing, and transfusion requests.
 * It follows ISBT 128 standards and AABB guidelines for blood banking.
 */

// Blood types
export enum BloodType {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-'
}

// Blood product types
export enum BloodProductType {
  WHOLE_BLOOD = 'whole_blood',
  RED_BLOOD_CELLS = 'red_blood_cells',
  PLATELETS = 'platelets',
  PLASMA = 'plasma',
  CRYOPRECIPITATE = 'cryoprecipitate',
  GRANULOCYTES = 'granulocytes'
}

// Blood product status
export enum BloodProductStatus {
  AVAILABLE = 'available',
  ASSIGNED = 'assigned',
  CROSSMATCHED = 'crossmatched',
  QUARANTINED = 'quarantined',
  DISCARDED = 'discarded',
  TRANSFUSED = 'transfused',
  EXPIRED = 'expired'
}

// Special attributes for blood products
export enum BloodProductAttribute {
  IRRADIATED = 'irradiated',
  LEUKOREDUCED = 'leukoreduced',
  CMV_NEGATIVE = 'cmv_negative',
  WASHED = 'washed',
  DIRECTED_DONATION = 'directed_donation',
  AUTOLOGOUS = 'autologous',
  HLA_MATCHED = 'hla_matched',
  PATHOGEN_REDUCED = 'pathogen_reduced'
}

// Donor status
export enum DonorStatus {
  ELIGIBLE = 'eligible',
  TEMPORARILY_DEFERRED = 'temporarily_deferred',
  PERMANENTLY_DEFERRED = 'permanently_deferred',
  PENDING_REVIEW = 'pending_review'
}

// Transfusion request priority
export enum TransfusionPriority {
  ROUTINE = 'routine',
  URGENT = 'urgent',
  EMERGENCY = 'emergency',
  MASSIVE_TRANSFUSION = 'massive_transfusion'
}

// Transfusion request status
export enum TransfusionRequestStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  READY = 'ready',
  ISSUED = 'issued',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Transfusion reaction severity
export enum TransfusionReactionSeverity {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  LIFE_THREATENING = 'life_threatening'
}

// Blood product
export interface BloodProduct {
  id: string;
  donationId: string;
  donorId: string;
  type: BloodProductType;
  bloodType: BloodType;
  volume: number; // in mL
  collectionDate: string;
  expirationDate: string;
  status: BloodProductStatus;
  location: string;
  attributes: BloodProductAttribute[];
  isbtNumber: string; // ISBT 128 donation identification number
  processingDetails?: {
    processedBy: string;
    processedAt: string;
    processingMethod: string;
    notes?: string;
  };
  testResults: {
    aboRhConfirmed: boolean;
    infectiousDiseaseScreening: {
      hiv: boolean;
      hbv: boolean;
      hcv: boolean;
      syphilis: boolean;
      other?: Record<string, boolean>;
    };
    additionalTesting?: Record<string, any>;
  };
  modifiedAt: string;
  modifiedBy: string;
  notes?: string;
  metadata?: Record<string, any>;
}

// Donor
export interface Donor {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodType?: BloodType;
  contactInformation: {
    phone: string;
    email?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  status: DonorStatus;
  eligibilityUntil?: string;
  deferralReason?: string;
  lastDonationDate?: string;
  donationCount: number;
  medicalHistory?: {
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
    travelHistory?: {
      location: string;
      startDate: string;
      endDate: string;
    }[];
  };
  consentForms?: {
    type: string;
    signedDate: string;
    expirationDate?: string;
    documentReference?: string;
  }[];
  registrationDate: string;
  lastUpdated: string;
  updatedBy: string;
  notes?: string;
}

// Donation
export interface Donation {
  id: string;
  donorId: string;
  donationType: BloodProductType;
  donationDate: string;
  volume: number; // in mL
  location: string;
  phlebotomist: string;
  preScreening: {
    hemoglobin: number;
    temperature: number;
    bloodPressure: {
      systolic: number;
      diastolic: number;
    };
    pulse: number;
    weight: number;
    height?: number;
    passed: boolean;
    notes?: string;
  };
  adverseReaction?: {
    type: string;
    severity: string;
    description: string;
    treatment: string;
    outcome: string;
  };
  processingStatus: 'pending' | 'processing' | 'completed' | 'discarded';
  productsCreated?: string[]; // IDs of blood products created from this donation
  notes?: string;
}

// Compatibility test
export interface CompatibilityTest {
  id: string;
  patientId: string;
  bloodProductId: string;
  requestId: string;
  testDate: string;
  testedBy: string;
  testType: 'type_and_screen' | 'crossmatch';
  results: {
    aboRhCompatible: boolean;
    crossmatchCompatible?: boolean;
    antibodyScreen?: {
      positive: boolean;
      antibodiesIdentified?: string[];
    };
    directAntiglobulinTest?: {
      positive: boolean;
      notes?: string;
    };
    otherTests?: Record<string, any>;
  };
  isCompatible: boolean;
  notes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

// Transfusion request
export interface TransfusionRequest {
  id: string;
  patientId: string;
  requestingPhysician: string;
  requestingDepartment: string;
  requestDate: string;
  priority: TransfusionPriority;
  status: TransfusionRequestStatus;
  diagnosis: string;
  indicationForTransfusion: string;
  requestedProducts: {
    type: BloodProductType;
    quantity: number;
    attributes?: BloodProductAttribute[];
    specialInstructions?: string;
  }[];
  patientBloodType?: BloodType;
  previousTransfusionHistory?: {
    date: string;
    productType: BloodProductType;
    reaction?: string;
  }[];
  assignedProducts?: string[]; // IDs of assigned blood products
  issuedProducts?: {
    productId: string;
    issuedBy: string;
    issuedAt: string;
    receivedBy?: string;
    receivedAt?: string;
  }[];
  transfusionStartTime?: string;
  transfusionEndTime?: string;
  vitalSigns?: {
    time: string;
    temperature: number;
    bloodPressure: {
      systolic: number;
      diastolic: number;
    };
    pulse: number;
    respiratoryRate: number;
    oxygenSaturation?: number;
  }[];
  transfusionReaction?: {
    detected: boolean;
    time?: string;
    type?: string;
    severity?: TransfusionReactionSeverity;
    symptoms?: string[];
    treatment?: string;
    outcome?: string;
    reportedBy?: string;
  };
  notes?: string;
  cancelledReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
}

// Mock data stores
const mockBloodProducts: BloodProduct[] = [];
const mockDonors: Donor[] = [];
const mockDonations: Donation[] = [];
const mockCompatibilityTests: CompatibilityTest[] = [];
const mockTransfusionRequests: TransfusionRequest[] = [];

/**
 * Creates a new blood product
 */
export function createBloodProduct(
  product: Omit<BloodProduct, 'id' | 'modifiedAt' | 'modifiedBy'>,
  modifiedBy: string
): BloodProduct {
  const id = Math.random().toString(36).substring(2, 15);
  const now = new Date().toISOString();
  
  const newProduct: BloodProduct = {
    id,
    ...product,
    modifiedAt: now,
    modifiedBy
  };
  
  // Store the product
  mockBloodProducts.push(newProduct);
  
  return newProduct;
}

/**
 * Gets a blood product by ID
 */
export function getBloodProduct(productId: string): BloodProduct | null {
  return mockBloodProducts.find(p => p.id === productId) || null;
}

/**
 * Gets blood products by type and status
 */
export function getBloodProductsByTypeAndStatus(
  type: BloodProductType,
  status: BloodProductStatus
): BloodProduct[] {
  return mockBloodProducts.filter(
    p => p.type === type && p.status === status
  );
}

/**
 * Gets blood products by blood type and status
 */
export function getBloodProductsByBloodTypeAndStatus(
  bloodType: BloodType,
  status: BloodProductStatus
): BloodProduct[] {
  return mockBloodProducts.filter(
    p => p.bloodType === bloodType && p.status === status
  );
}

/**
 * Updates a blood product
 */
export function updateBloodProduct(
  productId: string,
  updates: Partial<Omit<BloodProduct, 'id' | 'modifiedAt' | 'modifiedBy'>>,
  modifiedBy: string
): BloodProduct | null {
  const productIndex = mockBloodProducts.findIndex(p => p.id === productId);
  
  if (productIndex === -1) {
    return null;
  }
  
  const existingProduct = mockBloodProducts[productIndex];
  const now = new Date().toISOString();
  
  const updatedProduct: BloodProduct = {
    ...existingProduct,
    ...updates,
    modifiedAt: now,
    modifiedBy
  };
  
  // Store the updated product
  mockBloodProducts[productIndex] = updatedProduct;
  
  return updatedProduct;
}

/**
 * Creates a new donor
 */
export function createDonor(
  donor: Omit<Donor, 'id' | 'registrationDate' | 'lastUpdated' | 'updatedBy' | 'donationCount'>,
  updatedBy: string
): Donor {
  const id = Math.random().toString(36).substring(2, 15);
  const now = new Date().toISOString();
  
  const newDonor: Donor = {
    id,
    ...donor,
    donationCount: 0,
    registrationDate: now,
    lastUpdated: now,
    updatedBy
  };
  
  // Store the donor
  mockDonors.push(newDonor);
  
  return newDonor;
}

/**
 * Gets a donor by ID
 */
export function getDonor(donorId: string): Donor | null {
  return mockDonors.find(d => d.id === donorId) || null;
}

/**
 * Gets donors by status
 */
export function getDonorsByStatus(status: DonorStatus): Donor[] {
  return mockDonors.filter(d => d.status === status);
}

/**
 * Gets donors by blood type
 */
export function getDonorsByBloodType(bloodType: BloodType): Donor[] {
  return mockDonors.filter(d => d.bloodType === bloodType);
}

/**
 * Updates a donor
 */
export function updateDonor(
  donorId: string,
  updates: Partial<Omit<Donor, 'id' | 'registrationDate' | 'lastUpdated' | 'updatedBy'>>,
  updatedBy: string
): Donor | null {
  const donorIndex = mockDonors.findIndex(d => d.id === donorId);
  
  if (donorIndex === -1) {
    return null;
  }
  
  const existingDonor = mockDonors[donorIndex];
  const now = new Date().toISOString();
  
  const updatedDonor: Donor = {
    ...existingDonor,
    ...updates,
    lastUpdated: now,
    updatedBy
  };
  
  // Store the updated donor
  mockDonors[donorIndex] = updatedDonor;
  
  return updatedDonor;
}

/**
 * Creates a new donation
 */
export function createDonation(
  donation: Omit<Donation, 'id'>,
  updatedBy: string
): Donation {
  const id = Math.random().toString(36).substring(2, 15);
  
  const newDonation: Donation = {
    id,
    ...donation
  };
  
  // Store the donation
  mockDonations.push(newDonation);
  
  // Update donor's donation count and last donation date
  const donorIndex = mockDonors.findIndex(d => d.id === donation.donorId);
  
  if (donorIndex !== -1) {
    const donor = mockDonors[donorIndex];
    const now = new Date().toISOString();
    
    mockDonors[donorIndex] = {
      ...donor,
      donationCount: donor.donationCount + 1,
      lastDonationDate: donation.donationDate,
      lastUpdated: now,
      updatedBy
    };
  }
  
  return newDonation;
}

/**
 * Gets a donation by ID
 */
export function getDonation(donationId: string): Donation | null {
  return mockDonations.find(d => d.id === donationId) || null;
}

/**
 * Gets donations by donor ID
 */
export function getDonationsByDonor(donorId: string): Donation[] {
  return mockDonations.filter(d => d.donorId === donorId);
}

/**
 * Updates a donation
 */
export function updateDonation(
  donationId: string,
  updates: Partial<Omit<Donation, 'id' | 'donorId'>>
): Donation | null {
  const donationIndex = mockDonations.findIndex(d => d.id === donationId);
  
  if (donationIndex === -1) {
    return null;
  }
  
  const existingDonation = mockDonations[donationIndex];
  
  const updatedDonation: Donation = {
    ...existingDonation,
    ...updates
  };
  
  // Store the updated donation
  mockDonations[donationIndex] = updatedDonation;
  
  return updatedDonation;
}

/**
 * Creates a new compatibility test
 */
export function createCompatibilityTest(
  test: Omit<CompatibilityTest, 'id'>
): CompatibilityTest {
  const id = Math.random().toString(36).substring(2, 15);
  
  const newTest: CompatibilityTest = {
    id,
    ...test
  };
  
  // Store the test
  mockCompatibilityTests.push(newTest);
  
  return newTest;
}

/**
 * Gets a compatibility test by ID
 */
export function getCompatibilityTest(testId: string): CompatibilityTest | null {
  return mockCompatibilityTests.find(t => t.id === testId) || null;
}

/**
 * Gets compatibility tests by patient ID
 */
export function getCompatibilityTestsByPatient(patientId: string): CompatibilityTest[] {
  return mockCompatibilityTests.filter(t => t.patientId === patientId);
}

/**
 * Gets compatibility tests by blood product ID
 */
export function getCompatibilityTestsByBloodProduct(productId: string): CompatibilityTest[] {
  return mockCompatibilityTests.filter(t => t.bloodProductId === productId);
}

/**
 * Updates a compatibility test
 */
export function updateCompatibilityTest(
  testId: string,
  updates: Partial<Omit<CompatibilityTest, 'id' | 'patientId' | 'bloodProductId' | 'requestId' | 'testDate' | 'testedBy'>>
): CompatibilityTest | null {
  const testIndex = mockCompatibilityTests.findIndex(t => t.id === testId);
  
  if (testIndex === -1) {
    return null;
  }
  
  const existingTest = mockCompatibilityTests[testIndex];
  
  const updatedTest: CompatibilityTest = {
    ...existingTest,
    ...updates
  };
  
  // Store the updated test
  mockCompatibilityTests[testIndex] = updatedTest;
  
  return updatedTest;
}

/**
 * Creates a new transfusion request
 */
export function createTransfusionRequest(
  request: Omit<TransfusionRequest, 'id' | 'status'>,
  requestingUser: string
): TransfusionRequest {
  const id = Math.random().toString(36).substring(2, 15);
  
  const newRequest: TransfusionRequest = {
    id,
    ...request,
    status: TransfusionRequestStatus.PENDING
  };
  
  // Store the request
  mockTransfusionRequests.push(newRequest);
  
  return newRequest;
}

/**
 * Gets a transfusion request by ID
 */
export function getTransfusionRequest(requestId: string): TransfusionRequest | null {
  return mockTransfusionRequests.find(r => r.id === requestId) || null;
}

/**
 * Gets transfusion requests by patient ID
 */
export function getTransfusionRequestsByPatient(patientId: string): TransfusionRequest[] {
  return mockTransfusionRequests.filter(r => r.patientId === patientId);
}

/**
 * Gets transfusion requests by status
 */
export function getTransfusionRequestsByStatus(status: TransfusionRequestStatus): TransfusionRequest[] {
  return mockTransfusionRequests.filter(r => r.status === status);
}

/**
 * Updates a transfusion request
 */
export function updateTransfusionRequest(
  requestId: string,
  updates: Partial<Omit<TransfusionRequest, 'id' | 'patientId' | 'requestingPhysician' | 'requestingDepartment' | 'requestDate'>>
): TransfusionRequest | null {
  const requestIndex = mockTransfusionRequests.findIndex(r => r.id === requestId);
  
  if (requestIndex === -1) {
    return null;
  }
  
  const existingRequest = mockTransfusionRequests[requestIndex];
  
  const updatedRequest: TransfusionRequest = {
    ...existingRequest,
    ...updates
  };
  
  // Store the updated request
  mockTransfusionRequests[requestIndex] = updatedRequest;
  
  return updatedRequest;
}

/**
 * Assigns blood products to a transfusion request
 */
export function assignBloodProducts(
  requestId: string,
  productIds: string[],
  assignedBy: string
): TransfusionRequest | null {
  const requestIndex = mockTransfusionRequests.findIndex(r => r.id === requestId);
  
  if (requestIndex === -1) {
    return null;
  }
  
  const existingRequest = mockTransfusionRequests[requestIndex];
  
  // Check if all products exist and are available
  for (const productId of productIds) {
    const productIndex = mockBloodProducts.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      throw new Error(`Blood product with ID ${productId} not found`);
    }
    
    const product = mockBloodProducts[productIndex];
    
    if (product.status !== BloodProductStatus.AVAILABLE) {
      throw new Error(`Blood product with ID ${productId} is not available`);
    }
    
    // Update product status
    mockBloodProducts[productIndex] = {
      ...product,
      status: BloodProductStatus.ASSIGNED,
      modifiedAt: new Date().toISOString(),
      modifiedBy: assignedBy
    };
  }
  
  // Update request
  const updatedRequest: TransfusionRequest = {
    ...existingRequest,
    status: TransfusionRequestStatus.PROCESSING,
    assignedProducts: productIds
  };
  
  // Store the updated request
  mockTransfusionRequests[requestIndex] = updatedRequest;
  
  return updatedRequest;
}

/**
 * Issues blood products for a transfusion request
 */
export function issueBloodProducts(
  requestId: string,
  issuedBy: string
): TransfusionRequest | null {
  const requestIndex = mockTransfusionRequests.findIndex(r => r.id === requestId);
  
  if (requestIndex === -1) {
    return null;
  }
  
  const existingRequest = mockTransfusionRequests[requestIndex];
  
  if (!existingRequest.assignedProducts || existingRequest.assignedProducts.length === 0) {
    throw new Error('No blood products assigned to this request');
  }
  
  const now = new Date().toISOString();
  
  // Update product status
  for (const productId of existingRequest.assignedProducts) {
    const productIndex = mockBloodProducts.findIndex(p => p.id === productId);
    
    if (productIndex !== -1) {
      const product = mockBloodProducts[productIndex];
      
      mockBloodProducts[productIndex] = {
        ...product,
        status: BloodProductStatus.CROSSMATCHED,
        modifiedAt: now,
        modifiedBy: issuedBy
      };
    }
  }
  
  // Create issued products records
  const issuedProducts = existingRequest.assignedProducts.map(productId => ({
    productId,
    issuedBy,
    issuedAt: now
  }));
  
  // Update request
  const updatedRequest: TransfusionRequest = {
    ...existingRequest,
    status: TransfusionRequestStatus.READY,
    issuedProducts
  };
  
  // Store the updated request
  mockTransfusionRequests[requestIndex] = updatedRequest;
  
  return updatedRequest;
}

/**
 * Records transfusion completion
 */
export function recordTransfusionCompletion(
  requestId: string,
  transfusionEndTime: string,
  completedBy: string,
  vitalSigns?: {
    time: string;
    temperature: number;
    bloodPressure: {
      systolic: number;
      diastolic: number;
    };
    pulse: number;
    respiratoryRate: number;
    oxygenSaturation?: number;
  }
): TransfusionRequest | null {
  const requestIndex = mockTransfusionRequests.findIndex(r => r.id === requestId);
  
  if (requestIndex === -1) {
    return null;
  }
  
  const existingRequest = mockTransfusionRequests[requestIndex];
  
  if (!existingRequest.issuedProducts || existingRequest.issuedProducts.length === 0) {
    throw new Error('No blood products issued for this request');
  }
  
  // Update product status
  for (const issuedProduct of existingRequest.issuedProducts) {
    const productIndex = mockBloodProducts.findIndex(p => p.id === issuedProduct.productId);
    
    if (productIndex !== -1) {
      const product = mockBloodProducts[productIndex];
      
      mockBloodProducts[productIndex] = {
        ...product,
        status: BloodProductStatus.TRANSFUSED,
        modifiedAt: new Date().toISOString(),
        modifiedBy: completedBy
      };
    }
  }
  
  // Update request
  const updatedRequest: TransfusionRequest = {
    ...existingRequest,
    status: TransfusionRequestStatus.COMPLETED,
    transfusionEndTime
  };
  
  // Add vital signs if provided
  if (vitalSigns) {
    updatedRequest.vitalSigns = [
      ...(existingRequest.vitalSigns || []),
      vitalSigns
    ];
  }
  
  // Store the updated request
  mockTransfusionRequests[requestIndex] = updatedRequest;
  
  return updatedRequest;
}

/**
 * Records a transfusion reaction
 */
export function recordTransfusionReaction(
  requestId: string,
  reaction: {
    time: string;
    type: string;
    severity: TransfusionReactionSeverity;
    symptoms: string[];
    treatment?: string;
    outcome?: string;
    reportedBy: string;
  }
): TransfusionRequest | null {
  const requestIndex = mockTransfusionRequests.findIndex(r => r.id === requestId);
  
  if (requestIndex === -1) {
    return null;
  }
  
  const existingRequest = mockTransfusionRequests[requestIndex];
  
  // Update request
  const updatedRequest: TransfusionRequest = {
    ...existingRequest,
    transfusionReaction: {
      detected: true,
      time: reaction.time,
      type: reaction.type,
      severity: reaction.severity,
      symptoms: reaction.symptoms,
      treatment: reaction.treatment,
      outcome: reaction.outcome,
      reportedBy: reaction.reportedBy
    }
  };
  
  // Store the updated request
  mockTransfusionRequests[requestIndex] = updatedRequest;
  
  return updatedRequest;
}

/**
 * Cancels a transfusion request
 */
export function cancelTransfusionRequest(
  requestId: string,
  reason: string,
  cancelledBy: string
): TransfusionRequest | null {
  const requestIndex = mockTransfusionRequests.findIndex(r => r.id === requestId);
  
  if (requestIndex === -1) {
    return null;
  }
  
  const existingRequest = mockTransfusionRequests[requestIndex];
  const now = new Date().toISOString();
  
  // Release any assigned products
  if (existingRequest.assignedProducts) {
    for (const productId of existingRequest.assignedProducts) {
      const productIndex = mockBloodProducts.findIndex(p => p.id === productId);
      
      if (productIndex !== -1) {
        const product = mockBloodProducts[productIndex];
        
        if (product.status === BloodProductStatus.ASSIGNED || 
            product.status === BloodProductStatus.CROSSMATCHED) {
          mockBloodProducts[productIndex] = {
            ...product,
            status: BloodProductStatus.AVAILABLE,
            modifiedAt: now,
            modifiedBy: cancelledBy
          };
        }
      }
    }
  }
  
  // Update request
  const updatedRequest: TransfusionRequest = {
    ...existingRequest,
    status: TransfusionRequestStatus.CANCELLED,
    cancelledReason: reason,
    cancelledBy,
    cancelledAt: now
  };
  
  // Store the updated request
  mockTransfusionRequests[requestIndex] = updatedRequest;
  
  return updatedRequest;
}

/**
 * Gets blood inventory summary
 */
export function getBloodInventorySummary(): {
  byType: Record<BloodProductType, number>;
  byBloodType: Record<BloodType, number>;
  byStatus: Record<BloodProductStatus, number>;
  expiringWithin24Hours: number;
  expiringWithin72Hours: number;
  totalAvailable: number;
} {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const in72Hours = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
  
  // Initialize counters
  const byType: Record<BloodProductType, number> = {
    [BloodProductType.WHOLE_BLOOD]: 0,
    [BloodProductType.RED_BLOOD_CELLS]: 0,
    [BloodProductType.PLATELETS]: 0,
    [BloodProductType.PLASMA]: 0,
    [BloodProductType.CRYOPRECIPITATE]: 0,
    [BloodProductType.GRANULOCYTES]: 0
  };
  
  const byBloodType: Record<BloodType, number> = {
    [BloodType.A_POSITIVE]: 0,
    [BloodType.A_NEGATIVE]: 0,
    [BloodType.B_POSITIVE]: 0,
    [BloodType.B_NEGATIVE]: 0,
    [BloodType.AB_POSITIVE]: 0,
    [BloodType.AB_NEGATIVE]: 0,
    [BloodType.O_POSITIVE]: 0,
    [BloodType.O_NEGATIVE]: 0
  };
  
  const byStatus: Record<BloodProductStatus, number> = {
    [BloodProductStatus.AVAILABLE]: 0,
    [BloodProductStatus.ASSIGNED]: 0,
    [BloodProductStatus.CROSSMATCHED]: 0,
    [BloodProductStatus.QUARANTINED]: 0,
    [BloodProductStatus.DISCARDED]: 0,
    [BloodProductStatus.TRANSFUSED]: 0,
    [BloodProductStatus.EXPIRED]: 0
  };
  
  let expiringWithin24Hours = 0;
  let expiringWithin72Hours = 0;
  
  // Count products
  for (const product of mockBloodProducts) {
    byType[product.type]++;
    byBloodType[product.bloodType]++;
    byStatus[product.status]++;
    
    if (product.status === BloodProductStatus.AVAILABLE) {
      if (product.expirationDate <= in24Hours) {
        expiringWithin24Hours++;
      } else if (product.expirationDate <= in72Hours) {
        expiringWithin72Hours++;
      }
    }
  }
  
  return {
    byType,
    byBloodType,
    byStatus,
    expiringWithin24Hours,
    expiringWithin72Hours,
    totalAvailable: byStatus[BloodProductStatus.AVAILABLE]
  };
}

/**
 * Gets compatible blood types for a given blood type
 */
export function getCompatibleBloodTypes(bloodType: BloodType): BloodType[] {
  switch (bloodType) {
    case BloodType.A_POSITIVE:
      return [BloodType.A_POSITIVE, BloodType.A_NEGATIVE, BloodType.O_POSITIVE, BloodType.O_NEGATIVE];
    case BloodType.A_NEGATIVE:
      return [BloodType.A_NEGATIVE, BloodType.O_NEGATIVE];
    case BloodType.B_POSITIVE:
      return [BloodType.B_POSITIVE, BloodType.B_NEGATIVE, BloodType.O_POSITIVE, BloodType.O_NEGATIVE];
    case BloodType.B_NEGATIVE:
      return [BloodType.B_NEGATIVE, BloodType.O_NEGATIVE];
    case BloodType.AB_POSITIVE:
      return [
        BloodType.AB_POSITIVE, BloodType.AB_NEGATIVE,
        BloodType.A_POSITIVE, BloodType.A_NEGATIVE,
        BloodType.B_POSITIVE, BloodType.B_NEGATIVE,
        BloodType.O_POSITIVE, BloodType.O_NEGATIVE
      ];
    case BloodType.AB_NEGATIVE:
      return [
        BloodType.AB_NEGATIVE,
        BloodType.A_NEGATIVE,
        BloodType.B_NEGATIVE,
        BloodType.O_NEGATIVE
      ];
    case BloodType.O_POSITIVE:
      return [BloodType.O_POSITIVE, BloodType.O_NEGATIVE];
    case BloodType.O_NEGATIVE:
      return [BloodType.O_NEGATIVE];
    default:
      return [];
  }
}

/**
 * Finds compatible blood products for a patient
 */
export function findCompatibleBloodProducts(
  patientBloodType: BloodType,
  productType: BloodProductType,
  quantity: number,
  attributes?: BloodProductAttribute[]
): BloodProduct[] {
  // Get compatible blood types
  const compatibleTypes = getCompatibleBloodTypes(patientBloodType);
  
  // Find available products of the right type and compatible blood type
  let compatibleProducts = mockBloodProducts.filter(
    p => p.type === productType &&
        compatibleTypes.includes(p.bloodType) &&
        p.status === BloodProductStatus.AVAILABLE
  );
  
  // Filter by attributes if specified
  if (attributes && attributes.length > 0) {
    compatibleProducts = compatibleProducts.filter(
      p => attributes.every(attr => p.attributes.includes(attr))
    );
  }
  
  // Sort by expiration date (oldest first)
  compatibleProducts.sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
  
  // Return the requested quantity or all available if less than requested
  return compatibleProducts.slice(0, quantity);
}

/**
 * Generates an ISBT 128 donation identification number
 */
export function generateISBT128DonationNumber(
  facilityId: string,
  year: number,
  serialNumber: number
): string {
  // Format: W0000 YY 123456
  // W0000 = Facility ID (5 characters)
  // YY = Last two digits of year
  // 123456 = Serial number (6 digits)
  
  const paddedFacilityId = facilityId.padStart(5, '0');
  const yearStr = (year % 100).toString().padStart(2, '0');
  const serialStr = serialNumber.toString().padStart(6, '0');
  
  return `${paddedFacilityId}${yearStr}${serialStr}`;
}

/**
 * Validates an ISBT 128 donation identification number
 */
export function validateISBT128DonationNumber(isbtNumber: string): boolean {
  // Check format: W0000 YY 123456
  const regex = /^[A-Z0-9]{5}[0-9]{2}[0-9]{6}$/;
  return regex.test(isbtNumber.replace(/\s/g, ''));
}

/**
 * Generates a blood product label in ISBT 128 format
 */
export function generateBloodProductLabel(product: BloodProduct): string {
  // This is a simplified representation of an ISBT 128 label
  // In a real implementation, this would generate a proper label format
  
  const productCodes: Record<BloodProductType, string> = {
    [BloodProductType.WHOLE_BLOOD]: 'E0001',
    [BloodProductType.RED_BLOOD_CELLS]: 'E0002',
    [BloodProductType.PLATELETS]: 'E0003',
    [BloodProductType.PLASMA]: 'E0004',
    [BloodProductType.CRYOPRECIPITATE]: 'E0005',
    [BloodProductType.GRANULOCYTES]: 'E0006'
  };
  
  const bloodGroupCodes: Record<BloodType, string> = {
    [BloodType.A_POSITIVE]: 'A POS',
    [BloodType.A_NEGATIVE]: 'A NEG',
    [BloodType.B_POSITIVE]: 'B POS',
    [BloodType.B_NEGATIVE]: 'B NEG',
    [BloodType.AB_POSITIVE]: 'AB POS',
    [BloodType.AB_NEGATIVE]: 'AB NEG',
    [BloodType.O_POSITIVE]: 'O POS',
    [BloodType.O_NEGATIVE]: 'O NEG'
  };
  
  const attributeCodes: Record<BloodProductAttribute, string> = {
    [BloodProductAttribute.IRRADIATED]: 'IRR',
    [BloodProductAttribute.LEUKOREDUCED]: 'LR',
    [BloodProductAttribute.CMV_NEGATIVE]: 'CMV-',
    [BloodProductAttribute.WASHED]: 'WASHED',
    [BloodProductAttribute.DIRECTED_DONATION]: 'DIR',
    [BloodProductAttribute.AUTOLOGOUS]: 'AUTO',
    [BloodProductAttribute.HLA_MATCHED]: 'HLA',
    [BloodProductAttribute.PATHOGEN_REDUCED]: 'PR'
  };
  
  const productCode = productCodes[product.type];
  const bloodGroup = bloodGroupCodes[product.bloodType];
  const attributes = product.attributes.map(attr => attributeCodes[attr]).join(', ');
  const expirationDate = new Date(product.expirationDate).toLocaleDateString();
  
  return `
ISBT 128 BLOOD PRODUCT LABEL
---------------------------
DIN: ${product.isbtNumber}
PRODUCT: ${productCode} - ${product.type}
ABO/Rh: ${bloodGroup}
VOLUME: ${product.volume} mL
COLLECTED: ${new Date(product.collectionDate).toLocaleDateString()}
EXPIRES: ${expirationDate}
${attributes ? `ATTRIBUTES: ${attributes}` : ''}
---------------------------
  `.trim();
}

/**
 * Checks if a donor is eligible to donate
 */
export function checkDonorEligibility(
  donor: Donor,
  donationType: BloodProductType
): {
  isEligible: boolean;
  deferralReason?: string;
  nextEligibleDate?: string;
} {
  const now = new Date();
  
  // Check if donor is already deferred
  if (donor.status === DonorStatus.PERMANENTLY_DEFERRED) {
    return {
      isEligible: false,
      deferralReason: donor.deferralReason || 'Permanently deferred'
    };
  }
  
  if (donor.status === DonorStatus.TEMPORARILY_DEFERRED && donor.eligibilityUntil) {
    if (donor.eligibilityUntil > now.toISOString()) {
      return {
        isEligible: false,
        deferralReason: donor.deferralReason || 'Temporarily deferred',
        nextEligibleDate: donor.eligibilityUntil
      };
    }
  }
  
  // Check last donation date
  if (donor.lastDonationDate) {
    const lastDonation = new Date(donor.lastDonationDate);
    let minInterval = 56; // Default 56 days for whole blood
    
    // Different intervals based on donation type
    switch (donationType) {
      case BloodProductType.WHOLE_BLOOD:
        minInterval = 56; // 56 days
        break;
      case BloodProductType.PLATELETS:
        minInterval = 7; // 7 days
        break;
      case BloodProductType.PLASMA:
        minInterval = 28; // 28 days
        break;
      default:
        minInterval = 56; // Default to whole blood interval
    }
    
    const nextEligibleDate = new Date(lastDonation);
    nextEligibleDate.setDate(lastDonation.getDate() + minInterval);
    
    if (now < nextEligibleDate) {
      return {
        isEligible: false,
        deferralReason: `Minimum interval between donations not met`,
        nextEligibleDate: nextEligibleDate.toISOString()
      };
    }
  }
  
  // All checks passed
  return {
    isEligible: true
  };
}

/**
 * Processes a donation into blood products
 */
export function processDonation(
  donationId: string,
  processingDetails: {
    processedBy: string;
    processingMethod: string;
    productsToCreate: {
      type: BloodProductType;
      volume: number;
      attributes?: BloodProductAttribute[];
    }[];
    notes?: string;
  }
): BloodProduct[] {
  const donation = getDonation(donationId);
  
  if (!donation) {
    throw new Error(`Donation with ID ${donationId} not found`);
  }
  
  if (donation.processingStatus !== 'pending') {
    throw new Error(`Donation with ID ${donationId} has already been processed`);
  }
  
  const donor = getDonor(donation.donorId);
  
  if (!donor) {
    throw new Error(`Donor with ID ${donation.donorId} not found`);
  }
  
  const now = new Date().toISOString();
  const products: BloodProduct[] = [];
  
  // Generate ISBT 128 donation number
  const currentYear = new Date().getFullYear();
  const facilityId = 'HMS01'; // Example facility ID
  const serialNumber = Math.floor(Math.random() * 1000000); // Random serial number
  const isbtNumber = generateISBT128DonationNumber(facilityId, currentYear, serialNumber);
  
  // Create products
  for (const productInfo of processingDetails.productsToCreate) {
    // Calculate expiration date based on product type
    const collectionDate = new Date(donation.donationDate);
    const expirationDate = new Date(collectionDate);
    
    switch (productInfo.type) {
      case BloodProductType.WHOLE_BLOOD:
        expirationDate.setDate(collectionDate.getDate() + 35); // 35 days
        break;
      case BloodProductType.RED_BLOOD_CELLS:
        expirationDate.setDate(collectionDate.getDate() + 42); // 42 days
        break;
      case BloodProductType.PLATELETS:
        expirationDate.setDate(collectionDate.getDate() + 5); // 5 days
        break;
      case BloodProductType.PLASMA:
        expirationDate.setFullYear(collectionDate.getFullYear() + 1); // 1 year
        break;
      case BloodProductType.CRYOPRECIPITATE:
        expirationDate.setFullYear(collectionDate.getFullYear() + 1); // 1 year
        break;
      case BloodProductType.GRANULOCYTES:
        expirationDate.setDate(collectionDate.getDate() + 1); // 24 hours
        break;
    }
    
    // Create the product
    const product = createBloodProduct({
      donationId,
      donorId: donation.donorId,
      type: productInfo.type,
      bloodType: donor.bloodType || BloodType.O_POSITIVE, // Default to O+ if unknown
      volume: productInfo.volume,
      collectionDate: donation.donationDate,
      expirationDate: expirationDate.toISOString(),
      status: BloodProductStatus.AVAILABLE,
      location: 'Blood Bank Storage',
      attributes: productInfo.attributes || [],
      isbtNumber,
      processingDetails: {
        processedBy: processingDetails.processedBy,
        processedAt: now,
        processingMethod: processingDetails.processingMethod,
        notes: processingDetails.notes
      },
      testResults: {
        aboRhConfirmed: true,
        infectiousDiseaseScreening: {
          hiv: false,
          hbv: false,
          hcv: false,
          syphilis: false
        }
      }
    }, processingDetails.processedBy);
    
    products.push(product);
  }
  
  // Update donation status
  updateDonation(donationId, {
    processingStatus: 'completed',
    productsCreated: products.map(p => p.id)
  });
  
  return products;
}
