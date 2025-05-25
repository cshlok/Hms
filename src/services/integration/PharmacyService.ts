import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { logAudit, AuditAction } from '@/lib/audit';

// Initialize Prisma client
const prisma = new PrismaClient();

// Validation schemas
export const MedicationOrderSchema = z.object({
  encounterId: z.string().uuid(),
  medications: z.array(z.object({
    medicationId: z.string().uuid(),
    name: z.string().min(1),
    dosage: z.string().min(1),
    route: z.string().min(1),
    frequency: z.string().min(1),
    duration: z.string().min(1),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    instructions: z.string().optional(),
    priority: z.enum(['STAT', 'URGENT', 'ROUTINE']).optional(),
  })).min(1),
});

export const MedicationReconciliationSchema = z.object({
  dischargeId: z.string().uuid(),
  medications: z.array(z.object({
    medicationId: z.string().uuid().optional(),
    name: z.string().min(1),
    dosage: z.string().min(1),
    route: z.string().min(1),
    frequency: z.string().min(1),
    duration: z.string().min(1),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    instructions: z.string().optional(),
    continuePrescription: z.boolean().optional(),
  })),
});

export const MedicationAdministrationSchema = z.object({
  orderId: z.string().uuid(),
  administrationDetails: z.object({
    dosage: z.string().optional(),
    route: z.string().optional(),
    administeredAt: z.date().optional(),
    notes: z.string().optional(),
  }),
  updateOrderStatus: z.enum(['ACTIVE', 'COMPLETED', 'DISCONTINUED']).optional(),
});

export const MedicationDiscontinueSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(1),
});

/**
 * PharmacyService class for handling medication-related operations
 */
export class PharmacyService {
  /**
   * Handle medication order creation
   * @param data Medication order data
   * @param userId User ID of the person creating the order
   * @returns Created medication orders
   */
  async createMedicationOrder(data: z.infer<typeof MedicationOrderSchema>, userId: string) {
    logger.info({ method: 'createMedicationOrder', encounterId: data.encounterId }, 'Creating medication order');
    
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
            allergies: true,
          },
        },
      },
    });

    if (!encounter) {
      throw new Error('Encounter not found');
    }

    // Check for medication allergies
    const patientAllergies = encounter.patient.allergies || [];
    const allergicMedications = [];

    for (const medication of data.medications) {
      // Check if patient is allergic to this medication
      const isAllergic = patientAllergies.some(
        (allergy: any) => 
          allergy.allergen.toLowerCase() === medication.name.toLowerCase() ||
          (allergy.allergenType === 'MEDICATION' && 
           allergy.allergen.toLowerCase().includes(medication.name.toLowerCase()))
      );

      if (isAllergic) {
        allergicMedications.push(medication.name);
      }
    }

    // If allergies found, return warning
    if (allergicMedications.length > 0) {
      return {
        warning: 'Potential allergic reaction detected',
        allergicMedications,
        message: 'Patient may be allergic to one or more ordered medications',
      };
    }

    // Create medication orders
    const createdOrders = [];

    for (const medication of data.medications) {
      const order = await prisma.medicationOrder.create({
        data: {
          patientId: encounter.patientId,
          encounterId: encounter.id,
          medicationId: medication.medicationId,
          name: medication.name,
          dosage: medication.dosage,
          route: medication.route,
          frequency: medication.frequency,
          duration: medication.duration,
          startDate: medication.startDate || new Date(),
          endDate: medication.endDate,
          instructions: medication.instructions,
          status: 'PENDING',
          priority: medication.priority || 'ROUTINE',
          orderedBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      createdOrders.push(order);

      // Log the medication order
      await logAudit(
        AuditAction.CREATE,
        'MEDICATION_ORDER',
        order.id,
        {
          orderId: order.id,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          medicationId: medication.medicationId,
          medicationName: medication.name,
        }
      );
    }

    return {
      success: true,
      orders: createdOrders,
      message: `${createdOrders.length} medication orders created successfully`,
    };
  }

  /**
   * Handle medication reconciliation
   * @param data Medication reconciliation data
   * @param userId User ID of the person performing reconciliation
   * @returns Reconciliation result
   */
  async performMedicationReconciliation(data: z.infer<typeof MedicationReconciliationSchema>, userId: string) {
    logger.info({ method: 'performMedicationReconciliation', dischargeId: data.dischargeId }, 'Performing medication reconciliation');
    
    // Get discharge details
    const discharge = await prisma.discharge.findUnique({
      where: { id: data.dischargeId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            mrn: true,
          },
        },
        encounter: true,
      },
    });

    if (!discharge) {
      throw new Error('Discharge record not found');
    }

    // Update discharge with medication reconciliation
    const updatedDischarge = await prisma.discharge.update({
      where: { id: data.dischargeId },
      data: {
        medicationReconciliation: data.medications,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    });

    // Create medication reconciliation record
    const reconciliation = await prisma.medicationReconciliation.create({
      data: {
        patientId: discharge.patientId,
        encounterId: discharge.encounterId,
        dischargeId: discharge.id,
        medications: data.medications,
        status: 'COMPLETED',
        performedBy: userId,
        performedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Log the medication reconciliation
    await logAudit(
      AuditAction.CREATE,
      'MEDICATION_RECONCILIATION',
      reconciliation.id,
      {
        reconciliationId: reconciliation.id,
        patientId: discharge.patientId,
        encounterId: discharge.encounterId,
        dischargeId: discharge.id,
        medicationCount: data.medications.length,
      }
    );

    return {
      success: true,
      reconciliationId: reconciliation.id,
      message: 'Medication reconciliation completed successfully',
    };
  }

  /**
   * Handle medication administration
   * @param data Medication administration data
   * @param userId User ID of the person administering medication
   * @returns Administration result
   */
  async recordMedicationAdministration(data: z.infer<typeof MedicationAdministrationSchema>, userId: string) {
    logger.info({ method: 'recordMedicationAdministration', orderId: data.orderId }, 'Recording medication administration');
    
    // Get medication order details
    const order = await prisma.medicationOrder.findUnique({
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
      throw new Error('Medication order not found');
    }

    // Create medication administration record
    const administration = await prisma.medicationAdministration.create({
      data: {
        orderId: order.id,
        patientId: order.patientId,
        encounterId: order.encounterId,
        medicationId: order.medicationId,
        medicationName: order.name,
        dosage: data.administrationDetails.dosage || order.dosage,
        route: data.administrationDetails.route || order.route,
        administeredAt: data.administrationDetails.administeredAt || new Date(),
        administeredBy: userId,
        notes: data.administrationDetails.notes,
        status: 'COMPLETED',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Update medication order status if needed
    if (data.updateOrderStatus) {
      await prisma.medicationOrder.update({
        where: { id: order.id },
        data: {
          status: data.updateOrderStatus,
          updatedAt: new Date(),
        },
      });
    }

    // Log the medication administration
    await logAudit(
      AuditAction.CREATE,
      'MEDICATION_ADMINISTRATION',
      administration.id,
      {
        administrationId: administration.id,
        orderId: order.id,
        patientId: order.patientId,
        encounterId: order.encounterId,
        medicationId: order.medicationId,
        medicationName: order.name,
        administeredAt: administration.administeredAt,
      }
    );

    return {
      success: true,
      administrationId: administration.id,
      message: 'Medication administration recorded successfully',
    };
  }

  /**
   * Handle medication discontinuation
   * @param data Medication discontinue data
   * @param userId User ID of the person discontinuing medication
   * @returns Discontinue result
   */
  async discontinueMedication(data: z.infer<typeof MedicationDiscontinueSchema>, userId: string) {
    logger.info({ method: 'discontinueMedication', orderId: data.orderId }, 'Discontinuing medication');
    
    // Get medication order details
    const order = await prisma.medicationOrder.findUnique({
      where: { id: data.orderId },
    });

    if (!order) {
      throw new Error('Medication order not found');
    }

    // Check if order can be discontinued
    if (order.status === 'DISCONTINUED' || order.status === 'COMPLETED') {
      throw new Error(`Cannot discontinue order with status: ${order.status}`);
    }

    // Update medication order
    const updatedOrder = await prisma.medicationOrder.update({
      where: { id: data.orderId },
      data: {
        status: 'DISCONTINUED',
        discontinuedReason: data.reason,
        discontinuedBy: userId,
        discontinuedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Log the medication discontinuation
    await logAudit(
      AuditAction.UPDATE,
      'MEDICATION_ORDER',
      order.id,
      {
        orderId: order.id,
        patientId: order.patientId,
        encounterId: order.encounterId,
        medicationId: order.medicationId,
        medicationName: order.name,
        reason: data.reason,
        action: 'DISCONTINUED',
      }
    );

    return {
      success: true,
      order: updatedOrder,
      message: 'Medication order discontinued successfully',
    };
  }

  /**
   * Get active medications for a patient
   * @param patientId Patient ID
   * @returns Active medications
   */
  async getActiveMedications(patientId: string) {
    logger.info({ method: 'getActiveMedications', patientId }, 'Getting active medications');
    
    // Get active medication orders for the patient
    const activeMedications = await prisma.medicationOrder.findMany({
      where: {
        patientId,
        status: { in: ['ACTIVE', 'PENDING'] },
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      patientId,
      activeMedications,
      count: activeMedications.length,
    };
  }

  /**
   * Get medication history for a patient
   * @param patientId Patient ID
   * @param limit Maximum number of records to return
   * @returns Medication history
   */
  async getMedicationHistory(patientId: string, limit: number = 50) {
    logger.info({ method: 'getMedicationHistory', patientId, limit }, 'Getting medication history');
    
    // Get medication history for the patient
    const medicationHistory = await prisma.medicationOrder.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        administrations: {
          orderBy: { administeredAt: 'desc' },
          take: 5,
        },
      },
    });

    // Group by encounter
    const groupedByEncounter = medicationHistory.reduce((groups, medication) => {
      const group = groups[medication.encounterId] || [];
      group.push(medication);
      groups[medication.encounterId] = group;
      return groups;
    }, {} as Record<string, any[]>);

    return {
      patientId,
      medicationHistory,
      groupedByEncounter,
      count: medicationHistory.length,
    };
  }
}
