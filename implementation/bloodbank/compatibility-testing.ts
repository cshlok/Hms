/**
 * Compatibility Testing System
 * 
 * This module implements advanced compatibility testing features for the Blood Bank,
 * including ABO/Rh typing, antibody screening, crossmatching, and compatibility
 * determination algorithms.
 */

import {
  BloodType,
  BloodProductType,
  BloodProduct,
  CompatibilityTest,
  TransfusionRequest,
  getBloodProduct,
  getCompatibilityTest,
  getCompatibilityTestsByPatient,
  getCompatibilityTestsByBloodProduct,
  createCompatibilityTest,
  updateCompatibilityTest,
  getTransfusionRequest,
  updateTransfusionRequest,
  getCompatibleBloodTypes,
  findCompatibleBloodProducts
} from './core-data-models';

// Test type
export enum TestType {
  ABO_RH_TYPING = 'abo_rh_typing',
  ANTIBODY_SCREEN = 'antibody_screen',
  CROSSMATCH = 'crossmatch',
  DIRECT_ANTIGLOBULIN = 'direct_antiglobulin',
  INDIRECT_ANTIGLOBULIN = 'indirect_antiglobulin',
  ELUTION = 'elution',
  ADSORPTION = 'adsorption'
}

// Test result
export enum TestResult {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  INCONCLUSIVE = 'inconclusive',
  PENDING = 'pending'
}

// Antibody identification
export interface AntibodyIdentification {
  antibody: string;
  strength: 'weak' | 'moderate' | 'strong';
  clinicalSignificance: 'low' | 'moderate' | 'high';
}

// Patient blood typing
export interface PatientBloodTyping {
  id: string;
  patientId: string;
  testDate: string;
  testedBy: string;
  bloodType: BloodType;
  confirmationRequired: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
  notes?: string;
}

// Patient antibody screen
export interface PatientAntibodyScreen {
  id: string;
  patientId: string;
  testDate: string;
  testedBy: string;
  result: TestResult;
  antibodiesIdentified: AntibodyIdentification[];
  confirmationRequired: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
  notes?: string;
}

// Crossmatch result
export interface CrossmatchResult {
  id: string;
  patientId: string;
  bloodProductId: string;
  requestId: string;
  testDate: string;
  testedBy: string;
  method: 'immediate_spin' | 'electronic' | 'antiglobulin';
  result: TestResult;
  isCompatible: boolean;
  confirmationRequired: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
  notes?: string;
}

// Mock data stores
const mockPatientBloodTypings: PatientBloodTyping[] = [];
const mockPatientAntibodyScreens: PatientAntibodyScreen[] = [];
const mockCrossmatchResults: CrossmatchResult[] = [];

/**
 * Creates a new patient blood typing
 */
export function createPatientBloodTyping(
  patientId: string,
  bloodType: BloodType,
  testedBy: string,
  confirmationRequired: boolean = true,
  notes?: string
): PatientBloodTyping {
  const id = Math.random().toString(36).substring(2, 15);
  const now = new Date().toISOString();
  
  const bloodTyping: PatientBloodTyping = {
    id,
    patientId,
    testDate: now,
    testedBy,
    bloodType,
    confirmationRequired,
    notes
  };
  
  // Store the blood typing
  mockPatientBloodTypings.push(bloodTyping);
  
  return bloodTyping;
}

/**
 * Gets a patient blood typing by ID
 */
export function getPatientBloodTyping(typingId: string): PatientBloodTyping | null {
  return mockPatientBloodTypings.find(t => t.id === typingId) || null;
}

/**
 * Gets patient blood typings by patient ID
 */
export function getPatientBloodTypingsByPatient(patientId: string): PatientBloodTyping[] {
  return mockPatientBloodTypings.filter(t => t.patientId === patientId);
}

/**
 * Gets the latest patient blood typing by patient ID
 */
export function getLatestPatientBloodTyping(patientId: string): PatientBloodTyping | null {
  const typings = mockPatientBloodTypings
    .filter(t => t.patientId === patientId)
    .sort((a, b) => b.testDate.localeCompare(a.testDate));
  
  return typings.length > 0 ? typings[0] : null;
}

/**
 * Confirms a patient blood typing
 */
export function confirmPatientBloodTyping(
  typingId: string,
  confirmedBy: string,
  notes?: string
): PatientBloodTyping | null {
  const typingIndex = mockPatientBloodTypings.findIndex(t => t.id === typingId);
  
  if (typingIndex === -1) {
    return null;
  }
  
  const existingTyping = mockPatientBloodTypings[typingIndex];
  
  if (!existingTyping.confirmationRequired) {
    throw new Error(`Blood typing with ID ${typingId} does not require confirmation`);
  }
  
  if (existingTyping.confirmedBy) {
    throw new Error(`Blood typing with ID ${typingId} is already confirmed`);
  }
  
  const now = new Date().toISOString();
  
  const updatedTyping: PatientBloodTyping = {
    ...existingTyping,
    confirmedBy,
    confirmedAt: now,
    notes: notes ? (existingTyping.notes ? `${existingTyping.notes}\n${notes}` : notes) : existingTyping.notes
  };
  
  // Store the updated typing
  mockPatientBloodTypings[typingIndex] = updatedTyping;
  
  return updatedTyping;
}

/**
 * Creates a new patient antibody screen
 */
export function createPatientAntibodyScreen(
  patientId: string,
  result: TestResult,
  antibodiesIdentified: AntibodyIdentification[],
  testedBy: string,
  confirmationRequired: boolean = true,
  notes?: string
): PatientAntibodyScreen {
  const id = Math.random().toString(36).substring(2, 15);
  const now = new Date().toISOString();
  
  const antibodyScreen: PatientAntibodyScreen = {
    id,
    patientId,
    testDate: now,
    testedBy,
    result,
    antibodiesIdentified,
    confirmationRequired,
    notes
  };
  
  // Store the antibody screen
  mockPatientAntibodyScreens.push(antibodyScreen);
  
  return antibodyScreen;
}

/**
 * Gets a patient antibody screen by ID
 */
export function getPatientAntibodyScreen(screenId: string): PatientAntibodyScreen | null {
  return mockPatientAntibodyScreens.find(s => s.id === screenId) || null;
}

/**
 * Gets patient antibody screens by patient ID
 */
export function getPatientAntibodyScreensByPatient(patientId: string): PatientAntibodyScreen[] {
  return mockPatientAntibodyScreens.filter(s => s.patientId === patientId);
}

/**
 * Gets the latest patient antibody screen by patient ID
 */
export function getLatestPatientAntibodyScreen(patientId: string): PatientAntibodyScreen | null {
  const screens = mockPatientAntibodyScreens
    .filter(s => s.patientId === patientId)
    .sort((a, b) => b.testDate.localeCompare(a.testDate));
  
  return screens.length > 0 ? screens[0] : null;
}

/**
 * Confirms a patient antibody screen
 */
export function confirmPatientAntibodyScreen(
  screenId: string,
  confirmedBy: string,
  notes?: string
): PatientAntibodyScreen | null {
  const screenIndex = mockPatientAntibodyScreens.findIndex(s => s.id === screenId);
  
  if (screenIndex === -1) {
    return null;
  }
  
  const existingScreen = mockPatientAntibodyScreens[screenIndex];
  
  if (!existingScreen.confirmationRequired) {
    throw new Error(`Antibody screen with ID ${screenId} does not require confirmation`);
  }
  
  if (existingScreen.confirmedBy) {
    throw new Error(`Antibody screen with ID ${screenId} is already confirmed`);
  }
  
  const now = new Date().toISOString();
  
  const updatedScreen: PatientAntibodyScreen = {
    ...existingScreen,
    confirmedBy,
    confirmedAt: now,
    notes: notes ? (existingScreen.notes ? `${existingScreen.notes}\n${notes}` : notes) : existingScreen.notes
  };
  
  // Store the updated screen
  mockPatientAntibodyScreens[screenIndex] = updatedScreen;
  
  return updatedScreen;
}

/**
 * Creates a new crossmatch result
 */
export function createCrossmatchResult(
  patientId: string,
  bloodProductId: string,
  requestId: string,
  method: 'immediate_spin' | 'electronic' | 'antiglobulin',
  result: TestResult,
  isCompatible: boolean,
  testedBy: string,
  confirmationRequired: boolean = true,
  notes?: string
): CrossmatchResult {
  const id = Math.random().toString(36).substring(2, 15);
  const now = new Date().toISOString();
  
  // Validate blood product
  const product = getBloodProduct(bloodProductId);
  
  if (!product) {
    throw new Error(`Blood product with ID ${bloodProductId} not found`);
  }
  
  // Validate request
  const request = getTransfusionRequest(requestId);
  
  if (!request) {
    throw new Error(`Transfusion request with ID ${requestId} not found`);
  }
  
  if (request.patientId !== patientId) {
    throw new Error(`Transfusion request with ID ${requestId} does not belong to patient with ID ${patientId}`);
  }
  
  const crossmatch: CrossmatchResult = {
    id,
    patientId,
    bloodProductId,
    requestId,
    testDate: now,
    testedBy,
    method,
    result,
    isCompatible,
    confirmationRequired,
    notes
  };
  
  // Store the crossmatch
  mockCrossmatchResults.push(crossmatch);
  
  // Create compatibility test record
  createCompatibilityTest({
    patientId,
    bloodProductId,
    requestId,
    testDate: now,
    testedBy,
    testType: TestType.CROSSMATCH,
    results: {
      method,
      result,
      isCompatible
    },
    isCompatible,
    notes
  });
  
  return crossmatch;
}

/**
 * Gets a crossmatch result by ID
 */
export function getCrossmatchResult(crossmatchId: string): CrossmatchResult | null {
  return mockCrossmatchResults.find(c => c.id === crossmatchId) || null;
}

/**
 * Gets crossmatch results by patient ID
 */
export function getCrossmatchResultsByPatient(patientId: string): CrossmatchResult[] {
  return mockCrossmatchResults.filter(c => c.patientId === patientId);
}

/**
 * Gets crossmatch results by blood product ID
 */
export function getCrossmatchResultsByBloodProduct(bloodProductId: string): CrossmatchResult[] {
  return mockCrossmatchResults.filter(c => c.bloodProductId === bloodProductId);
}

/**
 * Gets crossmatch results by request ID
 */
export function getCrossmatchResultsByRequest(requestId: string): CrossmatchResult[] {
  return mockCrossmatchResults.filter(c => c.requestId === requestId);
}

/**
 * Confirms a crossmatch result
 */
export function confirmCrossmatchResult(
  crossmatchId: string,
  confirmedBy: string,
  notes?: string
): CrossmatchResult | null {
  const crossmatchIndex = mockCrossmatchResults.findIndex(c => c.id === crossmatchId);
  
  if (crossmatchIndex === -1) {
    return null;
  }
  
  const existingCrossmatch = mockCrossmatchResults[crossmatchIndex];
  
  if (!existingCrossmatch.confirmationRequired) {
    throw new Error(`Crossmatch with ID ${crossmatchId} does not require confirmation`);
  }
  
  if (existingCrossmatch.confirmedBy) {
    throw new Error(`Crossmatch with ID ${crossmatchId} is already confirmed`);
  }
  
  const now = new Date().toISOString();
  
  const updatedCrossmatch: CrossmatchResult = {
    ...existingCrossmatch,
    confirmedBy,
    confirmedAt: now,
    notes: notes ? (existingCrossmatch.notes ? `${existingCrossmatch.notes}\n${notes}` : notes) : existingCrossmatch.notes
  };
  
  // Store the updated crossmatch
  mockCrossmatchResults[crossmatchIndex] = updatedCrossmatch;
  
  // Update compatibility test record
  const compatibilityTests = getCompatibilityTestsByBloodProduct(existingCrossmatch.bloodProductId)
    .filter(t => t.patientId === existingCrossmatch.patientId && t.requestId === existingCrossmatch.requestId);
  
  if (compatibilityTests.length > 0) {
    updateCompatibilityTest(
      compatibilityTests[0].id,
      {
        verifiedBy: confirmedBy,
        verifiedAt: now,
        notes: notes ? (compatibilityTests[0].notes ? `${compatibilityTests[0].notes}\n${notes}` : notes) : compatibilityTests[0].notes
      }
    );
  }
  
  return updatedCrossmatch;
}

/**
 * Determines compatible blood types for a patient
 */
export function determineCompatibleBloodTypes(patientBloodType: BloodType): BloodType[] {
  return getCompatibleBloodTypes(patientBloodType);
}

/**
 * Determines if a blood product is compatible with a patient
 */
export function isBloodProductCompatibleWithPatient(
  patientId: string,
  bloodProductId: string
): { isCompatible: boolean; reason?: string } {
  // Get patient blood type
  const patientBloodTyping = getLatestPatientBloodTyping(patientId);
  
  if (!patientBloodTyping) {
    return { isCompatible: false, reason: 'Patient blood type not determined' };
  }
  
  // Get blood product
  const bloodProduct = getBloodProduct(bloodProductId);
  
  if (!bloodProduct) {
    return { isCompatible: false, reason: 'Blood product not found' };
  }
  
  // Check ABO/Rh compatibility
  const compatibleBloodTypes = determineCompatibleBloodTypes(patientBloodTyping.bloodType);
  
  if (!compatibleBloodTypes.includes(bloodProduct.bloodType)) {
    return { 
      isCompatible: false, 
      reason: `Blood product type ${bloodProduct.bloodType} is not compatible with patient blood type ${patientBloodTyping.bloodType}` 
    };
  }
  
  // Check for antibodies
  const antibodyScreen = getLatestPatientAntibodyScreen(patientId);
  
  if (antibodyScreen && antibodyScreen.result === TestResult.POSITIVE) {
    // Patient has antibodies, crossmatch required
    const crossmatches = getCrossmatchResultsByBloodProduct(bloodProductId)
      .filter(c => c.patientId === patientId);
    
    if (crossmatches.length === 0) {
      return { isCompatible: false, reason: 'Crossmatch required due to positive antibody screen' };
    }
    
    // Check the latest crossmatch
    const latestCrossmatch = crossmatches.sort((a, b) => b.testDate.localeCompare(a.testDate))[0];
    
    if (!latestCrossmatch.isCompatible) {
      return { isCompatible: false, reason: 'Incompatible crossmatch result' };
    }
  }
  
  return { isCompatible: true };
}

/**
 * Finds compatible blood products for a patient
 */
export function findCompatibleBloodProductsForPatient(
  patientId: string,
  productType: BloodProductType,
  quantity: number
): BloodProduct[] {
  // Get patient blood type
  const patientBloodTyping = getLatestPatientBloodTyping(patientId);
  
  if (!patientBloodTyping) {
    return [];
  }
  
  // Find compatible products
  const products = findCompatibleBloodProducts(
    patientBloodTyping.bloodType,
    productType,
    quantity
  );
  
  // Check for antibodies
  const antibodyScreen = getLatestPatientAntibodyScreen(patientId);
  
  if (!antibodyScreen || antibodyScreen.result !== TestResult.POSITIVE) {
    // No antibodies, return all compatible products
    return products;
  }
  
  // Patient has antibodies, filter by crossmatch results
  return products.filter(product => {
    const crossmatches = getCrossmatchResultsByBloodProduct(product.id)
      .filter(c => c.patientId === patientId);
    
    if (crossmatches.length === 0) {
      // No crossmatch, not compatible
      return false;
    }
    
    // Check the latest crossmatch
    const latestCrossmatch = crossmatches.sort((a, b) => b.testDate.localeCompare(a.testDate))[0];
    
    return latestCrossmatch.isCompatible;
  });
}

/**
 * Generates a compatibility report for a transfusion request
 */
export function generateCompatibilityReport(
  requestId: string
): {
  request: TransfusionRequest | null;
  patientBloodType: BloodType | null;
  antibodyScreen: {
    result: TestResult;
    antibodies: AntibodyIdentification[];
  } | null;
  compatibleProducts: BloodProduct[];
  crossmatchResults: CrossmatchResult[];
  recommendations: string[];
} {
  // Get request
  const request = getTransfusionRequest(requestId);
  
  if (!request) {
    return {
      request: null,
      patientBloodType: null,
      antibodyScreen: null,
      compatibleProducts: [],
      crossmatchResults: [],
      recommendations: ['Transfusion request not found']
    };
  }
  
  // Get patient blood type
  const patientBloodTyping = getLatestPatientBloodTyping(request.patientId);
  const patientBloodType = patientBloodTyping ? patientBloodTyping.bloodType : null;
  
  // Get antibody screen
  const antibodyScreen = getLatestPatientAntibodyScreen(request.patientId);
  
  let antibodyScreenResult = null;
  
  if (antibodyScreen) {
    antibodyScreenResult = {
      result: antibodyScreen.result,
      antibodies: antibodyScreen.antibodiesIdentified
    };
  }
  
  // Get compatible products
  let compatibleProducts: BloodProduct[] = [];
  
  if (patientBloodType) {
    for (const requestedProduct of request.requestedProducts) {
      const products = findCompatibleBloodProductsForPatient(
        request.patientId,
        requestedProduct.type,
        requestedProduct.quantity
      );
      
      compatibleProducts = [...compatibleProducts, ...products];
    }
  }
  
  // Get crossmatch results
  const crossmatchResults = getCrossmatchResultsByRequest(requestId);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (!patientBloodType) {
    recommendations.push('Determine patient blood type');
  }
  
  if (!antibodyScreen) {
    recommendations.push('Perform antibody screen');
  } else if (antibodyScreen.result === TestResult.POSITIVE) {
    recommendations.push('Perform crossmatch due to positive antibody screen');
  }
  
  if (compatibleProducts.length < request.requestedProducts.reduce((total, p) => total + p.quantity, 0)) {
    recommendations.push('Insufficient compatible blood products available');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Compatible blood products available for transfusion');
  }
  
  return {
    request,
    patientBloodType,
    antibodyScreen: antibodyScreenResult,
    compatibleProducts,
    crossmatchResults,
    recommendations
  };
}
