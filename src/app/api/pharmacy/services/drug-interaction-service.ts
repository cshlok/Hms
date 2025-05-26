/**
 * Drug Interaction Service
 * 
 * This service handles detection and management of various types of drug interactions,
 * including drug-drug, drug-allergy, drug-condition, and drug-lab interactions.
 */

import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../../../implementation/utils/audit-logger';
import { PharmacyDomain } from '../../../../implementation/models/domain-models';

export class DrugInteractionService {
  private prisma: PrismaClient;
  private auditLogger: AuditLogger;
  
  // Reference data for drug classes and interactions
  private allergyClasses: Array<{id: string; name: string; medications: string[]}>;
  private conditionInteractions: Array<{id: string; medicationName: string; conditionCode: string; severity: string; description: string; reference: string}>;
  private labInteractions: Array<{id: string; medicationName: string; labCode: string; abnormalFlag: string; severity: string; description: string; reference: string}>;

  constructor(prisma: PrismaClient, auditLogger: AuditLogger) {
    this.prisma = prisma;
    this.auditLogger = auditLogger;
    
    // Initialize reference data
    this.initializeReferenceData();
  }
  
  /**
   * Initialize reference data for drug interactions
   * This would typically be loaded from a database or external service
   */
  private initializeReferenceData(): void {
    // Initialize allergy classes
    this.allergyClasses = [
      {
        id: 'class1',
        name: 'Penicillins',
        medications: ['Amoxicillin', 'Ampicillin', 'Penicillin G', 'Piperacillin']
      },
      {
        id: 'class2',
        name: 'Cephalosporins',
        medications: ['Cefazolin', 'Ceftriaxone', 'Cefuroxime', 'Cephalexin']
      },
      {
        id: 'class3',
        name: 'Sulfonamides',
        medications: ['Sulfamethoxazole', 'Sulfadiazine', 'Sulfasalazine']
      },
      {
        id: 'class4',
        name: 'NSAIDs',
        medications: ['Aspirin', 'Ibuprofen', 'Naproxen', 'Diclofenac', 'Celecoxib']
      }
    ];
    
    // Initialize condition interactions
    this.conditionInteractions = [
      {
        id: 'condint1',
        medicationName: 'Metformin',
        conditionCode: 'N17.9', // Acute kidney failure
        severity: 'severe',
        description: 'Metformin is contraindicated in acute kidney failure due to increased risk of lactic acidosis',
        reference: 'https://example.com/interactions/metformin-kidney-failure'
      },
      {
        id: 'condint2',
        medicationName: 'Warfarin',
        conditionCode: 'K92.2', // Gastrointestinal hemorrhage
        severity: 'severe',
        description: 'Warfarin may exacerbate gastrointestinal bleeding',
        reference: 'https://example.com/interactions/warfarin-gi-bleeding'
      },
      {
        id: 'condint3',
        medicationName: 'Propranolol',
        conditionCode: 'J45.909', // Asthma
        severity: 'severe',
        description: 'Non-selective beta-blockers can cause bronchospasm in patients with asthma',
        reference: 'https://example.com/interactions/propranolol-asthma'
      }
    ];
    
    // Initialize lab interactions
    this.labInteractions = [
      {
        id: 'labint1',
        medicationName: 'Digoxin',
        labCode: '2823-3', // Potassium
        abnormalFlag: 'L', // Low
        severity: 'severe',
        description: 'Hypokalemia increases risk of digoxin toxicity',
        reference: 'https://example.com/interactions/digoxin-hypokalemia'
      },
      {
        id: 'labint2',
        medicationName: 'Warfarin',
        labCode: '6301-6', // INR
        abnormalFlag: 'H', // High
        severity: 'severe',
        description: 'Elevated INR indicates increased bleeding risk with warfarin',
        reference: 'https://example.com/interactions/warfarin-inr'
      },
      {
        id: 'labint3',
        medicationName: 'Lithium',
        labCode: '2951-2', // Sodium
        abnormalFlag: 'L', // Low
        severity: 'severe',
        description: 'Hyponatremia can increase lithium levels and toxicity',
        reference: 'https://example.com/interactions/lithium-hyponatremia'
      }
    ];
  }
  
  /**
   * Check for drug-drug interactions between two medications
   * 
   * @param medicationId1 - ID of the first medication
   * @param medicationId2 - ID of the second medication
   * @param patientId - Optional patient ID for checking overrides
   * @returns Interaction result with details
   */
  async checkDrugDrugInteraction(
    medicationId1: string,
    medicationId2: string,
    patientId?: string
  ): Promise<PharmacyDomain.DrugInteractionResult> {
    try {
      // Log the interaction check
      this.auditLogger.logEvent({
        eventType: 'INTERACTION_CHECK',
        resourceType: 'Medication',
        resourceId: `${medicationId1},${medicationId2}`,
        details: `Checking drug-drug interaction between medications ${medicationId1} and ${medicationId2}`,
        severity: 'INFO'
      });
      
      // Get medication details
      const medication1 = await this.prisma.medication.findUnique({
        where: { id: medicationId1 }
      });
      
      const medication2 = await this.prisma.medication.findUnique({
        where: { id: medicationId2 }
      });
      
      if (!medication1 || !medication2) {
        throw new Error('One or both medications not found');
      }
      
      // Check for interactions in the database
      const interactions = await this.prisma.medication.findMany({
        where: {
          OR: [
            {
              AND: [
                { medicationId1: medicationId1 },
                { medicationId2: medicationId2 }
              ]
            },
            {
              AND: [
                { medicationId1: medicationId2 },
                { medicationId2: medicationId1 }
              ]
            }
          ]
        }
      });
      
      // If no interactions found, return negative result
      if (interactions.length === 0) {
        return {
          hasInteraction: false,
          medications: [medication1, medication2],
          interactionType: 'drug-drug'
        };
      }
      
      // Get the most severe interaction
      const interaction = interactions.reduce((prev, current) => {
        const severityRank: Record<string, number> = {
          severe: 3,
          moderate: 2,
          mild: 1
        };
        
        return severityRank[current.severity] > severityRank[prev.severity] ? current : prev;
      });
      
      // Check if there's an override for this interaction
      let isOverridden = false;
      let overrideReason = '';
      
      if (patientId) {
        const override = await this.prisma.interactionOverride.findFirst({
          where: {
            interactionId: interaction.id,
            patientId,
            expiresAt: {
              gt: new Date() // Only active overrides
            }
          }
        });
        
        if (override) {
          isOverridden = true;
          overrideReason = override.reason;
          
          // Log the override application
          this.auditLogger.logEvent({
            eventType: 'INTERACTION_OVERRIDE_APPLIED',
            resourceType: 'Medication',
            resourceId: `${medicationId1},${medicationId2}`,
            details: `Applied override for interaction between medications ${medicationId1} and ${medicationId2}`,
            severity: 'WARNING'
          });
        } else if (await this.prisma.interactionOverride.findFirst({
          where: {
            interactionId: interaction.id,
            patientId,
            expiresAt: {
              lte: new Date() // Expired overrides
            }
          }
        })) {
          // Log expired override
          this.auditLogger.logEvent({
            eventType: 'EXPIRED_OVERRIDE_IGNORED',
            resourceType: 'Medication',
            resourceId: `${medicationId1},${medicationId2}`,
            details: `Expired override found for interaction between medications ${medicationId1} and ${medicationId2}`,
            severity: 'WARNING'
          });
        }
      }
      
      // Return interaction result
      return {
        hasInteraction: true,
        isOverridden,
        overrideReason,
        medications: [medication1, medication2],
        interactionType: 'drug-drug',
        severity: interaction.severity,
        description: interaction.description,
        reference: interaction.reference
      };
    } catch (error) {
      // Log the error
      this.auditLogger.logEvent({
        eventType: 'INTERACTION_CHECK_ERROR',
        resourceType: 'Medication',
        resourceId: `${medicationId1},${medicationId2}`,
        details: `Error checking drug-drug interaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'ERROR'
      });
      
      throw error;
    }
  }
  
  /**
   * Check for drug-allergy interactions for a medication and patient
   * 
   * @param medicationId - ID of the medication
   * @param patientId - ID of the patient
   * @returns Interaction result with details
   */
  async checkDrugAllergyInteraction(
    medicationId: string,
    patientId: string
  ): Promise<PharmacyDomain.DrugAllergyInteractionResult> {
    try {
      // Log the interaction check
      this.auditLogger.logEvent({
        eventType: 'ALLERGY_INTERACTION_CHECK',
        resourceType: 'Medication',
        resourceId: medicationId,
        details: `Checking drug-allergy interaction for medication ${medicationId} and patient ${patientId}`,
        severity: 'INFO'
      });
      
      // Get medication details
      const medication = await this.prisma.medication.findUnique({
        where: { id: medicationId }
      });
      
      if (!medication) {
        throw new Error('Medication not found');
      }
      
      // Get patient allergies
      const allergies = await this.prisma.allergy.findMany({
        where: {
          patientId,
          status: 'active'
        }
      });
      
      // Check for direct allergen match
      const directMatch = allergies.find(allergy => 
        allergy.allergen.toLowerCase() === medication.name.toLowerCase()
      );
      
      if (directMatch) {
        // Log the interaction detection
        this.auditLogger.logEvent({
          eventType: 'ALLERGY_INTERACTION_DETECTED',
          resourceType: 'Medication',
          resourceId: medicationId,
          details: `Direct allergy match detected for ${medication.name}`,
          severity: 'WARNING'
        });
        
        return {
          hasInteraction: true,
          medication,
          interactionType: 'drug-allergy',
          allergen: directMatch.allergen,
          severity: directMatch.severity,
          reaction: directMatch.reaction
        };
      }
      
      // Check for class-based allergen match
      for (const allergy of allergies) {
        const allergyClass = this.allergyClasses.find(cls => 
          cls.name.toLowerCase() === allergy.allergen.toLowerCase()
        );
        
        if (allergyClass && allergyClass.medications.some(med => 
          med.toLowerCase() === medication.name.toLowerCase()
        )) {
          // Log the interaction detection
          this.auditLogger.logEvent({
            eventType: 'ALLERGY_INTERACTION_DETECTED',
            resourceType: 'Medication',
            resourceId: medicationId,
            details: `Class-based allergy match detected for ${medication.name} in class ${allergyClass.name}`,
            severity: 'WARNING'
          });
          
          return {
            hasInteraction: true,
            medication,
            interactionType: 'drug-allergy',
            allergen: allergy.allergen,
            severity: allergy.severity,
            reaction: allergy.reaction,
            allergyClass: allergyClass.name
          };
        }
      }
      
      // No interaction found
      return {
        hasInteraction: false,
        medication,
        interactionType: 'drug-allergy'
      };
    } catch (error) {
      // Log the error
      this.auditLogger.logEvent({
        eventType: 'ALLERGY_INTERACTION_CHECK_ERROR',
        resourceType: 'Medication',
        resourceId: medicationId,
        details: `Error checking drug-allergy interaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'ERROR'
      });
      
      throw error;
    }
  }
  
  /**
   * Check for drug-condition interactions for a medication and patient
   * 
   * @param medicationId - ID of the medication
   * @param patientId - ID of the patient
   * @returns Interaction result with details
   */
  async checkDrugConditionInteraction(
    medicationId: string,
    patientId: string
  ): Promise<PharmacyDomain.DrugConditionInteractionResult> {
    try {
      // Log the interaction check
      this.auditLogger.logEvent({
        eventType: 'CONDITION_INTERACTION_CHECK',
        resourceType: 'Medication',
        resourceId: medicationId,
        details: `Checking drug-condition interaction for medication ${medicationId} and patient ${patientId}`,
        severity: 'INFO'
      });
      
      // Get medication details
      const medication = await this.prisma.medication.findUnique({
        where: { id: medicationId }
      });
      
      if (!medication) {
        throw new Error('Medication not found');
      }
      
      // Get patient conditions
      const conditions = await this.prisma.condition.findMany({
        where: {
          patientId,
          status: 'active'
        }
      });
      
      // Check for condition interactions
      for (const condition of conditions) {
        const interaction = this.conditionInteractions.find(int => 
          int.medicationName.toLowerCase() === medication.name.toLowerCase() &&
          int.conditionCode === condition.code
        );
        
        if (interaction) {
          // Log the interaction detection
          this.auditLogger.logEvent({
            eventType: 'CONDITION_INTERACTION_DETECTED',
            resourceType: 'Medication',
            resourceId: medicationId,
            details: `Condition interaction detected for ${medication.name} with condition ${condition.name}`,
            severity: 'WARNING'
          });
          
          return {
            hasInteraction: true,
            medication,
            condition,
            interactionType: 'drug-condition',
            severity: interaction.severity,
            description: interaction.description,
            reference: interaction.reference
          };
        }
      }
      
      // No interaction found
      return {
        hasInteraction: false,
        medication,
        interactionType: 'drug-condition'
      };
    } catch (error) {
      // Log the error
      this.auditLogger.logEvent({
        eventType: 'CONDITION_INTERACTION_CHECK_ERROR',
        resourceType: 'Medication',
        resourceId: medicationId,
        details: `Error checking drug-condition interaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'ERROR'
      });
      
      throw error;
    }
  }
  
  /**
   * Check for drug-lab interactions for a medication and patient
   * 
   * @param medicationId - ID of the medication
   * @param patientId - ID of the patient
   * @returns Interaction result with details
   */
  async checkDrugLabInteraction(
    medicationId: string,
    patientId: string
  ): Promise<PharmacyDomain.DrugLabInteractionResult> {
    try {
      // Log the interaction check
      this.auditLogger.logEvent({
        eventType: 'LAB_INTERACTION_CHECK',
        resourceType: 'Medication',
        resourceId: medicationId,
        details: `Checking drug-lab interaction for medication ${medicationId} and patient ${patientId}`,
        severity: 'INFO'
      });
      
      // Get medication details
      const medication = await this.prisma.medication.findUnique({
        where: { id: medicationId }
      });
      
      if (!medication) {
        throw new Error('Medication not found');
      }
      
      // Get patient lab results (recent abnormal results)
      const labResults = await this.prisma.labResult.findMany({
        where: {
          patientId,
          abnormalFlag: {
            in: ['H', 'L', 'HH', 'LL', 'A'] // Abnormal flags
          },
          collectedDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        orderBy: {
          collectedDate: 'desc'
        }
      });
      
      // Check for lab interactions
      for (const labResult of labResults) {
        const interaction = this.labInteractions.find(int => 
          int.medicationName.toLowerCase() === medication.name.toLowerCase() &&
          int.labCode === labResult.code &&
          int.abnormalFlag === labResult.abnormalFlag
        );
        
        if (interaction) {
          // Log the interaction detection
          this.auditLogger.logEvent({
            eventType: 'LAB_INTERACTION_DETECTED',
            resourceType: 'Medication',
            resourceId: medicationId,
            details: `Lab interaction detected for ${medication.name} with abnormal ${labResult.name}`,
            severity: 'WARNING'
          });
          
          return {
            hasInteraction: true,
            medication,
            labResult,
            interactionType: 'drug-lab',
            severity: interaction.severity,
            description: interaction.description,
            reference: interaction.reference
          };
        }
      }
      
      // No interaction found
      return {
        hasInteraction: false,
        medication,
        interactionType: 'drug-lab'
      };
    } catch (error) {
      // Log the error
      this.auditLogger.logEvent({
        eventType: 'LAB_INTERACTION_CHECK_ERROR',
        resourceType: 'Medication',
        resourceId: medicationId,
        details: `Error checking drug-lab interaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'ERROR'
      });
      
      throw error;
    }
  }
  
  /**
   * Create an override for a specific interaction
   * 
   * @param interactionId - ID of the interaction
   * @param patientId - ID of the patient
   * @param providerId - ID of the provider creating the override
   * @param reason - Reason for the override
   * @param durationDays - Duration of the override in days
   * @returns The created override
   */
  async createInteractionOverride(
    interactionId: string,
    patientId: string,
    providerId: string,
    reason: string,
    durationDays: number
  ): Promise<PharmacyDomain.InteractionOverride> {
    try {
      // Log the override creation
      this.auditLogger.logEvent({
        eventType: 'INTERACTION_OVERRIDE_CREATED',
        userId: providerId,
        resourceType: 'Interaction',
        resourceId: interactionId,
        details: `Creating override for interaction ${interactionId} for patient ${patientId}`,
        severity: 'WARNING'
      });
      
      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
      
      // Create the override in the database
      const override = await this.prisma.interactionOverride.create({
        data: {
          interactionId,
          patientId,
          providerId,
          reason,
          expiresAt,
          createdAt: new Date()
        }
      });
      
      return override;
    } catch (error) {
      // Log the error
      this.auditLogger.logEvent({
        eventType: 'INTERACTION_OVERRIDE_ERROR',
        userId: providerId,
        resourceType: 'Interaction',
        resourceId: interactionId,
        details: `Error creating interaction override: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'ERROR'
      });
      
      throw error;
    }
  }
  
  /**
   * Perform a comprehensive batch interaction check for multiple medications
   * 
   * @param medicationIds - Array of medication IDs
   * @param patientId - ID of the patient
   * @returns Comprehensive interaction results
   */
  async batchInteractionCheck(
    medicationIds: string[],
    patientId: string
  ): Promise<PharmacyDomain.BatchInteractionResult> {
    try {
      // Log the batch check
      this.auditLogger.logEvent({
        eventType: 'BATCH_INTERACTION_CHECK',
        resourceType: 'Patient',
        resourceId: patientId,
        details: `Performing batch interaction check for ${medicationIds.length} medications`,
        severity: 'INFO'
      });
      
      const drugDrugInteractions: PharmacyDomain.DrugInteractionResult[] = [];
      const drugAllergyInteractions: PharmacyDomain.DrugAllergyInteractionResult[] = [];
      const drugConditionInteractions: PharmacyDomain.DrugConditionInteractionResult[] = [];
      const drugLabInteractions: PharmacyDomain.DrugLabInteractionResult[] = [];
      
      // Check drug-drug interactions
      for (let i = 0; i < medicationIds.length; i++) {
        for (let j = i + 1; j < medicationIds.length; j++) {
          const interaction = await this.checkDrugDrugInteraction(
            medicationIds[i],
            medicationIds[j],
            patientId
          );
          
          if (interaction.hasInteraction && !interaction.isOverridden) {
            drugDrugInteractions.push(interaction);
          }
        }
      }
      
      // Check drug-allergy interactions
      for (const medicationId of medicationIds) {
        const interaction = await this.checkDrugAllergyInteraction(medicationId, patientId);
        
        if (interaction.hasInteraction) {
          drugAllergyInteractions.push(interaction);
        }
      }
      
      // Check drug-condition interactions
      for (const medicationId of medicationIds) {
        const interaction = await this.checkDrugConditionInteraction(medicationId, patientId);
        
        if (interaction.hasInteraction) {
          drugConditionInteractions.push(interaction);
        }
      }
      
      // Check drug-lab interactions
      for (const medicationId of medicationIds) {
        const interaction = await this.checkDrugLabInteraction(medicationId, patientId);
        
        if (interaction.hasInteraction) {
          drugLabInteractions.push(interaction);
        }
      }
      
      // Determine if there are any severe interactions
      const hasSevereInteractions = [
        ...drugDrugInteractions,
        ...drugAllergyInteractions,
        ...drugConditionInteractions,
        ...drugLabInteractions
      ].some(interaction => interaction.severity === 'severe');
      
      return {
        patientId,
        medicationIds,
        drugDrugInteractions,
        drugAllergyInteractions,
        drugConditionInteractions,
        drugLabInteractions,
        hasSevereInteractions,
        interactionCount: drugDrugInteractions.length + 
                         drugAllergyInteractions.length + 
                         drugConditionInteractions.length + 
                         drugLabInteractions.length
      };
    } catch (error) {
      // Log the error
      this.auditLogger.logEvent({
        eventType: 'BATCH_INTERACTION_CHECK_ERROR',
        resourceType: 'Patient',
        resourceId: patientId,
        details: `Error performing batch interaction check: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'ERROR'
      });
      
      throw error;
    }
  }
}
