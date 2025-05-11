# Research: Audit Logging Best Practices (Placeholder Service)

Source URL: https://betterstack.com/community/guides/logging/nodejs-logging-best-practices/

## Key Takeaways for Audit Logging:

While the article covers general Node.js logging best practices, many are directly applicable to creating an `AuditService` placeholder and a future production-ready audit logging system.

1.  **Use a Recognized Logging Framework:** For a production system, libraries like Winston or Pino are recommended over `console.log`. For a placeholder `AuditService`, direct `console.log` might be acceptable initially if clearly marked, but a simple wrapper around a library could also be considered if time permits, to establish a better pattern.

2.  **Use Structured Logging (e.g., JSON):** This is crucial for audit logs, which need to be machine-parsable for analysis, alerting, and reporting. Audit logs should contain clear, distinct fields.
    *   *Example Audit Log Structure (Conceptual):*
        ```json
        {
          "timestamp": "2023-10-25T07:12:46.743Z",
          "level": "AUDIT", // Or a specific audit level
          "userId": "user_uuid_or_system", // Who performed the action
          "event_type": "PATIENT_REGISTERED", // What happened
          "entity_type": "Patient", // What entity was affected
          "entity_id": "patient_uuid", // ID of the affected entity
          "source_ip": "192.168.1.100", // Optional: IP address of the requester
          "details": { /* Event-specific details */ },
          "status": "SUCCESS" // Or FAILURE
        }
        ```

3.  **Employ Log Levels Correctly:** Audit logs are distinct from debug or error logs. They might have their own "AUDIT" level or be logged at an INFO level with specific categorization. The key is consistent and filterable logging.

4.  **Write Descriptive Log Messages (and Structured Data):** While the message itself is important, the structured data fields are paramount for audit logs.

5.  **Always Include a Timestamp:** Essential for chronological tracking of events.

6.  **Add Contextual Fields:** Audit logs inherently require context: who, what, when, where, and outcome. This includes user IDs, affected entity IDs, action types, IP addresses, etc.

7.  **Ensure Sensitive Data Stays Out of Logs (or is Masked/Tokenized):** This is critical. Audit logs should *not* contain raw PHI or other sensitive data unless absolutely necessary and properly secured/encrypted itself. For example, instead of logging a patient's full name, log their ID. If a field value change is audited, consider logging that a field changed, not the old/new values if they are sensitive.
    *   The `EncryptionService` could potentially be used to encrypt certain sensitive details within an audit log if absolutely required, but the preference is to avoid logging raw sensitive data.

8.  **Log for More Than Troubleshooting:** Audit logs are specifically for security, compliance, and accountability, not just debugging.

9.  **Log to Standard Output (in containerized environments):** This allows the container orchestrator or logging agent to collect and forward logs. For a placeholder, `console.log` (which goes to stdout) is fine.

10. **Centralize Logs (Production):** In production, logs (including audit logs) should be sent to a centralized log management system for secure storage, analysis, and alerting.

## Placeholder `AuditService` (SEC-3) Considerations for HMS:

*   **Interface:** The `AuditService` will need a method like `logEvent(userId: string, eventType: string, entityType: string, entityId: string, status: string, details?: object): void`.
*   **Initial Implementation:**
    *   For the placeholder, this service might simply use `console.log()` to output a JSON string representing the audit event.
    *   The structure should include essential fields: timestamp, userId, eventType, entityType, entityId, status, and any relevant details.
    *   **Crucially, mark this as a placeholder and not for production.**
*   **Integration:**
    *   `PatientService`: Call `AuditService.logEvent` after successful patient registration, updates, or when sensitive data is accessed.
    *   `AuthService`: Call `AuditService.logEvent` for login attempts (success/failure), logout, password changes.
    *   Other services as they are developed.
*   **What to Audit (Examples for HMS):**
    *   User login success/failure.
    *   Patient record creation, view, update, deletion (if deletion is allowed).
    *   Access to PHI.
    *   Administrative actions.
    *   Security setting changes.

**Summary for HMS Implementation (SEC-3):**

The `AuditService` will be created with a `logEvent` method. Initially, it will use `console.log` to output a structured JSON message. Key services like `AuthService` and `PatientService` will be modified to call this service at appropriate points. The focus is on establishing the service interface and integration points, with clear documentation that the current implementation is a placeholder. The structure of the logged message should anticipate future needs for a production audit trail.
