/**
 * FHIR R4 Resource Mapper for Pharmacy Module
 * 
 * This file implements mappers between domain models and FHIR R4 resources
 * to ensure full FHIR compliance for the Pharmacy & Prescriptions module.
 */

import { PharmacyDomain } from './domain-models';

// FHIR R4 Resource Types
export namespace FHIR {
  // Common FHIR Elements
  export interface Reference {
    reference: string;
    type?: string;
    identifier?: Identifier;
    display?: string;
  }

  export interface Identifier {
    system?: string;
    value: string;
    use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
    type?: CodeableConcept;
    period?: Period;
    assigner?: Reference;
  }

  export interface CodeableConcept {
    coding?: Coding[];
    text?: string;
  }

  export interface Coding {
    system?: string;
    version?: string;
    code?: string;
    display?: string;
    userSelected?: boolean;
  }

  export interface Quantity {
    value?: number;
    comparator?: '<' | '<=' | '>=' | '>';
    unit?: string;
    system?: string;
    code?: string;
  }

  export interface Period {
    start?: string;
    end?: string;
  }

  export interface Ratio {
    numerator?: Quantity;
    denominator?: Quantity;
  }

  export interface Annotation {
    authorReference?: Reference;
    authorString?: string;
    time?: string;
    text: string;
  }

  export interface Dosage {
    sequence?: number;
    text?: string;
    additionalInstruction?: CodeableConcept[];
    patientInstruction?: string;
    timing?: Timing;
    asNeededBoolean?: boolean;
    asNeededCodeableConcept?: CodeableConcept;
    site?: CodeableConcept;
    route?: CodeableConcept;
    method?: CodeableConcept;
    doseAndRate?: DoseAndRate[];
    maxDosePerPeriod?: Ratio;
    maxDosePerAdministration?: Quantity;
    maxDosePerLifetime?: Quantity;
  }

  export interface DoseAndRate {
    type?: CodeableConcept;
    doseRange?: Range;
    doseQuantity?: Quantity;
    rateRatio?: Ratio;
    rateRange?: Range;
    rateQuantity?: Quantity;
  }

  export interface Range {
    low?: Quantity;
    high?: Quantity;
  }

  export interface Timing {
    event?: string[];
    repeat?: TimingRepeat;
    code?: CodeableConcept;
  }

  export interface TimingRepeat {
    boundsDuration?: Quantity;
    boundsRange?: Range;
    boundsPeriod?: Period;
    count?: number;
    countMax?: number;
    duration?: number;
    durationMax?: number;
    durationUnit?: 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a';
    frequency?: number;
    frequencyMax?: number;
    period?: number;
    periodMax?: number;
    periodUnit?: 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a';
    dayOfWeek?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
    timeOfDay?: string[];
    when?: string[];
    offset?: number;
  }

  // FHIR Resources
  export interface Medication {
    resourceType: 'Medication';
    id?: string;
    meta?: Meta;
    identifier?: Identifier[];
    code?: CodeableConcept;
    status?: 'active' | 'inactive' | 'entered-in-error';
    manufacturer?: Reference;
    form?: CodeableConcept;
    amount?: Ratio;
    ingredient?: MedicationIngredient[];
    batch?: MedicationBatch;
  }

  export interface MedicationIngredient {
    itemCodeableConcept?: CodeableConcept;
    itemReference?: Reference;
    isActive?: boolean;
    strength?: Ratio;
  }

  export interface MedicationBatch {
    lotNumber?: string;
    expirationDate?: string;
  }

  export interface MedicationRequest {
    resourceType: 'MedicationRequest';
    id?: string;
    meta?: Meta;
    identifier?: Identifier[];
    status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown';
    statusReason?: CodeableConcept;
    intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
    category?: CodeableConcept[];
    priority?: 'routine' | 'urgent' | 'asap' | 'stat';
    doNotPerform?: boolean;
    reportedBoolean?: boolean;
    reportedReference?: Reference;
    medicationCodeableConcept?: CodeableConcept;
    medicationReference?: Reference;
    subject: Reference;
    encounter?: Reference;
    supportingInformation?: Reference[];
    authoredOn?: string;
    requester?: Reference;
    performer?: Reference;
    performerType?: CodeableConcept;
    recorder?: Reference;
    reasonCode?: CodeableConcept[];
    reasonReference?: Reference[];
    instantiatesCanonical?: string[];
    instantiatesUri?: string[];
    basedOn?: Reference[];
    groupIdentifier?: Identifier;
    courseOfTherapyType?: CodeableConcept;
    insurance?: Reference[];
    note?: Annotation[];
    dosageInstruction?: Dosage[];
    dispenseRequest?: MedicationRequestDispenseRequest;
    substitution?: MedicationRequestSubstitution;
    priorPrescription?: Reference;
    detectedIssue?: Reference[];
    eventHistory?: Reference[];
  }

  export interface MedicationRequestDispenseRequest {
    initialFill?: MedicationRequestInitialFill;
    dispenseInterval?: Quantity;
    validityPeriod?: Period;
    numberOfRepeatsAllowed?: number;
    quantity?: Quantity;
    expectedSupplyDuration?: Quantity;
    performer?: Reference;
  }

  export interface MedicationRequestInitialFill {
    quantity?: Quantity;
    duration?: Quantity;
  }

  export interface MedicationRequestSubstitution {
    allowedBoolean?: boolean;
    allowedCodeableConcept?: CodeableConcept;
    reason?: CodeableConcept;
  }

  export interface MedicationDispense {
    resourceType: 'MedicationDispense';
    id?: string;
    meta?: Meta;
    identifier?: Identifier[];
    partOf?: Reference[];
    status: 'preparation' | 'in-progress' | 'cancelled' | 'on-hold' | 'completed' | 'entered-in-error' | 'stopped' | 'unknown' | 'declined';
    statusReasonCodeableConcept?: CodeableConcept;
    statusReasonReference?: Reference;
    category?: CodeableConcept;
    medicationCodeableConcept?: CodeableConcept;
    medicationReference?: Reference;
    subject: Reference;
    context?: Reference;
    supportingInformation?: Reference[];
    performer?: MedicationDispensePerformer[];
    location?: Reference;
    authorizingPrescription?: Reference[];
    type?: CodeableConcept;
    quantity?: Quantity;
    daysSupply?: Quantity;
    whenPrepared?: string;
    whenHandedOver?: string;
    destination?: Reference;
    receiver?: Reference[];
    note?: Annotation[];
    dosageInstruction?: Dosage[];
    substitution?: MedicationDispenseSubstitution;
    detectedIssue?: Reference[];
    eventHistory?: Reference[];
  }

  export interface MedicationDispensePerformer {
    function?: CodeableConcept;
    actor: Reference;
  }

  export interface MedicationDispenseSubstitution {
    wasSubstituted: boolean;
    type?: CodeableConcept;
    reason?: CodeableConcept[];
    responsibleParty?: Reference[];
  }

  export interface MedicationAdministration {
    resourceType: 'MedicationAdministration';
    id?: string;
    meta?: Meta;
    identifier?: Identifier[];
    instantiates?: string[];
    partOf?: Reference[];
    status: 'in-progress' | 'not-done' | 'on-hold' | 'completed' | 'entered-in-error' | 'stopped' | 'unknown';
    statusReason?: CodeableConcept[];
    category?: CodeableConcept;
    medicationCodeableConcept?: CodeableConcept;
    medicationReference?: Reference;
    subject: Reference;
    context?: Reference;
    supportingInformation?: Reference[];
    effectiveDateTime?: string;
    effectivePeriod?: Period;
    performer?: MedicationAdministrationPerformer[];
    reasonCode?: CodeableConcept[];
    reasonReference?: Reference[];
    request?: Reference;
    device?: Reference[];
    note?: Annotation[];
    dosage?: MedicationAdministrationDosage;
    eventHistory?: Reference[];
  }

  export interface MedicationAdministrationPerformer {
    function?: CodeableConcept;
    actor: Reference;
  }

  export interface MedicationAdministrationDosage {
    text?: string;
    site?: CodeableConcept;
    route?: CodeableConcept;
    method?: CodeableConcept;
    dose?: Quantity;
    rateRatio?: Ratio;
    rateQuantity?: Quantity;
  }

  export interface MedicationStatement {
    resourceType: 'MedicationStatement';
    id?: string;
    meta?: Meta;
    identifier?: Identifier[];
    basedOn?: Reference[];
    partOf?: Reference[];
    status: 'active' | 'completed' | 'entered-in-error' | 'intended' | 'stopped' | 'on-hold' | 'unknown' | 'not-taken';
    statusReason?: CodeableConcept[];
    category?: CodeableConcept;
    medicationCodeableConcept?: CodeableConcept;
    medicationReference?: Reference;
    subject: Reference;
    context?: Reference;
    effectiveDateTime?: string;
    effectivePeriod?: Period;
    dateAsserted?: string;
    informationSource?: Reference;
    derivedFrom?: Reference[];
    reasonCode?: CodeableConcept[];
    reasonReference?: Reference[];
    note?: Annotation[];
    dosage?: Dosage[];
  }

  export interface Meta {
    versionId?: string;
    lastUpdated?: string;
    source?: string;
    profile?: string[];
    security?: Coding[];
    tag?: Coding[];
  }
}

// Mapper Functions
export class FHIRMapper {
  // Medication Mappers
  static toFHIRMedication(medication: PharmacyDomain.Medication): FHIR.Medication {
    return {
      resourceType: 'Medication',
      id: medication.id,
      status: medication.status,
      code: {
        coding: medication.codes.map(code => ({
          system: code.system,
          code: code.code,
          display: code.display
        })),
        text: medication.name
      },
      manufacturer: medication.manufacturer ? {
        display: medication.manufacturer
      } : undefined,
      form: {
        text: medication.form
      },
      ingredient: medication.ingredients.map(ingredient => ({
        itemCodeableConcept: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: ingredient.substanceId,
            display: ingredient.substanceName
          }],
          text: ingredient.substanceName
        },
        isActive: ingredient.isActive,
        strength: {
          numerator: {
            value: ingredient.strength.numerator,
            unit: ingredient.strength.numeratorUnit
          },
          denominator: ingredient.strength.denominator ? {
            value: ingredient.strength.denominator,
            unit: ingredient.strength.denominatorUnit
          } : undefined
        }
      }))
    };
  }

  static fromFHIRMedication(fhirMedication: FHIR.Medication): PharmacyDomain.Medication {
    const codes: PharmacyDomain.MedicationCode[] = [];
    if (fhirMedication.code && fhirMedication.code.coding) {
      fhirMedication.code.coding.forEach(coding => {
        if (coding.system && coding.code) {
          codes.push(new PharmacyDomain.MedicationCode(
            coding.system,
            coding.code,
            coding.display || ''
          ));
        }
      });
    }

    const ingredients: PharmacyDomain.MedicationIngredient[] = [];
    if (fhirMedication.ingredient) {
      fhirMedication.ingredient.forEach(ingredient => {
        const substanceId = ingredient.itemCodeableConcept?.coding?.[0]?.code || '';
        const substanceName = ingredient.itemCodeableConcept?.coding?.[0]?.display || 
                             ingredient.itemCodeableConcept?.text || '';
        
        if (substanceId && substanceName && ingredient.strength) {
          const numerator = ingredient.strength.numerator?.value || 0;
          const numeratorUnit = ingredient.strength.numerator?.unit || '';
          const denominator = ingredient.strength.denominator?.value;
          const denominatorUnit = ingredient.strength.denominator?.unit;
          
          ingredients.push(new PharmacyDomain.MedicationIngredient(
            `${fhirMedication.id}-ingredient-${ingredients.length + 1}`,
            substanceId,
            substanceName,
            new PharmacyDomain.StrengthValue(
              numerator,
              numeratorUnit,
              denominator,
              denominatorUnit
            ),
            ingredient.isActive
          ));
        }
      });
    }

    return new PharmacyDomain.Medication(
      fhirMedication.id || '',
      fhirMedication.code?.text || '',
      fhirMedication.code?.text || '', // Using the same for generic name as a fallback
      fhirMedication.form?.text || '',
      codes,
      ingredients,
      fhirMedication.status || 'active',
      fhirMedication.manufacturer?.display,
      undefined,
      undefined
    );
  }

  // Prescription (MedicationRequest) Mappers
  static toFHIRMedicationRequest(prescription: PharmacyDomain.Prescription): FHIR.MedicationRequest {
    return {
      resourceType: 'MedicationRequest',
      id: prescription.id,
      status: prescription.status,
      intent: 'order',
      priority: prescription.priority,
      medicationReference: {
        reference: `Medication/${prescription.medicationId}`
      },
      subject: {
        reference: `Patient/${prescription.patientId}`
      },
      authoredOn: prescription.dateWritten.toISOString(),
      requester: {
        reference: `Practitioner/${prescription.prescriberId}`
      },
      reasonCode: prescription.reasonCode ? [{
        text: prescription.reasonText || '',
        coding: [{
          code: prescription.reasonCode
        }]
      }] : undefined,
      note: prescription.notes ? [{
        text: prescription.notes
      }] : undefined,
      dosageInstruction: [{
        text: prescription.dosage.toString(),
        doseAndRate: [{
          doseQuantity: {
            value: prescription.dosage.value,
            unit: prescription.dosage.unit
          }
        }],
        route: {
          text: prescription.dosage.route
        },
        timing: {
          code: {
            text: prescription.dosage.frequency
          }
        }
      }],
      dispenseRequest: {
        numberOfRepeatsAllowed: prescription.refills,
        quantity: {
          value: prescription.quantity,
          system: 'http://unitsofmeasure.org',
          code: 'unit'
        },
        validityPeriod: prescription.validityPeriod ? {
          start: prescription.validityPeriod.start.toISOString(),
          end: prescription.validityPeriod.end.toISOString()
        } : undefined,
      },
      substitution: {
        allowedBoolean: prescription.substitutionAllowed
      }
    };
  }

  static fromFHIRMedicationRequest(fhirMedicationRequest: FHIR.MedicationRequest): PharmacyDomain.Prescription {
    // Extract medication ID from reference
    const medicationId = fhirMedicationRequest.medicationReference?.reference?.split('/')[1] || '';
    
    // Extract patient ID from reference
    const patientId = fhirMedicationRequest.subject.reference.split('/')[1] || '';
    
    // Extract prescriber ID from reference
    const prescriberId = fhirMedicationRequest.requester?.reference?.split('/')[1] || '';
    
    // Parse dosage information
    const dosageInstruction = fhirMedicationRequest.dosageInstruction?.[0];
    const dosageValue = dosageInstruction?.doseAndRate?.[0]?.doseQuantity?.value || 0;
    const dosageUnit = dosageInstruction?.doseAndRate?.[0]?.doseQuantity?.unit || '';
    const dosageRoute = dosageInstruction?.route?.text || '';
    const dosageFrequency = dosageInstruction?.timing?.code?.text || '';
    
    // Create dosage value object
    const dosage = new PharmacyDomain.Dosage(
      dosageValue,
      dosageUnit,
      dosageRoute,
      dosageFrequency
    );
    
    // Extract quantity
    const quantity = fhirMedicationRequest.dispenseRequest?.quantity?.value || 0;
    
    // Extract refills
    const refills = fhirMedicationRequest.dispenseRequest?.numberOfRepeatsAllowed || 0;
    
    // Parse date written
    const dateWritten = fhirMedicationRequest.authoredOn ? 
      new Date(fhirMedicationRequest.authoredOn) : new Date();
    
    // Extract validity period
    let validityPeriod: { start: Date; end: Date } | undefined;
    if (fhirMedicationRequest.dispenseRequest?.validityPeriod) {
      const start = fhirMedicationRequest.dispenseRequest.validityPeriod.start ? 
        new Date(fhirMedicationRequest.dispenseRequest.validityPeriod.start) : new Date();
      const end = fhirMedicationRequest.dispenseRequest.validityPeriod.end ? 
        new Date(fhirMedicationRequest.dispenseRequest.validityPeriod.end) : new Date();
      validityPeriod = { start, end };
    }
    
    // Extract reason information
    const reasonCode = fhirMedicationRequest.reasonCode?.[0]?.coding?.[0]?.code;
    const reasonText = fhirMedicationRequest.reasonCode?.[0]?.text;
    
    // Extract notes
    const notes = fhirMedicationRequest.note?.[0]?.text;
    
    // Extract substitution allowed
    const substitutionAllowed = fhirMedicationRequest.substitution?.allowedBoolean !== false;
    
    return new PharmacyDomain.Prescription(
      fhirMedicationRequest.id || '',
      patientId,
      prescriberId,
      medicationId,
      dosage,
      quantity,
      refills,
      dateWritten,
      fhirMedicationRequest.status,
      fhirMedicationRequest.priority || 'routine',
      notes,
      reasonCode,
      reasonText,
      substitutionAllowed,
      undefined,
      undefined,
      validityPeriod
    );
  }

  // Dispensing (MedicationDispense) Mappers
  static toFHIRMedicationDispense(dispensing: PharmacyDomain.Dispensing): FHIR.MedicationDispense {
    return {
      resourceType: 'MedicationDispense',
      id: dispensing.id,
      status: dispensing.status,
      medicationReference: {
        reference: `Medication/${dispensing.medicationId}`
      },
      subject: {
        reference: `Patient/${dispensing.patientId}`
      },
      performer: [{
        actor: {
          reference: `Practitioner/${dispensing.dispenserId}`
        }
      }],
      authorizingPrescription: [{
        reference: `MedicationRequest/${dispensing.prescriptionId}`
      }],
      quantity: {
        value: dispensing.quantity,
        system: 'http://unitsofmeasure.org',
        code: 'unit'
      },
      whenPrepared: dispensing.dispensedAt.toISOString(),
      whenHandedOver: dispensing.whenHandedOver?.toISOString(),
      destination: dispensing.destination ? {
        reference: `Location/${dispensing.destination}`
      } : undefined,
      note: dispensing.notes ? [{
        text: dispensing.notes
      }] : undefined,
      daysSupply: dispensing.daysSupply ? {
        value: dispensing.daysSupply,
        unit: 'days'
      } : undefined,
      substitution: dispensing.substitutionType ? {
        wasSubstituted: true,
        type: {
          coding: [{
            code: dispensing.substitutionType,
            display: dispensing.substitutionType === 'therapeutic' ? 
              'Therapeutic Substitution' : 'Generic Substitution'
          }]
        },
        reason: dispensing.substitutionReason ? [{
          text: dispensing.substitutionReason
        }] : undefined
      } : {
        wasSubstituted: false
      }
    };
  }

  static fromFHIRMedicationDispense(fhirMedicationDispense: FHIR.MedicationDispense): PharmacyDomain.Dispensing {
    // Extract medication ID from reference
    const medicationId = fhirMedicationDispense.medicationReference?.reference?.split('/')[1] || '';
    
    // Extract patient ID from reference
    const patientId = fhirMedicationDispense.subject.reference.split('/')[1] || '';
    
    // Extract dispenser ID from reference
    const dispenserId = fhirMedicationDispense.performer?.[0]?.actor.reference.split('/')[1] || '';
    
    // Extract prescription ID from reference
    const prescriptionId = fhirMedicationDispense.authorizingPrescription?.[0]?.reference.split('/')[1] || '';
    
    // Extract quantity
    const quantity = fhirMedicationDispense.quantity?.value || 0;
    
    // Parse dispensed date
    const dispensedAt = fhirMedicationDispense.whenPrepared ? 
      new Date(fhirMedicationDispense.whenPrepared) : new Date();
    
    // Parse handed over date
    const whenHandedOver = fhirMedicationDispense.whenHandedOver ? 
      new Date(fhirMedicationDispense.whenHandedOver) : undefined;
    
    // Extract days supply
    const daysSupply = fhirMedicationDispense.daysSupply?.value;
    
    // Extract destination
    const destination = fhirMedicationDispense.destination?.reference?.split('/')[1];
    
    // Extract notes
    const notes = fhirMedicationDispense.note?.[0]?.text;
    
    // Extract substitution information
    let substitutionType: 'therapeutic' | 'generic' | 'none' = 'none';
    let substitutionReason: string | undefined;
    
    if (fhirMedicationDispense.substitution?.wasSubstituted) {
      const typeCode = fhirMedicationDispense.substitution.type?.coding?.[0]?.code;
      substitutionType = typeCode === 'therapeutic' ? 'therapeutic' : 'generic';
      substitutionReason = fhirMedicationDispense.substitution.reason?.[0]?.text;
    }
    
    return new PharmacyDomain.Dispensing(
      fhirMedicationDispense.id || '',
      prescriptionId,
      medicationId,
      patientId,
      dispenserId,
      quantity,
      dispensedAt,
      fhirMedicationDispense.status as any,
      notes,
      substitutionType,
      substitutionReason,
      daysSupply,
      whenHandedOver,
      destination,
      undefined
    );
  }

  // MedicationAdministration Mappers
  static toFHIRMedicationAdministration(administration: PharmacyDomain.MedicationAdministration): FHIR.MedicationAdministration {
    return {
      resourceType: 'MedicationAdministration',
      id: administration.id,
      status: administration.status,
      medicationReference: {
        reference: `Medication/${administration.medicationId}`
      },
      subject: {
        reference: `Patient/${administration.patientId}`
      },
      performer: [{
        actor: {
          reference: `Practitioner/${administration.performerId}`
        }
      }],
      request: administration.prescriptionId ? {
        reference: `MedicationRequest/${administration.prescriptionId}`
      } : undefined,
      effectiveDateTime: administration.administeredAt.toISOString(),
      reasonCode: administration.reasonCode ? [{
        text: administration.reasonText || '',
        coding: [{
          code: administration.reasonCode
        }]
      }] : undefined,
      note: administration.notes ? [{
        text: administration.notes
      }] : undefined,
      dosage: {
        text: administration.dosage.toString(),
        dose: {
          value: administration.dosage.value,
          unit: administration.dosage.unit
        },
        route: {
          text: administration.dosage.route
        },
        method: administration.route ? {
          text: administration.route
        } : undefined,
        site: administration.site ? {
          text: administration.site
        } : undefined
      },
      device: administration.device ? [{
        reference: `Device/${administration.device}`
      }] : undefined,
      statusReason: administration.statusReason ? [{
        text: administration.statusReason
      }] : undefined
    };
  }

  static fromFHIRMedicationAdministration(fhirMedicationAdministration: FHIR.MedicationAdministration): PharmacyDomain.MedicationAdministration {
    // Extract medication ID from reference
    const medicationId = fhirMedicationAdministration.medicationReference?.reference?.split('/')[1] || '';
    
    // Extract patient ID from reference
    const patientId = fhirMedicationAdministration.subject.reference.split('/')[1] || '';
    
    // Extract performer ID from reference
    const performerId = fhirMedicationAdministration.performer?.[0]?.actor.reference.split('/')[1] || '';
    
    // Extract prescription ID from reference
    const prescriptionId = fhirMedicationAdministration.request?.reference?.split('/')[1];
    
    // Parse administered date
    const administeredAt = fhirMedicationAdministration.effectiveDateTime ? 
      new Date(fhirMedicationAdministration.effectiveDateTime) : new Date();
    
    // Extract dosage information
    const dosageValue = fhirMedicationAdministration.dosage?.dose?.value || 0;
    const dosageUnit = fhirMedicationAdministration.dosage?.dose?.unit || '';
    const dosageRoute = fhirMedicationAdministration.dosage?.route?.text || '';
    
    // Create dosage value object
    const dosage = new PharmacyDomain.Dosage(
      dosageValue,
      dosageUnit,
      dosageRoute,
      '' // Frequency not typically included in administration
    );
    
    // Extract reason information
    const reasonCode = fhirMedicationAdministration.reasonCode?.[0]?.coding?.[0]?.code;
    const reasonText = fhirMedicationAdministration.reasonCode?.[0]?.text;
    
    // Extract notes
    const notes = fhirMedicationAdministration.note?.[0]?.text;
    
    // Extract status reason
    const statusReason = fhirMedicationAdministration.statusReason?.[0]?.text;
    
    // Extract device
    const device = fhirMedicationAdministration.device?.[0]?.reference?.split('/')[1];
    
    // Extract site and route
    const site = fhirMedicationAdministration.dosage?.site?.text;
    const route = fhirMedicationAdministration.dosage?.method?.text;
    
    return new PharmacyDomain.MedicationAdministration(
      fhirMedicationAdministration.id || '',
      patientId,
      medicationId,
      prescriptionId,
      undefined, // dispensingId not available in FHIR
      performerId,
      dosage,
      administeredAt,
      fhirMedicationAdministration.status,
      statusReason,
      notes,
      reasonCode,
      reasonText,
      device,
      site,
      route,
      'unverified' // Verification status not available in FHIR
    );
  }
}
