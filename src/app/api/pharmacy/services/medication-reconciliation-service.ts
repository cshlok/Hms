/**
 * Medication Reconciliation Service Implementation
 * 
 * This service implements an enhanced medication reconciliation workflow
 * based on research of leading open-source pharmacy systems and best practices.
 * It provides structured comparison of medication lists across care transitions.
 */

import { injectable, inject } from 'inversify';
import { PharmacyDomain } from '../models/domain-models';
import { v4 as uuidv4 } from 'uuid';

// Reconciliation types
export enum ReconciliationType {
  ADMISSION = 'admission',
  TRANSFER = 'transfer',
  DISCHARGE = 'discharge'
}

// Reconciliation status
export enum ReconciliationStatus {
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Medication source types
export enum MedicationSourceType {
  PATIENT_REPORTED = 'patient-reported',
  PHARMACY_FILL = 'pharmacy-fill',
  PREVIOUS_ENCOUNTER = 'previous-encounter',
  EXTERNAL_SOURCE = 'external-source'
}

// Reconciliation decision
export enum ReconciliationDecision {
  CONTINUE = 'continue',
  MODIFY = 'modify',
  DISCONTINUE = 'discontinue',
  NEW = 'new'
}

// Medication source
export interface MedicationSource {
  id: string;
  type: MedicationSourceType;
  name: string;
  description: string;
  lastUpdated: Date;
}

// Medication entry for reconciliation
export interface MedicationEntry {
  id: string;
  medicationId: string;
  medicationName: string;
  dosage: PharmacyDomain.Dosage;
  sourceType: MedicationSourceType;
  sourceId: string;
  sourceName: string;
  startDate?: Date;
  endDate?: Date;
  prescriptionId?: string;
  indication?: string;
  notes?: string;
}

// Reconciliation decision entry
export interface ReconciliationDecisionEntry {
  id: string;
  medicationEntryId: string;
  decision: ReconciliationDecision;
  reason?: string;
  newDosage?: PharmacyDomain.Dosage;
  newStartDate?: Date;
  newEndDate?: Date;
  newIndication?: string;
  notes?: string;
  decidedBy: string;
  decidedAt: Date;
}

// Reconciliation session
export interface ReconciliationSession {
  id: string;
  patientId: string;
  type: ReconciliationType;
  status: ReconciliationStatus;
  createdBy: string;
  createdAt: Date;
  completedBy?: string;
  completedAt?: Date;
  encounterOrVisitId?: string;
  sources: MedicationSource[];
  medicationEntries: MedicationEntry[];
  decisions: ReconciliationDecisionEntry[];
}

@injectable()
export class MedicationReconciliationService {
  constructor(
    @inject('MedicationRepository') private medicationRepository: PharmacyDomain.MedicationRepository,
    @inject('PrescriptionRepository') private prescriptionRepository: PharmacyDomain.PrescriptionRepository,
    @inject('DrugInteractionService') private drugInteractionService: PharmacyDomain.DrugInteractionService
  ) {}

  /**
   * Create a new medication reconciliation session
   * 
   * @param patientId Patient ID
   * @param type Reconciliation type (admission, transfer, discharge)
   * @param createdBy ID of the user creating the session
   * @param encounterOrVisitId Optional encounter or visit ID
   * @returns New reconciliation session
   */
  async createReconciliationSession(
    patientId: string,
    type: ReconciliationType,
    createdBy: string,
    encounterOrVisitId?: string
  ): Promise<ReconciliationSession> {
    // Create new session
    const session: ReconciliationSession = {
      id: uuidv4(),
      patientId,
      type,
      status: ReconciliationStatus.IN_PROGRESS,
      createdBy,
      createdAt: new Date(),
      encounterOrVisitId,
      sources: [],
      medicationEntries: [],
      decisions: []
    };
    
    // Add default sources
    session.sources = await this.getDefaultSources(patientId);
    
    // Populate medication entries from sources
    session.medicationEntries = await this.getMedicationEntriesFromSources(patientId, session.sources);
    
    // Save session (in a real implementation, this would save to a database)
    return this.saveSession(session);
  }
  
  /**
   * Get an existing reconciliation session
   * 
   * @param sessionId Session ID
   * @returns Reconciliation session
   */
  async getReconciliationSession(sessionId: string): Promise<ReconciliationSession | null> {
    // In a real implementation, this would fetch from a database
    // For this implementation, we'll simulate a database lookup
    return this.findSessionById(sessionId);
  }
  
  /**
   * Get active reconciliation sessions for a patient
   * 
   * @param patientId Patient ID
   * @returns Array of active reconciliation sessions
   */
  async getActiveSessionsForPatient(patientId: string): Promise<ReconciliationSession[]> {
    // In a real implementation, this would query a database
    // For this implementation, we'll simulate a database query
    return this.findSessionsByPatientAndStatus(patientId, ReconciliationStatus.IN_PROGRESS);
  }
  
  /**
   * Add a medication source to a reconciliation session
   * 
   * @param sessionId Session ID
   * @param sourceType Source type
   * @param name Source name
   * @param description Source description
   * @returns Updated reconciliation session
   */
  async addMedicationSource(
    sessionId: string,
    sourceType: MedicationSourceType,
    name: string,
    description: string
  ): Promise<ReconciliationSession> {
    const session = await this.getReconciliationSession(sessionId);
    if (!session) {
      throw new Error('Reconciliation session not found');
    }
    
    // Create new source
    const source: MedicationSource = {
      id: uuidv4(),
      type: sourceType,
      name,
      description,
      lastUpdated: new Date()
    };
    
    // Add source to session
    session.sources.push(source);
    
    // Get medication entries from this source
    const newEntries = await this.getMedicationEntriesFromSource(session.patientId, source);
    
    // Add new entries to session
    session.medicationEntries = [...session.medicationEntries, ...newEntries];
    
    // Save session
    return this.saveSession(session);
  }
  
  /**
   * Add a medication entry to a reconciliation session
   * 
   * @param sessionId Session ID
   * @param medicationId Medication ID
   * @param dosage Medication dosage
   * @param sourceType Source type
   * @param sourceId Source ID
   * @param options Additional options
   * @returns Updated reconciliation session
   */
  async addMedicationEntry(
    sessionId: string,
    medicationId: string,
    dosage: PharmacyDomain.Dosage,
    sourceType: MedicationSourceType,
    sourceId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      prescriptionId?: string;
      indication?: string;
      notes?: string;
    }
  ): Promise<ReconciliationSession> {
    const session = await this.getReconciliationSession(sessionId);
    if (!session) {
      throw new Error('Reconciliation session not found');
    }
    
    // Get medication details
    const medication = await this.medicationRepository.findById(medicationId);
    if (!medication) {
      throw new Error('Medication not found');
    }
    
    // Find source
    const source = session.sources.find(s => s.id === sourceId);
    if (!source) {
      throw new Error('Source not found in session');
    }
    
    // Create new entry
    const entry: MedicationEntry = {
      id: uuidv4(),
      medicationId,
      medicationName: medication.name,
      dosage,
      sourceType,
      sourceId,
      sourceName: source.name,
      ...options
    };
    
    // Add entry to session
    session.medicationEntries.push(entry);
    
    // Save session
    return this.saveSession(session);
  }
  
  /**
   * Record a reconciliation decision
   * 
   * @param sessionId Session ID
   * @param medicationEntryId Medication entry ID
   * @param decision Reconciliation decision
   * @param decidedBy ID of the user making the decision
   * @param options Additional options
   * @returns Updated reconciliation session
   */
  async recordDecision(
    sessionId: string,
    medicationEntryId: string,
    decision: ReconciliationDecision,
    decidedBy: string,
    options?: {
      reason?: string;
      newDosage?: PharmacyDomain.Dosage;
      newStartDate?: Date;
      newEndDate?: Date;
      newIndication?: string;
      notes?: string;
    }
  ): Promise<ReconciliationSession> {
    const session = await this.getReconciliationSession(sessionId);
    if (!session) {
      throw new Error('Reconciliation session not found');
    }
    
    // Find medication entry
    const entry = session.medicationEntries.find(e => e.id === medicationEntryId);
    if (!entry) {
      throw new Error('Medication entry not found in session');
    }
    
    // Create decision entry
    const decisionEntry: ReconciliationDecisionEntry = {
      id: uuidv4(),
      medicationEntryId,
      decision,
      decidedBy,
      decidedAt: new Date(),
      ...options
    };
    
    // Add or update decision
    const existingDecisionIndex = session.decisions.findIndex(d => d.medicationEntryId === medicationEntryId);
    if (existingDecisionIndex >= 0) {
      session.decisions[existingDecisionIndex] = decisionEntry;
    } else {
      session.decisions.push(decisionEntry);
    }
    
    // Save session
    return this.saveSession(session);
  }
  
  /**
   * Complete a reconciliation session
   * 
   * @param sessionId Session ID
   * @param completedBy ID of the user completing the session
   * @returns Completed reconciliation session
   */
  async completeReconciliation(
    sessionId: string,
    completedBy: string
  ): Promise<ReconciliationSession> {
    const session = await this.getReconciliationSession(sessionId);
    if (!session) {
      throw new Error('Reconciliation session not found');
    }
    
    // Check if all medications have decisions
    const undecidedEntries = session.medicationEntries.filter(entry => 
      !session.decisions.some(decision => decision.medicationEntryId === entry.id)
    );
    
    if (undecidedEntries.length > 0) {
      throw new Error(`Reconciliation cannot be completed: ${undecidedEntries.length} medications have no decision`);
    }
    
    // Update session status
    session.status = ReconciliationStatus.COMPLETED;
    session.completedBy = completedBy;
    session.completedAt = new Date();
    
    // Save session
    return this.saveSession(session);
  }
  
  /**
   * Cancel a reconciliation session
   * 
   * @param sessionId Session ID
   * @param reason Reason for cancellation
   * @returns Cancelled reconciliation session
   */
  async cancelReconciliation(
    sessionId: string,
    reason: string
  ): Promise<ReconciliationSession> {
    const session = await this.getReconciliationSession(sessionId);
    if (!session) {
      throw new Error('Reconciliation session not found');
    }
    
    // Update session status
    session.status = ReconciliationStatus.CANCELLED;
    
    // Add a note about cancellation
    // In a real implementation, this would be stored in a dedicated field
    
    // Save session
    return this.saveSession(session);
  }
  
  /**
   * Apply reconciliation decisions to create or update prescriptions
   * 
   * @param sessionId Session ID
   * @param prescriberId ID of the prescriber
   * @returns Array of created or updated prescriptions
   */
  async applyReconciliationDecisions(
    sessionId: string,
    prescriberId: string
  ): Promise<PharmacyDomain.Prescription[]> {
    const session = await this.getReconciliationSession(sessionId);
    if (!session) {
      throw new Error('Reconciliation session not found');
    }
    
    if (session.status !== ReconciliationStatus.COMPLETED) {
      throw new Error('Cannot apply decisions: reconciliation is not completed');
    }
    
    const prescriptions: PharmacyDomain.Prescription[] = [];
    
    // Process each decision
    for (const decision of session.decisions) {
      const entry = session.medicationEntries.find(e => e.id === decision.medicationEntryId);
      if (!entry) continue;
      
      switch (decision.decision) {
        case ReconciliationDecision.CONTINUE:
        case ReconciliationDecision.MODIFY:
          // Create or update prescription
          const dosage = decision.newDosage || entry.dosage;
          const prescription = new PharmacyDomain.Prescription(
            uuidv4(),
            session.patientId,
            prescriberId,
            entry.medicationId,
            dosage,
            1, // Default quantity
            0, // Default refills
            new Date(),
            'active',
            'routine',
            decision.notes || entry.notes,
            undefined,
            decision.newIndication || entry.indication,
            true, // Default substitution allowed
            undefined,
            undefined,
            {
              start: decision.newStartDate || entry.startDate || new Date(),
              end: decision.newEndDate || entry.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days
            }
          );
          
          const savedPrescription = await this.prescriptionRepository.save(prescription);
          prescriptions.push(savedPrescription);
          break;
          
        case ReconciliationDecision.DISCONTINUE:
          // If there's an existing prescription, update its status
          if (entry.prescriptionId) {
            const existingPrescription = await this.prescriptionRepository.findById(entry.prescriptionId);
            if (existingPrescription) {
              existingPrescription.status = 'stopped';
              const updatedPrescription = await this.prescriptionRepository.update(existingPrescription);
              prescriptions.push(updatedPrescription);
            }
          }
          break;
          
        case ReconciliationDecision.NEW:
          // Create new prescription
          const newDosage = decision.newDosage || entry.dosage;
          const newPrescription = new PharmacyDomain.Prescription(
            uuidv4(),
            session.patientId,
            prescriberId,
            entry.medicationId,
            newDosage,
            1, // Default quantity
            0, // Default refills
            new Date(),
            'active',
            'routine',
            decision.notes,
            undefined,
            decision.newIndication,
            true, // Default substitution allowed
            undefined,
            undefined,
            {
              start: decision.newStartDate || new Date(),
              end: decision.newEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days
            }
          );
          
          const savedNewPrescription = await this.prescriptionRepository.save(newPrescription);
          prescriptions.push(savedNewPrescription);
          break;
      }
    }
    
    return prescriptions;
  }
  
  /**
   * Check for potential drug interactions in reconciliation decisions
   * 
   * @param sessionId Session ID
   * @returns Array of potential drug interactions
   */
  async checkInteractionsInReconciliation(
    sessionId: string
  ): Promise<PharmacyDomain.DrugInteraction[]> {
    const session = await this.getReconciliationSession(sessionId);
    if (!session) {
      throw new Error('Reconciliation session not found');
    }
    
    // Get medication IDs from entries with CONTINUE, MODIFY, or NEW decisions
    const medicationIds: string[] = [];
    
    for (const decision of session.decisions) {
      if (decision.decision === ReconciliationDecision.DISCONTINUE) continue;
      
      const entry = session.medicationEntries.find(e => e.id === decision.medicationEntryId);
      if (entry && !medicationIds.includes(entry.medicationId)) {
        medicationIds.push(entry.medicationId);
      }
    }
    
    if (medicationIds.length < 2) {
      return [];
    }
    
    // Check for interactions
    return this.drugInteractionService.checkInteractions(medicationIds);
  }
  
  /**
   * Generate a reconciliation report
   * 
   * @param sessionId Session ID
   * @returns Reconciliation report data
   */
  async generateReconciliationReport(sessionId: string): Promise<any> {
    const session = await this.getReconciliationSession(sessionId);
    if (!session) {
      throw new Error('Reconciliation session not found');
    }
    
    // Get interactions
    const interactions = await this.checkInteractionsInReconciliation(sessionId);
    
    // Group medications by decision
    const medicationsByDecision: Record<ReconciliationDecision, any[]> = {
      [ReconciliationDecision.CONTINUE]: [],
      [ReconciliationDecision.MODIFY]: [],
      [ReconciliationDecision.DISCONTINUE]: [],
      [ReconciliationDecision.NEW]: []
    };
    
    for (const decision of session.decisions) {
      const entry = session.medicationEntries.find(e => e.id === decision.medicationEntryId);
      if (!entry) continue;
      
      medicationsByDecision[decision.decision].push({
        medicationId: entry.medicationId,
        medicationName: entry.medicationName,
        originalDosage: entry.dosage.toString(),
        newDosage: decision.newDosage ? decision.newDosage.toString() : undefined,
        source: entry.sourceName,
        reason: decision.reason,
        notes: decision.notes
      });
    }
    
    // Create report
    return {
      sessionId: session.id,
      patientId: session.patientId,
      type: session.type,
      status: session.status,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
      medications: {
        continued: medicationsByDecision[ReconciliationDecision.CONTINUE],
        modified: medicationsByDecision[ReconciliationDecision.MODIFY],
        discontinued: medicationsByDecision[ReconciliationDecision.DISCONTINUE],
        new: medicationsByDecision[ReconciliationDecision.NEW]
      },
      interactions: interactions.map(interaction => ({
        medications: interaction.medicationNames.join(' + '),
        severity: interaction.severity,
        description: interaction.description,
        recommendation: interaction.recommendation
      })),
      summary: {
        totalMedications: session.medicationEntries.length,
        continued: medicationsByDecision[ReconciliationDecision.CONTINUE].length,
        modified: medicationsByDecision[ReconciliationDecision.MODIFY].length,
        discontinued: medicationsByDecision[ReconciliationDecision.DISCONTINUE].length,
        new: medicationsByDecision[ReconciliationDecision.NEW].length,
        interactionsFound: interactions.length
      }
    };
  }
  
  // Private helper methods
  
  /**
   * Get default medication sources for a patient
   * 
   * @param patientId Patient ID
   * @returns Array of medication sources
   */
  private async getDefaultSources(patientId: string): Promise<MedicationSource[]> {
    const sources: MedicationSource[] = [];
    
    // Add current prescriptions source
    sources.push({
      id: uuidv4(),
      type: MedicationSourceType.PREVIOUS_ENCOUNTER,
      name: 'Current Prescriptions',
      description: 'Active prescriptions in the system',
      lastUpdated: new Date()
    });
    
    // In a real implementation, additional sources would be added:
    // - External pharmacy fill history
    // - Previous encounter medications
    // - Patient-reported medications
    
    return sources;
  }
  
  /**
   * Get medication entries from all sources
   * 
   * @param patientId Patient ID
   * @param sources Array of medication sources
   * @returns Array of medication entries
   */
  private async getMedicationEntriesFromSources(
    patientId: string,
    sources: MedicationSource[]
  ): Promise<MedicationEntry[]> {
    let entries: MedicationEntry[] = [];
    
    for (const source of sources) {
      const sourceEntries = await this.getMedicationEntriesFromSource(patientId, source);
      entries = [...entries, ...sourceEntries];
    }
    
    return entries;
  }
  
  /**
   * Get medication entries from a specific source
   * 
   * @param patientId Patient ID
   * @param source Medication source
   * @returns Array of medication entries
   */
  private async getMedicationEntriesFromSource(
    patientId: string,
    source: MedicationSource
  ): Promise<MedicationEntry[]> {
    const entries: MedicationEntry[] = [];
    
    switch (source.type) {
      case MedicationSourceType.PREVIOUS_ENCOUNTER:
        // Get active prescriptions for the patient
        const prescriptions = await this.prescriptionRepository.findByPatientId(patientId);
        const activePrescriptions = prescriptions.filter(p => p.isActive());
        
        for (const prescription of activePrescriptions) {
          const medication = await this.medicationRepository.findById(prescription.medicationId);
          if (!medication) continue;
          
          entries.push({
            id: uuidv4(),
            medicationId: prescription.medicationId,
            medicationName: medication.name,
            dosage: prescription.dosage,
            sourceType: source.type,
            sourceId: source.id,
            sourceName: source.name,
            startDate: prescription.validityPeriod?.start,
            endDate: prescription.validityPeriod?.end,
            prescriptionId: prescription.id,
            indication: prescription.reasonText,
            notes: prescription.notes
          });
        }
        break;
        
      // In a real implementation, additional source types would be handled:
      // - PATIENT_REPORTED: Would come from patient interviews
      // - PHARMACY_FILL: Would come from external pharmacy systems
      // - EXTERNAL_SOURCE: Would come from HIEs or other external systems
    }
    
    return entries;
  }
  
  /**
   * Save a reconciliation session
   * 
   * @param session Reconciliation session to save
   * @returns Saved reconciliation session
   */
  private async saveSession(session: ReconciliationSession): Promise<ReconciliationSession> {
    // In a real implementation, this would save to a database
    // For this implementation, we'll simulate saving to a database
    
    // For simplicity, we'll just return the session
    return session;
  }
  
  /**
   * Find a reconciliation session by ID
   * 
   * @param sessionId Session ID
   * @returns Reconciliation session or null if not found
   */
  private async findSessionById(sessionId: string): Promise<ReconciliationSession | null> {
    // In a real implementation, this would query a database
    // For this implementation, we'll simulate a database query
    
    // For simplicity, we'll return null (not found)
    return null;
  }
  
  /**
   * Find reconciliation sessions by patient ID and status
   * 
   * @param patientId Patient ID
   * @param status Session status
   * @returns Array of matching reconciliation sessions
   */
  private async findSessionsByPatientAndStatus(
    patientId: string,
    status: ReconciliationStatus
  ): Promise<ReconciliationSession[]> {
    // In a real implementation, this would query a database
    // For this implementation, we'll simulate a database query
    
    // For simplicity, we'll return an empty array
    return [];
  }
}
