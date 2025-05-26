-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PROCESSING', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('FURNITURE', 'IT_EQUIPMENT', 'MEDICAL_EQUIPMENT', 'VEHICLE', 'BUILDING', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DISPOSED', 'LOST');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'CALIBRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RegulatoryStatus" AS ENUM ('REGISTERED', 'PENDING', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "RiskClassification" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CalibrationType" AS ENUM ('INITIAL', 'PERIODIC', 'UNSCHEDULED');

-- CreateEnum
CREATE TYPE "CalibrationStatus" AS ENUM ('PASSED', 'FAILED', 'INCOMPLETE');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "employeeId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "gender" "Gender",
    "birthDate" TIMESTAMP(3),
    "photo" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" JSONB,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "terminationDate" TIMESTAMP(3),
    "emergencyContact" JSONB,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePosition" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "identifier" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "attachment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "biometricVerified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leave" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "processedDate" TIMESTAMP(3) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "employeeCount" INTEGER NOT NULL,
    "processedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePayroll" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "basicSalary" DECIMAL(10,2) NOT NULL,
    "allowances" JSONB NOT NULL,
    "deductions" JSONB NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL,
    "netSalary" DECIMAL(10,2) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3),
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePayroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assetType" "AssetType" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "serialNumber" TEXT,
    "modelNumber" TEXT,
    "manufacturer" TEXT,
    "manufactureDate" TIMESTAMP(3),
    "purchaseDate" TIMESTAMP(3),
    "purchaseCost" DECIMAL(10,2),
    "expirationDate" TIMESTAMP(3),
    "departmentId" TEXT,
    "location" TEXT,
    "isBiomedical" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAssignment" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "maintenanceType" "MaintenanceType" NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "performedBy" TEXT,
    "cost" DECIMAL(10,2),
    "notes" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiomedicalEquipment" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "udiDeviceIdentifier" TEXT,
    "regulatoryStatus" "RegulatoryStatus" NOT NULL DEFAULT 'REGISTERED',
    "riskClassification" "RiskClassification" NOT NULL DEFAULT 'LOW',
    "lastCalibrationDate" TIMESTAMP(3),
    "nextCalibrationDate" TIMESTAMP(3),
    "calibrationFrequency" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiomedicalEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalibrationRecord" (
    "id" TEXT NOT NULL,
    "biomedicalEquipmentId" TEXT NOT NULL,
    "calibrationType" "CalibrationType" NOT NULL,
    "performedDate" TIMESTAMP(3) NOT NULL,
    "performedBy" TEXT NOT NULL,
    "status" "CalibrationStatus" NOT NULL DEFAULT 'PASSED',
    "notes" TEXT,
    "attachments" JSONB,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalibrationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeId_key" ON "Employee"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Position_code_key" ON "Position"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePosition_employeeId_positionId_startDate_key" ON "EmployeePosition"("employeeId", "positionId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_periodStart_periodEnd_key" ON "Payroll"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePayroll_payrollId_employeeId_key" ON "EmployeePayroll"("payrollId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetId_key" ON "Asset"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetAssignment_assetId_employeeId_assignedAt_key" ON "AssetAssignment"("assetId", "employeeId", "assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BiomedicalEquipment_assetId_key" ON "BiomedicalEquipment"("assetId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePosition" ADD CONSTRAINT "EmployeePosition_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePosition" ADD CONSTRAINT "EmployeePosition_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayroll" ADD CONSTRAINT "EmployeePayroll_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayroll" ADD CONSTRAINT "EmployeePayroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiomedicalEquipment" ADD CONSTRAINT "BiomedicalEquipment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationRecord" ADD CONSTRAINT "CalibrationRecord_biomedicalEquipmentId_fkey" FOREIGN KEY ("biomedicalEquipmentId") REFERENCES "BiomedicalEquipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
