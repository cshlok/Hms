/**
 * Barcode Medication Administration Service Implementation
 * 
 * This service implements an enhanced barcode medication administration system
 * based on research of leading open-source pharmacy systems and best practices.
 * It provides comprehensive verification of the "five rights" of medication administration.
 */

import { injectable, inject } from 'inversify';
import { PharmacyDomain } from '../models/domain-models';
import { v4 as uuidv4 } from 'uuid';

interface BarcodeVerificationResult {
  success: boolean;
  message: string;
  details?: {
    rightPatient: boolean;
    rightMedication: boolean;
    rightDose: boolean;
    rightRoute: boolean;
    rightTime: boolean;
  };
}

@injectable()
export class BarcodeMedicationAdministrationService {
  constructor(
    @inject('MedicationRepository') private medicationRepository: PharmacyDomain.MedicationRepository,
    @inject('PrescriptionRepository') private prescriptionRepository: PharmacyDomain.PrescriptionRepository,
    @inject('MedicationAdministrationRepository') private administrationRepository: PharmacyDomain.MedicationAdministrationRepository,
    @inject('DrugInteractionService') private drugInteractionService: PharmacyDomain.DrugInteractionService
  ) {}

  /**
   * Verify a medication administration using barcode scanning
   * Implements the "five rights" of medication administration:
   * 1. Right patient
   * 2. Right medication
   * 3. Right dose
   * 4. Right route
   * 5. Right time
   * 
   * @param patientBarcode Scanned patient barcode
   * @param medicationBarcode Scanned medication barcode
   * @param prescriptionId Prescription ID
   * @param administeredDose Dose being administered
   * @param administeredRoute Route of administration
   * @returns Verification result with details
   */
  async verifyAdministration(
    patientBarcode: string,
    medicationBarcode: string,
    prescriptionId: string,
    administeredDose: number,
    administeredRoute: string
  ): Promise<BarcodeVerificationResult> {
    try {
      // 1. Decode barcodes
      const patientId = this.decodePatientBarcode(patientBarcode);
      const medicationInfo = this.decodeMedicationBarcode(medicationBarcode);
      
      if (!patientId || !medicationInfo.medicationId) {
        return {
          success: false,
          message: 'Invalid barcode format'
        };
      }
      
      // 2. Get prescription
      const prescription = await this.prescriptionRepository.findById(prescriptionId);
      if (!prescription) {
        return {
          success: false,
          message: 'Prescription not found'
        };
      }
      
      // 3. Get medication
      const medication = await this.medicationRepository.findById(medicationInfo.medicationId);
      if (!medication) {
        return {
          success: false,
          message: 'Medication not found'
        };
      }
      
      // 4. Verify the "five rights"
      const rightPatient = prescription.patientId === patientId;
      const rightMedication = prescription.medicationId === medicationInfo.medicationId;
      
      // Check dose within acceptable range (±10%)
      const prescribedDose = prescription.dosage.value;
      const doseDeviation = Math.abs(prescribedDose - administeredDose) / prescribedDose;
      const rightDose = doseDeviation <= 0.1; // Within 10% of prescribed dose
      
      // Check route
      const rightRoute = prescription.dosage.route.toLowerCase() === administeredRoute.toLowerCase();
      
      // Check time (within scheduled window)
      const rightTime = this.isWithinAdministrationWindow(prescription);
      
      const allRightsVerified = rightPatient && rightMedication && rightDose && rightRoute && rightTime;
      
      // 5. Check for interactions if all rights are verified
      if (allRightsVerified) {
        const interactions = await this.drugInteractionService.checkInteractionsForPatient(
          patientId,
          medicationInfo.medicationId
        );
        
        // Check for severe or contraindicated interactions
        const severeInteractions = interactions.filter(
          i => i.severity === 'severe' || i.severity === 'contraindicated'
        );
        
        if (severeInteractions.length > 0) {
          return {
            success: false,
            message: `WARNING: Severe drug interaction detected: ${severeInteractions[0].description}`,
            details: {
              rightPatient,
              rightMedication,
              rightDose,
              rightRoute,
              rightTime
            }
          };
        }
      }
      
      return {
        success: allRightsVerified,
        message: allRightsVerified 
          ? 'All verification checks passed' 
          : 'One or more verification checks failed',
        details: {
          rightPatient,
          rightMedication,
          rightDose,
          rightRoute,
          rightTime
        }
      };
    } catch (error) {
      console.error('Error in barcode verification:', error);
      return {
        success: false,
        message: `Verification error: ${error.message}`
      };
    }
  }
  
  /**
   * Record a medication administration after successful verification
   * 
   * @param patientId Patient ID
   * @param medicationId Medication ID
   * @param prescriptionId Prescription ID
   * @param performerId ID of the healthcare provider performing the administration
   * @param dosage Administration dosage
   * @param route Administration route
   * @param site Administration site (optional)
   * @param notes Additional notes (optional)
   * @returns The recorded medication administration
   */
  async recordAdministration(
    patientId: string,
    medicationId: string,
    prescriptionId: string,
    performerId: string,
    dosage: PharmacyDomain.Dosage,
    route: string,
    site?: string,
    notes?: string
  ): Promise<PharmacyDomain.MedicationAdministration> {
    // Create new administration record
    const administration = new PharmacyDomain.MedicationAdministration(
      uuidv4(),
      patientId,
      medicationId,
      prescriptionId,
      undefined, // dispensingId
      performerId,
      dosage,
      new Date(),
      'completed',
      undefined, // statusReason
      notes,
      undefined, // reasonCode
      undefined, // reasonText
      undefined, // device
      site,
      route,
      'verified' // Set as verified since it passed barcode verification
    );
    
    // Save to repository
    const savedAdministration = await this.administrationRepository.save(administration);
    
    // Update prescription status if needed
    const prescription = await this.prescriptionRepository.findById(prescriptionId);
    if (prescription && this.shouldCompletePrescription(prescription)) {
      await this.prescriptionRepository.update({
        ...prescription,
        status: 'completed'
      });
    }
    
    return savedAdministration;
  }
  
  /**
   * Record a skipped or refused medication administration
   * 
   * @param patientId Patient ID
   * @param medicationId Medication ID
   * @param prescriptionId Prescription ID
   * @param performerId ID of the healthcare provider
   * @param reason Reason for skipping/refusing
   * @returns The recorded medication administration with not-done status
   */
  async recordSkippedAdministration(
    patientId: string,
    medicationId: string,
    prescriptionId: string,
    performerId: string,
    reason: string
  ): Promise<PharmacyDomain.MedicationAdministration> {
    // Get prescription to access dosage information
    const prescription = await this.prescriptionRepository.findById(prescriptionId);
    if (!prescription) {
      throw new Error('Prescription not found');
    }
    
    // Create new administration record with not-done status
    const administration = new PharmacyDomain.MedicationAdministration(
      uuidv4(),
      patientId,
      medicationId,
      prescriptionId,
      undefined, // dispensingId
      performerId,
      prescription.dosage, // Use prescribed dosage
      new Date(),
      'not-done',
      reason, // Status reason
      `Administration skipped: ${reason}`, // Notes
      undefined, // reasonCode
      undefined, // reasonText
      undefined, // device
      undefined, // site
      undefined, // route
      'verified' // Set as verified since it was deliberately skipped
    );
    
    // Save to repository
    return this.administrationRepository.save(administration);
  }
  
  /**
   * Get administration history for a patient
   * 
   * @param patientId Patient ID
   * @param days Number of days of history to retrieve (default: 7)
   * @returns Array of medication administrations
   */
  async getAdministrationHistory(
    patientId: string,
    days: number = 7
  ): Promise<PharmacyDomain.MedicationAdministration[]> {
    const administrations = await this.administrationRepository.findByPatientId(patientId);
    
    // Filter by date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return administrations.filter(admin => admin.administeredAt >= cutoffDate);
  }
  
  /**
   * Get due medications for a patient
   * 
   * @param patientId Patient ID
   * @returns Array of prescriptions due for administration
   */
  async getDueMedications(patientId: string): Promise<PharmacyDomain.Prescription[]> {
    const prescriptions = await this.prescriptionRepository.findByPatientId(patientId);
    
    // Filter active prescriptions
    const activePrescriptions = prescriptions.filter(p => p.isActive());
    
    // Filter prescriptions due for administration
    return activePrescriptions.filter(p => this.isWithinAdministrationWindow(p));
  }
  
  /**
   * Generate a medication administration schedule for a patient
   * 
   * @param patientId Patient ID
   * @param days Number of days to schedule (default: 1)
   * @returns Scheduled administration times grouped by day and hour
   */
  async generateAdministrationSchedule(
    patientId: string,
    days: number = 1
  ): Promise<any> {
    const prescriptions = await this.prescriptionRepository.findByPatientId(patientId);
    const activePrescriptions = prescriptions.filter(p => p.isActive());
    
    const schedule: any = {};
    const now = new Date();
    
    // Generate schedule for specified number of days
    for (let day = 0; day < days; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      const dateString = date.toISOString().split('T')[0];
      
      schedule[dateString] = {};
      
      // For each prescription, determine administration times
      for (const prescription of activePrescriptions) {
        const administrationTimes = this.calculateAdministrationTimes(prescription, date);
        
        for (const time of administrationTimes) {
          const hour = time.getHours();
          const hourString = `${hour.toString().padStart(2, '0')}:00`;
          
          if (!schedule[dateString][hourString]) {
            schedule[dateString][hourString] = [];
          }
          
          // Get medication details
          const medication = await this.medicationRepository.findById(prescription.medicationId);
          
          schedule[dateString][hourString].push({
            prescriptionId: prescription.id,
            medicationId: prescription.medicationId,
            medicationName: medication ? medication.name : 'Unknown Medication',
            dosage: prescription.dosage.toString(),
            priority: prescription.priority
          });
        }
      }
    }
    
    return schedule;
  }
  
  /**
   * Check if a medication is due for administration within the current time window
   * 
   * @param prescription Prescription to check
   * @returns Boolean indicating if medication is due
   */
  private isWithinAdministrationWindow(prescription: PharmacyDomain.Prescription): boolean {
    // This is a simplified implementation
    // In a real system, this would check the scheduled administration times
    // and determine if the current time is within an acceptable window
    
    // For this implementation, we'll assume all active prescriptions are
    // within the administration window
    return prescription.isActive() && !prescription.isExpired();
  }
  
  /**
   * Calculate administration times for a prescription on a specific date
   * 
   * @param prescription Prescription to calculate times for
   * @param date Date to calculate times for
   * @returns Array of administration times
   */
  private calculateAdministrationTimes(
    prescription: PharmacyDomain.Prescription,
    date: Date
  ): Date[] {
    const times: Date[] = [];
    const frequency = prescription.dosage.frequency.toLowerCase();
    
    // Parse the date string to ensure we're working with the correct date
    const baseDate = new Date(date.toISOString().split('T')[0]);
    
    // Calculate administration times based on frequency
    if (frequency.includes('daily') || frequency.includes('once a day')) {
      // Once daily - default to 9 AM
      const administrationTime = new Date(baseDate);
      administrationTime.setHours(9, 0, 0, 0);
      times.push(administrationTime);
    } else if (frequency.includes('twice daily') || frequency.includes('bid') || frequency.includes('b.i.d')) {
      // Twice daily - 9 AM and 6 PM
      const morningDose = new Date(baseDate);
      morningDose.setHours(9, 0, 0, 0);
      times.push(morningDose);
      
      const eveningDose = new Date(baseDate);
      eveningDose.setHours(18, 0, 0, 0);
      times.push(eveningDose);
    } else if (frequency.includes('three times daily') || frequency.includes('tid') || frequency.includes('t.i.d')) {
      // Three times daily - 9 AM, 2 PM, and 9 PM
      const morningDose = new Date(baseDate);
      morningDose.setHours(9, 0, 0, 0);
      times.push(morningDose);
      
      const afternoonDose = new Date(baseDate);
      afternoonDose.setHours(14, 0, 0, 0);
      times.push(afternoonDose);
      
      const eveningDose = new Date(baseDate);
      eveningDose.setHours(21, 0, 0, 0);
      times.push(eveningDose);
    } else if (frequency.includes('four times daily') || frequency.includes('qid') || frequency.includes('q.i.d')) {
      // Four times daily - 8 AM, 12 PM, 4 PM, and 8 PM
      const morningDose = new Date(baseDate);
      morningDose.setHours(8, 0, 0, 0);
      times.push(morningDose);
      
      const noonDose = new Date(baseDate);
      noonDose.setHours(12, 0, 0, 0);
      times.push(noonDose);
      
      const afternoonDose = new Date(baseDate);
      afternoonDose.setHours(16, 0, 0, 0);
      times.push(afternoonDose);
      
      const eveningDose = new Date(baseDate);
      eveningDose.setHours(20, 0, 0, 0);
      times.push(eveningDose);
    } else if (frequency.includes('every') && frequency.includes('hour')) {
      // Every X hours
      const hourMatch = frequency.match(/every\s+(\d+)\s+hours?/i);
      if (hourMatch && hourMatch[1]) {
        const intervalHours = parseInt(hourMatch[1], 10);
        const hoursInDay = 24;
        
        for (let hour = 0; hour < hoursInDay; hour += intervalHours) {
          const doseTime = new Date(baseDate);
          doseTime.setHours(hour, 0, 0, 0);
          times.push(doseTime);
        }
      }
    } else if (frequency.includes('weekly')) {
      // Weekly - if today is the day of the week for administration
      // For simplicity, we'll assume weekly meds are given on the same day of the week
      // as when they were prescribed
      const prescriptionDay = prescription.dateWritten.getDay();
      if (date.getDay() === prescriptionDay) {
        const administrationTime = new Date(baseDate);
        administrationTime.setHours(9, 0, 0, 0);
        times.push(administrationTime);
      }
    } else if (frequency.includes('monthly')) {
      // Monthly - if today is the day of the month for administration
      const prescriptionDate = prescription.dateWritten.getDate();
      if (date.getDate() === prescriptionDate) {
        const administrationTime = new Date(baseDate);
        administrationTime.setHours(9, 0, 0, 0);
        times.push(administrationTime);
      }
    } else {
      // Default to once daily if frequency is not recognized
      const administrationTime = new Date(baseDate);
      administrationTime.setHours(9, 0, 0, 0);
      times.push(administrationTime);
    }
    
    return times;
  }
  
  /**
   * Determine if a prescription should be marked as completed
   * based on administration history
   * 
   * @param prescription Prescription to check
   * @returns Boolean indicating if prescription should be completed
   */
  private async shouldCompletePrescription(prescription: PharmacyDomain.Prescription): Promise<boolean> {
    // Get administration history for this prescription
    const administrations = await this.administrationRepository.findByPrescriptionId(prescription.id);
    
    // Count completed administrations
    const completedAdministrations = administrations.filter(a => a.isComplete()).length;
    
    // If this is a one-time prescription (no refills, quantity = 1)
    if (prescription.refills === 0 && prescription.quantity === 1) {
      return completedAdministrations >= 1;
    }
    
    // If all doses have been administered
    const totalDoses = prescription.quantity * (prescription.refills + 1);
    return completedAdministrations >= totalDoses;
  }
  
  /**
   * Decode a patient barcode
   * 
   * @param barcode Patient barcode
   * @returns Patient ID
   */
  private decodePatientBarcode(barcode: string): string {
    // In a real system, this would implement actual barcode decoding logic
    // For this implementation, we'll assume the barcode is in the format "P-{patientId}"
    const match = barcode.match(/^P-(.+)$/);
    return match ? match[1] : '';
  }
  
  /**
   * Decode a medication barcode
   * 
   * @param barcode Medication barcode
   * @returns Decoded medication information
   */
  private decodeMedicationBarcode(barcode: string): {
    medicationId: string;
    batchNumber?: string;
    expirationDate?: Date;
  } {
    // In a real system, this would implement actual barcode decoding logic
    // For this implementation, we'll assume the barcode is in the format "M-{medicationId}[-{batchNumber}[-{expirationDate}]]"
    const parts = barcode.split('-');
    
    if (parts.length >= 2 && parts[0] === 'M') {
      const result: {
        medicationId: string;
        batchNumber?: string;
        expirationDate?: Date;
      } = {
        medicationId: parts[1]
      };
      
      if (parts.length >= 3) {
        result.batchNumber = parts[2];
      }
      
      if (parts.length >= 4) {
        try {
          result.expirationDate = new Date(parts[3]);
        } catch (e) {
          // Invalid date format, ignore
        }
      }
      
      return result;
    }
    
    return { medicationId: '' };
  }
}
