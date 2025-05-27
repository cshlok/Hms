# HR & Asset Management Module Documentation

## Overview
This document provides comprehensive documentation for the HR & Asset Management module of the Hospital Management System (HMS). This module handles all staff management and equipment tracking for the hospital, including employee lifecycle management, attendance tracking, payroll processing, asset management, and biomedical equipment management.

## Table of Contents
1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [API Documentation](#api-documentation)
4. [Component Documentation](#component-documentation)
5. [Workflows](#workflows)
6. [Integration Points](#integration-points)
7. [Security Considerations](#security-considerations)
8. [Error Handling](#error-handling)

## Architecture
The HR & Asset Management module follows a layered architecture:

### Layers
1. **Presentation Layer**
   - Dashboard components for user interface
   - Form components for data entry
   - Report components for data visualization

2. **API Layer**
   - RESTful API endpoints for all operations
   - Request validation and error handling
   - Authentication and authorization

3. **Service Layer**
   - Business logic implementation
   - Data processing and transformation
   - Integration with other modules

4. **Data Access Layer**
   - Database operations via Prisma ORM
   - Data models and relationships
   - Query optimization

### Key Components
- **Staff Management**: Handles employee profiles, positions, qualifications, and scheduling
- **Attendance Management**: Manages attendance tracking, biometric integration, and leave management
- **Payroll Processing**: Handles salary structures, payroll calculations, and payment processing
- **Asset Management**: Tracks general assets, maintenance, and assignments
- **Biomedical Equipment Management**: Specialized tracking for medical devices, calibration, and compliance

## Database Schema
The module uses the following database schema:

### Employee Management
```
model Employee {
  id                String      @id @default(cuid())
  employeeId        String      @unique
  firstName         String
  lastName          String
  email             String      @unique
  phone             String?
  dateOfBirth       DateTime?
  gender            Gender?
  address           String?
  emergencyContact  String?
  emergencyPhone    String?
  joinDate          DateTime
  terminationDate   DateTime?
  isActive          Boolean     @default(true)
  departmentId      String?
  department        Department? @relation(fields: [departmentId], references: [id])
  positions         Position[]
  qualifications    Qualification[]
  attendanceRecords Attendance[]
  salaryStructures  SalaryStructure[]
  payrollEntries    PayrollEntry[]
  assignedAssets    Asset[]
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  deletedAt         DateTime?

  @@index([departmentId])
  @@index([isActive])
}

model Position {
  id           String     @id @default(cuid())
  title        String
  employeeId   String
  employee     Employee   @relation(fields: [employeeId], references: [id])
  departmentId String
  department   Department @relation(fields: [departmentId], references: [id])
  startDate    DateTime
  endDate      DateTime?
  isPrimary    Boolean    @default(false)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@index([employeeId])
  @@index([departmentId])
}

model Qualification {
  id                 String               @id @default(cuid())
  type               QualificationType
  name               String
  issuedBy           String
  issuedDate         DateTime
  expiryDate         DateTime?
  attachmentUrl      String?
  verificationStatus VerificationStatus   @default(PENDING)
  employeeId         String
  employee           Employee             @relation(fields: [employeeId], references: [id])
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt

  @@index([employeeId])
  @@index([type])
  @@index([verificationStatus])
}

model Department {
  id                String       @id @default(cuid())
  name              String
  type              DepartmentType
  description       String?
  parentDepartmentId String?
  parentDepartment  Department?  @relation("DepartmentHierarchy", fields: [parentDepartmentId], references: [id])
  childDepartments  Department[] @relation("DepartmentHierarchy")
  employees         Employee[]
  positions         Position[]
  assets            Asset[]
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  @@index([parentDepartmentId])
  @@index([type])
}
```

### Attendance Management
```
model Attendance {
  id                  String              @id @default(cuid())
  employeeId          String
  employee            Employee            @relation(fields: [employeeId], references: [id])
  date                DateTime            @db.Date
  checkinTime         DateTime
  checkoutTime        DateTime?
  status              AttendanceStatus
  notes               String?
  verificationMethod  VerificationMethod
  biometricVerificationId String?
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  @@index([employeeId])
  @@index([date])
  @@index([status])
}

model BiometricTemplate {
  id          String            @id @default(cuid())
  employeeId  String
  templateType BiometricType
  templateData Bytes
  deviceId    String?
  isActive    Boolean           @default(true)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([employeeId])
  @@index([templateType])
  @@index([isActive])
}

model BiometricVerification {
  id          String            @id @default(cuid())
  employeeId  String
  templateId  String?
  deviceId    String?
  timestamp   DateTime
  success     Boolean
  score       Float?
  details     Json?
  createdAt   DateTime          @default(now())

  @@index([employeeId])
  @@index([timestamp])
  @@index([success])
}
```

### Payroll Management
```
model SalaryStructure {
  id            String          @id @default(cuid())
  employeeId    String
  employee      Employee        @relation(fields: [employeeId], references: [id])
  baseSalary    Float
  effectiveDate DateTime        @db.Date
  endDate       DateTime?       @db.Date
  components    Json
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([employeeId])
  @@index([effectiveDate])
}

model PayrollPeriod {
  id          String            @id @default(cuid())
  name        String
  startDate   DateTime          @db.Date
  endDate     DateTime          @db.Date
  paymentDate DateTime          @db.Date
  status      PayrollStatus     @default(DRAFT)
  entries     PayrollEntry[]
  createdBy   String
  createdAt   DateTime          @default(now())
  approvedBy  String?
  approvedAt  DateTime?
  paidBy      String?
  paidAt      DateTime?
  updatedAt   DateTime          @updatedAt

  @@index([status])
  @@index([startDate, endDate])
}

model PayrollEntry {
  id          String            @id @default(cuid())
  periodId    String
  period      PayrollPeriod     @relation(fields: [periodId], references: [id])
  employeeId  String
  employee    Employee          @relation(fields: [employeeId], references: [id])
  baseSalary  Float
  grossSalary Float
  deductions  Float
  netSalary   Float
  components  Json
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([periodId])
  @@index([employeeId])
}
```

### Asset Management
```
model Asset {
  id                  String            @id @default(cuid())
  name                String
  assetType           AssetType
  serialNumber        String?
  manufacturer        String?
  model               String?
  purchaseDate        DateTime?         @db.Date
  purchasePrice       Float?
  warrantyExpiryDate  DateTime?         @db.Date
  location            String?
  departmentId        String?
  department          Department?       @relation(fields: [departmentId], references: [id])
  assignedToId        String?
  assignedTo          Employee?         @relation(fields: [assignedToId], references: [id])
  status              AssetStatus       @default(AVAILABLE)
  lastMaintenanceDate DateTime?         @db.Date
  nextMaintenanceDate DateTime?         @db.Date
  notes               String?
  tags                String[]
  maintenanceRecords  MaintenanceRecord[]
  assetHistory        AssetHistory[]
  biomedicalEquipment BiomedicalEquipment?
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  deletedAt           DateTime?

  @@index([assetType])
  @@index([status])
  @@index([departmentId])
  @@index([assignedToId])
}

model MaintenanceRecord {
  id                  String            @id @default(cuid())
  assetId             String
  asset               Asset             @relation(fields: [assetId], references: [id])
  maintenanceType     MaintenanceType
  date                DateTime          @db.Date
  performedBy         String
  cost                Float?
  description         String
  nextMaintenanceDate DateTime?         @db.Date
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  @@index([assetId])
  @@index([date])
  @@index([maintenanceType])
}

model AssetHistory {
  id          String            @id @default(cuid())
  assetId     String
  asset       Asset             @relation(fields: [assetId], references: [id])
  type        AssetHistoryType
  date        DateTime
  employeeId  String?
  employee    Employee?         @relation(fields: [employeeId], references: [id])
  details     Json
  createdAt   DateTime          @default(now())

  @@index([assetId])
  @@index([type])
  @@index([date])
  @@index([employeeId])
}
```

### Biomedical Equipment Management
```
model BiomedicalEquipment {
  id                    String              @id @default(cuid())
  assetId               String              @unique
  asset                 Asset               @relation(fields: [assetId], references: [id])
  equipmentType         BiomedicalEquipmentType
  deviceIdentifier      String?
  regulatoryClass       RegulatoryClass?
  riskLevel             RiskLevel?
  lastCalibrationDate   DateTime?           @db.Date
  nextCalibrationDate   DateTime?           @db.Date
  calibrationFrequency  Int?
  certifications        String[]
  isReusable            Boolean?
  sterilizationRequired Boolean?
  lastSterilizationDate DateTime?           @db.Date
  calibrationRecords    CalibrationRecord[]
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  @@index([equipmentType])
  @@index([regulatoryClass])
  @@index([riskLevel])
  @@index([nextCalibrationDate])
}

model CalibrationRecord {
  id                     String               @id @default(cuid())
  biomedicalEquipmentId  String
  biomedicalEquipment    BiomedicalEquipment  @relation(fields: [biomedicalEquipmentId], references: [id])
  date                   DateTime             @db.Date
  performedBy            String
  result                 CalibrationResult
  notes                  String?
  attachments            String[]
  createdAt              DateTime             @default(now())
  updatedAt              DateTime             @updatedAt

  @@index([biomedicalEquipmentId])
  @@index([date])
  @@index([result])
}
```

### Enums
```
enum Gender {
  MALE
  FEMALE
  OTHER
}

enum QualificationType {
  DEGREE
  LICENSE
  CERTIFICATION
  TRAINING
}

enum VerificationStatus {
  PENDING
  VERIFIED
  REJECTED
}

enum DepartmentType {
  CLINICAL
  ADMINISTRATIVE
  SUPPORT
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  HALF_DAY
}

enum VerificationMethod {
  BIOMETRIC
  MANUAL
  SYSTEM
}

enum BiometricType {
  FINGERPRINT
  FACE
  IRIS
}

enum PayrollStatus {
  DRAFT
  PROCESSING
  APPROVED
  PAID
}

enum AssetType {
  EQUIPMENT
  FURNITURE
  IT
  VEHICLE
  OTHER
}

enum AssetStatus {
  AVAILABLE
  IN_USE
  UNDER_MAINTENANCE
  DISPOSED
  LOST
}

enum MaintenanceType {
  PREVENTIVE
  CORRECTIVE
  CALIBRATION
  INSPECTION
}

enum AssetHistoryType {
  ACQUISITION
  ASSIGNMENT
  STATUS_CHANGE
  MAINTENANCE
  DISPOSAL
}

enum BiomedicalEquipmentType {
  DIAGNOSTIC
  THERAPEUTIC
  MONITORING
  LABORATORY
  SURGICAL
  LIFE_SUPPORT
  OTHER
}

enum RegulatoryClass {
  CLASS_I
  CLASS_II
  CLASS_III
}

enum RiskLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum CalibrationResult {
  PASS
  FAIL
  ADJUSTED
}
```

## API Documentation
The module provides a comprehensive RESTful API for all operations. The complete OpenAPI/Swagger documentation is available in the `src/app/api/hr/openapi.yaml` file.

### API Endpoints Overview

#### Staff Management
- `GET /api/hr/staff` - List employees
- `POST /api/hr/staff` - Create employee
- `GET /api/hr/staff/{id}` - Get employee
- `PUT /api/hr/staff/{id}` - Update employee
- `DELETE /api/hr/staff/{id}` - Delete employee
- `POST /api/hr/staff/{id}/positions` - Add position
- `POST /api/hr/staff/{id}/qualifications` - Add qualification

#### Attendance Management
- `GET /api/hr/attendance` - List attendance records
- `POST /api/hr/attendance` - Record attendance
- `POST /api/hr/attendance/checkout` - Record checkout
- `POST /api/hr/biometrics/templates` - Register biometric template
- `POST /api/hr/biometrics/verify` - Verify biometric

#### Payroll Management
- `GET /api/hr/payroll/salary-structures` - List salary structures
- `POST /api/hr/payroll/salary-structures` - Create salary structure
- `GET /api/hr/payroll/periods` - List payroll periods
- `POST /api/hr/payroll/periods` - Create payroll period
- `GET /api/hr/payroll/periods/{id}/entries` - List payroll entries
- `POST /api/hr/payroll/periods/{id}/entries` - Generate payroll entries

#### Asset Management
- `GET /api/hr/assets` - List assets
- `POST /api/hr/assets` - Create asset
- `GET /api/hr/assets/{id}` - Get asset
- `PUT /api/hr/assets/{id}` - Update asset
- `GET /api/hr/assets/{id}/maintenance` - Get maintenance records
- `POST /api/hr/assets/{id}/maintenance` - Record maintenance

#### Biomedical Equipment Management
- `GET /api/hr/biomedical` - List biomedical equipment
- `POST /api/hr/biomedical` - Create biomedical equipment
- `GET /api/hr/biomedical/{id}` - Get biomedical equipment
- `PUT /api/hr/biomedical/{id}` - Update biomedical equipment
- `DELETE /api/hr/biomedical/{id}` - Delete biomedical equipment
- `GET /api/hr/biomedical/{id}/calibration` - Get calibration records
- `POST /api/hr/biomedical/{id}/calibration` - Record calibration
- `GET /api/hr/biomedical/statistics` - Get biomedical statistics

#### Integration
- `GET /api/integration/clinical/staff` - Get staff for clinical module

## Component Documentation

### Service Layer Components

#### EmployeeService
The `EmployeeService` handles all operations related to employee management, including:
- Creating, updating, and retrieving employee records
- Managing employee positions and qualifications
- Handling employee status changes
- Converting between database models and FHIR Practitioner resources

Key methods:
- `createEmployee(data)`: Creates a new employee record
- `getEmployee(id)`: Retrieves an employee by ID
- `updateEmployee(id, data)`: Updates an employee record
- `deleteEmployee(id)`: Soft-deletes an employee record
- `listEmployees(params)`: Lists employees with filtering and pagination
- `addPosition(employeeId, data)`: Adds a position to an employee
- `addQualification(employeeId, data)`: Adds a qualification to an employee
- `toFHIRPractitioner(employee)`: Converts an employee to a FHIR Practitioner resource
- `fromFHIRPractitioner(practitioner)`: Converts a FHIR Practitioner resource to an employee

#### AttendanceService
The `AttendanceService` manages attendance tracking and leave management:
- Recording check-ins and check-outs
- Calculating attendance status
- Managing leave requests
- Generating attendance reports

Key methods:
- `recordAttendance(data)`: Records a new attendance entry
- `recordCheckout(employeeId, data)`: Records a checkout
- `getAttendanceRecord(id)`: Retrieves an attendance record
- `listAttendanceRecords(params)`: Lists attendance records with filtering
- `calculateAttendanceStatus(checkinTime, checkoutTime)`: Calculates attendance status
- `getMonthlyAttendanceSummary(employeeId, month, year)`: Generates monthly attendance summary

#### BiometricService
The `BiometricService` handles biometric template management and verification:
- Registering biometric templates
- Verifying biometric samples
- Managing biometric devices
- Logging verification attempts

Key methods:
- `registerTemplate(data)`: Registers a new biometric template
- `verifyBiometric(data)`: Verifies a biometric sample
- `getTemplates(employeeId, templateType)`: Retrieves templates for an employee
- `deactivateTemplate(id)`: Deactivates a template
- `logVerification(data)`: Logs a verification attempt

#### PayrollService
The `PayrollService` handles payroll processing and salary management:
- Managing salary structures
- Creating payroll periods
- Generating payroll entries
- Calculating salaries based on attendance

Key methods:
- `createSalaryStructure(data)`: Creates a new salary structure
- `getSalaryStructure(id)`: Retrieves a salary structure
- `createPayrollPeriod(data)`: Creates a new payroll period
- `generatePayrollEntries(periodId)`: Generates payroll entries for a period
- `calculatePayroll(employee, salaryStructure, attendance, workingDays)`: Calculates payroll
- `approvePayrollPeriod(id, approvedBy)`: Approves a payroll period
- `markPayrollPeriodAsPaid(id, paidBy)`: Marks a payroll period as paid

#### AssetService
The `AssetService` manages general asset tracking and maintenance:
- Creating and updating asset records
- Tracking asset assignments
- Managing maintenance records
- Recording asset history

Key methods:
- `createAsset(data)`: Creates a new asset
- `getAsset(id)`: Retrieves an asset
- `updateAsset(id, data)`: Updates an asset
- `assignAsset(id, employeeId)`: Assigns an asset to an employee
- `recordMaintenance(assetId, data)`: Records maintenance for an asset
- `getMaintenanceRecords(assetId)`: Retrieves maintenance records
- `getAssetHistory(assetId)`: Retrieves asset history

#### BiomedicalService
The `BiomedicalService` handles specialized biomedical equipment management:
- Creating and updating biomedical equipment records
- Managing calibration records
- Tracking regulatory compliance
- Generating equipment statistics

Key methods:
- `createBiomedicalEquipment(data)`: Creates new biomedical equipment
- `getBiomedicalEquipment(id)`: Retrieves biomedical equipment
- `updateBiomedicalEquipment(id, data)`: Updates biomedical equipment
- `recordCalibration(equipmentId, data)`: Records calibration
- `getCalibrationRecords(equipmentId)`: Retrieves calibration records
- `getEquipmentDueForCalibration(daysThreshold)`: Gets equipment due for calibration
- `getBiomedicalStatistics()`: Generates biomedical statistics

### UI Components

#### StaffDirectory
The `StaffDirectory` component displays a searchable, filterable list of employees with pagination.

Props:
- `departmentFilter`: Optional department ID to filter by
- `statusFilter`: Optional status to filter by
- `onEmployeeSelect`: Callback function when an employee is selected

#### EmployeeProfile
The `EmployeeProfile` component displays detailed information about an employee.

Props:
- `employeeId`: ID of the employee to display
- `editable`: Whether the profile is editable
- `onUpdate`: Callback function when the profile is updated

#### AttendanceTracker
The `AttendanceTracker` component displays attendance records with filtering options.

Props:
- `employeeId`: Optional employee ID to filter by
- `departmentId`: Optional department ID to filter by
- `dateRange`: Optional date range to filter by

#### PayrollManager
The `PayrollManager` component manages payroll periods and entries.

Props:
- `periodId`: Optional period ID to display
- `departmentId`: Optional department ID to filter by

#### AssetInventory
The `AssetInventory` component displays a searchable, filterable list of assets.

Props:
- `assetType`: Optional asset type to filter by
- `status`: Optional status to filter by
- `departmentId`: Optional department ID to filter by

#### BiomedicalEquipmentTracker
The `BiomedicalEquipmentTracker` component displays biomedical equipment with specialized filtering.

Props:
- `equipmentType`: Optional equipment type to filter by
- `regulatoryClass`: Optional regulatory class to filter by
- `riskLevel`: Optional risk level to filter by
- `calibrationDue`: Optional boolean to filter by calibration due status

## Workflows

### Employee Lifecycle Management
1. **Recruitment**
   - Create employee record with basic information
   - Assign to department and position
   - Record qualifications and certifications

2. **Onboarding**
   - Complete employee profile
   - Register biometric templates
   - Create salary structure
   - Assign assets as needed

3. **Position Changes**
   - Record new position with start date
   - Update primary position flag if needed
   - End previous position if replacing

4. **Termination**
   - Set termination date
   - Update active status
   - Reassign assets
   - Archive employee record

### Attendance Management
1. **Daily Check-in**
   - Employee provides biometric sample
   - System verifies against stored templates
   - On successful verification, record attendance
   - Calculate status (present, late) based on time

2. **Check-out**
   - Employee provides biometric sample for verification
   - System records checkout time
   - Updates attendance record with total hours

3. **Leave Management**
   - Employee submits leave request
   - Manager approves/rejects request
   - System updates attendance records accordingly
   - Leave balance is updated

### Payroll Processing
1. **Period Creation**
   - Create new payroll period with date range
   - Set payment date

2. **Entry Generation**
   - Generate entries for all active employees
   - Pull attendance data for the period
   - Apply salary structure for each employee
   - Calculate gross salary, deductions, and net salary

3. **Approval Workflow**
   - Review generated entries
   - Make adjustments if needed
   - Approve payroll period
   - Mark as paid after payment processing

### Asset Lifecycle Management
1. **Acquisition**
   - Record new asset with details
   - Assign to department if applicable
   - Record purchase information

2. **Assignment**
   - Assign asset to employee
   - Record assignment in history
   - Update asset status to IN_USE

3. **Maintenance**
   - Record maintenance activity
   - Update asset status during maintenance
   - Schedule next maintenance date

4. **Disposal**
   - Record disposal details
   - Update asset status to DISPOSED
   - Archive asset record

### Biomedical Equipment Management
1. **Registration**
   - Create asset record with basic information
   - Add biomedical-specific details
   - Record regulatory information

2. **Calibration**
   - Record calibration activity
   - Update calibration dates
   - Generate calibration certificate
   - Update equipment status based on result

3. **Compliance Monitoring**
   - Track equipment due for calibration
   - Monitor certification expirations
   - Generate compliance reports

## Integration Points

### Authentication and Authorization
- Integration with the central HMS authentication system
- Role-based access control for HR operations
- Employee profile integration with user accounts

### Clinical Module Integration
- Provides staff information to clinical modules
- Shares equipment availability status
- Receives equipment usage data

### Financial Module Integration
- Provides payroll data for financial reporting
- Receives budget information for departments
- Shares asset valuation and depreciation data

### Reporting Module Integration
- Provides HR metrics and KPIs
- Shares attendance and staffing data
- Provides equipment utilization statistics

## Security Considerations

### Data Encryption
- Sensitive employee data is encrypted at rest
- Biometric templates use specialized encryption
- Salary information is protected with field-level encryption

### Access Control
- Role-based access control for all operations
- Department-level access restrictions
- Audit logging for all sensitive operations

### HIPAA Compliance
- All data handling follows HIPAA guidelines
- PHI is properly secured and access-controlled
- Audit trails for all PHI access

### Biometric Data Protection
- Biometric templates are stored securely
- Templates are never exposed in raw form
- Verification happens on secure channels

## Error Handling

### Global Error Handling
- Consistent error response format across all APIs
- Detailed error messages for debugging
- User-friendly error messages for UI

### Domain-Specific Error Types
- `EmployeeNotFoundError`: When an employee cannot be found
- `BiometricVerificationError`: When biometric verification fails
- `PayrollCalculationError`: When payroll calculation encounters an issue
- `AssetNotAvailableError`: When an asset is not available for assignment
- `CalibrationRequiredError`: When equipment requires calibration

### Graceful Degradation
- Fallback to manual verification when biometrics fail
- Cached data usage when services are temporarily unavailable
- Queued operations for background processing when appropriate

### Logging Strategy
- Error logs with contextual information
- Security event logging for audit purposes
- Performance monitoring for critical operations
