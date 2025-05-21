export interface TPA {
    id: string;
    name: string;
    address?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
}

export interface InsurancePolicy {
    id: string;
    patientId: string;
    policyNumber: string;
    tpaId: string; // Links to TPA
    providerName?: string; // Could be derived from TPA if TPA is the provider
    coverageDetails: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
}

export interface EligibilityStatus {
    eligible: boolean;
    reason?: string;
    details?: any; // Could include co-pay, deductible info
}

export interface Claim {
    id: string;
    patientId: string;
    policyId: string;
    submissionDate: Date;
    serviceCodes: string[];
    diagnosisCodes: string[];
    totalAmount: number;
    status: string; // e.g., SUBMITTED, PENDING, APPROVED, REJECTED, PAID
    notes?: string;
    tpaResponse?: string; // To store any direct response from TPA regarding the claim
}

export interface ClaimStatusResponse {
    claimId: string;
    status: "PENDING" | "APPROVED" | "PARTIALLY_APPROVED" | "REJECTED" | "PAID";
    lastUpdated: Date;
    details?: string;
    amountApproved?: number;
    amountPaid?: number;
    rejectionReason?: string;
}

