/**
 * Type definitions for the HR & Asset Management module
 * Based on FHIR R4 standards for healthcare interoperability
 */

// Staff Management Types
export interface Practitioner {
  id: string;
  identifier: Identifier[];
  active: boolean;
  name: HumanName[];
  telecom: ContactPoint[];
  address: Address[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  photo?: Attachment[];
  qualification: Qualification[];
  communication?: CodeableConcept[];
}

export interface PractitionerRole {
  id: string;
  identifier: Identifier[];
  active: boolean;
  period?: Period;
  practitioner: Reference;
  organization?: Reference;
  code?: CodeableConcept[];
  specialty?: CodeableConcept[];
  location?: Reference[];
  healthcareService?: Reference[];
  telecom?: ContactPoint[];
  availableTime?: AvailableTime[];
  notAvailable?: NotAvailable[];
  availabilityExceptions?: string;
}

export interface Qualification {
  identifier?: Identifier[];
  code: CodeableConcept;
  period?: Period;
  issuer?: Reference;
}

// Attendance Management Types
export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'on-leave';
  biometricVerified: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Leave {
  id: string;
  employeeId: string;
  leaveType: 'annual' | 'sick' | 'maternity' | 'paternity' | 'unpaid' | 'other';
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Payroll Types
export interface Payroll {
  id: string;
  periodStart: string;
  periodEnd: string;
  processedDate: string;
  status: 'draft' | 'processing' | 'completed' | 'error';
  totalAmount: number;
  employeeCount: number;
  processedBy: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeePayroll {
  id: string;
  payrollId: string;
  employeeId: string;
  basicSalary: number;
  allowances: PayrollItem[];
  deductions: PayrollItem[];
  tax: number;
  netSalary: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentDate?: string;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollItem {
  name: string;
  amount: number;
  type: string;
}

// Asset Management Types
export interface Asset {
  id: string;
  identifier: Identifier[];
  status: 'active' | 'inactive' | 'entered-in-error' | 'unknown';
  type: CodeableConcept;
  name?: string;
  modelNumber?: string;
  serialNumber?: string;
  manufacturer?: string;
  manufactureDate?: string;
  expirationDate?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  location?: Reference;
  department?: Reference;
  assignedTo?: Reference;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Biomedical Equipment Types
export interface Device {
  id: string;
  identifier: Identifier[];
  definition?: Reference;
  udiCarrier?: UdiCarrier[];
  status: 'active' | 'inactive' | 'entered-in-error' | 'unknown';
  statusReason?: CodeableConcept[];
  distinctIdentifier?: string;
  manufacturer?: string;
  manufactureDate?: string;
  expirationDate?: string;
  lotNumber?: string;
  serialNumber?: string;
  deviceName?: DeviceName[];
  modelNumber?: string;
  partNumber?: string;
  type?: CodeableConcept;
  specialization?: Specialization[];
  version?: Version[];
  property?: Property[];
  patient?: Reference;
  owner?: Reference;
  contact?: ContactPoint[];
  location?: Reference;
  url?: string;
  note?: Annotation[];
  safety?: CodeableConcept[];
  parent?: Reference;
  calibration?: Calibration[];
  regulatoryStatus?: 'registered' | 'pending' | 'not-required';
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
}

export interface Calibration {
  type?: 'initial' | 'periodic' | 'unscheduled';
  state?: 'not-calibrated' | 'calibration-required' | 'calibrated' | 'calibration-failed';
  time?: string;
  performer?: Reference;
  notes?: string;
}

export interface DeviceName {
  name: string;
  type: 'udi-label-name' | 'user-friendly-name' | 'patient-reported-name' | 'manufacturer-name' | 'model-name' | 'other';
}

export interface UdiCarrier {
  deviceIdentifier: string;
  issuer: string;
  jurisdiction: string;
  carrierAIDC?: string;
  carrierHRF?: string;
  entryType?: 'barcode' | 'rfid' | 'manual' | 'card' | 'self-reported' | 'unknown';
}

// Common Types
export interface Identifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: CodeableConcept;
  system?: string;
  value?: string;
  period?: Period;
  assigner?: Reference;
}

export interface HumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  period?: Period;
}

export interface ContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
  period?: Period;
}

export interface Address {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  period?: Period;
}

export interface Period {
  start?: string;
  end?: string;
}

export interface Attachment {
  contentType?: string;
  language?: string;
  data?: string;
  url?: string;
  size?: number;
  hash?: string;
  title?: string;
  creation?: string;
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

export interface Reference {
  reference?: string;
  type?: string;
  identifier?: Identifier;
  display?: string;
}

export interface AvailableTime {
  daysOfWeek?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  allDay?: boolean;
  availableStartTime?: string;
  availableEndTime?: string;
}

export interface NotAvailable {
  description: string;
  during?: Period;
}

export interface Annotation {
  authorReference?: Reference;
  authorString?: string;
  time?: string;
  text: string;
}

export interface Specialization {
  systemType: CodeableConcept;
  version?: string;
}

export interface Version {
  type?: CodeableConcept;
  component?: Identifier;
  value: string;
}

export interface Property {
  type: CodeableConcept;
  valueQuantity?: Quantity[];
  valueCode?: CodeableConcept[];
}

export interface Quantity {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>';
  unit?: string;
  system?: string;
  code?: string;
}
