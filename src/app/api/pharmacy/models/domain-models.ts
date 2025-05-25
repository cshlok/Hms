/**
 * Domain-Driven Design Implementation for Pharmacy Module
 * 
 * This file implements the core domain models and entities for the
 * Pharmacy & Prescriptions module following DDD principles.
 */

// Core Domain Models
export namespace PharmacyDomain {
  // Value Objects
  export class Dosage {
    constructor(
      public readonly value: number,
      public readonly unit: string,
      public readonly route: string,
      public readonly frequency: string,
      public readonly duration?: number,
      public readonly durationUnit?: string
    ) {}

    public toString(): string {
      let result = `${this.value} ${this.unit} ${this.route} ${this.frequency}`;
      if (this.duration && this.durationUnit) {
        result += ` for ${this.duration} ${this.durationUnit}`;
      }
      return result;
    }
  }

  export class MedicationCode {
    constructor(
      public readonly system: string,
      public readonly code: string,
      public readonly display: string
    ) {}
  }

  export class StrengthValue {
    constructor(
      public readonly numerator: number,
      public readonly numeratorUnit: string,
      public readonly denominator?: number,
      public readonly denominatorUnit?: string
    ) {}

    public toString(): string {
      if (this.denominator && this.denominatorUnit) {
        return `${this.numerator} ${this.numeratorUnit}/${this.denominator} ${this.denominatorUnit}`;
      }
      return `${this.numerator} ${this.numeratorUnit}`;
    }
  }

  // Entities
  export class Medication {
    constructor(
      public readonly id: string,
      public readonly name: string,
      public readonly genericName: string,
      public readonly form: string,
      public readonly codes: MedicationCode[],
      public readonly ingredients: MedicationIngredient[],
      public readonly status: 'active' | 'inactive' | 'entered-in-error',
      public readonly manufacturer?: string,
      public readonly description?: string,
      public readonly imageUrl?: string
    ) {}

    public isActive(): boolean {
      return this.status === 'active';
    }
  }

  export class MedicationIngredient {
    constructor(
      public readonly id: string,
      public readonly substanceId: string,
      public readonly substanceName: string,
      public readonly strength: StrengthValue,
      public readonly isActive: boolean = true
    ) {}
  }

  export class Prescription {
    constructor(
      public readonly id: string,
      public readonly patientId: string,
      public readonly prescriberId: string,
      public readonly medicationId: string,
      public readonly dosage: Dosage,
      public readonly quantity: number,
      public readonly refills: number,
      public readonly dateWritten: Date,
      public readonly status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown',
      public readonly priority: 'routine' | 'urgent' | 'asap' | 'stat',
      public readonly notes?: string,
      public readonly reasonCode?: string,
      public readonly reasonText?: string,
      public readonly substitutionAllowed: boolean = true,
      public readonly priorAuthorizationNumber?: string,
      public readonly priorAuthorizationStatus?: string,
      public readonly validityPeriod?: { start: Date; end: Date }
    ) {}

    public isActive(): boolean {
      return ['active', 'on-hold'].includes(this.status);
    }

    public canBeDispensed(): boolean {
      return this.isActive() && this.quantity > 0;
    }

    public isExpired(): boolean {
      if (!this.validityPeriod) return false;
      return new Date() > this.validityPeriod.end;
    }
  }

  export class Dispensing {
    constructor(
      public readonly id: string,
      public readonly prescriptionId: string,
      public readonly medicationId: string,
      public readonly patientId: string,
      public readonly dispenserId: string,
      public readonly quantity: number,
      public readonly dispensedAt: Date,
      public readonly status: 'preparation' | 'in-progress' | 'cancelled' | 'on-hold' | 'completed' | 'entered-in-error' | 'stopped',
      public readonly notes?: string,
      public readonly substitutionType?: 'therapeutic' | 'generic' | 'none',
      public readonly substitutionReason?: string,
      public readonly daysSupply?: number,
      public readonly whenHandedOver?: Date,
      public readonly destination?: string,
      public readonly inventoryBatchIds?: string[]
    ) {}

    public isComplete(): boolean {
      return this.status === 'completed';
    }
  }

  export class MedicationAdministration {
    constructor(
      public readonly id: string,
      public readonly patientId: string,
      public readonly medicationId: string,
      public readonly prescriptionId?: string,
      public readonly dispensingId?: string,
      public readonly performerId: string,
      public readonly dosage: Dosage,
      public readonly administeredAt: Date,
      public readonly status: 'in-progress' | 'not-done' | 'on-hold' | 'completed' | 'entered-in-error' | 'stopped' | 'unknown',
      public readonly statusReason?: string,
      public readonly notes?: string,
      public readonly reasonCode?: string,
      public readonly reasonText?: string,
      public readonly device?: string,
      public readonly site?: string,
      public readonly route?: string,
      public readonly verificationStatus?: 'unverified' | 'verified'
    ) {}

    public isComplete(): boolean {
      return this.status === 'completed';
    }

    public isVerified(): boolean {
      return this.verificationStatus === 'verified';
    }
  }

  export class InventoryItem {
    constructor(
      public readonly id: string,
      public readonly medicationId: string,
      public readonly locationId: string,
      public readonly batchNumber: string,
      public readonly lotNumber?: string,
      public readonly expirationDate: Date,
      public readonly quantity: number,
      public readonly unitCost: number,
      public readonly status: 'available' | 'on-hold' | 'reserved' | 'dispensed' | 'expired' | 'destroyed',
      public readonly receivedDate: Date,
      public readonly notes?: string,
      public readonly manufacturer?: string,
      public readonly isControlledSubstance: boolean = false,
      public readonly controlledSubstanceSchedule?: string,
      public readonly storageConditions?: string[]
    ) {}

    public isAvailable(): boolean {
      return this.status === 'available' && this.quantity > 0 && new Date() < this.expirationDate;
    }

    public isExpired(): boolean {
      return new Date() >= this.expirationDate;
    }

    public isControlled(): boolean {
      return this.isControlledSubstance;
    }
  }

  // Domain Events
  export interface DomainEvent {
    eventId: string;
    eventType: string;
    timestamp: Date;
    aggregateId: string;
    aggregateType: string;
    data: any;
  }

  export class PrescriptionCreatedEvent implements DomainEvent {
    public readonly eventId: string;
    public readonly eventType: string = 'PrescriptionCreated';
    public readonly timestamp: Date;
    public readonly aggregateId: string;
    public readonly aggregateType: string = 'Prescription';
    public readonly data: any;

    constructor(prescription: Prescription) {
      this.eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.timestamp = new Date();
      this.aggregateId = prescription.id;
      this.data = prescription;
    }
  }

  export class DispensingCompletedEvent implements DomainEvent {
    public readonly eventId: string;
    public readonly eventType: string = 'DispensingCompleted';
    public readonly timestamp: Date;
    public readonly aggregateId: string;
    public readonly aggregateType: string = 'Dispensing';
    public readonly data: any;

    constructor(dispensing: Dispensing) {
      this.eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.timestamp = new Date();
      this.aggregateId = dispensing.id;
      this.data = dispensing;
    }
  }

  export class MedicationAdministeredEvent implements DomainEvent {
    public readonly eventId: string;
    public readonly eventType: string = 'MedicationAdministered';
    public readonly timestamp: Date;
    public readonly aggregateId: string;
    public readonly aggregateType: string = 'MedicationAdministration';
    public readonly data: any;

    constructor(administration: MedicationAdministration) {
      this.eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.timestamp = new Date();
      this.aggregateId = administration.id;
      this.data = administration;
    }
  }

  export class InventoryUpdatedEvent implements DomainEvent {
    public readonly eventId: string;
    public readonly eventType: string = 'InventoryUpdated';
    public readonly timestamp: Date;
    public readonly aggregateId: string;
    public readonly aggregateType: string = 'InventoryItem';
    public readonly data: any;

    constructor(inventoryItem: InventoryItem, previousQuantity: number) {
      this.eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.timestamp = new Date();
      this.aggregateId = inventoryItem.id;
      this.data = {
        inventoryItem,
        previousQuantity,
        quantityChange: inventoryItem.quantity - previousQuantity
      };
    }
  }

  // Domain Services
  export interface MedicationService {
    findById(id: string): Promise<Medication | null>;
    search(query: any): Promise<Medication[]>;
    create(medication: Medication): Promise<Medication>;
    update(medication: Medication): Promise<Medication>;
    deactivate(id: string): Promise<void>;
  }

  export interface PrescriptionService {
    findById(id: string): Promise<Prescription | null>;
    findByPatientId(patientId: string): Promise<Prescription[]>;
    create(prescription: Prescription): Promise<Prescription>;
    updateStatus(id: string, status: string, reason?: string): Promise<Prescription>;
    cancel(id: string, reason: string): Promise<Prescription>;
  }

  export interface DispensingService {
    findById(id: string): Promise<Dispensing | null>;
    findByPrescriptionId(prescriptionId: string): Promise<Dispensing[]>;
    create(dispensing: Dispensing): Promise<Dispensing>;
    complete(id: string): Promise<Dispensing>;
    cancel(id: string, reason: string): Promise<Dispensing>;
  }

  export interface MedicationAdministrationService {
    findById(id: string): Promise<MedicationAdministration | null>;
    findByPatientId(patientId: string): Promise<MedicationAdministration[]>;
    create(administration: MedicationAdministration): Promise<MedicationAdministration>;
    verify(id: string, verifierId: string): Promise<MedicationAdministration>;
    cancel(id: string, reason: string): Promise<MedicationAdministration>;
  }

  export interface InventoryService {
    findById(id: string): Promise<InventoryItem | null>;
    findByMedicationId(medicationId: string): Promise<InventoryItem[]>;
    findAvailableByMedicationId(medicationId: string): Promise<InventoryItem[]>;
    create(inventoryItem: InventoryItem): Promise<InventoryItem>;
    updateQuantity(id: string, quantity: number): Promise<InventoryItem>;
    reserve(id: string, quantity: number): Promise<InventoryItem>;
    release(id: string, quantity: number): Promise<InventoryItem>;
    dispense(id: string, quantity: number): Promise<InventoryItem>;
  }

  export interface DrugInteractionService {
    checkInteractions(medicationIds: string[]): Promise<DrugInteraction[]>;
    checkInteractionsForPatient(patientId: string, newMedicationId: string): Promise<DrugInteraction[]>;
  }

  export interface DrugInteraction {
    medicationIds: string[];
    medicationNames: string[];
    severity: 'contraindicated' | 'severe' | 'moderate' | 'mild' | 'unknown';
    description: string;
    reference?: string;
    recommendation?: string;
  }

  // Repositories
  export interface MedicationRepository {
    findById(id: string): Promise<Medication | null>;
    findAll(): Promise<Medication[]>;
    search(query: any): Promise<Medication[]>;
    save(medication: Medication): Promise<Medication>;
    update(medication: Medication): Promise<Medication>;
    delete(id: string): Promise<void>;
  }

  export interface PrescriptionRepository {
    findById(id: string): Promise<Prescription | null>;
    findByPatientId(patientId: string): Promise<Prescription[]>;
    findByPrescriberId(prescriberId: string): Promise<Prescription[]>;
    findByMedicationId(medicationId: string): Promise<Prescription[]>;
    findByStatus(status: string): Promise<Prescription[]>;
    save(prescription: Prescription): Promise<Prescription>;
    update(prescription: Prescription): Promise<Prescription>;
    delete(id: string): Promise<void>;
  }

  export interface DispensingRepository {
    findById(id: string): Promise<Dispensing | null>;
    findByPrescriptionId(prescriptionId: string): Promise<Dispensing[]>;
    findByPatientId(patientId: string): Promise<Dispensing[]>;
    findByMedicationId(medicationId: string): Promise<Dispensing[]>;
    findByStatus(status: string): Promise<Dispensing[]>;
    save(dispensing: Dispensing): Promise<Dispensing>;
    update(dispensing: Dispensing): Promise<Dispensing>;
    delete(id: string): Promise<void>;
  }

  export interface MedicationAdministrationRepository {
    findById(id: string): Promise<MedicationAdministration | null>;
    findByPatientId(patientId: string): Promise<MedicationAdministration[]>;
    findByPrescriptionId(prescriptionId: string): Promise<MedicationAdministration[]>;
    findByMedicationId(medicationId: string): Promise<MedicationAdministration[]>;
    findByStatus(status: string): Promise<MedicationAdministration[]>;
    save(administration: MedicationAdministration): Promise<MedicationAdministration>;
    update(administration: MedicationAdministration): Promise<MedicationAdministration>;
    delete(id: string): Promise<void>;
  }

  export interface InventoryRepository {
    findById(id: string): Promise<InventoryItem | null>;
    findByMedicationId(medicationId: string): Promise<InventoryItem[]>;
    findByLocationId(locationId: string): Promise<InventoryItem[]>;
    findByStatus(status: string): Promise<InventoryItem[]>;
    findExpiring(daysThreshold: number): Promise<InventoryItem[]>;
    findLowStock(thresholdPercentage: number): Promise<InventoryItem[]>;
    save(inventoryItem: InventoryItem): Promise<InventoryItem>;
    update(inventoryItem: InventoryItem): Promise<InventoryItem>;
    delete(id: string): Promise<void>;
  }

  export interface EventRepository {
    save(event: DomainEvent): Promise<void>;
    findByAggregateId(aggregateId: string): Promise<DomainEvent[]>;
    findByAggregateType(aggregateType: string): Promise<DomainEvent[]>;
    findByEventType(eventType: string): Promise<DomainEvent[]>;
    findByTimeRange(startTime: Date, endTime: Date): Promise<DomainEvent[]>;
  }
}
