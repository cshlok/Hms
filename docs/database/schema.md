# Database Schema Documentation for Support Services Management Module

This document provides a comprehensive overview of the database schema for the Support Services Management module of the Hospital Management System (HMS).

## Table of Contents
1. [Housekeeping Management](#housekeeping-management)
2. [Maintenance Management](#maintenance-management)
3. [Dietary Management](#dietary-management)
4. [Ambulance Management](#ambulance-management)
5. [Feedback & Complaint Management](#feedback--complaint-management)
6. [Marketing CRM](#marketing-crm)
7. [Integration Tables](#integration-tables)
8. [Relationships](#relationships)

## Housekeeping Management

### HousekeepingRequest
Stores information about housekeeping service requests.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| locationId | UUID | ID of the location where housekeeping is needed | Foreign Key (Location) |
| requestType | ENUM | Type of housekeeping request (CLEANING, DISINFECTION, LINEN_CHANGE, WASTE_DISPOSAL, SPILL_CLEANUP, OTHER) | Not Null |
| priority | ENUM | Priority level (LOW, MEDIUM, HIGH, URGENT) | Not Null |
| description | TEXT | Detailed description of the request | |
| scheduledTime | TIMESTAMP | Scheduled time for the housekeeping task | Not Null |
| status | ENUM | Current status (PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED) | Not Null, Default: PENDING |
| notes | TEXT | Additional notes about the request | |
| requestedById | UUID | ID of the user who requested the housekeeping | Foreign Key (User) |
| assignedToId | UUID | ID of the staff member assigned to the task | Foreign Key (User), Nullable |
| completedById | UUID | ID of the staff member who completed the task | Foreign Key (User), Nullable |
| completedAt | TIMESTAMP | Time when the task was completed | Nullable |
| createdAt | TIMESTAMP | Time when the request was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the request was last updated | Not Null, Default: NOW() |

### HousekeepingSchedule
Stores recurring housekeeping schedules.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| locationId | UUID | ID of the location | Foreign Key (Location) |
| requestType | ENUM | Type of housekeeping request | Not Null |
| frequency | ENUM | Frequency (DAILY, WEEKLY, BIWEEKLY, MONTHLY) | Not Null |
| dayOfWeek | INTEGER | Day of week (1-7, where 1 is Monday) | Nullable |
| dayOfMonth | INTEGER | Day of month (1-31) | Nullable |
| timeOfDay | TIME | Time of day | Not Null |
| priority | ENUM | Priority level | Not Null |
| isActive | BOOLEAN | Whether the schedule is active | Not Null, Default: true |
| createdById | UUID | ID of the user who created the schedule | Foreign Key (User) |
| createdAt | TIMESTAMP | Time when the schedule was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the schedule was last updated | Not Null, Default: NOW() |

### HousekeepingInventory
Tracks housekeeping supplies and inventory.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| name | VARCHAR(255) | Name of the item | Not Null |
| category | ENUM | Category (CLEANING_SUPPLIES, LINEN, EQUIPMENT, OTHER) | Not Null |
| currentStock | INTEGER | Current stock level | Not Null |
| minimumStock | INTEGER | Minimum stock level | Not Null |
| unit | VARCHAR(50) | Unit of measurement | Not Null |
| locationId | UUID | Storage location | Foreign Key (Location) |
| lastRestockDate | TIMESTAMP | Date of last restock | Nullable |
| createdAt | TIMESTAMP | Time when the item was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the item was last updated | Not Null, Default: NOW() |

## Maintenance Management

### MaintenanceRequest
Stores information about maintenance service requests.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| assetId | UUID | ID of the asset requiring maintenance | Foreign Key (MaintenanceAsset) |
| requestType | ENUM | Type of maintenance request (CORRECTIVE, PREVENTIVE, EMERGENCY, INSPECTION) | Not Null |
| priority | ENUM | Priority level (LOW, MEDIUM, HIGH, URGENT) | Not Null |
| description | TEXT | Detailed description of the request | Not Null |
| scheduledTime | TIMESTAMP | Scheduled time for the maintenance task | Not Null |
| status | ENUM | Current status (PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED) | Not Null, Default: PENDING |
| notes | TEXT | Additional notes about the request | |
| requestedById | UUID | ID of the user who requested the maintenance | Foreign Key (User) |
| departmentId | UUID | ID of the department requesting maintenance | Foreign Key (Department) |
| assignedToId | UUID | ID of the technician assigned to the task | Foreign Key (User), Nullable |
| startedAt | TIMESTAMP | Time when work started | Nullable |
| completedById | UUID | ID of the technician who completed the task | Foreign Key (User), Nullable |
| completedAt | TIMESTAMP | Time when the task was completed | Nullable |
| laborHours | FLOAT | Hours spent on the maintenance task | Nullable |
| partsUsed | JSONB | Parts used in the maintenance | Nullable |
| estimatedDuration | INTEGER | Estimated duration in minutes | Nullable |
| createdAt | TIMESTAMP | Time when the request was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the request was last updated | Not Null, Default: NOW() |

### MaintenanceAsset
Stores information about assets that require maintenance.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| name | VARCHAR(255) | Name of the asset | Not Null |
| type | ENUM | Type of asset (HVAC, ELECTRICAL, PLUMBING, MEDICAL_EQUIPMENT, IT_EQUIPMENT, FURNITURE, VEHICLE, OTHER) | Not Null |
| status | ENUM | Current status (OPERATIONAL, UNDER_MAINTENANCE, OUT_OF_SERVICE, RETIRED) | Not Null |
| location | VARCHAR(255) | Location of the asset | Not Null |
| serialNumber | VARCHAR(255) | Serial number of the asset | |
| model | VARCHAR(255) | Model of the asset | |
| manufacturer | VARCHAR(255) | Manufacturer of the asset | |
| purchaseDate | DATE | Date when the asset was purchased | Nullable |
| warrantyExpiryDate | DATE | Date when the warranty expires | Nullable |
| lastMaintenanceDate | TIMESTAMP | Date of the last maintenance | Nullable |
| nextMaintenanceDate | TIMESTAMP | Scheduled date for the next maintenance | Nullable |
| maintenanceFrequency | INTEGER | Maintenance frequency in days | Nullable |
| specifications | JSONB | Technical specifications | Nullable |
| documents | JSONB | Related documents (manuals, warranties) | Nullable |
| createdAt | TIMESTAMP | Time when the asset was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the asset was last updated | Not Null, Default: NOW() |

### MaintenancePart
Stores information about maintenance parts inventory.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| name | VARCHAR(255) | Name of the part | Not Null |
| partNumber | VARCHAR(255) | Part number | Not Null |
| category | VARCHAR(255) | Category of the part | Not Null |
| currentStock | INTEGER | Current stock level | Not Null |
| minimumStock | INTEGER | Minimum stock level | Not Null |
| location | VARCHAR(255) | Storage location | Not Null |
| supplier | VARCHAR(255) | Supplier information | |
| cost | DECIMAL | Cost per unit | Nullable |
| lastOrderDate | TIMESTAMP | Date of last order | Nullable |
| createdAt | TIMESTAMP | Time when the part was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the part was last updated | Not Null, Default: NOW() |

## Dietary Management

### DietaryRequest
Stores information about dietary service requests.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| patientId | UUID | ID of the patient | Foreign Key (Patient) |
| mealType | ENUM | Type of meal (BREAKFAST, LUNCH, DINNER, SNACK) | Not Null |
| dietType | ENUM | Type of diet (REGULAR, VEGETARIAN, VEGAN, DIABETIC, GLUTEN_FREE, LOW_SODIUM, LIQUID, SOFT, CUSTOM) | Not Null |
| customDietDetails | TEXT | Details for custom diet | Nullable |
| allergies | TEXT[] | Food allergies | Nullable |
| preferences | TEXT[] | Food preferences | Nullable |
| scheduledTime | TIMESTAMP | Scheduled time for the meal | Not Null |
| status | ENUM | Current status (PENDING, PREPARING, READY, DELIVERED, COMPLETED, CANCELLED) | Not Null, Default: PENDING |
| notes | TEXT | Additional notes about the request | |
| requestedById | UUID | ID of the user who requested the meal | Foreign Key (User) |
| locationId | UUID | ID of the location for delivery | Foreign Key (Location) |
| preparedById | UUID | ID of the staff member who prepared the meal | Foreign Key (User), Nullable |
| preparedAt | TIMESTAMP | Time when the meal was prepared | Nullable |
| deliveredById | UUID | ID of the staff member who delivered the meal | Foreign Key (User), Nullable |
| deliveredAt | TIMESTAMP | Time when the meal was delivered | Nullable |
| createdAt | TIMESTAMP | Time when the request was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the request was last updated | Not Null, Default: NOW() |

### DietaryMenu
Stores information about dietary menus.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| name | VARCHAR(255) | Name of the menu | Not Null |
| dietType | ENUM | Type of diet | Not Null |
| mealType | ENUM | Type of meal | Not Null |
| description | TEXT | Description of the menu | |
| nutritionalInfo | JSONB | Nutritional information | Nullable |
| items | JSONB | Menu items | Not Null |
| isActive | BOOLEAN | Whether the menu is active | Not Null, Default: true |
| createdAt | TIMESTAMP | Time when the menu was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the menu was last updated | Not Null, Default: NOW() |

### DietaryMenuItem
Stores information about individual menu items.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| name | VARCHAR(255) | Name of the item | Not Null |
| description | TEXT | Description of the item | |
| category | ENUM | Category (APPETIZER, MAIN_COURSE, SIDE_DISH, DESSERT, BEVERAGE) | Not Null |
| ingredients | TEXT[] | List of ingredients | Not Null |
| allergens | TEXT[] | List of allergens | Nullable |
| nutritionalInfo | JSONB | Nutritional information | Nullable |
| isActive | BOOLEAN | Whether the item is active | Not Null, Default: true |
| createdAt | TIMESTAMP | Time when the item was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the item was last updated | Not Null, Default: NOW() |

### PatientDietaryProfile
Stores dietary profiles for patients.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| patientId | UUID | ID of the patient | Foreign Key (Patient), Unique |
| dietType | ENUM | Type of diet | Not Null |
| allergies | TEXT[] | Food allergies | Nullable |
| preferences | TEXT[] | Food preferences | Nullable |
| restrictions | TEXT[] | Dietary restrictions | Nullable |
| notes | TEXT | Additional notes | |
| createdAt | TIMESTAMP | Time when the profile was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the profile was last updated | Not Null, Default: NOW() |

## Ambulance Management

### Ambulance
Stores information about ambulances.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| registrationNumber | VARCHAR(255) | Registration number of the ambulance | Not Null, Unique |
| type | ENUM | Type of ambulance (BASIC_LIFE_SUPPORT, ADVANCED_LIFE_SUPPORT, PATIENT_TRANSPORT, NEONATAL, MOBILE_ICU) | Not Null |
| status | ENUM | Current status (AVAILABLE, ASSIGNED, IN_SERVICE, UNDER_MAINTENANCE, OUT_OF_SERVICE) | Not Null |
| capacity | INTEGER | Capacity of the ambulance | Not Null |
| features | TEXT[] | Features of the ambulance | Nullable |
| lastMaintenanceDate | TIMESTAMP | Date of the last maintenance | Nullable |
| nextMaintenanceDate | TIMESTAMP | Scheduled date for the next maintenance | Nullable |
| currentLatitude | FLOAT | Current latitude of the ambulance | Nullable |
| currentLongitude | FLOAT | Current longitude of the ambulance | Nullable |
| createdAt | TIMESTAMP | Time when the ambulance was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the ambulance was last updated | Not Null, Default: NOW() |

### AmbulanceTrip
Stores information about ambulance trips.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| requestType | ENUM | Type of ambulance request (EMERGENCY, NON_EMERGENCY, TRANSFER, DISCHARGE, SCHEDULED) | Not Null |
| priority | ENUM | Priority level (LOW, MEDIUM, HIGH, URGENT) | Not Null |
| pickupLocation | VARCHAR(255) | Pickup location | Not Null |
| dropoffLocation | VARCHAR(255) | Dropoff location | Not Null |
| patientId | UUID | ID of the patient | Foreign Key (Patient), Nullable |
| scheduledTime | TIMESTAMP | Scheduled time for the trip | Not Null |
| status | ENUM | Current status (PENDING, ASSIGNED, EN_ROUTE_TO_PICKUP, AT_PICKUP, EN_ROUTE_TO_DROPOFF, COMPLETED, CANCELLED) | Not Null, Default: PENDING |
| notes | TEXT | Additional notes about the trip | |
| requestedById | UUID | ID of the user who requested the ambulance | Foreign Key (User) |
| ambulanceId | UUID | ID of the assigned ambulance | Foreign Key (Ambulance), Nullable |
| crew | JSONB | Assigned crew members | Nullable |
| contactName | VARCHAR(255) | Contact person name | |
| contactPhone | VARCHAR(255) | Contact person phone | |
| medicalEquipmentNeeded | TEXT[] | Medical equipment needed for the trip | Nullable |
| specialInstructions | TEXT | Special instructions for the trip | |
| startedAt | TIMESTAMP | Time when the trip started | Nullable |
| completedAt | TIMESTAMP | Time when the trip was completed | Nullable |
| createdAt | TIMESTAMP | Time when the request was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the request was last updated | Not Null, Default: NOW() |

### AmbulanceCrew
Stores information about ambulance crew members.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| userId | UUID | ID of the user | Foreign Key (User) |
| role | ENUM | Role (DRIVER, PARAMEDIC, EMT, NURSE, DOCTOR) | Not Null |
| certifications | TEXT[] | List of certifications | Nullable |
| isActive | BOOLEAN | Whether the crew member is active | Not Null, Default: true |
| createdAt | TIMESTAMP | Time when the crew member was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the crew member was last updated | Not Null, Default: NOW() |

### AmbulanceInventory
Stores information about ambulance inventory.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| ambulanceId | UUID | ID of the ambulance | Foreign Key (Ambulance) |
| itemName | VARCHAR(255) | Name of the item | Not Null |
| category | ENUM | Category (MEDICATION, EQUIPMENT, SUPPLY, OTHER) | Not Null |
| quantity | INTEGER | Quantity | Not Null |
| expiryDate | DATE | Expiry date | Nullable |
| lastCheckedDate | TIMESTAMP | Date of last inventory check | Not Null |
| checkedById | UUID | ID of the user who checked the inventory | Foreign Key (User) |
| createdAt | TIMESTAMP | Time when the inventory item was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the inventory item was last updated | Not Null, Default: NOW() |

## Feedback & Complaint Management

### Feedback
Stores information about patient feedback.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| patientId | UUID | ID of the patient | Foreign Key (Patient), Nullable |
| departmentId | UUID | ID of the department | Foreign Key (Department), Nullable |
| feedbackType | ENUM | Type of feedback (GENERAL, CARE_QUALITY, STAFF, FACILITIES, FOOD, CLEANLINESS, OTHER) | Not Null |
| rating | INTEGER | Rating (1-5) | Not Null |
| comments | TEXT | Feedback comments | |
| status | ENUM | Current status (NEW, REVIEWED, RESPONDED, CLOSED) | Not Null, Default: NEW |
| isAnonymous | BOOLEAN | Whether the feedback is anonymous | Not Null, Default: false |
| contactEmail | VARCHAR(255) | Contact email | Nullable |
| contactPhone | VARCHAR(255) | Contact phone | Nullable |
| reviewedById | UUID | ID of the user who reviewed the feedback | Foreign Key (User), Nullable |
| reviewedAt | TIMESTAMP | Time when the feedback was reviewed | Nullable |
| createdAt | TIMESTAMP | Time when the feedback was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the feedback was last updated | Not Null, Default: NOW() |

### Complaint
Stores information about patient complaints.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| patientId | UUID | ID of the patient | Foreign Key (Patient), Nullable |
| departmentId | UUID | ID of the department | Foreign Key (Department), Nullable |
| complaintType | ENUM | Type of complaint (SERVICE_QUALITY, BILLING, STAFF_BEHAVIOR, FACILITIES, MEDICAL_CARE, PRIVACY, OTHER) | Not Null |
| description | TEXT | Complaint description | Not Null |
| severity | ENUM | Severity level (LOW, MEDIUM, HIGH, CRITICAL) | Not Null |
| status | ENUM | Current status (OPEN, INVESTIGATING, RESOLVED, CLOSED) | Not Null, Default: OPEN |
| isAnonymous | BOOLEAN | Whether the complaint is anonymous | Not Null, Default: false |
| contactEmail | VARCHAR(255) | Contact email | Nullable |
| contactPhone | VARCHAR(255) | Contact phone | Nullable |
| preferredContactMethod | ENUM | Preferred contact method (EMAIL, PHONE, MAIL, NONE) | Not Null |
| incidentDate | TIMESTAMP | Date of the incident | Nullable |
| assignedToId | UUID | ID of the user assigned to handle the complaint | Foreign Key (User), Nullable |
| resolution | TEXT | Resolution details | Nullable |
| resolvedAt | TIMESTAMP | Time when the complaint was resolved | Nullable |
| createdAt | TIMESTAMP | Time when the complaint was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the complaint was last updated | Not Null, Default: NOW() |

### FeedbackResponse
Stores responses to feedback.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| feedbackId | UUID | ID of the feedback | Foreign Key (Feedback) |
| respondedById | UUID | ID of the user who responded | Foreign Key (User) |
| response | TEXT | Response text | Not Null |
| createdAt | TIMESTAMP | Time when the response was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the response was last updated | Not Null, Default: NOW() |

### ComplaintAction
Stores actions taken for complaints.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| complaintId | UUID | ID of the complaint | Foreign Key (Complaint) |
| actionType | ENUM | Type of action (INVESTIGATION, COMMUNICATION, RESOLUTION, OTHER) | Not Null |
| description | TEXT | Description of the action | Not Null |
| performedById | UUID | ID of the user who performed the action | Foreign Key (User) |
| performedAt | TIMESTAMP | Time when the action was performed | Not Null |
| createdAt | TIMESTAMP | Time when the action was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the action was last updated | Not Null, Default: NOW() |

## Marketing CRM

### MarketingCampaign
Stores information about marketing campaigns.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| name | VARCHAR(255) | Name of the campaign | Not Null |
| description | TEXT | Description of the campaign | |
| type | ENUM | Type of campaign (AWARENESS, PROMOTION, EVENT, EDUCATION, OUTREACH, OTHER) | Not Null |
| status | ENUM | Current status (PLANNED, ACTIVE, PAUSED, COMPLETED, CANCELLED) | Not Null |
| startDate | TIMESTAMP | Start date of the campaign | Not Null |
| endDate | TIMESTAMP | End date of the campaign | Not Null |
| budget | DECIMAL | Budget for the campaign | Nullable |
| targetAudience | TEXT | Target audience for the campaign | |
| goals | TEXT | Goals of the campaign | |
| channels | TEXT[] | Marketing channels used | Nullable |
| createdById | UUID | ID of the user who created the campaign | Foreign Key (User) |
| createdAt | TIMESTAMP | Time when the campaign was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the campaign was last updated | Not Null, Default: NOW() |

### MarketingContact
Stores information about marketing contacts.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| firstName | VARCHAR(255) | First name of the contact | Not Null |
| lastName | VARCHAR(255) | Last name of the contact | Not Null |
| email | VARCHAR(255) | Email of the contact | Nullable |
| phone | VARCHAR(255) | Phone number of the contact | Nullable |
| type | ENUM | Type of contact (PATIENT, REFERRER, PARTNER, OTHER) | Not Null |
| status | ENUM | Current status (ACTIVE, INACTIVE, UNSUBSCRIBED) | Not Null |
| address | VARCHAR(255) | Address of the contact | Nullable |
| city | VARCHAR(255) | City of the contact | Nullable |
| state | VARCHAR(255) | State of the contact | Nullable |
| zipCode | VARCHAR(255) | ZIP code of the contact | Nullable |
| dateOfBirth | DATE | Date of birth of the contact | Nullable |
| gender | ENUM | Gender (MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY) | Nullable |
| preferredContactMethod | ENUM | Preferred contact method (EMAIL, PHONE, MAIL, NONE) | Not Null |
| marketingConsent | BOOLEAN | Whether the contact has given marketing consent | Not Null, Default: false |
| notes | TEXT | Notes about the contact | |
| tags | TEXT[] | Tags associated with the contact | Nullable |
| createdAt | TIMESTAMP | Time when the contact was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the contact was last updated | Not Null, Default: NOW() |

### MarketingSegment
Stores information about marketing segments.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| name | VARCHAR(255) | Name of the segment | Not Null |
| description | TEXT | Description of the segment | |
| criteria | JSONB | Segmentation criteria | Not Null |
| type | ENUM | Type of segment (DEMOGRAPHIC, GEOGRAPHIC, BEHAVIORAL, INTEREST, OTHER) | Not Null |
| status | ENUM | Current status (ACTIVE, INACTIVE) | Not Null, Default: ACTIVE |
| createdById | UUID | ID of the user who created the segment | Foreign Key (User) |
| createdAt | TIMESTAMP | Time when the segment was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the segment was last updated | Not Null, Default: NOW() |

### MarketingCommunication
Stores information about marketing communications.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| campaignId | UUID | ID of the campaign | Foreign Key (MarketingCampaign) |
| type | ENUM | Type of communication (EMAIL, SMS, SOCIAL_MEDIA, PRINT, DIRECT_MAIL, PHONE, OTHER) | Not Null |
| subject | VARCHAR(255) | Subject of the communication | Not Null |
| content | TEXT | Content of the communication | Not Null |
| segmentId | UUID | ID of the target segment | Foreign Key (MarketingSegment), Nullable |
| scheduledDate | TIMESTAMP | Scheduled date for the communication | Not Null |
| status | ENUM | Current status (DRAFT, SCHEDULED, SENT, CANCELLED) | Not Null |
| sentAt | TIMESTAMP | Time when the communication was sent | Nullable |
| metrics | JSONB | Performance metrics | Nullable |
| createdById | UUID | ID of the user who created the communication | Foreign Key (User) |
| createdAt | TIMESTAMP | Time when the communication was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the communication was last updated | Not Null, Default: NOW() |

## Integration Tables

### SupportServiceIntegration
Stores integration information for support services.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| serviceType | ENUM | Type of service (HOUSEKEEPING, MAINTENANCE, DIETARY, AMBULANCE, FEEDBACK, MARKETING) | Not Null |
| status | ENUM | Integration status (ACTIVE, INACTIVE, ERROR) | Not Null |
| lastSyncTime | TIMESTAMP | Time of last synchronization | Nullable |
| configuration | JSONB | Integration configuration | Not Null |
| errorLog | TEXT | Error log | Nullable |
| createdAt | TIMESTAMP | Time when the integration was created | Not Null, Default: NOW() |
| updatedAt | TIMESTAMP | Time when the integration was last updated | Not Null, Default: NOW() |

### SupportServiceAuditLog
Stores audit logs for support services.

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | UUID | Unique identifier | Primary Key |
| serviceType | ENUM | Type of service | Not Null |
| actionType | ENUM | Type of action (CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, OTHER) | Not Null |
| resourceId | UUID | ID of the affected resource | Nullable |
| resourceType | VARCHAR(255) | Type of the affected resource | Not Null |
| userId | UUID | ID of the user who performed the action | Foreign Key (User), Nullable |
| ipAddress | VARCHAR(255) | IP address | Nullable |
| details | JSONB | Action details | Not Null |
| timestamp | TIMESTAMP | Time of the action | Not Null, Default: NOW() |

## Relationships

This section describes the relationships between the tables in the Support Services Management module.

### Housekeeping Management
- **HousekeepingRequest** has a many-to-one relationship with **Location** (locationId)
- **HousekeepingRequest** has a many-to-one relationship with **User** (requestedById, assignedToId, completedById)
- **HousekeepingSchedule** has a many-to-one relationship with **Location** (locationId)
- **HousekeepingSchedule** has a many-to-one relationship with **User** (createdById)
- **HousekeepingInventory** has a many-to-one relationship with **Location** (locationId)

### Maintenance Management
- **MaintenanceRequest** has a many-to-one relationship with **MaintenanceAsset** (assetId)
- **MaintenanceRequest** has a many-to-one relationship with **User** (requestedById, assignedToId, completedById)
- **MaintenanceRequest** has a many-to-one relationship with **Department** (departmentId)

### Dietary Management
- **DietaryRequest** has a many-to-one relationship with **Patient** (patientId)
- **DietaryRequest** has a many-to-one relationship with **User** (requestedById, preparedById, deliveredById)
- **DietaryRequest** has a many-to-one relationship with **Location** (locationId)
- **PatientDietaryProfile** has a one-to-one relationship with **Patient** (patientId)

### Ambulance Management
- **AmbulanceTrip** has a many-to-one relationship with **Patient** (patientId)
- **AmbulanceTrip** has a many-to-one relationship with **User** (requestedById)
- **AmbulanceTrip** has a many-to-one relationship with **Ambulance** (ambulanceId)
- **AmbulanceCrew** has a many-to-one relationship with **User** (userId)
- **AmbulanceInventory** has a many-to-one relationship with **Ambulance** (ambulanceId)
- **AmbulanceInventory** has a many-to-one relationship with **User** (checkedById)

### Feedback & Complaint Management
- **Feedback** has a many-to-one relationship with **Patient** (patientId)
- **Feedback** has a many-to-one relationship with **Department** (departmentId)
- **Feedback** has a many-to-one relationship with **User** (reviewedById)
- **Complaint** has a many-to-one relationship with **Patient** (patientId)
- **Complaint** has a many-to-one relationship with **Department** (departmentId)
- **Complaint** has a many-to-one relationship with **User** (assignedToId)
- **FeedbackResponse** has a many-to-one relationship with **Feedback** (feedbackId)
- **FeedbackResponse** has a many-to-one relationship with **User** (respondedById)
- **ComplaintAction** has a many-to-one relationship with **Complaint** (complaintId)
- **ComplaintAction** has a many-to-one relationship with **User** (performedById)

### Marketing CRM
- **MarketingCampaign** has a many-to-one relationship with **User** (createdById)
- **MarketingSegment** has a many-to-one relationship with **User** (createdById)
- **MarketingCommunication** has a many-to-one relationship with **MarketingCampaign** (campaignId)
- **MarketingCommunication** has a many-to-one relationship with **MarketingSegment** (segmentId)
- **MarketingCommunication** has a many-to-one relationship with **User** (createdById)

### Integration Tables
- **SupportServiceAuditLog** has a many-to-one relationship with **User** (userId)
