import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';
import { logAudit, AuditAction } from '@/lib/audit';

// Initialize Prisma client
const prisma = new PrismaClient();

// Validation schemas
export const LabOrderSchema = z.object({
  encounterId: z.string().uuid(),
  tests: z.array(z.object({
    testId: z.string().uuid(),
    testName: z.string().min(1),
    testCode: z.string().min(1),
    specimenType: z.string().min(1),
    priority: z.enum(['STAT', 'URGENT', 'ROUTINE']).optional(),
    orderNotes: z.string().optional(),
  })).min(1),
});

export const LabCancelSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(1),
});

export const LabResultNotificationSchema = z.object({
  orderId: z.string().uuid(),
  notifyUserId: z.string().uuid().optional(),
  criticalResult: z.boolean().optional(),
});

/**
 * LaboratoryService class for handling laboratory-related operations
 */
export class LaboratoryService {
  /**
   * Handle laboratory test order
   * @param data Laboratory order data
   * @param userId User ID of the person creating the order
   * @returns Created laboratory orders
   */
  async createLabOrder(data: z.infer<typeof LabOrderSchema>, userId: string) {
    logger.info({ method: 'createLabOrder', encounterId: data.encounterId }, 'Creating laboratory order');
    
    // Get encounter details
    const encounter = await prisma.encounter.findUnique({
      where: { id: data.encounterId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            mrn: true,
            dateOfBirth: true,
            gender: true,
          },
        },
      },
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    // Create lab orders
    const createdOrders = [];

    for (const test of data.tests) {
      const order = await prisma.labOrder.create({
        data: {
          patientId: encounter.patientId,
          encounterId: encounter.id,
          testId: test.testId,
          testName: test.testName,
          testCode: test.testCode,
          specimenType: test.specimenType,
          priority: test.priority || 'ROUTINE',
          status: 'ORDERED',
          orderNotes: test.orderNotes,
          orderedBy: userId,
          orderedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      createdOrders.push(order);

      // Log the lab order
      await logAudit(
        AuditAction.CREATE,
        'LAB_ORDER',
        order.id,
        {
          orderId: order.id,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          testId: test.testId,
          testName: test.testName,
        }
      );
    }

    return {
      success: true,
      orders: createdOrders,
      message: `${createdOrders.length} laboratory tests ordered successfully`,
    };
  }

  /**
   * Handle laboratory test cancellation
   * @param data Laboratory cancellation data
   * @param userId User ID of the person cancelling the order
   * @returns Cancellation result
   */
  async cancelLabOrder(data: z.infer<typeof LabCancelSchema>, userId: string) {
    logger.info({ method: 'cancelLabOrder', orderId: data.orderId }, 'Cancelling laboratory order');
    
    // Get lab order details
    const order = await prisma.labOrder.findUnique({
      where: { id: data.orderId },
    });

    if (!order) {
      throw new Error('Laboratory order not found');
    }

    // Check if order can be cancelled
    if (order.status === 'CANCELLED' || order.status === 'COMPLETED' || order.status === 'RESULTED') {
      throw new Error(`Cannot cancel order with status: ${order.status}`);
    }

    // Update lab order
    const updatedOrder = await prisma.labOrder.update({
      where: { id: data.orderId },
      data: {
        status: 'CANCELLED',
        cancelReason: data.reason,
        cancelledBy: userId,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Log the lab cancellation
    await logAudit(
      AuditAction.UPDATE,
      'LAB_ORDER',
      order.id,
      {
        orderId: order.id,
        patientId: order.patientId,
        encounterId: order.encounterId,
        testId: order.testId,
        testName: order.testName,
        reason: data.reason,
        action: 'CANCELLED',
      }
    );

    return {
      success: true,
      order: updatedOrder,
      message: 'Laboratory order cancelled successfully',
    };
  }

  /**
   * Handle laboratory result notification
   * @param data Laboratory result notification data
   * @param userId User ID of the person sending the notification
   * @returns Notification result
   */
  async sendLabResultNotification(data: z.infer<typeof LabResultNotificationSchema>, userId: string) {
    logger.info({ method: 'sendLabResultNotification', orderId: data.orderId }, 'Sending laboratory result notification');
    
    // Get lab order details
    const order = await prisma.labOrder.findUnique({
      where: { id: data.orderId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            mrn: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Laboratory order not found');
    }

    // Create notification for clinical staff
    const notification = await prisma.notification.create({
      data: {
        userId: data.notifyUserId || null, // If null, will be sent to all relevant staff
        patientId: order.patientId,
        encounterId: order.encounterId,
        type: 'LAB_RESULT',
        title: `Lab Result Available: ${order.testName}`,
        message: `Laboratory results for ${order.testName} are now available for patient ${order.patient.name} (${order.patient.mrn}).`,
        priority: data.criticalResult ? 'HIGH' : 'NORMAL',
        status: 'UNREAD',
        actionUrl: `/ipd/patients/${order.patientId}/lab-results/${order.id}`,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    });

    // Update lab order status if not already resulted
    if (order.status !== 'RESULTED') {
      await prisma.labOrder.update({
        where: { id: data.orderId },
        data: {
          status: 'RESULTED',
          resultedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Log the notification
    await logAudit(
      AuditAction.CREATE,
      'NOTIFICATION',
      notification.id,
      {
        notificationId: notification.id,
        orderId: order.id,
        patientId: order.patientId,
        encounterId: order.encounterId,
        testId: order.testId,
        testName: order.testName,
        criticalResult: data.criticalResult || false,
      }
    );

    return {
      success: true,
      notification,
      message: 'Laboratory result notification sent successfully',
    };
  }

  /**
   * Get pending lab orders for a patient
   * @param patientId Patient ID
   * @returns Pending laboratory orders
   */
  async getPendingLabOrders(patientId: string) {
    logger.info({ method: 'getPendingLabOrders', patientId }, 'Getting pending laboratory orders');
    
    // Get pending lab orders for the patient
    const pendingOrders = await prisma.labOrder.findMany({
      where: {
        patientId,
        status: { in: ['ORDERED', 'COLLECTED', 'IN_PROGRESS'] },
      },
      orderBy: { orderedAt: 'desc' },
    });

    return {
      patientId,
      pendingOrders,
      count: pendingOrders.length,
    };
  }

  /**
   * Get lab results for a patient
   * @param patientId Patient ID
   * @param encounterId Optional encounter ID to filter results
   * @param limit Maximum number of records to return
   * @param includeDetails Whether to include detailed result data
   * @returns Laboratory results
   */
  async getLabResults(patientId: string, encounterId?: string, limit: number = 50, includeDetails: boolean = false) {
    logger.info({ method: 'getLabResults', patientId, encounterId, limit, includeDetails }, 'Getting laboratory results');
    
    // Build query
    const query: any = {
      where: {
        patientId,
        status: 'RESULTED',
      },
      orderBy: { resultedAt: 'desc' },
      take: limit,
    };

    // Add encounter filter if provided
    if (encounterId) {
      query.where.encounterId = encounterId;
    }

    // Add result details if requested
    if (includeDetails) {
      query.include = {
        results: {
          orderBy: { createdAt: 'desc' },
        },
      };
    }

    // Get lab results for the patient
    const labResults = await prisma.labOrder.findMany(query);

    // Group by test category if results are available
    let groupedResults = {};
    if (labResults.length > 0 && includeDetails) {
      groupedResults = labResults.reduce((groups, result) => {
        const category = result.testCategory || 'Uncategorized';
        const group = groups[category] || [];
        group.push(result);
        groups[category] = group;
        return groups;
      }, {} as Record<string, any[]>);
    }

    return {
      patientId,
      encounterId: encounterId || null,
      labResults,
      groupedResults: includeDetails ? groupedResults : null,
      count: labResults.length,
    };
  }

  /**
   * Get detailed lab result
   * @param orderId Laboratory order ID
   * @param userId User ID of the person viewing the result
   * @returns Detailed laboratory result
   */
  async getLabResultDetails(orderId: string, userId: string) {
    logger.info({ method: 'getLabResultDetails', orderId }, 'Getting laboratory result details');
    
    // Get lab order with results
    const labOrder = await prisma.labOrder.findUnique({
      where: { id: orderId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            mrn: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        results: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!labOrder) {
      throw new Error('Laboratory order not found');
    }

    // Check if results are available
    if (labOrder.status !== 'RESULTED' || !labOrder.results || labOrder.results.length === 0) {
      throw new Error('Laboratory results not available yet');
    }

    // Log the result view
    await logAudit(
      AuditAction.VIEW,
      'LAB_ORDER',
      orderId,
      {
        orderId,
        patientId: labOrder.patientId,
        encounterId: labOrder.encounterId,
        testId: labOrder.testId,
        testName: labOrder.testName,
      }
    );

    return labOrder;
  }
}
