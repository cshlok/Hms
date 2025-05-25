/**
 * Advanced Drug Interaction Service Implementation
 * 
 * This service implements a comprehensive drug interaction checking system
 * based on research of leading open-source pharmacy systems and best practices.
 * It provides multi-level interaction checking with severity classification.
 */

import { injectable, inject } from 'inversify';
import { PharmacyDomain } from '../models/domain-models';
import axios from 'axios';
import NodeCache from 'node-cache';

@injectable()
export class DrugInteractionService implements PharmacyDomain.DrugInteractionService {
  private cache: NodeCache;
  private readonly CACHE_TTL = 3600; // 1 hour cache TTL
  private readonly API_BASE_URL = process.env.DRUG_INTERACTION_API_URL || 'https://api.drugbank.com/v1';
  private readonly API_KEY = process.env.DRUG_INTERACTION_API_KEY || 'demo_key';

  constructor(
    @inject('MedicationRepository') private medicationRepository: PharmacyDomain.MedicationRepository,
    @inject('PrescriptionRepository') private prescriptionRepository: PharmacyDomain.PrescriptionRepository
  ) {
    this.cache = new NodeCache({
      stdTTL: this.CACHE_TTL,
      checkperiod: 120
    });
  }

  /**
   * Check interactions between a list of medications
   * @param medicationIds Array of medication IDs to check for interactions
   * @returns Promise resolving to array of drug interactions
   */
  async checkInteractions(medicationIds: string[]): Promise<PharmacyDomain.DrugInteraction[]> {
    if (!medicationIds.length || medicationIds.length < 2) {
      return [];
    }

    // Sort medication IDs to ensure consistent cache keys
    const sortedIds = [...medicationIds].sort();
    const cacheKey = `interactions:${sortedIds.join(':')}`;

    // Check cache first
    const cachedInteractions = this.cache.get<PharmacyDomain.DrugInteraction[]>(cacheKey);
    if (cachedInteractions) {
      return cachedInteractions;
    }

    // Fetch medications to get RxNorm codes
    const medications = await Promise.all(
      sortedIds.map(id => this.medicationRepository.findById(id))
    );

    // Filter out any medications that weren't found
    const validMedications = medications.filter(med => med !== null) as PharmacyDomain.Medication[];
    
    if (validMedications.length < 2) {
      return [];
    }

    // Extract RxNorm codes
    const rxnormCodes = validMedications.map(med => {
      const rxnormCode = med.codes.find(code => 
        code.system === 'http://www.nlm.nih.gov/research/umls/rxnorm'
      );
      return rxnormCode ? rxnormCode.code : null;
    }).filter(code => code !== null) as string[];

    if (rxnormCodes.length < 2) {
      // Fall back to ingredient-based checking if RxNorm codes aren't available
      return this.checkIngredientInteractions(validMedications);
    }

    try {
      // Call external API for interactions
      const interactions = await this.fetchInteractionsFromAPI(rxnormCodes);
      
      // Cache the results
      this.cache.set(cacheKey, interactions);
      
      return interactions;
    } catch (error) {
      console.error('Error fetching drug interactions:', error);
      
      // Fall back to ingredient-based checking if API call fails
      return this.checkIngredientInteractions(validMedications);
    }
  }

  /**
   * Check interactions for a patient's current medications plus a new medication
   * @param patientId Patient ID
   * @param newMedicationId New medication ID to check against current medications
   * @returns Promise resolving to array of drug interactions
   */
  async checkInteractionsForPatient(patientId: string, newMedicationId: string): Promise<PharmacyDomain.DrugInteraction[]> {
    // Get patient's active prescriptions
    const prescriptions = await this.prescriptionRepository.findByPatientId(patientId);
    const activePrescriptions = prescriptions.filter(p => p.isActive());
    
    if (activePrescriptions.length === 0) {
      return [];
    }

    // Get medication IDs from active prescriptions
    const currentMedicationIds = activePrescriptions.map(p => p.medicationId);
    
    // Add new medication ID if it's not already in the list
    if (!currentMedicationIds.includes(newMedicationId)) {
      currentMedicationIds.push(newMedicationId);
    }
    
    // Check interactions between all medications
    return this.checkInteractions(currentMedicationIds);
  }

  /**
   * Fetch interactions from external API
   * @param rxnormCodes Array of RxNorm codes
   * @returns Promise resolving to array of drug interactions
   */
  private async fetchInteractionsFromAPI(rxnormCodes: string[]): Promise<PharmacyDomain.DrugInteraction[]> {
    try {
      const response = await axios.post(
        `${this.API_BASE_URL}/interactions`,
        { rxnorm_codes: rxnormCodes },
        {
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status !== 200) {
        throw new Error(`API returned status ${response.status}`);
      }

      // Transform API response to domain model
      return this.transformAPIResponse(response.data, rxnormCodes);
    } catch (error) {
      console.error('Error calling drug interaction API:', error);
      throw error;
    }
  }

  /**
   * Transform API response to domain model
   * @param apiResponse API response data
   * @param rxnormCodes RxNorm codes used in the request
   * @returns Array of drug interactions
   */
  private async transformAPIResponse(apiResponse: any, rxnormCodes: string[]): Promise<PharmacyDomain.DrugInteraction[]> {
    if (!apiResponse.interactions || !Array.isArray(apiResponse.interactions)) {
      return [];
    }

    // Get medications by RxNorm code for name lookup
    const medications = await Promise.all(
      rxnormCodes.map(async code => {
        const meds = await this.medicationRepository.search({ code });
        return meds.length > 0 ? meds[0] : null;
      })
    );

    const medicationMap = new Map<string, PharmacyDomain.Medication>();
    medications.forEach(med => {
      if (med) {
        const rxnormCode = med.codes.find(c => 
          c.system === 'http://www.nlm.nih.gov/research/umls/rxnorm'
        );
        if (rxnormCode) {
          medicationMap.set(rxnormCode.code, med);
        }
      }
    });

    // Transform API interactions to domain model
    return apiResponse.interactions.map((interaction: any) => {
      // Map severity from API to domain model
      let severity: 'contraindicated' | 'severe' | 'moderate' | 'mild' | 'unknown' = 'unknown';
      
      switch (interaction.severity?.toLowerCase()) {
        case 'high':
        case 'contraindicated':
          severity = 'contraindicated';
          break;
        case 'severe':
        case 'major':
          severity = 'severe';
          break;
        case 'moderate':
          severity = 'moderate';
          break;
        case 'minor':
        case 'mild':
          severity = 'mild';
          break;
        default:
          severity = 'unknown';
      }

      // Get medication IDs and names
      const medicationIds: string[] = [];
      const medicationNames: string[] = [];

      if (interaction.rxnorm_codes && Array.isArray(interaction.rxnorm_codes)) {
        interaction.rxnorm_codes.forEach((code: string) => {
          const medication = medicationMap.get(code);
          if (medication) {
            medicationIds.push(medication.id);
            medicationNames.push(medication.name);
          }
        });
      }

      return {
        medicationIds,
        medicationNames,
        severity,
        description: interaction.description || 'No description available',
        reference: interaction.source || 'DrugBank',
        recommendation: interaction.recommendation || 'Monitor patient closely'
      };
    });
  }

  /**
   * Check interactions based on medication ingredients
   * This is a fallback method when RxNorm codes aren't available or API call fails
   * @param medications Array of medications to check
   * @returns Array of drug interactions
   */
  private checkIngredientInteractions(medications: PharmacyDomain.Medication[]): PharmacyDomain.DrugInteraction[] {
    const interactions: PharmacyDomain.DrugInteraction[] = [];
    const knownInteractions = this.getKnownIngredientInteractions();

    // Create a map of substance IDs to medications
    const substanceMap = new Map<string, PharmacyDomain.Medication[]>();
    
    medications.forEach(med => {
      med.ingredients.forEach(ingredient => {
        if (!substanceMap.has(ingredient.substanceId)) {
          substanceMap.set(ingredient.substanceId, []);
        }
        substanceMap.get(ingredient.substanceId)!.push(med);
      });
    });

    // Check each known interaction against our medications
    knownInteractions.forEach(interaction => {
      const substance1Meds = substanceMap.get(interaction.substance1Id) || [];
      const substance2Meds = substanceMap.get(interaction.substance2Id) || [];
      
      if (substance1Meds.length > 0 && substance2Meds.length > 0) {
        // Create all possible medication pairs for this interaction
        substance1Meds.forEach(med1 => {
          substance2Meds.forEach(med2 => {
            if (med1.id !== med2.id) {
              interactions.push({
                medicationIds: [med1.id, med2.id],
                medicationNames: [med1.name, med2.name],
                severity: interaction.severity,
                description: interaction.description,
                reference: 'Internal database',
                recommendation: interaction.recommendation
              });
            }
          });
        });
      }
    });

    return interactions;
  }

  /**
   * Get known ingredient interactions from internal database
   * This is a simplified version with common interactions
   * In a production system, this would be loaded from a database
   * @returns Array of known ingredient interactions
   */
  private getKnownIngredientInteractions(): Array<{
    substance1Id: string;
    substance2Id: string;
    severity: 'contraindicated' | 'severe' | 'moderate' | 'mild' | 'unknown';
    description: string;
    recommendation: string;
  }> {
    return [
      {
        substance1Id: '1191',  // Warfarin
        substance2Id: '1549',  // Aspirin
        severity: 'severe',
        description: 'Increased risk of bleeding when warfarin is used with aspirin',
        recommendation: 'Avoid combination unless benefits outweigh risks. Monitor INR closely.'
      },
      {
        substance1Id: '979467', // Simvastatin
        substance2Id: '42347',  // Clarithromycin
        severity: 'contraindicated',
        description: 'Increased risk of myopathy and rhabdomyolysis',
        recommendation: 'Contraindicated. Use alternative antibiotic if possible.'
      },
      {
        substance1Id: '6809',   // Fluoxetine
        substance2Id: '36437',  // Phenelzine
        severity: 'contraindicated',
        description: 'Risk of serotonin syndrome when SSRIs are used with MAOIs',
        recommendation: 'Contraindicated. Allow 2 weeks washout when switching between these medications.'
      },
      {
        substance1Id: '11289',  // Digoxin
        substance2Id: '4493',   // Amiodarone
        severity: 'severe',
        description: 'Amiodarone increases digoxin levels, increasing risk of toxicity',
        recommendation: 'Reduce digoxin dose by 50% and monitor levels closely.'
      },
      {
        substance1Id: '10454',  // Ciprofloxacin
        substance2Id: '42348',  // Calcium supplements
        severity: 'moderate',
        description: 'Calcium can reduce absorption of ciprofloxacin',
        recommendation: 'Separate administration times by at least 2 hours.'
      },
      {
        substance1Id: '6057',   // Metformin
        substance2Id: '1962',   // Contrast media
        severity: 'moderate',
        description: 'Increased risk of lactic acidosis with iodinated contrast',
        recommendation: 'Hold metformin for 48 hours after contrast administration.'
      },
      {
        substance1Id: '8629',   // Potassium supplements
        substance2Id: '203635', // Spironolactone
        severity: 'severe',
        description: 'Increased risk of hyperkalemia',
        recommendation: 'Monitor potassium levels closely if combination is necessary.'
      },
      {
        substance1Id: '10582',  // ACE inhibitors
        substance2Id: '1191',   // NSAIDs
        severity: 'moderate',
        description: 'NSAIDs may reduce antihypertensive effect of ACE inhibitors',
        recommendation: 'Monitor blood pressure and consider alternative pain management.'
      },
      {
        substance1Id: '6851',   // Levothyroxine
        substance2Id: '42348',  // Calcium supplements
        severity: 'mild',
        description: 'Calcium can reduce absorption of levothyroxine',
        recommendation: 'Separate administration times by at least 4 hours.'
      },
      {
        substance1Id: '8163',   // Phenytoin
        substance2Id: '4815',   // Valproic acid
        severity: 'moderate',
        description: 'Complex bidirectional interaction affecting levels of both drugs',
        recommendation: 'Monitor drug levels of both medications.'
      }
    ];
  }
}
