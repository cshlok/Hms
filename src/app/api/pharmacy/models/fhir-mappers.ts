/**
 * FHIR Mappers for Pharmacy Module
 * 
 * This file contains mappers between domain models and FHIR resources
 * for the pharmacy module.
 */

import { 
  Medication,
  MedicationOrder,
  MedicationDispense,
  MedicationAdministration,
  MedicationReconciliation
} from './domain-models';

// Define FHIR resource interfaces
export interface FHIRMedication {
  resourceType: 'Medication';
  id: string;
  meta: {
    versionId: string;
    lastUpdated: string;
  };
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  status: 'active' | 'inactive' | 'entered-in-error';
  manufacturer?: {
    reference: string;
    display: string;
  };
  form?: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  amount?: {
    numerator: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
    denominator: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
  };
  ingredient?: Array<{
    itemCodeableConcept: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
    strength?: {
      numerator: {
        value: number;
        unit: string;
        system: string;
        code: string;
      };
      denominator: {
        value: number;
        unit: string;
        system: string;
        code: string;
      };
    };
  }>;
}

export interface FHIRMedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;
  meta: {
    versionId: string;
    lastUpdated: string;
  };
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  medicationReference: {
    reference: string;
    display: string;
  };
  subject: {
    reference: string;
    display: string;
  };
  encounter?: {
    reference: string;
  };
  authoredOn: string;
  requester: {
    reference: string;
    display: string;
  };
  recorder?: {
    reference: string;
    display: string;
  };
  reasonCode?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  }>;
  dosageInstruction?: Array<{
    text?: string;
    timing?: {
      repeat?: {
        frequency?: number;
        period?: number;
        periodUnit?: 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a';
      };
      code?: {
        coding: Array<{
          system: string;
          code: string;
          display: string;
        }>;
        text: string;
      };
    };
    route?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
    doseAndRate?: Array<{
      type?: {
        coding: Array<{
          system: string;
          code: string;
          display: string;
        }>;
        text: string;
      };
      doseQuantity?: {
        value: number;
        unit: string;
        system: string;
        code: string;
      };
    }>;
  }>;
  dispenseRequest?: {
    validityPeriod?: {
      start: string;
      end: string;
    };
    numberOfRepeatsAllowed?: number;
    quantity?: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
    expectedSupplyDuration?: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
  };
  substitution?: {
    allowedBoolean: boolean;
    reason?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
  };
}

export interface FHIRMedicationDispense {
  resourceType: 'MedicationDispense';
  id: string;
  meta: {
    versionId: string;
    lastUpdated: string;
  };
  status: 'preparation' | 'in-progress' | 'cancelled' | 'on-hold' | 'completed' | 'entered-in-error' | 'stopped' | 'declined' | 'unknown';
  medicationReference: {
    reference: string;
    display: string;
  };
  subject: {
    reference: string;
    display: string;
  };
  performer?: Array<{
    actor: {
      reference: string;
      display: string;
    };
  }>;
  authorizingPrescription?: Array<{
    reference: string;
  }>;
  type?: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  quantity?: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
  daysSupply?: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
  whenPrepared?: string;
  whenHandedOver?: string;
  destination?: {
    reference: string;
    display: string;
  };
  note?: Array<{
    text: string;
  }>;
  dosageInstruction?: Array<{
    text?: string;
    timing?: {
      repeat?: {
        frequency?: number;
        period?: number;
        periodUnit?: 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a';
      };
      code?: {
        coding: Array<{
          system: string;
          code: string;
          display: string;
        }>;
        text: string;
      };
    };
    route?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
    doseAndRate?: Array<{
      type?: {
        coding: Array<{
          system: string;
          code: string;
          display: string;
        }>;
        text: string;
      };
      doseQuantity?: {
        value: number;
        unit: string;
        system: string;
        code: string;
      };
    }>;
  }>;
}

export interface FHIRMedicationAdministration {
  resourceType: 'MedicationAdministration';
  id: string;
  meta: {
    versionId: string;
    lastUpdated: string;
  };
  status: 'in-progress' | 'not-done' | 'on-hold' | 'completed' | 'entered-in-error' | 'stopped' | 'unknown';
  medicationReference: {
    reference: string;
    display: string;
  };
  subject: {
    reference: string;
    display: string;
  };
  context?: {
    reference: string;
  };
  effectiveDateTime: string;
  performer?: Array<{
    actor: {
      reference: string;
      display: string;
    };
  }>;
  reasonCode?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  }>;
  request?: {
    reference: string;
  };
  dosage?: {
    text?: string;
    site?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
    route?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
    dose?: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
  };
  note?: Array<{
    text: string;
  }>;
}

// Mapper functions for converting between domain models and FHIR resources

/**
 * Convert domain Medication to FHIR Medication
 * @param medication Domain medication model
 * @returns FHIR Medication resource
 */
export function medicationToFHIR(medication: Medication): FHIRMedication {
  return {
    resourceType: 'Medication',
    id: medication.id,
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString()
    },
    status: 'active',
    code: {
      coding: [
        {
          system: 'http://hl7.org/fhir/sid/ndc',
          code: medication.ndc,
          display: medication.name
        }
      ],
      text: medication.name
    },
    manufacturer: medication.manufacturer ? {
      reference: `Organization/${medication.manufacturer.replace(/\s+/g, '')}`,
      display: medication.manufacturer
    } : undefined,
    form: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-orderableDrugForm',
          code: medication.form.toLowerCase().replace(/\s+/g, '-'),
          display: medication.form
        }
      ],
      text: medication.form
    },
    amount: {
      numerator: {
        value: medication.strength,
        unit: medication.unit,
        system: 'http://unitsofmeasure.org',
        code: medication.unit
      },
      denominator: {
        value: 1,
        unit: 'unit',
        system: 'http://terminology.hl7.org/CodeSystem/v3-orderableDrugForm',
        code: 'unit'
      }
    }
  };
}

/**
 * Convert FHIR Medication to domain Medication
 * @param fhirMedication FHIR Medication resource
 * @returns Domain medication model
 */
export function fhirToMedication(fhirMedication: FHIRMedication): Medication {
  const ndcCoding = fhirMedication.code.coding.find(c => c.system === 'http://hl7.org/fhir/sid/ndc');
  const formCoding = fhirMedication.form?.coding.find(c => c.system === 'http://terminology.hl7.org/CodeSystem/v3-orderableDrugForm');
  
  return {
    id: fhirMedication.id,
    name: fhirMedication.code.text,
    brandName: fhirMedication.code.text, // Assuming brand name is the same as display name if not specified
    ndc: ndcCoding?.code || '',
    form: formCoding?.display || '',
    strength: fhirMedication.amount?.numerator.value || 0,
    unit: fhirMedication.amount?.numerator.unit || '',
    isControlled: false, // Default value, would need additional logic to determine
    isHighAlert: false, // Default value, would need additional logic to determine
    manufacturer: fhirMedication.manufacturer?.display
  };
}

/**
 * Convert domain MedicationOrder to FHIR MedicationRequest
 * @param order Domain medication order
 * @param patientName Patient display name
 * @param providerName Provider display name
 * @returns FHIR MedicationRequest resource
 */
export function medicationOrderToFHIR(
  order: MedicationOrder, 
  patientName: string, 
  providerName: string,
  medicationName: string
): FHIRMedicationRequest {
  // Parse dosage information from the domain model
  const dosageInfo = typeof order.dosage === 'object' ? order.dosage : {};
  
  return {
    resourceType: 'MedicationRequest',
    id: order.id,
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString()
    },
    status: order.status,
    intent: 'order',
    medicationReference: {
      reference: `Medication/${order.medicationId}`,
      display: medicationName
    },
    subject: {
      reference: `Patient/${order.patientId}`,
      display: patientName
    },
    authoredOn: order.orderDate.toISOString(),
    requester: {
      reference: `Practitioner/${order.providerId}`,
      display: providerName
    },
    dosageInstruction: [
      {
        text: dosageInfo.instructions as string || '',
        timing: {
          repeat: {
            frequency: dosageInfo.frequency as number || 1,
            period: dosageInfo.period as number || 1,
            periodUnit: dosageInfo.periodUnit as 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a' || 'd'
          },
          code: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-TimingEvent',
                code: order.frequency,
                display: order.frequency
              }
            ],
            text: order.frequency
          }
        },
        route: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration',
              code: order.route.toLowerCase().replace(/\s+/g, '-'),
              display: order.route
            }
          ],
          text: order.route
        },
        doseAndRate: [
          {
            doseQuantity: {
              value: dosageInfo.value as number || 1,
              unit: dosageInfo.unit as string || '',
              system: 'http://unitsofmeasure.org',
              code: dosageInfo.unit as string || ''
            }
          }
        ]
      }
    ],
    dispenseRequest: {
      validityPeriod: {
        start: order.startDate?.toISOString() || order.orderDate.toISOString(),
        end: order.endDate?.toISOString() || new Date(order.orderDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      numberOfRepeatsAllowed: dosageInfo.refills as number || 0,
      quantity: {
        value: dosageInfo.quantity as number || 1,
        unit: dosageInfo.unit as string || '',
        system: 'http://unitsofmeasure.org',
        code: dosageInfo.unit as string || ''
      },
      expectedSupplyDuration: {
        value: parseInt(order.duration, 10) || 30,
        unit: 'days',
        system: 'http://unitsofmeasure.org',
        code: 'd'
      }
    },
    substitution: {
      allowedBoolean: dosageInfo.allowSubstitution as boolean || true
    }
  };
}

/**
 * Convert FHIR MedicationRequest to domain MedicationOrder
 * @param fhirRequest FHIR MedicationRequest resource
 * @returns Domain medication order
 */
export function fhirToMedicationOrder(fhirRequest: FHIRMedicationRequest): MedicationOrder {
  // Extract medication ID from reference
  const medicationId = fhirRequest.medicationReference.reference.split('/')[1];
  
  // Extract patient ID from reference
  const patientId = fhirRequest.subject.reference.split('/')[1];
  
  // Extract provider ID from reference
  const providerId = fhirRequest.requester.reference.split('/')[1];
  
  // Extract dosage information
  const dosageInstruction = fhirRequest.dosageInstruction?.[0];
  const dispenseRequest = fhirRequest.dispenseRequest;
  
  // Build dosage object
  const dosage: Record<string, unknown> = {};
  
  if (dosageInstruction) {
    dosage.instructions = dosageInstruction.text;
    
    if (dosageInstruction.timing?.repeat) {
      dosage.frequency = dosageInstruction.timing.repeat.frequency;
      dosage.period = dosageInstruction.timing.repeat.period;
      dosage.periodUnit = dosageInstruction.timing.repeat.periodUnit;
    }
    
    if (dosageInstruction.doseAndRate?.[0]?.doseQuantity) {
      dosage.value = dosageInstruction.doseAndRate[0].doseQuantity.value;
      dosage.unit = dosageInstruction.doseAndRate[0].doseQuantity.unit;
    }
    
    if (dosageInstruction.route) {
      dosage.route = dosageInstruction.route.text;
    }
  }
  
  if (dispenseRequest) {
    if (dispenseRequest.numberOfRepeatsAllowed !== undefined) {
      dosage.refills = dispenseRequest.numberOfRepeatsAllowed;
    }
    
    if (dispenseRequest.quantity) {
      dosage.quantity = dispenseRequest.quantity.value;
    }
  }
  
  if (fhirRequest.substitution) {
    dosage.allowSubstitution = fhirRequest.substitution.allowedBoolean;
  }
  
  // Parse dates
  const orderDate = new Date(fhirRequest.authoredOn);
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  
  if (dispenseRequest?.validityPeriod) {
    startDate = new Date(dispenseRequest.validityPeriod.start);
    endDate = new Date(dispenseRequest.validityPeriod.end);
  }
  
  // Determine duration
  let duration = '30 days'; // Default
  if (dispenseRequest?.expectedSupplyDuration) {
    duration = `${dispenseRequest.expectedSupplyDuration.value} ${dispenseRequest.expectedSupplyDuration.unit}`;
  }
  
  // Extract frequency
  const frequency = dosageInstruction?.timing?.code?.text || 'daily';
  
  // Extract route
  const route = dosageInstruction?.route?.text || 'oral';
  
  return {
    id: fhirRequest.id,
    patientId,
    providerId,
    medicationId,
    status: fhirRequest.status,
    orderDate,
    dosage,
    frequency,
    route,
    duration,
    startDate,
    endDate,
    indication: fhirRequest.reasonCode?.[0]?.text
  };
}

// Additional mapper functions would be implemented similarly
// for MedicationDispense, MedicationAdministration, etc.

/**
 * Convert domain MedicationDispense to FHIR MedicationDispense
 * @param dispense Domain medication dispense
 * @param patientName Patient display name
 * @param dispenserName Dispenser display name
 * @param medicationName Medication display name
 * @returns FHIR MedicationDispense resource
 */
export function medicationDispenseToFHIR(
  dispense: MedicationDispense,
  patientName: string,
  dispenserName: string,
  medicationName: string
): FHIRMedicationDispense {
  return {
    resourceType: 'MedicationDispense',
    id: dispense.id,
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString()
    },
    status: dispense.status,
    medicationReference: {
      reference: `Medication/${dispense.medicationId}`,
      display: medicationName
    },
    subject: {
      reference: `Patient/${dispense.patientId}`,
      display: patientName
    },
    performer: [
      {
        actor: {
          reference: `Practitioner/${dispense.dispenserId}`,
          display: dispenserName
        }
      }
    ],
    authorizingPrescription: [
      {
        reference: `MedicationRequest/${dispense.prescriptionId}`
      }
    ],
    quantity: {
      value: dispense.quantity,
      unit: 'unit',
      system: 'http://unitsofmeasure.org',
      code: 'unit'
    },
    daysSupply: {
      value: dispense.daysSupply,
      unit: 'days',
      system: 'http://unitsofmeasure.org',
      code: 'd'
    },
    whenPrepared: dispense.dispenseDate.toISOString(),
    whenHandedOver: dispense.dispenseDate.toISOString(),
    destination: {
      reference: `Location/${dispense.locationId}`,
      display: 'Pharmacy'
    },
    note: dispense.notes ? [
      {
        text: dispense.notes
      }
    ] : undefined
  };
}

/**
 * Convert FHIR MedicationDispense to domain MedicationDispense
 * @param fhirDispense FHIR MedicationDispense resource
 * @returns Domain medication dispense
 */
export function fhirToMedicationDispense(fhirDispense: FHIRMedicationDispense): MedicationDispense {
  // Extract IDs from references
  const medicationId = fhirDispense.medicationReference.reference.split('/')[1];
  const patientId = fhirDispense.subject.reference.split('/')[1];
  const dispenserId = fhirDispense.performer?.[0]?.actor.reference.split('/')[1] || '';
  const prescriptionId = fhirDispense.authorizingPrescription?.[0]?.reference.split('/')[1] || '';
  const locationId = fhirDispense.destination?.reference.split('/')[1] || '';
  
  // Parse dates
  const dispenseDate = fhirDispense.whenHandedOver ? 
    new Date(fhirDispense.whenHandedOver) : 
    new Date(fhirDispense.whenPrepared || new Date().toISOString());
  
  // Extract notes
  const notes = fhirDispense.note?.[0]?.text;
  
  return {
    id: fhirDispense.id,
    patientId,
    providerId: '', // Not directly available in FHIR MedicationDispense
    medicationId,
    prescriptionId,
    dispenserId,
    status: fhirDispense.status,
    dispenseDate,
    quantity: fhirDispense.quantity?.value || 0,
    daysSupply: fhirDispense.daysSupply?.value || 0,
    notes,
    locationId
  };
}

/**
 * Convert domain MedicationAdministration to FHIR MedicationAdministration
 * @param administration Domain medication administration
 * @param patientName Patient display name
 * @param providerName Provider display name
 * @param medicationName Medication display name
 * @returns FHIR MedicationAdministration resource
 */
export function medicationAdministrationToFHIR(
  administration: MedicationAdministration,
  patientName: string,
  providerName: string,
  medicationName: string
): FHIRMedicationAdministration {
  return {
    resourceType: 'MedicationAdministration',
    id: administration.id,
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString()
    },
    status: administration.status,
    medicationReference: {
      reference: `Medication/${administration.medicationId}`,
      display: medicationName
    },
    subject: {
      reference: `Patient/${administration.patientId}`,
      display: patientName
    },
    effectiveDateTime: administration.administrationDate.toISOString(),
    performer: [
      {
        actor: {
          reference: `Practitioner/${administration.providerId}`,
          display: providerName
        }
      }
    ],
    request: {
      reference: `MedicationRequest/${administration.prescriptionId}`
    },
    dosage: {
      text: `${administration.dosage} ${administration.unit} ${administration.route}`,
      site: administration.site ? {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-BodySite',
            code: administration.site.toLowerCase().replace(/\s+/g, '-'),
            display: administration.site
          }
        ],
        text: administration.site
      } : undefined,
      route: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration',
            code: administration.route.toLowerCase().replace(/\s+/g, '-'),
            display: administration.route
          }
        ],
        text: administration.route
      },
      dose: {
        value: administration.dosage,
        unit: administration.unit,
        system: 'http://unitsofmeasure.org',
        code: administration.unit
      }
    },
    note: administration.notes ? [
      {
        text: administration.notes
      }
    ] : undefined
  };
}

/**
 * Convert FHIR MedicationAdministration to domain MedicationAdministration
 * @param fhirAdministration FHIR MedicationAdministration resource
 * @returns Domain medication administration
 */
export function fhirToMedicationAdministration(fhirAdministration: FHIRMedicationAdministration): MedicationAdministration {
  // Extract IDs from references
  const medicationId = fhirAdministration.medicationReference.reference.split('/')[1];
  const patientId = fhirAdministration.subject.reference.split('/')[1];
  const providerId = fhirAdministration.performer?.[0]?.actor.reference.split('/')[1] || '';
  const prescriptionId = fhirAdministration.request?.reference.split('/')[1] || '';
  
  // Parse dates
  const administrationDate = new Date(fhirAdministration.effectiveDateTime);
  
  // Extract dosage information
  const dosage = fhirAdministration.dosage?.dose?.value || 0;
  const unit = fhirAdministration.dosage?.dose?.unit || '';
  const route = fhirAdministration.dosage?.route?.text || '';
  const site = fhirAdministration.dosage?.site?.text;
  
  // Extract notes
  const notes = fhirAdministration.note?.[0]?.text;
  
  return {
    id: fhirAdministration.id,
    patientId,
    providerId,
    medicationId,
    prescriptionId,
    status: fhirAdministration.status,
    administrationDate,
    dosage,
    unit,
    route,
    site,
    notes
  };
}
