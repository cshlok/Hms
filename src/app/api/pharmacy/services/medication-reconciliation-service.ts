/**
 * Medication Reconciliation Service
 * 
 * This service handles the medication reconciliation process, comparing
 * medications across different transitions of care to ensure patient safety.
 */

import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../../../implementation/utils/audit-logger';
import { PharmacyDomain } from '../../../../implementation/models/domain-models';
import { FHIRMapper } from '../../../../implementation/models/fhir-mappers';

export class MedicationReconciliationService {
  private prisma: PrismaClient;
  private auditLogger: AuditLogger;

  constructor(prisma: PrismaClient, auditLogger: AuditLogger) {
    this.prisma = prisma;
    this.auditLogger = auditLogger;
  }

  /**
   * Performs medication reconciliation for a patient during a transition of care
   * 
   * @param patientId - The ID of the patient
   * @param sourceType - The source of medications (e.g., 'admission', 'discharge', 'transfer')
   * @param targetType - The target of medications (e.g., 'inpatient', 'outpatient')
   * @param providerId - The ID of the provider performing reconciliation
   * @returns The reconciliation result with discrepancies and actions
   */
  async performReconciliation(
    patientId: string,
    sourceType: 'admission' | 'discharge' | 'transfer',
    targetType: 'inpatient' | 'outpatient',
    providerId: string
  ): Promise<PharmacyDomain.MedicationReconciliationResult> {
    // Log the start of reconciliation
    this.auditLogger.logEvent({
      eventType: 'MEDICATION_RECONCILIATION_STARTED',
      userId: providerId,
      resourceType: 'Patient',
      resourceId: patientId,
      details: `Starting ${sourceType} reconciliation for ${targetType} medications`,
      severity: 'INFO'
    });

    // Get source medications
    const sourceMedications = await this.getMedicationsByType(patientId, sourceType);
    
    // Get target medications
    const targetMedications = await this.getMedicationsByType(patientId, targetType);
    
    // Identify discrepancies
    const discrepancies = this.identifyDiscrepancies(sourceMedications, targetMedications);
    
    // Create reconciliation record
    const reconciliation: PharmacyDomain.MedicationReconciliation = {
      id: `recon-${Date.now()}`,
      patientId,
      providerId,
      sourceType,
      targetType,
      reconciliationDate: new Date(),
      status: 'in-progress',
      discrepancies,
      actions: []
    };
    
    // Log the completion of reconciliation
    this.auditLogger.logEvent({
      eventType: 'MEDICATION_RECONCILIATION_COMPLETED',
      userId: providerId,
      resourceType: 'Patient',
      resourceId: patientId,
      details: `Completed ${sourceType} reconciliation with ${discrepancies.length} discrepancies`,
      severity: 'INFO'
    });
    
    return {
      reconciliation,
      sourceMedications,
      targetMedications,
      discrepancies
    };
  }
  
  /**
   * Retrieves medications based on the specified type
   * 
   * @param patientId - The ID of the patient
   * @param type - The type of medications to retrieve
   * @returns Array of medications
   */
  private async getMedicationsByType(
    patientId: string,
    type: 'admission' | 'discharge' | 'transfer' | 'inpatient' | 'outpatient'
  ): Promise<PharmacyDomain.Medication[]> {
    // In a real implementation, this would query the database based on type
    // For now, we'll simulate different medication lists
    
    // Common medications across all types
    const commonMedications = [
      new PharmacyDomain.Medication(
        'med1',
        'Lisinopril',
        'Zestril',
        '00071-0418-23',
        'tablet',
        10,
        'mg',
        false,
        false
      ),
      new PharmacyDomain.Medication(
        'med2',
        'Metformin',
        'Glucophage',
        '00087-6060-10',
        'tablet',
        500,
        'mg',
        false,
        false
      )
    ];
    
    // Type-specific medications
    switch (type) {
      case 'admission':
        return [
          ...commonMedications,
          new PharmacyDomain.Medication(
            'med3',
            'Aspirin',
            'Bayer',
            '00280-1301-01',
            'tablet',
            81,
            'mg',
            false,
            false
          ),
          new PharmacyDomain.Medication(
            'med4',
            'Simvastatin',
            'Zocor',
            '00006-0740-54',
            'tablet',
            20,
            'mg',
            false,
            false
          )
        ];
      
      case 'discharge':
        return [
          ...commonMedications,
          new PharmacyDomain.Medication(
            'med5',
            'Atorvastatin',
            'Lipitor',
            '00071-0156-23',
            'tablet',
            10,
            'mg',
            false,
            false
          ),
          new PharmacyDomain.Medication(
            'med6',
            'Clopidogrel',
            'Plavix',
            '00024-5152-10',
            'tablet',
            75,
            'mg',
            false,
            false
          )
        ];
      
      case 'transfer':
        return [
          ...commonMedications,
          new PharmacyDomain.Medication(
            'med7',
            'Furosemide',
            'Lasix',
            '00039-0067-10',
            'tablet',
            40,
            'mg',
            false,
            false
          )
        ];
      
      case 'inpatient':
        return [
          ...commonMedications,
          new PharmacyDomain.Medication(
            'med8',
            'Heparin',
            'Heparin',
            '00641-2440-41',
            'injection',
            5000,
            'units',
            false,
            true
          ),
          new PharmacyDomain.Medication(
            'med9',
            'Morphine',
            'Morphine',
            '00641-6060-25',
            'injection',
            4,
            'mg',
            true,
            true
          )
        ];
      
      case 'outpatient':
        return [
          ...commonMedications,
          new PharmacyDomain.Medication(
            'med10',
            'Hydrochlorothiazide',
            'Microzide',
            '00083-0242-10',
            'tablet',
            25,
            'mg',
            false,
            false
          )
        ];
      
      default:
        return commonMedications;
    }
  }
  
  /**
   * Identifies discrepancies between source and target medications
   * 
   * @param sourceMedications - Medications from the source
   * @param targetMedications - Medications from the target
   * @returns Array of discrepancies
   */
  private identifyDiscrepancies(
    sourceMedications: PharmacyDomain.Medication[],
    targetMedications: PharmacyDomain.Medication[]
  ): PharmacyDomain.MedicationDiscrepancy[] {
    const discrepancies: PharmacyDomain.MedicationDiscrepancy[] = [];
    
    // Check for medications in source but not in target (potential omissions)
    for (const sourceMed of sourceMedications) {
      const targetMed = targetMedications.find(med => 
        med.name === sourceMed.name && med.strength === sourceMed.strength && med.form === sourceMed.form
      );
      
      if (!targetMed) {
        discrepancies.push({
          id: `disc-${Date.now()}-${sourceMed.id}`,
          medicationId: sourceMed.id,
          discrepancyType: 'omission',
          description: `${sourceMed.name} ${sourceMed.strength} ${sourceMed.unit} ${sourceMed.form} is in source but not in target`,
          severity: this.calculateDiscrepancySeverity(sourceMed),
          status: 'unresolved'
        });
      }
    }
    
    // Check for medications in target but not in source (potential additions)
    for (const targetMed of targetMedications) {
      const sourceMed = sourceMedications.find(med => 
        med.name === targetMed.name && med.strength === targetMed.strength && med.form === targetMed.form
      );
      
      if (!sourceMed) {
        discrepancies.push({
          id: `disc-${Date.now()}-${targetMed.id}`,
          medicationId: targetMed.id,
          discrepancyType: 'addition',
          description: `${targetMed.name} ${targetMed.strength} ${targetMed.unit} ${targetMed.form} is in target but not in source`,
          severity: this.calculateDiscrepancySeverity(targetMed),
          status: 'unresolved'
        });
      }
    }
    
    // Check for dosing discrepancies (same medication but different dose)
    for (const sourceMed of sourceMedications) {
      const targetMed = targetMedications.find(med => med.name === sourceMed.name && med.form === sourceMed.form);
      
      if (targetMed && (targetMed.strength !== sourceMed.strength || targetMed.unit !== sourceMed.unit)) {
        discrepancies.push({
          id: `disc-${Date.now()}-${sourceMed.id}-${targetMed.id}`,
          medicationId: sourceMed.id,
          relatedMedicationId: targetMed.id,
          discrepancyType: 'dosing',
          description: `Dosing difference: ${sourceMed.name} ${sourceMed.strength} ${sourceMed.unit} in source vs ${targetMed.strength} ${targetMed.unit} in target`,
          severity: this.calculateDiscrepancySeverity(sourceMed, targetMed),
          status: 'unresolved'
        });
      }
    }
    
    return discrepancies;
  }
  
  /**
   * Calculates the severity of a discrepancy based on medication properties
   * 
   * @param medication1 - First medication
   * @param medication2 - Second medication (optional)
   * @returns Severity level
   */
  private calculateDiscrepancySeverity(
    medication1: PharmacyDomain.Medication,
    medication2?: PharmacyDomain.Medication
  ): 'high' | 'medium' | 'low' {
    // High-alert medications always get high severity
    if (medication1.isHighAlert || (medication2 && medication2.isHighAlert)) {
      return 'high';
    }
    
    // Controlled substances get at least medium severity
    if (medication1.isControlled || (medication2 && medication2.isControlled)) {
      return 'medium';
    }
    
    // Default to low severity
    return 'low';
  }
  
  /**
   * Resolves a medication discrepancy with the specified action
   * 
   * @param reconciliationId - The ID of the reconciliation
   * @param discrepancyId - The ID of the discrepancy
   * @param action - The action to take
   * @param providerId - The ID of the provider resolving the discrepancy
   * @param notes - Optional notes about the resolution
   * @returns The updated reconciliation
   */
  async resolveDiscrepancy(
    reconciliationId: string,
    discrepancyId: string,
    action: 'continue' | 'discontinue' | 'modify' | 'substitute',
    providerId: string,
    notes?: string
  ): Promise<PharmacyDomain.MedicationReconciliation> {
    // In a real implementation, this would update the database
    // For now, we'll simulate the resolution
    
    // Log the resolution
    this.auditLogger.logEvent({
      eventType: 'MEDICATION_DISCREPANCY_RESOLVED',
      userId: providerId,
      resourceType: 'MedicationReconciliation',
      resourceId: reconciliationId,
      details: `Resolved discrepancy ${discrepancyId} with action: ${action}`,
      severity: 'INFO'
    });
    
    // Create resolution action
    const resolutionAction: PharmacyDomain.ReconciliationAction = {
      id: `action-${Date.now()}`,
      discrepancyId,
      action,
      providerId,
      timestamp: new Date(),
      notes: notes || ''
    };
    
    // In a real implementation, this would return the updated reconciliation from the database
    // For now, we'll return a simulated response
    return {
      id: reconciliationId,
      patientId: 'patient123',
      providerId,
      sourceType: 'admission',
      targetType: 'inpatient',
      reconciliationDate: new Date(),
      status: 'in-progress',
      discrepancies: [],
      actions: [resolutionAction]
    };
  }
  
  /**
   * Completes a medication reconciliation
   * 
   * @param reconciliationId - The ID of the reconciliation
   * @param providerId - The ID of the provider completing the reconciliation
   * @returns The completed reconciliation
   */
  async completeReconciliation(
    reconciliationId: string,
    providerId: string
  ): Promise<PharmacyDomain.MedicationReconciliation> {
    // In a real implementation, this would update the database
    // For now, we'll simulate the completion
    
    // Log the completion
    this.auditLogger.logEvent({
      eventType: 'MEDICATION_RECONCILIATION_FINALIZED',
      userId: providerId,
      resourceType: 'MedicationReconciliation',
      resourceId: reconciliationId,
      details: 'Finalized medication reconciliation',
      severity: 'INFO'
    });
    
    // In a real implementation, this would return the updated reconciliation from the database
    // For now, we'll return a simulated response
    return {
      id: reconciliationId,
      patientId: 'patient123',
      providerId,
      sourceType: 'admission',
      targetType: 'inpatient',
      reconciliationDate: new Date(),
      status: 'completed',
      discrepancies: [],
      actions: []
    };
  }
  
  /**
   * Generates a medication reconciliation report
   * 
   * @param reconciliationId - The ID of the reconciliation
   * @returns The reconciliation report
   */
  async generateReconciliationReport(
    reconciliationId: string
  ): Promise<PharmacyDomain.MedicationReconciliationReport> {
    // In a real implementation, this would query the database
    // For now, we'll return a simulated report
    
    return {
      reconciliationId,
      patientId: 'patient123',
      patientName: 'John Doe',
      providerId: 'provider456',
      providerName: 'Dr. Jane Smith',
      reconciliationDate: new Date(),
      sourceType: 'admission',
      targetType: 'inpatient',
      status: 'completed',
      summary: {
        totalDiscrepancies: 3,
        resolvedDiscrepancies: 3,
        highSeverityCount: 1,
        mediumSeverityCount: 1,
        lowSeverityCount: 1
      },
      discrepancies: [
        {
          id: 'disc1',
          medicationId: 'med1',
          discrepancyType: 'omission',
          description: 'Lisinopril 10mg tablet is in source but not in target',
          severity: 'medium',
          status: 'resolved',
          resolution: {
            action: 'continue',
            providerId: 'provider456',
            timestamp: new Date(),
            notes: 'Continue medication as prescribed'
          }
        },
        {
          id: 'disc2',
          medicationId: 'med8',
          discrepancyType: 'addition',
          description: 'Heparin 5000 units injection is in target but not in source',
          severity: 'high',
          status: 'resolved',
          resolution: {
            action: 'continue',
            providerId: 'provider456',
            timestamp: new Date(),
            notes: 'Added for DVT prophylaxis during hospitalization'
          }
        },
        {
          id: 'disc3',
          medicationId: 'med2',
          relatedMedicationId: 'med2',
          discrepancyType: 'dosing',
          description: 'Dosing difference: Metformin 500mg in source vs 1000mg in target',
          severity: 'low',
          status: 'resolved',
          resolution: {
            action: 'modify',
            providerId: 'provider456',
            timestamp: new Date(),
            notes: 'Increased dose due to elevated blood glucose'
          }
        }
      ]
    };
  }
  
  /**
   * Retrieves reconciliation history for a patient
   * 
   * @param patientId - The ID of the patient
   * @returns Array of reconciliation summaries
   */
  async getReconciliationHistory(
    _patientId: string
  ): Promise<PharmacyDomain.MedicationReconciliationSummary[]> {
    // In a real implementation, this would query the database
    // For now, we'll return simulated history
    
    return [
      {
        id: 'recon1',
        patientId: 'patient123',
        providerId: 'provider456',
        sourceType: 'admission',
        targetType: 'inpatient',
        reconciliationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        status: 'completed',
        discrepancyCount: 3,
        resolvedCount: 3
      },
      {
        id: 'recon2',
        patientId: 'patient123',
        providerId: 'provider789',
        sourceType: 'transfer',
        targetType: 'inpatient',
        reconciliationDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        status: 'completed',
        discrepancyCount: 2,
        resolvedCount: 2
      },
      {
        id: 'recon3',
        patientId: 'patient123',
        providerId: 'provider456',
        sourceType: 'discharge',
        targetType: 'outpatient',
        reconciliationDate: new Date(),
        status: 'in-progress',
        discrepancyCount: 4,
        resolvedCount: 1
      }
    ];
  }
  
  /**
   * Creates a new medication order based on reconciliation
   * 
   * @param reconciliationId - The ID of the reconciliation
   * @param medicationId - The ID of the medication
   * @param providerId - The ID of the provider creating the order
   * @param patientId - The ID of the patient
   * @param dosage - The dosage information
   * @param frequency - The frequency information
   * @param route - The route of administration
   * @param duration - The duration of the order
   * @returns The created medication order
   */
  async createOrderFromReconciliation(
    reconciliationId: string,
    medicationId: string,
    providerId: string,
    _patientId: string,
    _status: string,
    dosage: Record<string, unknown>,
    frequency: string,
    route: string,
    duration: string
  ): Promise<PharmacyDomain.MedicationOrder> {
    // Log the order creation
    this.auditLogger.logEvent({
      eventType: 'MEDICATION_ORDER_FROM_RECONCILIATION',
      userId: providerId,
      resourceType: 'MedicationReconciliation',
      resourceId: reconciliationId,
      details: `Created order for medication ${medicationId} from reconciliation`,
      severity: 'INFO'
    });
    
    // In a real implementation, this would create an order in the database
    // For now, we'll return a simulated order
    return {
      id: `order-${Date.now()}`,
      patientId: 'patient123',
      providerId,
      medicationId,
      status: 'active',
      orderDate: new Date(),
      dosage,
      frequency,
      route,
      duration,
      reconciliationId
    };
  }
  
  /**
   * Handles a session timeout during reconciliation
   * 
   * @param reconciliationId - The ID of the reconciliation
   * @param sessionId - The ID of the session
   * @returns Success status
   */
  async handleSessionTimeout(
    reconciliationId: string,
    _sessionId: string
  ): Promise<boolean> {
    // Log the timeout
    this.auditLogger.logEvent({
      eventType: 'MEDICATION_RECONCILIATION_SESSION_TIMEOUT',
      resourceType: 'MedicationReconciliation',
      resourceId: reconciliationId,
      details: 'Session timed out during reconciliation',
      severity: 'WARNING'
    });
    
    // In a real implementation, this would save the current state
    // For now, we'll just return success
    return true;
  }
  
  /**
   * Retrieves pending reconciliations for a provider
   * 
   * @param providerId - The ID of the provider
   * @returns Array of pending reconciliations
   */
  async getPendingReconciliations(
    providerId: string
  ): Promise<PharmacyDomain.MedicationReconciliationSummary[]> {
    // In a real implementation, this would query the database
    // For now, we'll return simulated pending reconciliations
    
    return [
      {
        id: 'recon4',
        patientId: 'patient456',
        providerId,
        sourceType: 'admission',
        targetType: 'inpatient',
        reconciliationDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        status: 'in-progress',
        discrepancyCount: 5,
        resolvedCount: 2
      },
      {
        id: 'recon5',
        patientId: 'patient789',
        providerId,
        sourceType: 'discharge',
        targetType: 'outpatient',
        reconciliationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: 'in-progress',
        discrepancyCount: 3,
        resolvedCount: 0
      }
    ];
  }
}
