/**
 * Donor Management System
 * 
 * This module implements advanced donor management features for the Blood Bank,
 * including donor registration, eligibility checking, donation history tracking,
 * and appointment scheduling.
 */

import {
  Donor,
  DonorStatus,
  BloodType,
  Donation,
  BloodProductType,
  getDonor,
  updateDonor,
  createDonor,
  getDonorsByStatus,
  getDonorsByBloodType,
  createDonation,
  getDonation,
  getDonationsByDonor,
  updateDonation,
  checkDonorEligibility
} from './core-data-models';

// Donor registration status
export enum DonorRegistrationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

// Donor registration
export interface DonorRegistration {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  contactInformation: {
    phone: string;
    email?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  bloodType?: BloodType;
  medicalHistory?: {
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
    travelHistory?: {
      location: string;
      startDate: string;
      endDate: string;
    }[];
  };
  consentForms?: {
    type: string;
    signedDate: string;
    expirationDate?: string;
    documentReference?: string;
  }[];
  registrationDate: string;
  status: DonorRegistrationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  donorId?: string; // Set when approved
  notes?: string;
}

// Donor deferral
export interface DonorDeferral {
  id: string;
  donorId: string;
  startDate: string;
  endDate?: string;
  reason: string;
  type: 'temporary' | 'permanent';
  createdBy: string;
  createdAt: string;
  modifiedBy?: string;
  modifiedAt?: string;
  notes?: string;
}

// Donor appointment
export interface DonorAppointment {
  id: string;
  donorId: string;
  appointmentDate: string;
  appointmentTime: string;
  donationType: BloodProductType;
  location: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  createdBy: string;
  createdAt: string;
  modifiedBy?: string;
  modifiedAt?: string;
  donationId?: string; // Set when completed
  cancellationReason?: string;
  notes?: string;
}

// Donor eligibility check
export interface DonorEligibilityCheck {
  id: string;
  donorId: string;
  checkDate: string;
  donationType: BloodProductType;
  isEligible: boolean;
  deferralReason?: string;
  deferralEndDate?: string;
  checkedBy: string;
  notes?: string;
}

// Mock data stores
const mockDonorRegistrations: DonorRegistration[] = [];
const mockDonorDeferrals: DonorDeferral[] = [];
const mockDonorAppointments: DonorAppointment[] = [];
const mockDonorEligibilityChecks: DonorEligibilityCheck[] = [];

/**
 * Creates a new donor registration
 */
export function createDonorRegistration(
  registration: Omit<DonorRegistration, 'id' | 'registrationDate' | 'status'>
): DonorRegistration {
  const id = Math.random().toString(36).substring(2, 15);
  const now = new Date().toISOString();
  
  const newRegistration: DonorRegistration = {
    id,
    ...registration,
    registrationDate: now,
    status: DonorRegistrationStatus.PENDING
  };
  
  // Store the registration
  mockDonorRegistrations.push(newRegistration);
  
  return newRegistration;
}

/**
 * Gets a donor registration by ID
 */
export function getDonorRegistration(registrationId: string): DonorRegistration | null {
  return mockDonorRegistrations.find(r => r.id === registrationId) || null;
}

/**
 * Gets donor registrations by status
 */
export function getDonorRegistrationsByStatus(status: DonorRegistrationStatus): DonorRegistration[] {
  return mockDonorRegistrations.filter(r => r.status === status);
}

/**
 * Approves a donor registration
 */
export function approveDonorRegistration(
  registrationId: string,
  reviewedBy: string,
  notes?: string
): { registration: DonorRegistration; donor: Donor } {
  const registrationIndex = mockDonorRegistrations.findIndex(r => r.id === registrationId);
  
  if (registrationIndex === -1) {
    throw new Error(`Donor registration with ID ${registrationId} not found`);
  }
  
  const registration = mockDonorRegistrations[registrationIndex];
  
  if (registration.status !== DonorRegistrationStatus.PENDING) {
    throw new Error(`Donor registration with ID ${registrationId} is not pending`);
  }
  
  const now = new Date().toISOString();
  
  // Create donor
  const donor = createDonor({
    firstName: registration.firstName,
    lastName: registration.lastName,
    dateOfBirth: registration.dateOfBirth,
    gender: registration.gender,
    bloodType: registration.bloodType,
    contactInformation: registration.contactInformation,
    status: DonorStatus.ELIGIBLE,
    medicalHistory: registration.medicalHistory,
    consentForms: registration.consentForms,
    notes: registration.notes
  }, reviewedBy);
  
  // Update registration
  const updatedRegistration: DonorRegistration = {
    ...registration,
    status: DonorRegistrationStatus.APPROVED,
    reviewedBy,
    reviewedAt: now,
    donorId: donor.id,
    notes: notes ? (registration.notes ? `${registration.notes}\n${notes}` : notes) : registration.notes
  };
  
  mockDonorRegistrations[registrationIndex] = updatedRegistration;
  
  return { registration: updatedRegistration, donor };
}

/**
 * Rejects a donor registration
 */
export function rejectDonorRegistration(
  registrationId: string,
  reviewedBy: string,
  rejectionReason: string,
  notes?: string
): DonorRegistration {
  const registrationIndex = mockDonorRegistrations.findIndex(r => r.id === registrationId);
  
  if (registrationIndex === -1) {
    throw new Error(`Donor registration with ID ${registrationId} not found`);
  }
  
  const registration = mockDonorRegistrations[registrationIndex];
  
  if (registration.status !== DonorRegistrationStatus.PENDING) {
    throw new Error(`Donor registration with ID ${registrationId} is not pending`);
  }
  
  const now = new Date().toISOString();
  
  // Update registration
  const updatedRegistration: DonorRegistration = {
    ...registration,
    status: DonorRegistrationStatus.REJECTED,
    reviewedBy,
    reviewedAt: now,
    rejectionReason,
    notes: notes ? (registration.notes ? `${registration.notes}\n${notes}` : notes) : registration.notes
  };
  
  mockDonorRegistrations[registrationIndex] = updatedRegistration;
  
  return updatedRegistration;
}

/**
 * Creates a new donor deferral
 */
export function createDonorDeferral(
  donorId: string,
  startDate: string,
  reason: string,
  type: 'temporary' | 'permanent',
  endDate: string | undefined,
  createdBy: string,
  notes?: string
): { deferral: DonorDeferral; donor: Donor | null } {
  const id = Math.random().toString(36).substring(2, 15);
  const now = new Date().toISOString();
  
  // Validate donor
  const donor = getDonor(donorId);
  
  if (!donor) {
    throw new Error(`Donor with ID ${donorId} not found`);
  }
  
  // Create deferral
  const deferral: DonorDeferral = {
    id,
    donorId,
    startDate,
    endDate,
    reason,
    type,
    createdBy,
    createdAt: now,
    notes
  };
  
  // Store the deferral
  mockDonorDeferrals.push(deferral);
  
  // Update donor status
  const updatedDonor = updateDonor(
    donorId,
    {
      status: type === 'permanent' ? DonorStatus.PERMANENTLY_DEFERRED : DonorStatus.TEMPORARILY_DEFERRED,
      eligibilityUntil: endDate,
      deferralReason: reason
    },
    createdBy
  );
  
  return { deferral, donor: updatedDonor };
}

/**
 * Gets a donor deferral by ID
 */
export function getDonorDeferral(deferralId: string): DonorDeferral | null {
  return mockDonorDeferrals.find(d => d.id === deferralId) || null;
}

/**
 * Gets donor deferrals by donor ID
 */
export function getDonorDeferralsByDonor(donorId: string): DonorDeferral[] {
  return mockDonorDeferrals.filter(d => d.donorId === donorId);
}

/**
 * Updates a donor deferral
 */
export function updateDonorDeferral(
  deferralId: string,
  updates: Partial<Omit<DonorDeferral, 'id' | 'donorId' | 'createdBy' | 'createdAt'>>,
  modifiedBy: string
): { deferral: DonorDeferral | null; donor: Donor | null } {
  const deferralIndex = mockDonorDeferrals.findIndex(d => d.id === deferralId);
  
  if (deferralIndex === -1) {
    return { deferral: null, donor: null };
  }
  
  const existingDeferral = mockDonorDeferrals[deferralIndex];
  const now = new Date().toISOString();
  
  const updatedDeferral: DonorDeferral = {
    ...existingDeferral,
    ...updates,
    modifiedBy,
    modifiedAt: now
  };
  
  // Store the updated deferral
  mockDonorDeferrals[deferralIndex] = updatedDeferral;
  
  // Update donor if necessary
  let updatedDonor: Donor | null = null;
  
  if (updates.type !== undefined || updates.endDate !== undefined) {
    updatedDonor = updateDonor(
      existingDeferral.donorId,
      {
        status: updatedDeferral.type === 'permanent' ? DonorStatus.PERMANENTLY_DEFERRED : DonorStatus.TEMPORARILY_DEFERRED,
        eligibilityUntil: updatedDeferral.endDate,
        deferralReason: updatedDeferral.reason
      },
      modifiedBy
    );
  }
  
  return { deferral: updatedDeferral, donor: updatedDonor };
}

/**
 * Ends a donor deferral
 */
export function endDonorDeferral(
  deferralId: string,
  endDate: string,
  modifiedBy: string,
  notes?: string
): { deferral: DonorDeferral | null; donor: Donor | null } {
  const deferralIndex = mockDonorDeferrals.findIndex(d => d.id === deferralId);
  
  if (deferralIndex === -1) {
    return { deferral: null, donor: null };
  }
  
  const existingDeferral = mockDonorDeferrals[deferralIndex];
  
  if (existingDeferral.type === 'permanent') {
    throw new Error(`Cannot end a permanent deferral`);
  }
  
  const now = new Date().toISOString();
  
  const updatedDeferral: DonorDeferral = {
    ...existingDeferral,
    endDate,
    modifiedBy,
    modifiedAt: now,
    notes: notes ? (existingDeferral.notes ? `${existingDeferral.notes}\n${notes}` : notes) : existingDeferral.notes
  };
  
  // Store the updated deferral
  mockDonorDeferrals[deferralIndex] = updatedDeferral;
  
  // Update donor
  const updatedDonor = updateDonor(
    existingDeferral.donorId,
    {
      status: DonorStatus.ELIGIBLE,
      eligibilityUntil: undefined,
      deferralReason: undefined
    },
    modifiedBy
  );
  
  return { deferral: updatedDeferral, donor: updatedDonor };
}

/**
 * Creates a new donor appointment
 */
export function createDonorAppointment(
  donorId: string,
  appointmentDate: string,
  appointmentTime: string,
  donationType: BloodProductType,
  location: string,
  createdBy: string,
  notes?: string
): DonorAppointment {
  const id = Math.random().toString(36).substring(2, 15);
  const now = new Date().toISOString();
  
  // Validate donor
  const donor = getDonor(donorId);
  
  if (!donor) {
    throw new Error(`Donor with ID ${donorId} not found`);
  }
  
  // Create appointment
  const appointment: DonorAppointment = {
    id,
    donorId,
    appointmentDate,
    appointmentTime,
    donationType,
    location,
    status: 'scheduled',
    createdBy,
    createdAt: now,
    notes
  };
  
  // Store the appointment
  mockDonorAppointments.push(appointment);
  
  return appointment;
}

/**
 * Gets a donor appointment by ID
 */
export function getDonorAppointment(appointmentId: string): DonorAppointment | null {
  return mockDonorAppointments.find(a => a.id === appointmentId) || null;
}

/**
 * Gets donor appointments by donor ID
 */
export function getDonorAppointmentsByDonor(donorId: string): DonorAppointment[] {
  return mockDonorAppointments.filter(a => a.donorId === donorId);
}

/**
 * Gets donor appointments by date range
 */
export function getDonorAppointmentsByDateRange(
  startDate: string,
  endDate: string
): DonorAppointment[] {
  return mockDonorAppointments.filter(
    a => a.appointmentDate >= startDate && a.appointmentDate <= endDate
  );
}

/**
 * Gets donor appointments by status
 */
export function getDonorAppointmentsByStatus(
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
): DonorAppointment[] {
  return mockDonorAppointments.filter(a => a.status === status);
}

/**
 * Updates a donor appointment
 */
export function updateDonorAppointment(
  appointmentId: string,
  updates: Partial<Omit<DonorAppointment, 'id' | 'donorId' | 'createdBy' | 'createdAt'>>,
  modifiedBy: string
): DonorAppointment | null {
  const appointmentIndex = mockDonorAppointments.findIndex(a => a.id === appointmentId);
  
  if (appointmentIndex === -1) {
    return null;
  }
  
  const existingAppointment = mockDonorAppointments[appointmentIndex];
  const now = new Date().toISOString();
  
  const updatedAppointment: DonorAppointment = {
    ...existingAppointment,
    ...updates,
    modifiedBy,
    modifiedAt: now
  };
  
  // Store the updated appointment
  mockDonorAppointments[appointmentIndex] = updatedAppointment;
  
  return updatedAppointment;
}

/**
 * Confirms a donor appointment
 */
export function confirmDonorAppointment(
  appointmentId: string,
  modifiedBy: string,
  notes?: string
): DonorAppointment | null {
  const appointmentIndex = mockDonorAppointments.findIndex(a => a.id === appointmentId);
  
  if (appointmentIndex === -1) {
    return null;
  }
  
  const existingAppointment = mockDonorAppointments[appointmentIndex];
  
  if (existingAppointment.status !== 'scheduled') {
    throw new Error(`Appointment with ID ${appointmentId} is not in scheduled status`);
  }
  
  const now = new Date().toISOString();
  
  const updatedAppointment: DonorAppointment = {
    ...existingAppointment,
    status: 'confirmed',
    modifiedBy,
    modifiedAt: now,
    notes: notes ? (existingAppointment.notes ? `${existingAppointment.notes}\n${notes}` : notes) : existingAppointment.notes
  };
  
  // Store the updated appointment
  mockDonorAppointments[appointmentIndex] = updatedAppointment;
  
  return updatedAppointment;
}

/**
 * Completes a donor appointment
 */
export function completeDonorAppointment(
  appointmentId: string,
  donationId: string,
  modifiedBy: string,
  notes?: string
): DonorAppointment | null {
  const appointmentIndex = mockDonorAppointments.findIndex(a => a.id === appointmentId);
  
  if (appointmentIndex === -1) {
    return null;
  }
  
  const existingAppointment = mockDonorAppointments[appointmentIndex];
  
  if (existingAppointment.status !== 'confirmed' && existingAppointment.status !== 'scheduled') {
    throw new Error(`Appointment with ID ${appointmentId} cannot be completed`);
  }
  
  // Validate donation
  const donation = getDonation(donationId);
  
  if (!donation) {
    throw new Error(`Donation with ID ${donationId} not found`);
  }
  
  if (donation.donorId !== existingAppointment.donorId) {
    throw new Error(`Donation with ID ${donationId} does not belong to the appointment donor`);
  }
  
  const now = new Date().toISOString();
  
  const updatedAppointment: DonorAppointment = {
    ...existingAppointment,
    status: 'completed',
    donationId,
    modifiedBy,
    modifiedAt: now,
    notes: notes ? (existingAppointment.notes ? `${existingAppointment.notes}\n${notes}` : notes) : existingAppointment.notes
  };
  
  // Store the updated appointment
  mockDonorAppointments[appointmentIndex] = updatedAppointment;
  
  return updatedAppointment;
}

/**
 * Cancels a donor appointment
 */
export function cancelDonorAppointment(
  appointmentId: string,
  cancellationReason: string,
  modifiedBy: string,
  notes?: string
): DonorAppointment | null {
  const appointmentIndex = mockDonorAppointments.findIndex(a => a.id === appointmentId);
  
  if (appointmentIndex === -1) {
    return null;
  }
  
  const existingAppointment = mockDonorAppointments[appointmentIndex];
  
  if (existingAppointment.status === 'completed' || existingAppointment.status === 'cancelled') {
    throw new Error(`Appointment with ID ${appointmentId} cannot be cancelled`);
  }
  
  const now = new Date().toISOString();
  
  const updatedAppointment: DonorAppointment = {
    ...existingAppointment,
    status: 'cancelled',
    cancellationReason,
    modifiedBy,
    modifiedAt: now,
    notes: notes ? (existingAppointment.notes ? `${existingAppointment.notes}\n${notes}` : notes) : existingAppointment.notes
  };
  
  // Store the updated appointment
  mockDonorAppointments[appointmentIndex] = updatedAppointment;
  
  return updatedAppointment;
}

/**
 * Marks a donor appointment as no-show
 */
export function markDonorAppointmentNoShow(
  appointmentId: string,
  modifiedBy: string,
  notes?: string
): DonorAppointment | null {
  const appointmentIndex = mockDonorAppointments.findIndex(a => a.id === appointmentId);
  
  if (appointmentIndex === -1) {
    return null;
  }
  
  const existingAppointment = mockDonorAppointments[appointmentIndex];
  
  if (existingAppointment.status !== 'confirmed' && existingAppointment.status !== 'scheduled') {
    throw new Error(`Appointment with ID ${appointmentId} cannot be marked as no-show`);
  }
  
  const now = new Date().toISOString();
  
  const updatedAppointment: DonorAppointment = {
    ...existingAppointment,
    status: 'no_show',
    modifiedBy,
    modifiedAt: now,
    notes: notes ? (existingAppointment.notes ? `${existingAppointment.notes}\n${notes}` : notes) : existingAppointment.notes
  };
  
  // Store the updated appointment
  mockDonorAppointments[appointmentIndex] = updatedAppointment;
  
  return updatedAppointment;
}

/**
 * Creates a new donor eligibility check
 */
export function createDonorEligibilityCheck(
  donorId: string,
  donationType: BloodProductType,
  checkedBy: string,
  notes?: string
): DonorEligibilityCheck {
  const id = Math.random().toString(36).substring(2, 15);
  const now = new Date().toISOString();
  
  // Validate donor
  const donor = getDonor(donorId);
  
  if (!donor) {
    throw new Error(`Donor with ID ${donorId} not found`);
  }
  
  // Check eligibility
  const eligibility = checkDonorEligibility(donor, donationType);
  
  // Create eligibility check
  const eligibilityCheck: DonorEligibilityCheck = {
    id,
    donorId,
    checkDate: now,
    donationType,
    isEligible: eligibility.isEligible,
    deferralReason: eligibility.deferralReason,
    deferralEndDate: eligibility.nextEligibleDate,
    checkedBy,
    notes
  };
  
  // Store the eligibility check
  mockDonorEligibilityChecks.push(eligibilityCheck);
  
  return eligibilityCheck;
}

/**
 * Gets a donor eligibility check by ID
 */
export function getDonorEligibilityCheck(checkId: string): DonorEligibilityCheck | null {
  return mockDonorEligibilityChecks.find(c => c.id === checkId) || null;
}

/**
 * Gets donor eligibility checks by donor ID
 */
export function getDonorEligibilityChecksByDonor(donorId: string): DonorEligibilityCheck[] {
  return mockDonorEligibilityChecks.filter(c => c.donorId === donorId);
}

/**
 * Gets the latest donor eligibility check by donor ID
 */
export function getLatestDonorEligibilityCheck(
  donorId: string,
  donationType?: BloodProductType
): DonorEligibilityCheck | null {
  const checks = mockDonorEligibilityChecks
    .filter(c => c.donorId === donorId && (donationType ? c.donationType === donationType : true))
    .sort((a, b) => b.checkDate.localeCompare(a.checkDate));
  
  return checks.length > 0 ? checks[0] : null;
}

/**
 * Generates a donor report
 */
export function generateDonorReport(
  donorId: string
): {
  donor: Donor | null;
  donations: Donation[];
  deferrals: DonorDeferral[];
  appointments: DonorAppointment[];
  eligibilityChecks: DonorEligibilityCheck[];
  statistics: {
    totalDonations: number;
    lastDonationDate?: string;
    nextEligibleDate?: string;
    upcomingAppointments: number;
    missedAppointments: number;
    deferralCount: number;
    currentlyDeferred: boolean;
  };
} {
  // Get donor
  const donor = getDonor(donorId);
  
  if (!donor) {
    return {
      donor: null,
      donations: [],
      deferrals: [],
      appointments: [],
      eligibilityChecks: [],
      statistics: {
        totalDonations: 0,
        upcomingAppointments: 0,
        missedAppointments: 0,
        deferralCount: 0,
        currentlyDeferred: false
      }
    };
  }
  
  // Get donations
  const donations = getDonationsByDonor(donorId);
  
  // Get deferrals
  const deferrals = getDonorDeferralsByDonor(donorId);
  
  // Get appointments
  const appointments = getDonorAppointmentsByDonor(donorId);
  
  // Get eligibility checks
  const eligibilityChecks = getDonorEligibilityChecksByDonor(donorId);
  
  // Calculate statistics
  const totalDonations = donations.length;
  const lastDonationDate = donor.lastDonationDate;
  
  const now = new Date().toISOString();
  const upcomingAppointments = appointments.filter(
    a => (a.status === 'scheduled' || a.status === 'confirmed') && a.appointmentDate >= now
  ).length;
  
  const missedAppointments = appointments.filter(a => a.status === 'no_show').length;
  const deferralCount = deferrals.length;
  const currentlyDeferred = donor.status === DonorStatus.TEMPORARILY_DEFERRED || donor.status === DonorStatus.PERMANENTLY_DEFERRED;
  
  return {
    donor,
    donations,
    deferrals,
    appointments,
    eligibilityChecks,
    statistics: {
      totalDonations,
      lastDonationDate,
      nextEligibleDate: donor.eligibilityUntil,
      upcomingAppointments,
      missedAppointments,
      deferralCount,
      currentlyDeferred
    }
  };
}

/**
 * Generates a donor activity report for a date range
 */
export function generateDonorActivityReport(
  startDate: string,
  endDate: string
): {
  newDonors: number;
  returnDonors: number;
  totalDonations: number;
  donationsByType: Record<BloodProductType, number>;
  deferredDonors: number;
  deferralsByReason: Record<string, number>;
  appointmentsScheduled: number;
  appointmentsCompleted: number;
  appointmentsCancelled: number;
  appointmentsNoShow: number;
  donorRetentionRate: number;
} {
  // Initialize counters
  const donationsByType: Record<BloodProductType, number> = {
    [BloodProductType.WHOLE_BLOOD]: 0,
    [BloodProductType.RED_BLOOD_CELLS]: 0,
    [BloodProductType.PLATELETS]: 0,
    [BloodProductType.PLASMA]: 0,
    [BloodProductType.CRYOPRECIPITATE]: 0,
    [BloodProductType.GRANULOCYTES]: 0
  };
  
  const deferralsByReason: Record<string, number> = {};
  
  // Count new donors
  const newDonors = mockDonorRegistrations.filter(
    r => r.status === DonorRegistrationStatus.APPROVED && 
         r.reviewedAt !== undefined && 
         r.reviewedAt >= startDate && 
         r.reviewedAt <= endDate
  ).length;
  
  // Count return donors (donors who donated more than once)
  const donorDonationCounts: Record<string, number> = {};
  
  // Count donations
  let totalDonations = 0;
  
  // Count appointments
  const appointmentsInRange = mockDonorAppointments.filter(
    a => a.appointmentDate >= startDate && a.appointmentDate <= endDate
  );
  
  const appointmentsScheduled = appointmentsInRange.length;
  const appointmentsCompleted = appointmentsInRange.filter(a => a.status === 'completed').length;
  const appointmentsCancelled = appointmentsInRange.filter(a => a.status === 'cancelled').length;
  const appointmentsNoShow = appointmentsInRange.filter(a => a.status === 'no_show').length;
  
  // Count deferrals
  const deferralsInRange = mockDonorDeferrals.filter(
    d => d.startDate >= startDate && d.startDate <= endDate
  );
  
  const deferredDonors = deferralsInRange.length;
  
  // Count deferrals by reason
  for (const deferral of deferralsInRange) {
    if (!deferralsByReason[deferral.reason]) {
      deferralsByReason[deferral.reason] = 0;
    }
    deferralsByReason[deferral.reason]++;
  }
  
  // Calculate donor retention rate
  const donorRetentionRate = 0; // Placeholder - would require more complex calculation
  
  return {
    newDonors,
    returnDonors: 0, // Placeholder - would require more complex calculation
    totalDonations,
    donationsByType,
    deferredDonors,
    deferralsByReason,
    appointmentsScheduled,
    appointmentsCompleted,
    appointmentsCancelled,
    appointmentsNoShow,
    donorRetentionRate
  };
}
