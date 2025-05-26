/**
 * HMS Integration Service for Support Services
 * 
 * This service provides integration between the HMS core systems and
 * the Support Services module, enabling seamless data exchange and
 * workflow coordination.
 */

import { prisma } from '@/lib/prisma';
import { AuditLogger } from '@/lib/audit';
import { SecurityService } from '@/lib/security.service';
import { RBACService, Resource, Action } from '@/lib/rbac.service';
import { NotFoundError, AuthorizationError, ExternalServiceError } from '@/lib/errors';

export class HMSIntegrationService {
  /**
   * Retrieves patient information from the HMS Patient Management system
   * @param patientId The patient ID
   * @param userId The requesting user's ID
   * @param userRoles The requesting user's roles
   * @returns Patient information
   */
  public static async getPatientInfo(
    patientId: string,
    userId: string,
    userRoles: string[]
  ): Promise<any> {
    // Enforce RBAC
    RBACService.enforcePermission(
      userRoles,
      Resource.USER,
      Action.READ,
      { patientData: true },
      userId,
      patientId
    );
    
    try {
      // Audit the request
      const auditLogger = new AuditLogger({ userId, userRoles });
      await auditLogger.log({
        action: 'integration.patient.info.request',
        resourceId: patientId,
        userId,
        details: { patientId }
      });
      
      // In a real implementation, this would call the HMS Patient Management API
      // For this example, we'll simulate the API call with a database query
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
          contactInformation: true,
          // Exclude sensitive medical information based on roles
          ...(RBACService.hasPermission(userRoles, Resource.USER, Action.READ, { fullMedicalData: true })
            ? {
                allergies: true,
                diagnoses: true,
                medications: true
              }
            : {})
        }
      });
      
      if (!patient) {
        throw new NotFoundError(`Patient with ID ${patientId} not found`);
      }
      
      // Audit the successful retrieval
      await auditLogger.log({
        action: 'integration.patient.info.success',
        resourceId: patientId,
        userId,
        details: { patientId }
      });
      
      return patient;
    } catch (error) {
      // Handle and rethrow appropriate errors
      if (error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      
      console.error('Failed to retrieve patient information:', error);
      throw new ExternalServiceError('Patient Management System', 'Failed to retrieve patient information');
    }
  }
  
  /**
   * Retrieves location information from the HMS Location Management system
   * @param locationId The location ID
   * @param userId The requesting user's ID
   * @param userRoles The requesting user's roles
   * @returns Location information
   */
  public static async getLocationInfo(
    locationId: string,
    userId: string,
    userRoles: string[]
  ): Promise<any> {
    // Enforce RBAC
    RBACService.enforcePermission(
      userRoles,
      Resource.SYSTEM,
      Action.READ,
      { locationData: true },
      userId,
      locationId
    );
    
    try {
      // Audit the request
      const auditLogger = new AuditLogger({ userId, userRoles });
      await auditLogger.log({
        action: 'integration.location.info.request',
        resourceId: locationId,
        userId,
        details: { locationId }
      });
      
      // In a real implementation, this would call the HMS Location Management API
      // For this example, we'll simulate the API call with a database query
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: {
          id: true,
          name: true,
          type: true,
          floor: true,
          building: true,
          status: true,
          capacity: true,
          currentOccupancy: true
        }
      });
      
      if (!location) {
        throw new NotFoundError(`Location with ID ${locationId} not found`);
      }
      
      // Audit the successful retrieval
      await auditLogger.log({
        action: 'integration.location.info.success',
        resourceId: locationId,
        userId,
        details: { locationId }
      });
      
      return location;
    } catch (error) {
      // Handle and rethrow appropriate errors
      if (error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      
      console.error('Failed to retrieve location information:', error);
      throw new ExternalServiceError('Location Management System', 'Failed to retrieve location information');
    }
  }
  
  /**
   * Sends a notification through the HMS Notification System
   * @param recipientId The recipient user ID
   * @param notificationType The type of notification
   * @param title The notification title
   * @param message The notification message
   * @param metadata Additional metadata for the notification
   * @param userId The sending user's ID
   * @param userRoles The sending user's roles
   * @returns The created notification
   */
  public static async sendNotification(
    recipientId: string,
    notificationType: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP',
    title: string,
    message: string,
    metadata: Record<string, any>,
    userId: string,
    userRoles: string[]
  ): Promise<any> {
    // Enforce RBAC
    RBACService.enforcePermission(
      userRoles,
      Resource.SYSTEM,
      Action.CREATE,
      { notificationSend: true },
      userId,
      recipientId
    );
    
    try {
      // Audit the request
      const auditLogger = new AuditLogger({ userId, userRoles });
      await auditLogger.log({
        action: 'integration.notification.send.request',
        resourceId: recipientId,
        userId,
        details: { 
          recipientId,
          notificationType,
          title
        }
      });
      
      // In a real implementation, this would call the HMS Notification System API
      // For this example, we'll simulate the API call with a database insert
      const notification = await prisma.notification.create({
        data: {
          recipientId,
          type: notificationType,
          title,
          message,
          metadata,
          status: 'PENDING',
          createdById: userId
        }
      });
      
      // Audit the successful notification creation
      await auditLogger.log({
        action: 'integration.notification.send.success',
        resourceId: notification.id,
        userId,
        details: { 
          recipientId,
          notificationType,
          notificationId: notification.id
        }
      });
      
      return notification;
    } catch (error) {
      // Handle and rethrow appropriate errors
      if (error instanceof AuthorizationError) {
        throw error;
      }
      
      console.error('Failed to send notification:', error);
      throw new ExternalServiceError('Notification System', 'Failed to send notification');
    }
  }
  
  /**
   * Retrieves user information from the HMS User Management system
   * @param targetUserId The user ID to retrieve information for
   * @param userId The requesting user's ID
   * @param userRoles The requesting user's roles
   * @returns User information
   */
  public static async getUserInfo(
    targetUserId: string,
    userId: string,
    userRoles: string[]
  ): Promise<any> {
    // Enforce RBAC
    RBACService.enforcePermission(
      userRoles,
      Resource.USER,
      Action.READ,
      { userId: targetUserId === userId ? 'self' : 'other' },
      userId,
      targetUserId
    );
    
    try {
      // Audit the request
      const auditLogger = new AuditLogger({ userId, userRoles });
      await auditLogger.log({
        action: 'integration.user.info.request',
        resourceId: targetUserId,
        userId,
        details: { targetUserId }
      });
      
      // In a real implementation, this would call the HMS User Management API
      // For this example, we'll simulate the API call with a database query
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          roles: true,
          department: true,
          position: true,
          status: true,
          // Only include sensitive fields for self or admin
          ...(targetUserId === userId || userRoles.includes('admin')
            ? {
                lastLogin: true,
                createdAt: true,
                updatedAt: true
              }
            : {})
        }
      });
      
      if (!user) {
        throw new NotFoundError(`User with ID ${targetUserId} not found`);
      }
      
      // Audit the successful retrieval
      await auditLogger.log({
        action: 'integration.user.info.success',
        resourceId: targetUserId,
        userId,
        details: { targetUserId }
      });
      
      return user;
    } catch (error) {
      // Handle and rethrow appropriate errors
      if (error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      
      console.error('Failed to retrieve user information:', error);
      throw new ExternalServiceError('User Management System', 'Failed to retrieve user information');
    }
  }
  
  /**
   * Submits data to the HMS Reporting System
   * @param reportType The type of report
   * @param reportData The report data
   * @param userId The requesting user's ID
   * @param userRoles The requesting user's roles
   * @returns The created report
   */
  public static async submitReportData(
    reportType: string,
    reportData: Record<string, any>,
    userId: string,
    userRoles: string[]
  ): Promise<any> {
    // Enforce RBAC
    RBACService.enforcePermission(
      userRoles,
      Resource.SYSTEM,
      Action.REPORT,
      { reportType },
      userId
    );
    
    try {
      // Audit the request
      const auditLogger = new AuditLogger({ userId, userRoles });
      await auditLogger.log({
        action: 'integration.report.submit.request',
        resourceId: `report-${reportType}`,
        userId,
        details: { reportType }
      });
      
      // In a real implementation, this would call the HMS Reporting System API
      // For this example, we'll simulate the API call with a database insert
      const report = await prisma.report.create({
        data: {
          type: reportType,
          data: reportData,
          status: 'SUBMITTED',
          submittedById: userId
        }
      });
      
      // Audit the successful report submission
      await auditLogger.log({
        action: 'integration.report.submit.success',
        resourceId: report.id,
        userId,
        details: { 
          reportType,
          reportId: report.id
        }
      });
      
      return report;
    } catch (error) {
      // Handle and rethrow appropriate errors
      if (error instanceof AuthorizationError) {
        throw error;
      }
      
      console.error('Failed to submit report data:', error);
      throw new ExternalServiceError('Reporting System', 'Failed to submit report data');
    }
  }
  
  /**
   * Links a support service request to a patient record
   * @param serviceType The type of support service
   * @param requestId The request ID
   * @param patientId The patient ID
   * @param userId The requesting user's ID
   * @param userRoles The requesting user's roles
   * @returns The updated request with patient link
   */
  public static async linkRequestToPatient(
    serviceType: 'HOUSEKEEPING' | 'MAINTENANCE' | 'DIETARY' | 'AMBULANCE' | 'FEEDBACK',
    requestId: string,
    patientId: string,
    userId: string,
    userRoles: string[]
  ): Promise<any> {
    // Map service type to resource
    const resourceMap = {
      'HOUSEKEEPING': Resource.HOUSEKEEPING,
      'MAINTENANCE': Resource.MAINTENANCE,
      'DIETARY': Resource.DIETARY,
      'AMBULANCE': Resource.AMBULANCE,
      'FEEDBACK': Resource.FEEDBACK
    };
    
    const resource = resourceMap[serviceType];
    
    // Enforce RBAC
    RBACService.enforcePermission(
      userRoles,
      resource,
      Action.UPDATE,
      { patientLink: true },
      userId,
      requestId
    );
    
    try {
      // Audit the request
      const auditLogger = new AuditLogger({ userId, userRoles });
      await auditLogger.log({
        action: 'integration.request.patient.link.request',
        resourceId: requestId,
        userId,
        details: { 
          serviceType,
          requestId,
          patientId
        }
      });
      
      // Verify patient exists
      const patient = await this.getPatientInfo(patientId, userId, userRoles);
      
      // In a real implementation, this would update the appropriate service request
      // For this example, we'll use a generic approach
      const tableName = serviceType.toLowerCase() + 'Request';
      
      // Dynamic update based on service type
      const request = await prisma[tableName].update({
        where: { id: requestId },
        data: {
          patientId,
          updatedById: userId
        }
      });
      
      // Audit the successful link
      await auditLogger.log({
        action: 'integration.request.patient.link.success',
        resourceId: requestId,
        userId,
        details: { 
          serviceType,
          requestId,
          patientId
        }
      });
      
      return request;
    } catch (error) {
      // Handle and rethrow appropriate errors
      if (error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      
      console.error('Failed to link request to patient:', error);
      throw new ExternalServiceError('HMS Integration', 'Failed to link request to patient');
    }
  }
  
  /**
   * Links a support service request to a location
   * @param serviceType The type of support service
   * @param requestId The request ID
   * @param locationId The location ID
   * @param userId The requesting user's ID
   * @param userRoles The requesting user's roles
   * @returns The updated request with location link
   */
  public static async linkRequestToLocation(
    serviceType: 'HOUSEKEEPING' | 'MAINTENANCE' | 'DIETARY' | 'AMBULANCE',
    requestId: string,
    locationId: string,
    userId: string,
    userRoles: string[]
  ): Promise<any> {
    // Map service type to resource
    const resourceMap = {
      'HOUSEKEEPING': Resource.HOUSEKEEPING,
      'MAINTENANCE': Resource.MAINTENANCE,
      'DIETARY': Resource.DIETARY,
      'AMBULANCE': Resource.AMBULANCE
    };
    
    const resource = resourceMap[serviceType];
    
    // Enforce RBAC
    RBACService.enforcePermission(
      userRoles,
      resource,
      Action.UPDATE,
      { locationLink: true },
      userId,
      requestId
    );
    
    try {
      // Audit the request
      const auditLogger = new AuditLogger({ userId, userRoles });
      await auditLogger.log({
        action: 'integration.request.location.link.request',
        resourceId: requestId,
        userId,
        details: { 
          serviceType,
          requestId,
          locationId
        }
      });
      
      // Verify location exists
      const location = await this.getLocationInfo(locationId, userId, userRoles);
      
      // In a real implementation, this would update the appropriate service request
      // For this example, we'll use a generic approach
      const tableName = serviceType.toLowerCase() + 'Request';
      
      // Dynamic update based on service type
      const request = await prisma[tableName].update({
        where: { id: requestId },
        data: {
          locationId,
          updatedById: userId
        }
      });
      
      // Audit the successful link
      await auditLogger.log({
        action: 'integration.request.location.link.success',
        resourceId: requestId,
        userId,
        details: { 
          serviceType,
          requestId,
          locationId
        }
      });
      
      return request;
    } catch (error) {
      // Handle and rethrow appropriate errors
      if (error instanceof NotFoundError || error instanceof AuthorizationError) {
        throw error;
      }
      
      console.error('Failed to link request to location:', error);
      throw new ExternalServiceError('HMS Integration', 'Failed to link request to location');
    }
  }
}
