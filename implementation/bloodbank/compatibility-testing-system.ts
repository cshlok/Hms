/**
 * Blood Bank Compatibility Testing System
 * 
 * This file implements a comprehensive blood compatibility testing system
 * for the HMS Blood Bank module, including:
 * - ABO/Rh compatibility checking
 * - Electronic crossmatching
 * - Antibody screening and identification
 * - Special transfusion requirements handling
 * - Emergency release protocols
 * 
 * The implementation follows ISBT 128 standards and AABB guidelines.
 */

import { v4 as uuidv4 } from 'uuid';
import { logAuditEvent, AuditEventType, Resource } from '../security/security-framework';

// Blood types
export enum ABOType {
  A = 'A',
  B = 'B',
  AB = 'AB',
  O = 'O'
}

export enum RhType {
  POSITIVE = '+',
  NEGATIVE = '-'
}

export interface BloodType {
  abo: ABOType;
  rh: RhType;
}

// Antibody information
export interface Antibody {
  id: string;
  name: string;
  clinicalSignificance: 'high' | 'medium' | 'low';
  description: string;
}

export interface AntibodyScreenResult {
  id: string;
  patientId: string;
  timestamp: string;
  technician: string;
  isPositive: boolean;
  antibodiesIdentified: Antibody[];
  notes: string;
}

// Special transfusion requirements
export enum SpecialRequirement {
  IRRADIATED = 'irradiated',
  LEUKOREDUCED = 'leukoreduced',
  CMV_NEGATIVE = 'cmv_negative',
  WASHED = 'washed',
  HLA_MATCHED = 'hla_matched',
  WARMED = 'warmed'
}

export interface TransfusionRequirements {
  patientId: string;
  requirements: SpecialRequirement[];
  reason: string;
  orderedBy: string;
  timestamp: string;
}

// Crossmatch result
export interface CrossmatchResult {
  id?: string;
  patientId: string;
  productId: string;
  compatible: boolean;
  method: 'electronic' | 'serological' | 'emergency';
  timestamp?: string;
  performedBy?: string;
  notes?: string;
  requiresSerologicalCrossmatch?: boolean;
}

// Blood product
export interface BloodProduct {
  id: string;
  type: 'whole_blood' | 'red_cells' | 'platelets' | 'plasma' | 'cryoprecipitate';
  bloodType: BloodType;
  donationId: string;
  donationDate: string;
  expirationDate: string;
  volume: number;
  volumeUnit: 'mL';
  status: 'available' | 'assigned' | 'crossmatched' | 'issued' | 'transfused' | 'discarded';
  location: string;
  isIrradiated: boolean;
  isLeukoreduced: boolean;
  isCMVNegative: boolean;
  isWashed: boolean;
  specialTesting: Record<string, any>;
}

// Patient blood information
export interface PatientBloodInfo {
  patientId: string;
  bloodType?: BloodType;
  antibodyHistory: Antibody[];
  transfusionHistory: {
    date: string;
    productId: string;
    productType: string;
    reaction: boolean;
    reactionDetails?: string;
  }[];
  specialRequirements: SpecialRequirement[];
}

/**
 * Class implementing the compatibility testing system
 */
export class CompatibilityTestingSystem {
  /**
   * Check ABO/Rh compatibility between recipient and donor
   */
  public checkABOCompatibility(
    recipientABO: ABOType,
    recipientRh: RhType,
    donorABO: ABOType,
    donorRh: RhType
  ): { compatible: boolean; reason?: string } {
    // Check ABO compatibility
    let aboCompatible = false;
    
    switch (recipientABO) {
      case ABOType.A:
        aboCompatible = (donorABO === ABOType.A || donorABO === ABOType.O);
        break;
      case ABOType.B:
        aboCompatible = (donorABO === ABOType.B || donorABO === ABOType.O);
        break;
      case ABOType.AB:
        // AB recipients can receive any ABO type
        aboCompatible = true;
        break;
      case ABOType.O:
        // O recipients can only receive O
        aboCompatible = (donorABO === ABOType.O);
        break;
    }
    
    if (!aboCompatible) {
      return {
        compatible: false,
        reason: `ABO incompatibility: Recipient ${recipientABO} cannot receive ${donorABO}`
      };
    }
    
    // Check Rh compatibility
    // Rh- recipients should not receive Rh+ blood
    if (recipientRh === RhType.NEGATIVE && donorRh === RhType.POSITIVE) {
      return {
        compatible: false,
        reason: `Rh incompatibility: Rh- recipient cannot receive Rh+ blood`
      };
    }
    
    return { compatible: true };
  }
  
  /**
   * Perform electronic crossmatch
   */
  public async performElectronicCrossmatch(
    patientId: string,
    productId: string,
    session: any
  ): Promise<CrossmatchResult> {
    try {
      // Get patient blood information
      const patientInfo = await this.getPatientBloodInfo(patientId);
      
      // Get blood product information
      const product = await this.getBloodProduct(productId);
      
      // Check if electronic crossmatch is allowed
      if (!this.isElectronicCrossmatchEligible(patientInfo)) {
        // Log the attempt
        await logAuditEvent(
          session,
          AuditEventType.ACCESS,
          Resource.BLOOD_TRANSFUSION,
          'electronic crossmatch',
          'failure',
          {
            patientId,
            productId,
            reason: 'Patient not eligible for electronic crossmatch'
          },
          undefined,
          'Patient not eligible for electronic crossmatch'
        );
        
        return {
          patientId,
          productId,
          compatible: false,
          method: 'electronic',
          notes: 'Patient not eligible for electronic crossmatch. Perform serological crossmatch.',
          requiresSerologicalCrossmatch: true
        };
      }
      
      // Check if patient blood type is known
      if (!patientInfo.bloodType) {
        // Log the attempt
        await logAuditEvent(
          session,
          AuditEventType.ACCESS,
          Resource.BLOOD_TRANSFUSION,
          'electronic crossmatch',
          'failure',
          {
            patientId,
            productId,
            reason: 'Patient blood type unknown'
          },
          undefined,
          'Patient blood type unknown'
        );
        
        return {
          patientId,
          productId,
          compatible: false,
          method: 'electronic',
          notes: 'Patient blood type unknown. Perform serological crossmatch.',
          requiresSerologicalCrossmatch: true
        };
      }
      
      // Check ABO compatibility
      const aboCompatibility = this.checkABOCompatibility(
        patientInfo.bloodType.abo,
        patientInfo.bloodType.rh,
        product.bloodType.abo,
        product.bloodType.rh
      );
      
      if (!aboCompatibility.compatible) {
        // Log the incompatibility
        await logAuditEvent(
          session,
          AuditEventType.ACCESS,
          Resource.BLOOD_TRANSFUSION,
          'electronic crossmatch',
          'failure',
          {
            patientId,
            productId,
            reason: aboCompatibility.reason
          },
          undefined,
          aboCompatibility.reason
        );
        
        return {
          patientId,
          productId,
          compatible: false,
          method: 'electronic',
          notes: aboCompatibility.reason
        };
      }
      
      // Check for special requirements
      const specialRequirementsCheck = this.checkSpecialRequirements(product, patientInfo.specialRequirements);
      
      if (!specialRequirementsCheck.compatible) {
        // Log the incompatibility
        await logAuditEvent(
          session,
          AuditEventType.ACCESS,
          Resource.BLOOD_TRANSFUSION,
          'electronic crossmatch',
          'failure',
          {
            patientId,
            productId,
            reason: specialRequirementsCheck.reason
          },
          undefined,
          specialRequirementsCheck.reason
        );
        
        return {
          patientId,
          productId,
          compatible: false,
          method: 'electronic',
          notes: specialRequirementsCheck.reason
        };
      }
      
      // Create crossmatch record
      const crossmatchResult: CrossmatchResult = {
        id: uuidv4(),
        patientId,
        productId,
        compatible: true,
        method: 'electronic',
        timestamp: new Date().toISOString(),
        performedBy: session.userId,
        notes: 'Electronic crossmatch compatible'
      };
      
      // Save crossmatch result
      await this.saveCrossmatchResult(crossmatchResult);
      
      // Log the successful crossmatch
      await logAuditEvent(
        session,
        AuditEventType.ACCESS,
        Resource.BLOOD_TRANSFUSION,
        'electronic crossmatch',
        'success',
        {
          patientId,
          productId,
          crossmatchId: crossmatchResult.id
        },
        crossmatchResult.id
      );
      
      return crossmatchResult;
    } catch (error) {
      console.error('Error performing electronic crossmatch:', error);
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.ACCESS,
        Resource.BLOOD_TRANSFUSION,
        'electronic crossmatch',
        'failure',
        {
          patientId,
          productId,
          error: error.message
        },
        undefined,
        `Error performing electronic crossmatch: ${error.message}`
      );
      
      throw error;
    }
  }
  
  /**
   * Perform serological crossmatch
   */
  public async performSerologicalCrossmatch(
    patientId: string,
    productId: string,
    testResults: {
      immediateSpinPhase: boolean;
      enhancementPhase: boolean;
      antiHumanGlobulinPhase: boolean;
      autoControl: boolean;
    },
    notes: string,
    session: any
  ): Promise<CrossmatchResult> {
    try {
      // Get patient blood information
      const patientInfo = await this.getPatientBloodInfo(patientId);
      
      // Get blood product information
      const product = await this.getBloodProduct(productId);
      
      // Check if any phase is incompatible
      const isCompatible = 
        testResults.immediateSpinPhase && 
        testResults.enhancementPhase && 
        testResults.antiHumanGlobulinPhase;
      
      // Create crossmatch record
      const crossmatchResult: CrossmatchResult = {
        id: uuidv4(),
        patientId,
        productId,
        compatible: isCompatible,
        method: 'serological',
        timestamp: new Date().toISOString(),
        performedBy: session.userId,
        notes: notes || (isCompatible ? 'Serological crossmatch compatible' : 'Serological crossmatch incompatible')
      };
      
      // Save crossmatch result
      await this.saveCrossmatchResult(crossmatchResult);
      
      // Log the crossmatch
      await logAuditEvent(
        session,
        AuditEventType.ACCESS,
        Resource.BLOOD_TRANSFUSION,
        'serological crossmatch',
        isCompatible ? 'success' : 'failure',
        {
          patientId,
          productId,
          crossmatchId: crossmatchResult.id,
          testResults
        },
        crossmatchResult.id
      );
      
      return crossmatchResult;
    } catch (error) {
      console.error('Error performing serological crossmatch:', error);
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.ACCESS,
        Resource.BLOOD_TRANSFUSION,
        'serological crossmatch',
        'failure',
        {
          patientId,
          productId,
          error: error.message
        },
        undefined,
        `Error performing serological crossmatch: ${error.message}`
      );
      
      throw error;
    }
  }
  
  /**
   * Process emergency release
   */
  public async processEmergencyRelease(
    patientId: string,
    productId: string,
    reason: string,
    authorizedBy: string,
    session: any
  ): Promise<CrossmatchResult> {
    try {
      // Get blood product information
      const product = await this.getBloodProduct(productId);
      
      // In emergency, we typically use O- for unknown recipients
      // or type-specific but uncrossmatched blood if type is known
      const patientInfo = await this.getPatientBloodInfo(patientId);
      
      // Create emergency release record
      const emergencyRelease: CrossmatchResult = {
        id: uuidv4(),
        patientId,
        productId,
        compatible: true, // Assumed compatible for emergency release
        method: 'emergency',
        timestamp: new Date().toISOString(),
        performedBy: session.userId,
        notes: `Emergency release authorized by ${authorizedBy}. Reason: ${reason}`
      };
      
      // Save emergency release record
      await this.saveCrossmatchResult(emergencyRelease);
      
      // Update product status
      await this.updateProductStatus(productId, 'issued');
      
      // Log the emergency release
      await logAuditEvent(
        session,
        AuditEventType.ACCESS,
        Resource.BLOOD_TRANSFUSION,
        'emergency release',
        'success',
        {
          patientId,
          productId,
          releaseId: emergencyRelease.id,
          reason,
          authorizedBy
        },
        emergencyRelease.id
      );
      
      return emergencyRelease;
    } catch (error) {
      console.error('Error processing emergency release:', error);
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.ACCESS,
        Resource.BLOOD_TRANSFUSION,
        'emergency release',
        'failure',
        {
          patientId,
          productId,
          error: error.message
        },
        undefined,
        `Error processing emergency release: ${error.message}`
      );
      
      throw error;
    }
  }
  
  /**
   * Find compatible blood products
   */
  public async findCompatibleProducts(
    patientId: string,
    productType: string,
    count: number = 1,
    session: any
  ): Promise<BloodProduct[]> {
    try {
      // Get patient blood information
      const patientInfo = await this.getPatientBloodInfo(patientId);
      
      // Get available products of the requested type
      const availableProducts = await this.getAvailableProducts(productType);
      
      // Filter products by compatibility
      const compatibleProducts: BloodProduct[] = [];
      
      for (const product of availableProducts) {
        // If patient blood type is unknown, only O- is safe for RBCs
        if (!patientInfo.bloodType) {
          if (productType === 'red_cells' && 
              product.bloodType.abo === ABOType.O && 
              product.bloodType.rh === RhType.NEGATIVE) {
            compatibleProducts.push(product);
          }
          continue;
        }
        
        // Check ABO compatibility
        const aboCompatibility = this.checkABOCompatibility(
          patientInfo.bloodType.abo,
          patientInfo.bloodType.rh,
          product.bloodType.abo,
          product.bloodType.rh
        );
        
        if (!aboCompatibility.compatible) {
          continue;
        }
        
        // Check special requirements
        const specialRequirementsCheck = this.checkSpecialRequirements(
          product, 
          patientInfo.specialRequirements
        );
        
        if (!specialRequirementsCheck.compatible) {
          continue;
        }
        
        compatibleProducts.push(product);
        
        // Stop once we have enough products
        if (compatibleProducts.length >= count) {
          break;
        }
      }
      
      // Log the search
      await logAuditEvent(
        session,
        AuditEventType.ACCESS,
        Resource.BLOOD_PRODUCT,
        'find compatible products',
        'success',
        {
          patientId,
          productType,
          count,
          foundCount: compatibleProducts.length
        }
      );
      
      return compatibleProducts;
    } catch (error) {
      console.error('Error finding compatible products:', error);
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.ACCESS,
        Resource.BLOOD_PRODUCT,
        'find compatible products',
        'failure',
        {
          patientId,
          productType,
          count,
          error: error.message
        },
        undefined,
        `Error finding compatible products: ${error.message}`
      );
      
      throw error;
    }
  }
  
  /**
   * Record antibody screening result
   */
  public async recordAntibodyScreening(
    patientId: string,
    isPositive: boolean,
    antibodiesIdentified: Antibody[],
    notes: string,
    session: any
  ): Promise<AntibodyScreenResult> {
    try {
      // Create antibody screen result
      const screenResult: AntibodyScreenResult = {
        id: uuidv4(),
        patientId,
        timestamp: new Date().toISOString(),
        technician: session.userId,
        isPositive,
        antibodiesIdentified,
        notes
      };
      
      // Save antibody screen result
      await this.saveAntibodyScreenResult(screenResult);
      
      // If positive, update patient blood info with antibodies
      if (isPositive && antibodiesIdentified.length > 0) {
        await this.updatePatientAntibodies(patientId, antibodiesIdentified);
      }
      
      // Log the antibody screening
      await logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.BLOOD_DONATION,
        'antibody screening',
        'success',
        {
          patientId,
          screenResultId: screenResult.id,
          isPositive,
          antibodiesIdentified: antibodiesIdentified.map(a => a.name)
        },
        screenResult.id
      );
      
      return screenResult;
    } catch (error) {
      console.error('Error recording antibody screening:', error);
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.CREATE,
        Resource.BLOOD_DONATION,
        'antibody screening',
        'failure',
        {
          patientId,
          error: error.message
        },
        undefined,
        `Error recording antibody screening: ${error.message}`
      );
      
      throw error;
    }
  }
  
  /**
   * Update patient special requirements
   */
  public async updateSpecialRequirements(
    patientId: string,
    requirements: SpecialRequirement[],
    reason: string,
    session: any
  ): Promise<TransfusionRequirements> {
    try {
      // Create transfusion requirements
      const transfusionRequirements: TransfusionRequirements = {
        patientId,
        requirements,
        reason,
        orderedBy: session.userId,
        timestamp: new Date().toISOString()
      };
      
      // Save transfusion requirements
      await this.saveTransfusionRequirements(transfusionRequirements);
      
      // Update patient blood info with special requirements
      await this.updatePatientSpecialRequirements(patientId, requirements);
      
      // Log the update
      await logAuditEvent(
        session,
        AuditEventType.UPDATE,
        Resource.PATIENT_RECORD,
        'update special requirements',
        'success',
        {
          patientId,
          requirements,
          reason
        },
        patientId
      );
      
      return transfusionRequirements;
    } catch (error) {
      console.error('Error updating special requirements:', error);
      
      // Log the error
      await logAuditEvent(
        session,
        AuditEventType.UPDATE,
        Resource.PATIENT_RECORD,
        'update special requirements',
        'failure',
        {
          patientId,
          requirements,
          reason,
          error: error.message
        },
        patientId,
        `Error updating special requirements: ${error.message}`
      );
      
      throw error;
    }
  }
  
  /**
   * Check if patient is eligible for electronic crossmatch
   */
  private isElectronicCrossmatchEligible(patientInfo: PatientBloodInfo): boolean {
    // Patient must have a known blood type
    if (!patientInfo.bloodType) {
      return false;
    }
    
    // Patient must not have any antibodies
    if (patientInfo.antibodyHistory.length > 0) {
      return false;
    }
    
    // Patient must not have had any transfusion reactions
    const hasReactions = patientInfo.transfusionHistory.some(t => t.reaction);
    if (hasReactions) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if product meets special requirements
   */
  private checkSpecialRequirements(
    product: BloodProduct,
    requirements: SpecialRequirement[]
  ): { compatible: boolean; reason?: string } {
    for (const requirement of requirements) {
      switch (requirement) {
        case SpecialRequirement.IRRADIATED:
          if (!product.isIrradiated) {
            return {
              compatible: false,
              reason: 'Product is not irradiated'
            };
          }
          break;
        case SpecialRequirement.LEUKOREDUCED:
          if (!product.isLeukoreduced) {
            return {
              compatible: false,
              reason: 'Product is not leukoreduced'
            };
          }
          break;
        case SpecialRequirement.CMV_NEGATIVE:
          if (!product.isCMVNegative) {
            return {
              compatible: false,
              reason: 'Product is not CMV negative'
            };
          }
          break;
        case SpecialRequirement.WASHED:
          if (!product.isWashed) {
            return {
              compatible: false,
              reason: 'Product is not washed'
            };
          }
          break;
        case SpecialRequirement.HLA_MATCHED:
          if (!product.specialTesting.hlaMatched) {
            return {
              compatible: false,
              reason: 'Product is not HLA matched'
            };
          }
          break;
      }
    }
    
    return { compatible: true };
  }
  
  /**
   * Get patient blood information
   */
  private async getPatientBloodInfo(patientId: string): Promise<PatientBloodInfo> {
    // In a real implementation, this would fetch from a database
    // For now, we'll return mock data
    return {
      patientId,
      bloodType: {
        abo: ABOType.A,
        rh: RhType.POSITIVE
      },
      antibodyHistory: [],
      transfusionHistory: [],
      specialRequirements: []
    };
  }
  
  /**
   * Get blood product information
   */
  private async getBloodProduct(productId: string): Promise<BloodProduct> {
    // In a real implementation, this would fetch from a database
    // For now, we'll return mock data
    return {
      id: productId,
      type: 'red_cells',
      bloodType: {
        abo: ABOType.A,
        rh: RhType.POSITIVE
      },
      donationId: 'donation123',
      donationDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(), // 42 days
      volume: 280,
      volumeUnit: 'mL',
      status: 'available',
      location: 'blood_bank_refrigerator_1',
      isIrradiated: false,
      isLeukoreduced: true,
      isCMVNegative: false,
      isWashed: false,
      specialTesting: {}
    };
  }
  
  /**
   * Get available blood products
   */
  private async getAvailableProducts(productType: string): Promise<BloodProduct[]> {
    // In a real implementation, this would fetch from a database
    // For now, we'll return mock data
    return [
      {
        id: 'product1',
        type: productType as any,
        bloodType: {
          abo: ABOType.A,
          rh: RhType.POSITIVE
        },
        donationId: 'donation1',
        donationDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(),
        volume: 280,
        volumeUnit: 'mL',
        status: 'available',
        location: 'blood_bank_refrigerator_1',
        isIrradiated: false,
        isLeukoreduced: true,
        isCMVNegative: false,
        isWashed: false,
        specialTesting: {}
      },
      {
        id: 'product2',
        type: productType as any,
        bloodType: {
          abo: ABOType.O,
          rh: RhType.NEGATIVE
        },
        donationId: 'donation2',
        donationDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(),
        volume: 280,
        volumeUnit: 'mL',
        status: 'available',
        location: 'blood_bank_refrigerator_1',
        isIrradiated: true,
        isLeukoreduced: true,
        isCMVNegative: true,
        isWashed: false,
        specialTesting: {}
      }
    ];
  }
  
  /**
   * Save crossmatch result
   */
  private async saveCrossmatchResult(result: CrossmatchResult): Promise<void> {
    // In a real implementation, this would save to a database
    console.log('Saving crossmatch result:', result);
  }
  
  /**
   * Save antibody screen result
   */
  private async saveAntibodyScreenResult(result: AntibodyScreenResult): Promise<void> {
    // In a real implementation, this would save to a database
    console.log('Saving antibody screen result:', result);
  }
  
  /**
   * Save transfusion requirements
   */
  private async saveTransfusionRequirements(requirements: TransfusionRequirements): Promise<void> {
    // In a real implementation, this would save to a database
    console.log('Saving transfusion requirements:', requirements);
  }
  
  /**
   * Update product status
   */
  private async updateProductStatus(productId: string, status: string): Promise<void> {
    // In a real implementation, this would update the database
    console.log(`Updating product ${productId} status to ${status}`);
  }
  
  /**
   * Update patient antibodies
   */
  private async updatePatientAntibodies(patientId: string, antibodies: Antibody[]): Promise<void> {
    // In a real implementation, this would update the database
    console.log(`Updating patient ${patientId} antibodies:`, antibodies);
  }
  
  /**
   * Update patient special requirements
   */
  private async updatePatientSpecialRequirements(patientId: string, requirements: SpecialRequirement[]): Promise<void> {
    // In a real implementation, this would update the database
    console.log(`Updating patient ${patientId} special requirements:`, requirements);
  }
}

// Export singleton instance
export const compatibilityTestingSystem = new CompatibilityTestingSystem();
