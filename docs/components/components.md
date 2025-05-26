# Component Documentation for Support Services Management Module

This document provides comprehensive documentation for the components in the Support Services Management module of the Hospital Management System (HMS).

## Table of Contents
1. [Housekeeping Management Components](#housekeeping-management-components)
2. [Maintenance Management Components](#maintenance-management-components)
3. [Dietary Management Components](#dietary-management-components)
4. [Ambulance Management Components](#ambulance-management-components)
5. [Feedback & Complaint Management Components](#feedback--complaint-management-components)
6. [Marketing CRM Components](#marketing-crm-components)
7. [Shared Components](#shared-components)
8. [Integration Components](#integration-components)

## Housekeeping Management Components

### HousekeepingDashboard
The main dashboard component for housekeeping management.

**Props:**
- None

**State:**
- `requests`: Array of housekeeping requests
- `loading`: Boolean indicating loading state
- `error`: Error object
- `filters`: Object containing filter criteria
- `pagination`: Object containing pagination information

**Key Functions:**
- `fetchRequests()`: Fetches housekeeping requests based on filters and pagination
- `handleFilterChange()`: Updates filters and refetches requests
- `handlePageChange()`: Updates pagination and refetches requests
- `handleStatusChange()`: Updates the status of a request

**Usage Example:**
```jsx
<HousekeepingDashboard />
```

### HousekeepingRequestForm
Form component for creating and editing housekeeping requests.

**Props:**
- `initialData`: (Optional) Initial data for editing an existing request
- `onSubmit`: Function to call when the form is submitted
- `onCancel`: Function to call when the form is cancelled

**State:**
- `formData`: Object containing form field values
- `errors`: Object containing validation errors
- `loading`: Boolean indicating submission state
- `locations`: Array of available locations

**Key Functions:**
- `handleChange()`: Updates form field values
- `handleSubmit()`: Validates and submits the form
- `validateForm()`: Validates form fields
- `fetchLocations()`: Fetches available locations

**Usage Example:**
```jsx
<HousekeepingRequestForm 
  onSubmit={(data) => console.log(data)} 
  onCancel={() => console.log('Cancelled')} 
/>
```

### HousekeepingScheduleCalendar
Calendar component for viewing and managing housekeeping schedules.

**Props:**
- `locationId`: (Optional) ID of the location to filter schedules
- `onScheduleClick`: Function to call when a schedule is clicked

**State:**
- `schedules`: Array of housekeeping schedules
- `loading`: Boolean indicating loading state
- `error`: Error object
- `view`: String indicating the current calendar view (day, week, month)

**Key Functions:**
- `fetchSchedules()`: Fetches housekeeping schedules
- `handleViewChange()`: Changes the calendar view
- `handleScheduleClick()`: Handles click on a schedule
- `handleDateChange()`: Changes the displayed date range

**Usage Example:**
```jsx
<HousekeepingScheduleCalendar 
  onScheduleClick={(schedule) => console.log(schedule)} 
/>
```

### HousekeepingRequestDetail
Component for displaying detailed information about a housekeeping request.

**Props:**
- `requestId`: ID of the request to display
- `onStatusChange`: Function to call when the status is changed
- `onEdit`: Function to call when the edit button is clicked
- `onBack`: Function to call when the back button is clicked

**State:**
- `request`: Object containing request details
- `loading`: Boolean indicating loading state
- `error`: Error object

**Key Functions:**
- `fetchRequest()`: Fetches request details
- `handleStatusChange()`: Updates the status of the request
- `handleAssign()`: Assigns the request to a staff member
- `handleComplete()`: Marks the request as completed

**Usage Example:**
```jsx
<HousekeepingRequestDetail 
  requestId="123e4567-e89b-12d3-a456-426614174000"
  onStatusChange={(status) => console.log(status)}
  onEdit={() => console.log('Edit')}
  onBack={() => console.log('Back')}
/>
```

### HousekeepingInventoryList
Component for displaying and managing housekeeping inventory.

**Props:**
- `onItemClick`: Function to call when an inventory item is clicked
- `onAddItem`: Function to call when the add item button is clicked

**State:**
- `inventory`: Array of inventory items
- `loading`: Boolean indicating loading state
- `error`: Error object
- `filters`: Object containing filter criteria
- `pagination`: Object containing pagination information

**Key Functions:**
- `fetchInventory()`: Fetches inventory items
- `handleFilterChange()`: Updates filters and refetches inventory
- `handlePageChange()`: Updates pagination and refetches inventory
- `handleRestock()`: Updates the stock level of an item

**Usage Example:**
```jsx
<HousekeepingInventoryList 
  onItemClick={(item) => console.log(item)}
  onAddItem={() => console.log('Add item')}
/>
```

## Maintenance Management Components

### MaintenanceDashboard
The main dashboard component for maintenance management.

**Props:**
- None

**State:**
- `requests`: Array of maintenance requests
- `loading`: Boolean indicating loading state
- `error`: Error object
- `filters`: Object containing filter criteria
- `pagination`: Object containing pagination information

**Key Functions:**
- `fetchRequests()`: Fetches maintenance requests based on filters and pagination
- `handleFilterChange()`: Updates filters and refetches requests
- `handlePageChange()`: Updates pagination and refetches requests
- `handleStatusChange()`: Updates the status of a request

**Usage Example:**
```jsx
<MaintenanceDashboard />
```

### MaintenanceRequestForm
Form component for creating and editing maintenance requests.

**Props:**
- `initialData`: (Optional) Initial data for editing an existing request
- `onSubmit`: Function to call when the form is submitted
- `onCancel`: Function to call when the form is cancelled

**State:**
- `formData`: Object containing form field values
- `errors`: Object containing validation errors
- `loading`: Boolean indicating submission state
- `assets`: Array of available assets
- `departments`: Array of available departments

**Key Functions:**
- `handleChange()`: Updates form field values
- `handleSubmit()`: Validates and submits the form
- `validateForm()`: Validates form fields
- `fetchAssets()`: Fetches available assets
- `fetchDepartments()`: Fetches available departments

**Usage Example:**
```jsx
<MaintenanceRequestForm 
  onSubmit={(data) => console.log(data)} 
  onCancel={() => console.log('Cancelled')} 
/>
```

### MaintenanceAssetList
Component for displaying and managing maintenance assets.

**Props:**
- `onAssetClick`: Function to call when an asset is clicked
- `onAddAsset`: Function to call when the add asset button is clicked

**State:**
- `assets`: Array of assets
- `loading`: Boolean indicating loading state
- `error`: Error object
- `filters`: Object containing filter criteria
- `pagination`: Object containing pagination information

**Key Functions:**
- `fetchAssets()`: Fetches assets based on filters and pagination
- `handleFilterChange()`: Updates filters and refetches assets
- `handlePageChange()`: Updates pagination and refetches assets
- `handleStatusChange()`: Updates the status of an asset

**Usage Example:**
```jsx
<MaintenanceAssetList 
  onAssetClick={(asset) => console.log(asset)}
  onAddAsset={() => console.log('Add asset')}
/>
```

### MaintenanceRequestDetail
Component for displaying detailed information about a maintenance request.

**Props:**
- `requestId`: ID of the request to display
- `onStatusChange`: Function to call when the status is changed
- `onEdit`: Function to call when the edit button is clicked
- `onBack`: Function to call when the back button is clicked

**State:**
- `request`: Object containing request details
- `loading`: Boolean indicating loading state
- `error`: Error object

**Key Functions:**
- `fetchRequest()`: Fetches request details
- `handleStatusChange()`: Updates the status of the request
- `handleAssign()`: Assigns the request to a technician
- `handleComplete()`: Marks the request as completed
- `handlePartsUsed()`: Updates the parts used for the request

**Usage Example:**
```jsx
<MaintenanceRequestDetail 
  requestId="123e4567-e89b-12d3-a456-426614174000"
  onStatusChange={(status) => console.log(status)}
  onEdit={() => console.log('Edit')}
  onBack={() => console.log('Back')}
/>
```

### MaintenanceScheduleCalendar
Calendar component for viewing and managing maintenance schedules.

**Props:**
- `assetId`: (Optional) ID of the asset to filter schedules
- `onScheduleClick`: Function to call when a schedule is clicked

**State:**
- `schedules`: Array of maintenance schedules
- `loading`: Boolean indicating loading state
- `error`: Error object
- `view`: String indicating the current calendar view (day, week, month)

**Key Functions:**
- `fetchSchedules()`: Fetches maintenance schedules
- `handleViewChange()`: Changes the calendar view
- `handleScheduleClick()`: Handles click on a schedule
- `handleDateChange()`: Changes the displayed date range

**Usage Example:**
```jsx
<MaintenanceScheduleCalendar 
  onScheduleClick={(schedule) => console.log(schedule)} 
/>
```

## Dietary Management Components

### DietaryDashboard
The main dashboard component for dietary management.

**Props:**
- None

**State:**
- `requests`: Array of dietary requests
- `loading`: Boolean indicating loading state
- `error`: Error object
- `filters`: Object containing filter criteria
- `pagination`: Object containing pagination information

**Key Functions:**
- `fetchRequests()`: Fetches dietary requests based on filters and pagination
- `handleFilterChange()`: Updates filters and refetches requests
- `handlePageChange()`: Updates pagination and refetches requests
- `handleStatusChange()`: Updates the status of a request

**Usage Example:**
```jsx
<DietaryDashboard />
```

### DietaryRequestForm
Form component for creating and editing dietary requests.

**Props:**
- `initialData`: (Optional) Initial data for editing an existing request
- `onSubmit`: Function to call when the form is submitted
- `onCancel`: Function to call when the form is cancelled

**State:**
- `formData`: Object containing form field values
- `errors`: Object containing validation errors
- `loading`: Boolean indicating submission state
- `patients`: Array of available patients
- `dietTypes`: Array of available diet types
- `locations`: Array of available locations

**Key Functions:**
- `handleChange()`: Updates form field values
- `handleSubmit()`: Validates and submits the form
- `validateForm()`: Validates form fields
- `fetchPatients()`: Fetches available patients
- `fetchLocations()`: Fetches available locations
- `handleAllergiesChange()`: Updates allergies list
- `handlePreferencesChange()`: Updates preferences list

**Usage Example:**
```jsx
<DietaryRequestForm 
  onSubmit={(data) => console.log(data)} 
  onCancel={() => console.log('Cancelled')} 
/>
```

### DietaryMenuList
Component for displaying and managing dietary menus.

**Props:**
- `onMenuClick`: Function to call when a menu is clicked
- `onAddMenu`: Function to call when the add menu button is clicked

**State:**
- `menus`: Array of menus
- `loading`: Boolean indicating loading state
- `error`: Error object
- `filters`: Object containing filter criteria
- `pagination`: Object containing pagination information

**Key Functions:**
- `fetchMenus()`: Fetches menus based on filters and pagination
- `handleFilterChange()`: Updates filters and refetches menus
- `handlePageChange()`: Updates pagination and refetches menus
- `handleStatusChange()`: Updates the status of a menu

**Usage Example:**
```jsx
<DietaryMenuList 
  onMenuClick={(menu) => console.log(menu)}
  onAddMenu={() => console.log('Add menu')}
/>
```

### DietaryRequestDetail
Component for displaying detailed information about a dietary request.

**Props:**
- `requestId`: ID of the request to display
- `onStatusChange`: Function to call when the status is changed
- `onEdit`: Function to call when the edit button is clicked
- `onBack`: Function to call when the back button is clicked

**State:**
- `request`: Object containing request details
- `loading`: Boolean indicating loading state
- `error`: Error object

**Key Functions:**
- `fetchRequest()`: Fetches request details
- `handleStatusChange()`: Updates the status of the request
- `handlePrepare()`: Marks the request as prepared
- `handleDeliver()`: Marks the request as delivered

**Usage Example:**
```jsx
<DietaryRequestDetail 
  requestId="123e4567-e89b-12d3-a456-426614174000"
  onStatusChange={(status) => console.log(status)}
  onEdit={() => console.log('Edit')}
  onBack={() => console.log('Back')}
/>
```

### PatientDietaryProfileForm
Form component for creating and editing patient dietary profiles.

**Props:**
- `patientId`: ID of the patient
- `initialData`: (Optional) Initial data for editing an existing profile
- `onSubmit`: Function to call when the form is submitted
- `onCancel`: Function to call when the form is cancelled

**State:**
- `formData`: Object containing form field values
- `errors`: Object containing validation errors
- `loading`: Boolean indicating submission state

**Key Functions:**
- `handleChange()`: Updates form field values
- `handleSubmit()`: Validates and submits the form
- `validateForm()`: Validates form fields
- `handleAllergiesChange()`: Updates allergies list
- `handlePreferencesChange()`: Updates preferences list
- `handleRestrictionsChange()`: Updates restrictions list

**Usage Example:**
```jsx
<PatientDietaryProfileForm 
  patientId="123e4567-e89b-12d3-a456-426614174000"
  onSubmit={(data) => console.log(data)} 
  onCancel={() => console.log('Cancelled')} 
/>
```

## Ambulance Management Components

### AmbulanceDashboard
The main dashboard component for ambulance management.

**Props:**
- None

**State:**
- `trips`: Array of ambulance trips
- `ambulances`: Array of ambulances
- `loading`: Boolean indicating loading state
- `error`: Error object
- `filters`: Object containing filter criteria
- `pagination`: Object containing pagination information

**Key Functions:**
- `fetchTrips()`: Fetches ambulance trips based on filters and pagination
- `fetchAmbulances()`: Fetches ambulances
- `handleFilterChange()`: Updates filters and refetches trips
- `handlePageChange()`: Updates pagination and refetches trips
- `handleStatusChange()`: Updates the status of a trip

**Usage Example:**
```jsx
<AmbulanceDashboard />
```

### AmbulanceTripRequestForm
Form component for creating and editing ambulance trip requests.

**Props:**
- `initialData`: (Optional) Initial data for editing an existing request
- `onSubmit`: Function to call when the form is submitted
- `onCancel`: Function to call when the form is cancelled

**State:**
- `formData`: Object containing form field values
- `errors`: Object containing validation errors
- `loading`: Boolean indicating submission state
- `patients`: Array of available patients
- `ambulances`: Array of available ambulances

**Key Functions:**
- `handleChange()`: Updates form field values
- `handleSubmit()`: Validates and submits the form
- `validateForm()`: Validates form fields
- `fetchPatients()`: Fetches available patients
- `fetchAmbulances()`: Fetches available ambulances
- `handleEquipmentChange()`: Updates equipment list

**Usage Example:**
```jsx
<AmbulanceTripRequestForm 
  onSubmit={(data) => console.log(data)} 
  onCancel={() => console.log('Cancelled')} 
/>
```

### AmbulanceList
Component for displaying and managing ambulances.

**Props:**
- `onAmbulanceClick`: Function to call when an ambulance is clicked
- `onAddAmbulance`: Function to call when the add ambulance button is clicked

**State:**
- `ambulances`: Array of ambulances
- `loading`: Boolean indicating loading state
- `error`: Error object
- `filters`: Object containing filter criteria
- `pagination`: Object containing pagination information

**Key Functions:**
- `fetchAmbulances()`: Fetches ambulances based on filters and pagination
- `handleFilterChange()`: Updates filters and refetches ambulances
- `handlePageChange()`: Updates pagination and refetches ambulances
- `handleStatusChange()`: Updates the status of an ambulance

**Usage Example:**
```jsx
<AmbulanceList 
  onAmbulanceClick={(ambulance) => console.log(ambulance)}
  onAddAmbulance={() => console.log('Add ambulance')}
/>
```

### AmbulanceTripDetail
Component for displaying detailed information about an ambulance trip.

**Props:**
- `tripId`: ID of the trip to display
- `onStatusChange`: Function to call when the status is changed
- `onEdit`: Function to call when the edit button is clicked
- `onBack`: Function to call when the back button is clicked

**State:**
- `trip`: Object containing trip details
- `loading`: Boolean indicating loading state
- `error`: Error object

**Key Functions:**
- `fetchTrip()`: Fetches trip details
- `handleStatusChange()`: Updates the status of the trip
- `handleAssign()`: Assigns the trip to an ambulance and crew
- `handleStart()`: Marks the trip as started
- `handleComplete()`: Marks the trip as completed
- `handleLocationUpdate()`: Updates the current location of the ambulance

**Usage Example:**
```jsx
<AmbulanceTripDetail 
  tripId="123e4567-e89b-12d3-a456-426614174000"
  onStatusChange={(status) => console.log(status)}
  onEdit={() => console.log('Edit')}
  onBack={() => console.log('Back')}
/>
```

### AmbulanceMap
Component for displaying ambulance locations on a map.

**Props:**
- `ambulanceId`: (Optional) ID of a specific ambulance to track
- `tripId`: (Optional) ID of a specific trip to track
- `onAmbulanceClick`: Function to call when an ambulance marker is clicked

**State:**
- `ambulances`: Array of ambulances with location data
- `loading`: Boolean indicating loading state
- `error`: Error object
- `center`: Object containing map center coordinates
- `zoom`: Number indicating map zoom level

**Key Functions:**
- `fetchAmbulanceLocations()`: Fetches ambulance locations
- `handleAmbulanceClick()`: Handles click on an ambulance marker
- `handleMapMove()`: Updates center and zoom when the map is moved
- `startLocationTracking()`: Starts real-time location tracking
- `stopLocationTracking()`: Stops real-time location tracking

**Usage Example:**
```jsx
<AmbulanceMap 
  onAmbulanceClick={(ambulance) => console.log(ambulance)}
/>
```

## Feedback & Complaint Management Components

### FeedbackDashboard
The main dashboard component for feedback management.

**Props:**
- None

**State:**
- `feedback`: Array of feedback items
- `complaints`: Array of complaints
- `loading`: Boolean indicating loading state
- `error`: Error object
- `filters`: Object containing filter criteria
- `pagination`: Object containing pagination information

**Key Functions:**
- `fetchFeedback()`: Fetches feedback items based on filters and pagination
- `fetchComplaints()`: Fetches complaints based on filters and pagination
- `handleFilterChange()`: Updates filters and refetches data
- `handlePageChange()`: Updates pagination and refetches data
- `handleStatusChange()`: Updates the status of a feedback item or complaint

**Usage Example:**
```jsx
<FeedbackDashboard />
```

### FeedbackForm
Form component for submitting feedback.

**Props:**
- `initialData`: (Optional) Initial data for editing existing feedback
- `onSubmit`: Function to call when the form is submitted
- `onCancel`: Function to call when the form is cancelled

**State:**
- `formData`: Object containing form field values
- `errors`: Object containing validation errors
- `loading`: Boolean indicating submission state
- `departments`: Array of available departments

**Key Functions:**
- `handleChange()`: Updates form field values
- `handleSubmit()`: Validates and submits the form
- `validateForm()`: Validates form fields
- `fetchDepartments()`: Fetches available departments
- `handleRatingChange()`: Updates the rating value

**Usage Example:**
```jsx
<FeedbackForm 
  onSubmit={(data) => console.log(data)} 
  onCancel={() => console.log('Cancelled')} 
/>
```

### ComplaintForm
Form component for submitting complaints.

**Props:**
- `initialData`: (Optional) Initial data for editing an existing complaint
- `onSubmit`: Function to call when the form is submitted
- `onCancel`: Function to call when the form is cancelled

**State:**
- `formData`: Object containing form field values
- `errors`: Object containing validation errors
- `loading`: Boolean indicating submission state
- `departments`: Array of available departments

**Key Functions:**
- `handleChange()`: Updates form field values
- `handleSubmit()`: Validates and submits the form
- `validateForm()`: Validates form fields
- `fetchDepartments()`: Fetches available departments
- `handleSeverityChange()`: Updates the severity level

**Usage Example:**
```jsx
<ComplaintForm 
  onSubmit={(data) => console.log(data)} 
  onCancel={() => console.log('Cancelled')} 
/>
```

### FeedbackDetail
Component for displaying detailed information about a feedback item.

**Props:**
- `feedbackId`: ID of the feedback to display
- `onStatusChange`: Function to call when the status is changed
- `onRespond`: Function to call when the respond button is clicked
- `onBack`: Function to call when the back button is clicked

**State:**
- `feedback`: Object containing feedback details
- `responses`: Array of responses to the feedback
- `loading`: Boolean indicating loading state
- `error`: Error object

**Key Functions:**
- `fetchFeedback()`: Fetches feedback details
- `fetchResponses()`: Fetches responses to the feedback
- `handleStatusChange()`: Updates the status of the feedback
- `handleReview()`: Marks the feedback as reviewed
- `handleRespond()`: Submits a response to the feedback

**Usage Example:**
```jsx
<FeedbackDetail 
  feedbackId="123e4567-e89b-12d3-a456-426614174000"
  onStatusChange={(status) => console.log(status)}
  onRespond={() => console.log('Respond')}
  onBack={() => console.log('Back')}
/>
```

### ComplaintDetail
Component for displaying detailed information about a complaint.

**Props:**
- `complaintId`: ID of the complaint to display
- `onStatusChange`: Function to call when the status is changed
- `onAddAction`: Function to call when the add action button is clicked
- `onBack`: Function to call when the back button is clicked

**State:**
- `complaint`: Object containing complaint details
- `actions`: Array of actions taken for the complaint
- `loading`: Boolean indicating loading state
- `error`: Error object

**Key Functions:**
- `fetchComplaint()`: Fetches complaint details
- `fetchActions()`: Fetches actions taken for the complaint
- `handleStatusChange()`: Updates the status of the complaint
- `handleAssign()`: Assigns the complaint to a user
- `handleResolve()`: Marks the complaint as resolved
- `handleAddAction()`: Adds a new action for the complaint

**Usage Example:**
```jsx
<ComplaintDetail 
  complaintId="123e4567-e89b-12d3-a456-426614174000"
  onStatusChange={(status) => console.log(status)}
  onAddAction={() => console.log('Add action')}
  onBack={() => console.log('Back')}
/>
```

### FeedbackAnalytics
Component for displaying feedback analytics.

**Props:**
- `fromDate`: (Optional) Start date for analytics
- `toDate`: (Optional) End date for analytics
- `departmentId`: (Optional) ID of the department to filter analytics

**State:**
- `analytics`: Object containing analytics data
- `loading`: Boolean indicating loading state
- `error`: Error object

**Key Functions:**
- `fetchAnalytics()`: Fetches analytics data
- `handleDateRangeChange()`: Updates date range and refetches analytics
- `handleDepartmentChange()`: Updates department filter and refetches analytics
- `exportAnalytics()`: Exports analytics data to CSV or PDF

**Usage Example:**
```jsx
<FeedbackAnalytics 
  fromDate="2025-01-01"
  toDate="2025-05-25"
/>
```

## Marketing CRM Components

### MarketingDashboard
The main dashboard component for marketing CRM.

**Props:**
- None

**State:**
- `campaigns`: Array of marketing campaigns
- `contacts`: Array of marketing contacts
- `loading`: Boolean indicating loading state
- `error`: Error object
- `filters`: Object containing filter criteria
- `pagination`: Object containing pagination information

**Key Functions:**
- `fetchCampaigns()`: Fetches marketing campaigns based on filters and pagination
- `fetchContacts()`: Fetches marketing contacts based on filters and pagination
- `handleFilterChange()`: Updates filters and refetches data
- `handlePageChange()`: Updates pagination and refetches data
- `handleStatusChange()`: Updates the status of a campaign

**Usage Example:**
```jsx
<MarketingDashboard />
```

### CampaignForm
Form component for creating and editing marketing campaigns.

**Props:**
- `initialData`: (Optional) Initial data for editing an existing campaign
- `onSubmit`: Function to call when the form is submitted
- `onCancel`: Function to call when the form is cancelled

**State:**
- `formData`: Object containing form field values
- `errors`: Object containing validation errors
- `loading`: Boolean indicating submission state

**Key Functions:**
- `handleChange()`: Updates form field values
- `handleSubmit()`: Validates and submits the form
- `validateForm()`: Validates form fields
- `handleChannelsChange()`: Updates marketing channels list
- `handleDateChange()`: Updates start and end dates

**Usage Example:**
```jsx
<CampaignForm 
  onSubmit={(data) => console.log(data)} 
  onCancel={() => console.log('Cancelled')} 
/>
```

### ContactForm
Form component for creating and editing marketing contacts.

**Props:**
- `initialData`: (Optional) Initial data for editing an existing contact
- `onSubmit`: Function to call when the form is submitted
- `onCancel`: Function to call when the form is cancelled

**State:**
- `formData`: Object containing form field values
- `errors`: Object containing validation errors
- `loading`: Boolean indicating submission state

**Key Functions:**
- `handleChange()`: Updates form field values
- `handleSubmit()`: Validates and submits the form
- `validateForm()`: Validates form fields
- `handleTagsChange()`: Updates tags list
- `handleConsentChange()`: Updates marketing consent status

**Usage Example:**
```jsx
<ContactForm 
  onSubmit={(data) => console.log(data)} 
  onCancel={() => console.log('Cancelled')} 
/>
```

### CampaignDetail
Component for displaying detailed information about a marketing campaign.

**Props:**
- `campaignId`: ID of the campaign to display
- `onStatusChange`: Function to call when the status is changed
- `onEdit`: Function to call when the edit button is clicked
- `onBack`: Function to call when the back button is clicked

**State:**
- `campaign`: Object containing campaign details
- `communications`: Array of communications for the campaign
- `loading`: Boolean indicating loading state
- `error`: Error object

**Key Functions:**
- `fetchCampaign()`: Fetches campaign details
- `fetchCommunications()`: Fetches communications for the campaign
- `handleStatusChange()`: Updates the status of the campaign
- `handleAddCommunication()`: Adds a new communication for the campaign
- `handleMetricsUpdate()`: Updates campaign metrics

**Usage Example:**
```jsx
<CampaignDetail 
  campaignId="123e4567-e89b-12d3-a456-426614174000"
  onStatusChange={(status) => console.log(status)}
  onEdit={() => console.log('Edit')}
  onBack={() => console.log('Back')}
/>
```

### ContactList
Component for displaying and managing marketing contacts.

**Props:**
- `onContactClick`: Function to call when a contact is clicked
- `onAddContact`: Function to call when the add contact button is clicked

**State:**
- `contacts`: Array of contacts
- `loading`: Boolean indicating loading state
- `error`: Error object
- `filters`: Object containing filter criteria
- `pagination`: Object containing pagination information

**Key Functions:**
- `fetchContacts()`: Fetches contacts based on filters and pagination
- `handleFilterChange()`: Updates filters and refetches contacts
- `handlePageChange()`: Updates pagination and refetches contacts
- `handleStatusChange()`: Updates the status of a contact
- `handleExport()`: Exports contacts to CSV or Excel

**Usage Example:**
```jsx
<ContactList 
  onContactClick={(contact) => console.log(contact)}
  onAddContact={() => console.log('Add contact')}
/>
```

### SegmentForm
Form component for creating and editing marketing segments.

**Props:**
- `initialData`: (Optional) Initial data for editing an existing segment
- `onSubmit`: Function to call when the form is submitted
- `onCancel`: Function to call when the form is cancelled

**State:**
- `formData`: Object containing form field values
- `errors`: Object containing validation errors
- `loading`: Boolean indicating submission state

**Key Functions:**
- `handleChange()`: Updates form field values
- `handleSubmit()`: Validates and submits the form
- `validateForm()`: Validates form fields
- `handleCriteriaChange()`: Updates segmentation criteria
- `testSegment()`: Tests the segment against existing contacts

**Usage Example:**
```jsx
<SegmentForm 
  onSubmit={(data) => console.log(data)} 
  onCancel={() => console.log('Cancelled')} 
/>
```

### MarketingAnalytics
Component for displaying marketing analytics.

**Props:**
- `fromDate`: (Optional) Start date for analytics
- `toDate`: (Optional) End date for analytics
- `campaignId`: (Optional) ID of the campaign to filter analytics

**State:**
- `analytics`: Object containing analytics data
- `loading`: Boolean indicating loading state
- `error`: Error object

**Key Functions:**
- `fetchAnalytics()`: Fetches analytics data
- `handleDateRangeChange()`: Updates date range and refetches analytics
- `handleCampaignChange()`: Updates campaign filter and refetches analytics
- `exportAnalytics()`: Exports analytics data to CSV or PDF

**Usage Example:**
```jsx
<MarketingAnalytics 
  fromDate="2025-01-01"
  toDate="2025-05-25"
/>
```

## Shared Components

### StatusBadge
Component for displaying status badges with appropriate colors.

**Props:**
- `status`: Status value to display
- `type`: Type of status (request, asset, trip, etc.)
- `size`: (Optional) Size of the badge (small, medium, large)

**Usage Example:**
```jsx
<StatusBadge status="COMPLETED" type="request" size="medium" />
```

### PriorityBadge
Component for displaying priority badges with appropriate colors.

**Props:**
- `priority`: Priority value to display
- `size`: (Optional) Size of the badge (small, medium, large)

**Usage Example:**
```jsx
<PriorityBadge priority="HIGH" size="medium" />
```

### DateTimePicker
Component for selecting date and time.

**Props:**
- `value`: Current date/time value
- `onChange`: Function to call when the value changes
- `label`: Label for the picker
- `minDate`: (Optional) Minimum selectable date
- `maxDate`: (Optional) Maximum selectable date
- `disabled`: (Optional) Whether the picker is disabled
- `required`: (Optional) Whether the field is required

**Usage Example:**
```jsx
<DateTimePicker 
  value={new Date()} 
  onChange={(date) => console.log(date)}
  label="Scheduled Time"
  required={true}
/>
```

### SearchFilter
Component for filtering search results.

**Props:**
- `filters`: Current filter values
- `onFilterChange`: Function to call when filters change
- `filterOptions`: Available filter options
- `showReset`: (Optional) Whether to show reset button

**Usage Example:**
```jsx
<SearchFilter 
  filters={{ status: 'ACTIVE', priority: 'HIGH' }}
  onFilterChange={(filters) => console.log(filters)}
  filterOptions={[
    { name: 'status', label: 'Status', options: ['ACTIVE', 'PENDING', 'COMPLETED'] },
    { name: 'priority', label: 'Priority', options: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] }
  ]}
  showReset={true}
/>
```

### Pagination
Component for paginating through results.

**Props:**
- `currentPage`: Current page number
- `totalPages`: Total number of pages
- `onPageChange`: Function to call when page changes
- `pageSize`: (Optional) Number of items per page
- `onPageSizeChange`: (Optional) Function to call when page size changes
- `pageSizeOptions`: (Optional) Available page size options

**Usage Example:**
```jsx
<Pagination 
  currentPage={1}
  totalPages={10}
  onPageChange={(page) => console.log(page)}
  pageSize={10}
  onPageSizeChange={(size) => console.log(size)}
  pageSizeOptions={[10, 25, 50, 100]}
/>
```

### ConfirmationDialog
Component for confirming actions.

**Props:**
- `isOpen`: Whether the dialog is open
- `onClose`: Function to call when the dialog is closed
- `onConfirm`: Function to call when the action is confirmed
- `title`: Dialog title
- `message`: Dialog message
- `confirmText`: (Optional) Text for the confirm button
- `cancelText`: (Optional) Text for the cancel button
- `type`: (Optional) Type of confirmation (info, warning, danger)

**Usage Example:**
```jsx
<ConfirmationDialog 
  isOpen={true}
  onClose={() => console.log('Closed')}
  onConfirm={() => console.log('Confirmed')}
  title="Confirm Deletion"
  message="Are you sure you want to delete this item? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  type="danger"
/>
```

## Integration Components

### IntegrationStatus
Component for displaying integration status.

**Props:**
- `serviceType`: Type of service
- `onRefresh`: Function to call when refresh button is clicked

**State:**
- `status`: Integration status
- `lastSyncTime`: Time of last synchronization
- `loading`: Boolean indicating loading state
- `error`: Error object

**Key Functions:**
- `fetchStatus()`: Fetches integration status
- `handleRefresh()`: Refreshes integration status
- `handleReset()`: Resets integration configuration

**Usage Example:**
```jsx
<IntegrationStatus 
  serviceType="HOUSEKEEPING"
  onRefresh={() => console.log('Refresh')}
/>
```

### ErrorBoundary
Component for catching and displaying errors.

**Props:**
- `children`: Child components
- `fallback`: (Optional) Component to display when an error occurs
- `onError`: (Optional) Function to call when an error occurs

**State:**
- `hasError`: Boolean indicating whether an error has occurred
- `error`: Error object

**Key Functions:**
- `resetError()`: Resets the error state

**Usage Example:**
```jsx
<ErrorBoundary 
  fallback={<div>Something went wrong</div>}
  onError={(error) => console.error(error)}
>
  <SomeComponent />
</ErrorBoundary>
```

### AuditLogViewer
Component for viewing audit logs.

**Props:**
- `serviceType`: (Optional) Type of service to filter logs
- `resourceId`: (Optional) ID of the resource to filter logs
- `fromDate`: (Optional) Start date for logs
- `toDate`: (Optional) End date for logs

**State:**
- `logs`: Array of audit logs
- `loading`: Boolean indicating loading state
- `error`: Error object
- `filters`: Object containing filter criteria
- `pagination`: Object containing pagination information

**Key Functions:**
- `fetchLogs()`: Fetches audit logs based on filters and pagination
- `handleFilterChange()`: Updates filters and refetches logs
- `handlePageChange()`: Updates pagination and refetches logs
- `exportLogs()`: Exports logs to CSV or PDF

**Usage Example:**
```jsx
<AuditLogViewer 
  serviceType="HOUSEKEEPING"
  fromDate="2025-01-01"
  toDate="2025-05-25"
/>
```
