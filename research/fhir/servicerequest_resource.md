# FHIR ServiceRequest Resource Analysis

## Overview

The ServiceRequest resource in FHIR R4 represents an order, proposal, or plan to perform a diagnostic or other service on or for a patient. This resource is fundamental for implementing the Support Services Management module, as it provides the standardized structure for requesting various support services within a healthcare facility.

## Scope and Usage

ServiceRequest represents a wide range of service requests, including:

- Diagnostic tests/studies
- Endoscopic procedures
- Counseling
- Biopsies
- Therapies (e.g., physio-, social-, psychological-)
- (Exploratory) surgeries or procedures
- Exercises
- Specialist consultation and assessments
- Community services
- Nursing services
- Pharmacist medication review
- Other clinical interventions

The resource can represent:
- An order entered by a practitioner in a CPOE system
- A proposal made by a clinical decision support (CDS) system
- A planned procedure following a defined CarePlan

The `ServiceRequest.intent` element identifies if the resource represents an order, proposal, or plan to perform the indicated service. The service might result in a Procedure and could be summarized in a DiagnosticReport, potentially referencing Observations, ImagingStudies, Specimens, or other resources.

## Key Attributes

The ServiceRequest resource includes several important attributes:

1. **Status**: The current state of the service request
2. **Intent**: Whether the request is a proposal, plan, or order
3. **Category**: Classification of service (e.g., diagnostic, therapeutic)
4. **Priority**: How quickly the service should be addressed
5. **Code**: What is being requested
6. **Subject**: Who the service is for (typically a patient)
7. **Occurrence**: When the service should occur
8. **Requester**: Who is requesting the service
9. **Performer**: Who is requested to perform the service
10. **Reason**: Why the service is needed
11. **Supporting Info**: Additional clinical information
12. **Specimen**: Specimen to be used for the service
13. **Body Site**: Location on body where service is performed
14. **Note**: Comments about the request

## Workflow Considerations

The general workflow facilitated by this resource is:
1. A clinical system creates a service request
2. The request is accessed by or exchanged with a system representing an organization that can perform the procedure
3. The receiving organization updates the request as work is performed
4. The organization issues a report referencing the fulfilled requests

Only a single procedure is requested by each ServiceRequest. If multiple procedures are needed simultaneously, multiple ServiceRequests are used. These can be linked in different ways depending on workflow needs.

When ServiceRequest execution needs to be coordinated, another resource such as RequestOrchestration may be needed. For simple grouping (e.g., for billing), the `ServiceRequest.requisition` element can be used.

## Boundaries and Relationships

ServiceRequest is a record of a proposal/plan or order for a service that would result in a Procedure, Observation, DiagnosticReport, ImagingStudy, or similar resource. In contrast, Task spans both intent and event, tracks execution through to completion, and is intended for "administrative" actions.

A ServiceRequest can be a higher-level authorization that triggered the creation of a Task, or it can be the "request" resource that a Task is seeking to fulfill.

ServiceRequest and CommunicationRequest are related but distinct:
- CommunicationRequest is a request to merely disclose information
- ServiceRequest is used when the process involves verification of patient comprehension or an attempt to change the patient's mental state

## Implementation Considerations for Support Services Management

For the Support Services Management module, the ServiceRequest resource will be essential for:

1. **Housekeeping Management**: 
   - Creating requests for room cleaning
   - Scheduling regular housekeeping services
   - Requesting special cleaning protocols for isolation rooms or operating theaters

2. **Maintenance Management**:
   - Requesting preventive maintenance
   - Creating breakdown maintenance requests
   - Scheduling facility inspections

3. **Dietary Management**:
   - Ordering patient meals with specific dietary requirements
   - Requesting nutritional assessments
   - Scheduling meal deliveries

4. **Ambulance Management**:
   - Requesting ambulance transport
   - Scheduling non-emergency patient transfers
   - Requesting emergency medical transport

5. **Feedback Management**:
   - Requesting patient satisfaction surveys
   - Initiating complaint investigations

## FHIR Compliance Requirements

To ensure FHIR compliance when implementing ServiceRequest-based features:

1. Use the required bindings for status and intent elements
2. Follow the preferred bindings for priority and category elements
3. Ensure proper linking to related resources via basedOn and resultOf
4. Maintain appropriate relationships with Task resources for execution tracking
5. Use the requisition element for grouping related requests

## References

- FHIR R4 ServiceRequest Resource: [https://build.fhir.org/servicerequest.html](https://build.fhir.org/servicerequest.html)
- HL7 FHIR R4 Specification: [https://hl7.org/fhir/r4/](https://hl7.org/fhir/r4/)
