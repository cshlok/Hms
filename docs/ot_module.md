# Operation Theatre Management Module Documentation

## Overview

The Operation Theatre (OT) Management module is a comprehensive system for managing surgical procedures, operation theatres, and related workflows within the Hospital Management System. This module integrates with other HMS modules including IPD, User Management, and Billing to provide a complete solution for surgical care management.

## Database Schema

The OT module uses the following database tables:

- `ot_theatres`: Stores information about operation theatres
- `ot_surgery_types`: Defines different types of surgeries with their requirements
- `ot_bookings`: Manages scheduling of surgeries
- `ot_staff_assignments`: Tracks staff assigned to each surgery
- `ot_checklist_templates`: Stores pre-defined safety checklist templates
- `ot_checklist_responses`: Records responses to checklist items for each surgery
- `ot_records`: Documents details of performed surgeries
- `ot_inventory_usage`: Tracks inventory items used during surgeries

Refer to the migration file `migrations/0008_add_ot_management_tables.sql` for the complete schema definition.

## API Routes

The module provides the following API endpoints:

### Operation Theatres
- `GET /api/ot/theatres`: List all operation theatres
- `POST /api/ot/theatres`: Create a new operation theatre
- `GET /api/ot/theatres/:id`: Get details of a specific theatre
- `PUT /api/ot/theatres/:id`: Update a theatre
- `DELETE /api/ot/theatres/:id`: Delete a theatre

### Surgery Types
- `GET /api/ot/surgery-types`: List all surgery types
- `POST /api/ot/surgery-types`: Create a new surgery type
- `GET /api/ot/surgery-types/:id`: Get details of a specific surgery type
- `PUT /api/ot/surgery-types/:id`: Update a surgery type
- `DELETE /api/ot/surgery-types/:id`: Delete a surgery type

### Bookings
- `GET /api/ot/bookings`: List all bookings (with optional filters)
- `POST /api/ot/bookings`: Create a new booking
- `GET /api/ot/bookings/:id`: Get details of a specific booking
- `PUT /api/ot/bookings/:id`: Update a booking
- `DELETE /api/ot/bookings/:id`: Cancel a booking

### Staff Assignments
- `GET /api/ot/bookings/:id/staff`: List staff assigned to a booking
- `POST /api/ot/bookings/:id/staff`: Assign staff to a booking
- `DELETE /api/ot/bookings/:id/staff/:assignmentId`: Remove staff from a booking

### Checklist Templates
- `GET /api/ot/checklist-templates`: List all checklist templates
- `POST /api/ot/checklist-templates`: Create a new checklist template
- `GET /api/ot/checklist-templates/:id`: Get details of a specific template
- `PUT /api/ot/checklist-templates/:id`: Update a template
- `DELETE /api/ot/checklist-templates/:id`: Delete a template

### Checklist Responses
- `GET /api/ot/bookings/:id/checklist-responses`: Get checklist responses for a booking
- `POST /api/ot/bookings/:id/checklist-responses`: Submit checklist responses

### Operation Records
- `GET /api/ot/bookings/:id/record`: Get operation record for a booking
- `POST /api/ot/bookings/:id/record`: Create operation record
- `PUT /api/ot/bookings/:id/record`: Update operation record

## UI Components

The module includes the following UI components:

### Main Components
- `OTDashboardPage`: Main dashboard with tabs for different sections
- `OTDashboardStats`: Statistics and today's schedule overview
- `OTBookingList`: List of all OT bookings with filtering
- `OTTheatreList`: List of all operation theatres
- `OTSurgeryTypeList`: List of all surgery types
- `OTChecklistTemplateList`: List of all checklist templates

### Modal Components
- `OTBookingModal`: Create/edit OT bookings
- `OTTheatreModal`: Create/edit operation theatres
- `OTSurgeryTypeModal`: Create/edit surgery types
- `OTChecklistTemplateModal`: Create/edit checklist templates
- `OTRecordModal`: Create/edit operation records

### Integration Components
- `OTPatientSurgeries`: Shows surgeries for a specific patient (integrates with IPD)
- `OTBillingItems`: Shows OT-related billing items (integrates with Billing)
- `OTStaffAssignment`: Manages staff assignments for surgeries (integrates with User Management)

## Integration Points

The OT module integrates with other HMS modules as follows:

### IPD Module Integration
- Patient surgeries are displayed in the IPD patient view
- Surgeries can be scheduled directly from the IPD module
- Post-operative notes are accessible from the IPD module

### User Management Integration
- Staff members are assigned to surgeries based on their roles
- Surgeons, anesthesiologists, and other staff are selected from the user database
- Staff availability is checked when scheduling surgeries

### Billing Integration
- Surgery charges are automatically generated based on surgery type
- OT usage charges are added to patient bills
- Consumables and equipment usage are tracked for billing

## Workflow

The typical workflow for the OT module is:

1. **Setup**: Configure operation theatres, surgery types, and checklist templates
2. **Scheduling**: Book surgeries by selecting patient, surgery type, theatre, and staff
3. **Pre-operative**: Complete pre-operative checklists and preparations
4. **Intra-operative**: Record procedure details, vital signs, and complications
5. **Post-operative**: Document post-operative instructions and recovery notes
6. **Billing**: Generate and process charges for the surgery

## Future Enhancements

Potential future enhancements for the OT module include:

- Real-time OT status monitoring dashboard
- Integration with medical device data for automated vital sign recording
- Advanced scheduling with conflict detection and resolution
- Inventory management integration for surgical supplies
- Mobile app for surgeons to view their schedule and patient details
- AI-assisted surgical risk assessment

## Technical Notes

- The module uses React with TypeScript for the frontend
- API routes are implemented using Next.js API routes
- Database operations use Cloudflare D1 (SQLite-compatible)
- Authentication and authorization are handled by the core HMS system

## Testing

The module should be tested for:

- Scheduling conflicts and resolution
- Integration with other modules
- Form validation and error handling
- Performance with large datasets
- Mobile responsiveness
- Accessibility compliance

## Deployment

Deploy the module as part of the main HMS application using the standard deployment process:

1. Apply database migrations
2. Build the Next.js application
3. Deploy to Cloudflare Pages or other hosting platform

## Conclusion

The Operation Theatre Management module provides a comprehensive solution for managing surgical procedures within the Hospital Management System. It integrates seamlessly with other modules to provide a complete end-to-end workflow for surgical care.
