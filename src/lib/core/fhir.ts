/**
 * Core FHIR utilities for the Financial Management system
 * Provides standardized FHIR resource handling and validation
 */

// FHIR Resource Types relevant to Financial Management
export enum FHIRResourceType {
  ACCOUNT = 'Account',
  CLAIM = 'Claim',
  CLAIM_RESPONSE = 'ClaimResponse',
  COVERAGE = 'Coverage',
  PAYMENT_NOTICE = 'PaymentNotice',
  PAYMENT_RECONCILIATION = 'PaymentReconciliation',
  INVOICE = 'Invoice',
  CHARGE_ITEM = 'ChargeItem',
}

// FHIR Account resource interface (simplified)
export interface FHIRAccount {
  resourceType: FHIRResourceType.ACCOUNT;
  id?: string;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  status: 'active' | 'inactive' | 'entered-in-error' | 'on-hold' | 'unknown';
  type?: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  };
  subject?: Array<{
    reference: string;
  }>;
  servicePeriod?: {
    start: string;
    end?: string;
  };
  coverage?: Array<{
    coverage: {
      reference: string;
    };
    priority?: number;
  }>;
  owner?: {
    reference: string;
  };
  description?: string;
  balance?: Array<{
    value: number;
    currency: string;
  }>;
}

// FHIR Claim resource interface (simplified)
export interface FHIRClaim {
  resourceType: FHIRResourceType.CLAIM;
  id?: string;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  status: 'active' | 'cancelled' | 'draft' | 'entered-in-error';
  type: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  };
  use: 'claim' | 'preauthorization' | 'predetermination';
  patient: {
    reference: string;
  };
  created: string;
  provider: {
    reference: string;
  };
  priority: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  };
  insurance: Array<{
    sequence: number;
    focal: boolean;
    coverage: {
      reference: string;
    };
  }>;
  diagnosis?: Array<{
    sequence: number;
    diagnosis: {
      coding: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
    };
  }>;
  item?: Array<{
    sequence: number;
    productOrService: {
      coding: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
    };
    servicedDate?: string;
    unitPrice?: {
      value: number;
      currency: string;
    };
    net?: {
      value: number;
      currency: string;
    };
  }>;
  total?: {
    value: number;
    currency: string;
  };
}

// FHIR Coverage resource interface (simplified)
export interface FHIRCoverage {
  resourceType: FHIRResourceType.COVERAGE;
  id?: string;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  status: 'active' | 'cancelled' | 'draft' | 'entered-in-error';
  type?: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  };
  subscriber?: {
    reference: string;
  };
  beneficiary: {
    reference: string;
  };
  relationship?: {
    coding: Array<{
      system: string;
      code: string;
      display?: string;
    }>;
  };
  period?: {
    start: string;
    end?: string;
  };
  payor: Array<{
    reference: string;
  }>;
  class?: Array<{
    type: {
      coding: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
    };
    value: string;
    name?: string;
  }>;
}

// FHIR Invoice resource interface (simplified)
export interface FHIRInvoice {
  resourceType: FHIRResourceType.INVOICE;
  id?: string;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  status: 'draft' | 'issued' | 'balanced' | 'cancelled' | 'entered-in-error';
  subject?: {
    reference: string;
  };
  date: string;
  participant?: Array<{
    role?: {
      coding: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
    };
    actor: {
      reference: string;
    };
  }>;
  issuer?: {
    reference: string;
  };
  account?: {
    reference: string;
  };
  lineItem?: Array<{
    sequence: number;
    chargeItem: {
      reference: string;
    };
    priceComponent?: Array<{
      type: 'base' | 'surcharge' | 'deduction' | 'discount' | 'tax' | 'informational';
      factor?: number;
      amount?: {
        value: number;
        currency: string;
      };
    }>;
  }>;
  totalNet?: {
    value: number;
    currency: string;
  };
  totalGross?: {
    value: number;
    currency: string;
  };
}

// FHIR PaymentReconciliation resource interface (simplified)
export interface FHIRPaymentReconciliation {
  resourceType: FHIRResourceType.PAYMENT_RECONCILIATION;
  id?: string;
  identifier?: Array<{
    system: string;
    value: string;
  }>;
  status: 'active' | 'cancelled' | 'draft' | 'entered-in-error';
  period?: {
    start: string;
    end?: string;
  };
  created: string;
  paymentIssuer?: {
    reference: string;
  };
  request?: {
    reference: string;
  };
  outcome?: 'complete' | 'error' | 'partial';
  disposition?: string;
  paymentDate: string;
  paymentAmount: {
    value: number;
    currency: string;
  };
  paymentIdentifier?: {
    system: string;
    value: string;
  };
  detail?: Array<{
    identifier?: {
      system: string;
      value: string;
    };
    type?: {
      coding: Array<{
        system: string;
        code: string;
        display?: string;
      }>;
    };
    request?: {
      reference: string;
    };
    response?: {
      reference: string;
    };
    submitter?: {
      reference: string;
    };
    payee?: {
      reference: string;
    };
    date?: string;
    amount?: {
      value: number;
      currency: string;
    };
  }>;
}

// Utility function to convert internal invoice to FHIR Invoice
export function convertToFHIRInvoice(invoice: any): FHIRInvoice {
  // Map internal invoice status to FHIR Invoice status
  const statusMap: Record<string, 'draft' | 'issued' | 'balanced' | 'cancelled' | 'entered-in-error'> = {
    draft: 'draft',
    pending: 'draft',
    verified: 'issued',
    approved: 'issued',
    sent: 'issued',
    partial: 'balanced',
    paid: 'balanced',
    overdue: 'issued',
    cancelled: 'cancelled',
    refunded: 'balanced',
  };

  return {
    resourceType: FHIRResourceType.INVOICE,
    id: invoice.id,
    identifier: [
      {
        system: 'http://hospital.example.org/identifiers/invoice',
        value: invoice.invoiceNumber,
      },
    ],
    status: statusMap[invoice.status] || 'draft',
    subject: {
      reference: `Patient/${invoice.patientId}`,
    },
    date: invoice.invoiceDate,
    issuer: {
      reference: 'Organization/hospital',
    },
    account: invoice.accountId ? {
      reference: `Account/${invoice.accountId}`,
    } : undefined,
    lineItem: invoice.items.map((item: any, index: number) => ({
      sequence: index + 1,
      chargeItem: {
        reference: `ChargeItem/${item.id}`,
      },
      priceComponent: [
        {
          type: 'base',
          amount: {
            value: item.unitPrice,
            currency: 'USD',
          },
        },
        ...(item.discount > 0 ? [{
          type: 'discount',
          amount: {
            value: -item.discount,
            currency: 'USD',
          },
        }] : []),
        ...(item.tax > 0 ? [{
          type: 'tax',
          amount: {
            value: item.tax,
            currency: 'USD',
          },
        }] : []),
      ],
    })),
    totalNet: {
      value: invoice.totalAmount - invoice.taxAmount,
      currency: 'USD',
    },
    totalGross: {
      value: invoice.totalAmount,
      currency: 'USD',
    },
  };
}

// Utility function to convert internal claim to FHIR Claim
export function convertToFHIRClaim(claim: any): FHIRClaim {
  // Map internal claim status to FHIR Claim status
  const statusMap: Record<string, 'active' | 'cancelled' | 'draft' | 'entered-in-error'> = {
    draft: 'draft',
    pending: 'active',
    submitted: 'active',
    in_progress: 'active',
    additional_info_needed: 'active',
    approved: 'active',
    partially_approved: 'active',
    denied: 'active',
    appealed: 'active',
    closed: 'active',
    cancelled: 'cancelled',
  };

  return {
    resourceType: FHIRResourceType.CLAIM,
    id: claim.id,
    identifier: [
      {
        system: 'http://hospital.example.org/identifiers/claim',
        value: claim.claimNumber,
      },
    ],
    status: statusMap[claim.status] || 'draft',
    type: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/claim-type',
          code: 'institutional',
          display: 'Institutional',
        },
      ],
    },
    use: 'claim',
    patient: {
      reference: `Patient/${claim.patientId}`,
    },
    created: claim.createdAt,
    provider: {
      reference: `Organization/hospital`,
    },
    priority: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/processpriority',
          code: 'normal',
          display: 'Normal',
        },
      ],
    },
    insurance: [
      {
        sequence: 1,
        focal: true,
        coverage: {
          reference: `Coverage/${claim.insurancePolicyId}`,
        },
      },
    ],
    diagnosis: claim.diagnoses.map((diagnosis: any, index: number) => ({
      sequence: index + 1,
      diagnosis: {
        coding: [
          {
            system: 'http://hl7.org/fhir/sid/icd-10',
            code: diagnosis.code,
            display: diagnosis.description,
          },
        ],
      },
    })),
    item: claim.items.map((item: any, index: number) => ({
      sequence: index + 1,
      productOrService: {
        coding: [
          {
            system: 'http://www.ama-assn.org/go/cpt',
            code: item.serviceItem.cptCode,
            display: item.serviceItem.name,
          },
        ],
      },
      servicedDate: item.serviceDate,
      unitPrice: {
        value: item.unitPrice,
        currency: 'USD',
      },
      net: {
        value: item.totalPrice,
        currency: 'USD',
      },
    })),
    total: {
      value: claim.totalAmount,
      currency: 'USD',
    },
  };
}

// Utility function to convert internal coverage to FHIR Coverage
export function convertToFHIRCoverage(coverage: any): FHIRCoverage {
  return {
    resourceType: FHIRResourceType.COVERAGE,
    id: coverage.id,
    identifier: [
      {
        system: 'http://hospital.example.org/identifiers/coverage',
        value: coverage.policyNumber,
      },
    ],
    status: coverage.status === 'active' ? 'active' : 'cancelled',
    type: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: coverage.type,
          display: coverage.typeName,
        },
      ],
    },
    subscriber: {
      reference: `Patient/${coverage.subscriberId}`,
    },
    beneficiary: {
      reference: `Patient/${coverage.patientId}`,
    },
    relationship: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/subscriber-relationship',
          code: coverage.relationship,
          display: coverage.relationshipName,
        },
      ],
    },
    period: {
      start: coverage.startDate,
      end: coverage.endDate,
    },
    payor: [
      {
        reference: `Organization/${coverage.insuranceProviderId}`,
      },
    ],
    class: [
      {
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/coverage-class',
              code: 'group',
              display: 'Group',
            },
          ],
        },
        value: coverage.groupNumber,
        name: coverage.groupName,
      },
    ],
  };
}

// Utility function to validate FHIR resources
export function validateFHIRResource(resource: any): boolean {
  // This would typically use a FHIR validation library
  // For now, we'll do basic validation
  
  if (!resource || !resource.resourceType) {
    return false;
  }
  
  switch (resource.resourceType) {
    case FHIRResourceType.ACCOUNT:
      return validateFHIRAccount(resource);
    case FHIRResourceType.CLAIM:
      return validateFHIRClaim(resource);
    case FHIRResourceType.COVERAGE:
      return validateFHIRCoverage(resource);
    case FHIRResourceType.INVOICE:
      return validateFHIRInvoice(resource);
    case FHIRResourceType.PAYMENT_RECONCILIATION:
      return validateFHIRPaymentReconciliation(resource);
    default:
      return false;
  }
}

// Helper validation functions
function validateFHIRAccount(account: any): boolean {
  return !!account.status;
}

function validateFHIRClaim(claim: any): boolean {
  return !!claim.status && 
         !!claim.type && 
         !!claim.use && 
         !!claim.patient && 
         !!claim.created && 
         !!claim.provider && 
         !!claim.priority && 
         Array.isArray(claim.insurance) && 
         claim.insurance.length > 0;
}

function validateFHIRCoverage(coverage: any): boolean {
  return !!coverage.status && 
         !!coverage.beneficiary && 
         Array.isArray(coverage.payor) && 
         coverage.payor.length > 0;
}

function validateFHIRInvoice(invoice: any): boolean {
  return !!invoice.status && 
         !!invoice.date;
}

function validateFHIRPaymentReconciliation(paymentReconciliation: any): boolean {
  return !!paymentReconciliation.status && 
         !!paymentReconciliation.created && 
         !!paymentReconciliation.paymentDate && 
         !!paymentReconciliation.paymentAmount;
}
