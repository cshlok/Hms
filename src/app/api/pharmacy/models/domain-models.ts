/**
 * Domain Models for Pharmacy Module
 * 
 * This file contains the domain models for the pharmacy module,
 * following domain-driven design principles.
 */

import { z } from 'zod';

// Define domain models using ES2015 module syntax instead of namespace
export interface Medication {
  id: string;
  name: string;
  brandName: string;
  ndc: string;
  form: string;
  strength: number;
  unit: string;
  isControlled: boolean;
  isHighAlert: boolean;
  controlledSubstanceSchedule?: string;
  therapeuticClass?: string;
  manufacturer?: string;
  description?: string;
  warnings?: string[];
  contraindications?: string[];
  interactions?: string[];
  sideEffects?: string[];
  storageRequirements?: string;
  requiresRefrigeration?: boolean;
  requiresControlledStorage?: boolean;
}

export interface MedicationInventory {
  id: string;
  medicationId: string;
  locationId: string;
  batchNumber: string;
  lotNumber: string;
  expirationDate: Date;
  quantity: number;
  reorderThreshold: number;
  reorderQuantity: number;
  lastCountDate: Date;
  status: 'active' | 'expired' | 'recalled' | 'depleted';
  cost: number;
  supplier: string;
  receivedDate: Date;
  notes?: string;
}

export interface MedicationOrder {
  id: string;
  patientId: string;
  providerId: string;
  medicationId: string;
  status: 'draft' | 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'unknown';
  orderDate: Date;
  dosage: Record<string, unknown>;
  frequency: string;
  route: string;
  duration: string;
  startDate?: Date;
  endDate?: Date;
  indication?: string;
  notes?: string;
  isStatOrder?: boolean;
  prn?: boolean;
  prnReason?: string;
  reconciliationId?: string;
}

export interface MedicationDispense {
  id: string;
  patientId: string;
  providerId: string;
  medicationId: string;
  prescriptionId: string;
  dispenserId: string;
  status: 'preparation' | 'in-progress' | 'cancelled' | 'on-hold' | 'completed' | 'entered-in-error' | 'stopped' | 'declined' | 'unknown';
  dispenseDate: Date;
  quantity: number;
  daysSupply: number;
  batchNumber?: string;
  lotNumber?: string;
  expirationDate?: Date;
  notes?: string;
  locationId: string;
  verifierId?: string;
  verificationDate?: Date;
  isPartialFill?: boolean;
  remainingQuantity?: number;
  labelInstructions?: string;
  patientInstructions?: string;
}

export interface MedicationAdministration {
  id: string;
  patientId: string;
  providerId: string;
  medicationId: string;
  prescriptionId: string;
  status: 'in-progress' | 'not-done' | 'on-hold' | 'completed' | 'entered-in-error' | 'stopped' | 'unknown';
  administrationDate: Date;
  dosage: number;
  unit: string;
  route: string;
  site?: string;
  notes?: string;
  verifierId?: string;
  verificationMethod?: 'barcode' | 'manual' | 'override';
  reasonNotAdministered?: string;
  adverseReaction?: boolean;
  adverseReactionDetails?: string;
}

export interface MedicationReconciliation {
  id: string;
  patientId: string;
  providerId: string;
  sourceType: 'admission' | 'discharge' | 'transfer';
  targetType: 'inpatient' | 'outpatient';
  reconciliationDate: Date;
  status: 'in-progress' | 'completed' | 'cancelled';
  discrepancies: MedicationDiscrepancy[];
  actions: ReconciliationAction[];
}

export interface MedicationDiscrepancy {
  id: string;
  medicationId: string;
  relatedMedicationId?: string;
  discrepancyType: 'omission' | 'addition' | 'dosing' | 'frequency' | 'route' | 'duplication';
  description: string;
  severity: 'high' | 'medium' | 'low';
  status: 'unresolved' | 'resolved';
  resolution?: {
    action: 'continue' | 'discontinue' | 'modify' | 'substitute';
    providerId: string;
    timestamp: Date;
    notes: string;
  };
}

export interface ReconciliationAction {
  id: string;
  discrepancyId: string;
  action: 'continue' | 'discontinue' | 'modify' | 'substitute';
  providerId: string;
  timestamp: Date;
  notes: string;
}

export interface MedicationReconciliationResult {
  reconciliation: MedicationReconciliation;
  sourceMedications: Medication[];
  targetMedications: Medication[];
  discrepancies: MedicationDiscrepancy[];
}

export interface MedicationReconciliationSummary {
  id: string;
  patientId: string;
  providerId: string;
  sourceType: 'admission' | 'discharge' | 'transfer';
  targetType: 'inpatient' | 'outpatient';
  reconciliationDate: Date;
  status: 'in-progress' | 'completed' | 'cancelled';
  discrepancyCount: number;
  resolvedCount: number;
}

export interface MedicationReconciliationReport {
  reconciliationId: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  reconciliationDate: Date;
  sourceType: 'admission' | 'discharge' | 'transfer';
  targetType: 'inpatient' | 'outpatient';
  status: 'in-progress' | 'completed' | 'cancelled';
  summary: {
    totalDiscrepancies: number;
    resolvedDiscrepancies: number;
    highSeverityCount: number;
    mediumSeverityCount: number;
    lowSeverityCount: number;
  };
  discrepancies: Array<MedicationDiscrepancy & {
    resolution?: {
      action: 'continue' | 'discontinue' | 'modify' | 'substitute';
      providerId: string;
      timestamp: Date;
      notes: string;
    };
  }>;
}

export interface DrugInteractionResult {
  hasInteraction: boolean;
  isOverridden?: boolean;
  overrideReason?: string;
  medications: Medication[];
  interactionType: 'drug-drug';
  severity?: 'severe' | 'moderate' | 'mild';
  description?: string;
  reference?: string;
}

export interface DrugAllergyInteractionResult {
  hasInteraction: boolean;
  medication: Medication;
  interactionType: 'drug-allergy';
  allergen?: string;
  allergyClass?: string;
  severity?: 'severe' | 'moderate' | 'mild';
  reaction?: string;
}

export interface DrugConditionInteractionResult {
  hasInteraction: boolean;
  medication: Medication;
  condition?: Record<string, unknown>;
  interactionType: 'drug-condition';
  severity?: 'severe' | 'moderate' | 'mild';
  description?: string;
  reference?: string;
}

export interface DrugLabInteractionResult {
  hasInteraction: boolean;
  medication: Medication;
  labResult?: Record<string, unknown>;
  interactionType: 'drug-lab';
  severity?: 'severe' | 'moderate' | 'mild';
  description?: string;
  reference?: string;
}

export interface BatchInteractionResult {
  patientId: string;
  medicationIds: string[];
  drugDrugInteractions: DrugInteractionResult[];
  drugAllergyInteractions: DrugAllergyInteractionResult[];
  drugConditionInteractions: DrugConditionInteractionResult[];
  drugLabInteractions: DrugLabInteractionResult[];
  hasSevereInteractions: boolean;
  interactionCount: number;
}

export interface InteractionOverride {
  id: string;
  interactionId: string;
  patientId: string;
  providerId: string;
  reason: string;
  expiresAt: Date;
  createdAt: Date;
}

// Validation schemas using Zod
export const MedicationSchema = z.object({
  id: z.string(),
  name: z.string(),
  brandName: z.string(),
  ndc: z.string(),
  form: z.string(),
  strength: z.number().positive(),
  unit: z.string(),
  isControlled: z.boolean(),
  isHighAlert: z.boolean(),
  controlledSubstanceSchedule: z.string().optional(),
  therapeuticClass: z.string().optional(),
  manufacturer: z.string().optional(),
  description: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  interactions: z.array(z.string()).optional(),
  sideEffects: z.array(z.string()).optional(),
  storageRequirements: z.string().optional(),
  requiresRefrigeration: z.boolean().optional(),
  requiresControlledStorage: z.boolean().optional()
});

export const MedicationInventorySchema = z.object({
  id: z.string(),
  medicationId: z.string(),
  locationId: z.string(),
  batchNumber: z.string(),
  lotNumber: z.string(),
  expirationDate: z.date(),
  quantity: z.number().int().nonnegative(),
  reorderThreshold: z.number().int().nonnegative(),
  reorderQuantity: z.number().int().positive(),
  lastCountDate: z.date(),
  status: z.enum(['active', 'expired', 'recalled', 'depleted']),
  cost: z.number().nonnegative(),
  supplier: z.string(),
  receivedDate: z.date(),
  notes: z.string().optional()
});

export const MedicationOrderSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  providerId: z.string(),
  medicationId: z.string(),
  status: z.enum([
    'draft', 'active', 'on-hold', 'cancelled', 'completed', 
    'entered-in-error', 'stopped', 'unknown'
  ]),
  orderDate: z.date(),
  dosage: z.record(z.unknown()),
  frequency: z.string(),
  route: z.string(),
  duration: z.string(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  indication: z.string().optional(),
  notes: z.string().optional(),
  isStatOrder: z.boolean().optional(),
  prn: z.boolean().optional(),
  prnReason: z.string().optional(),
  reconciliationId: z.string().optional()
});

// Factory functions to create domain objects with validation
export function createMedication(data: Medication): Medication {
  return MedicationSchema.parse(data);
}

export function createMedicationInventory(data: MedicationInventory): MedicationInventory {
  return MedicationInventorySchema.parse(data);
}

export function createMedicationOrder(data: MedicationOrder): MedicationOrder {
  return MedicationOrderSchema.parse(data);
}
