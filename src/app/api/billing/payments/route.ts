import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { 
  withErrorHandling, 
  validateBody, 
  validateQuery, 
  checkPermission, 
  createSuccessResponse,
  createPaginatedResponse
} from '@/lib/core/middleware';
import { ValidationError, NotFoundError, BusinessLogicError } from '@/lib/core/errors';
import { 
  moneySchema, 
  paymentMethodSchema,
  paymentStatusSchema
} from '@/lib/core/validation';
import { logger } from '@/lib/core/logging';

// Schema for payment creation
const createPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: moneySchema,
  paymentMethod: paymentMethodSchema,
  paymentDate: z.coerce.date().default(() => new Date()),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  paidBy: z.string().optional(),
  receiptRequired: z.boolean().default(true),
});

// Schema for payment query parameters
const paymentQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  invoiceId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  paymentMethod: paymentMethodSchema.optional(),
  status: paymentStatusSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  sortBy: z.enum(['createdAt', 'paymentDate', 'amount']).optional().default('paymentDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// GET handler for retrieving all payments with filtering and pagination
export const GET = withErrorHandling(async (req: NextRequest) => {
  // Validate query parameters
  const query = validateQuery(paymentQuerySchema)(req);
  
  // Check permissions
  await checkPermission(permissionService, 'read', 'payment')(req);
  
  // Build filter conditions
  const where: any = {};
  
  if (query.invoiceId) {
    where.invoiceId = query.invoiceId;
  }
  
  if (query.patientId) {
    where.invoice = {
      patientId: query.patientId
    };
  }
  
  if (query.paymentMethod) {
    where.paymentMethod = query.paymentMethod;
  }
  
  if (query.status) {
    where.status = query.status;
  }
  
  if (query.startDate && query.endDate) {
    try {
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      
      if (startDate > endDate) {
        throw new ValidationError('Start date must be before end date', 'INVALID_DATE_RANGE');
      }
      
      where.paymentDate = {
        gte: startDate,
        lte: endDate,
      };
    } catch (error) {
      throw new ValidationError('Invalid date range', 'INVALID_DATE_RANGE');
    }
  }
  
  if (query.minAmount !== undefined) {
    where.amount = {
      ...(where.amount || {}),
      gte: query.minAmount,
    };
  }
  
  if (query.maxAmount !== undefined) {
    where.amount = {
      ...(where.amount || {}),
      lte: query.maxAmount,
    };
  }
  
  // Execute query with pagination
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: {
        [query.sortBy]: query.sortOrder,
      },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        invoice: {
          select: {
            id: true,
            billNumber: true,
            patientId: true,
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                mrn: true,
              },
            },
          },
        },
      },
    }),
    prisma.payment.count({ where }),
  ]);
  
  return createPaginatedResponse(payments, query.page, query.pageSize, total);
});

// POST handler for creating a new payment
export const POST = withErrorHandling(async (req: NextRequest) => {
  // Validate request body
  const data = await validateBody(createPaymentSchema)(req);
  
  // Check permissions
  await checkPermission(permissionService, 'create', 'payment')(req);
  
  // Retrieve invoice
  const invoice = await prisma.bill.findUnique({
    where: { id: data.invoiceId },
  });
  
  if (!invoice) {
    throw new NotFoundError(`Invoice with ID ${data.invoiceId} not found`);
  }
  
  // Check if invoice is in a valid state for payment
  if (!['approved', 'partial', 'overdue'].includes(invoice.status)) {
    throw new BusinessLogicError(
      'Payment can only be made for approved, partially paid, or overdue invoices',
      'INVALID_INVOICE_STATUS',
      { currentStatus: invoice.status }
    );
  }
  
  // Check if payment amount is valid
  if (data.amount <= 0) {
    throw new ValidationError('Payment amount must be greater than zero', 'INVALID_PAYMENT_AMOUNT');
  }
  
  if (data.amount > invoice.outstandingAmount) {
    throw new ValidationError(
      'Payment amount cannot exceed outstanding amount',
      'PAYMENT_EXCEEDS_OUTSTANDING',
      { 
        paymentAmount: data.amount,
        outstandingAmount: invoice.outstandingAmount
      }
    );
  }
  
  // Generate payment reference number if not provided
  const referenceNumber = data.referenceNumber || 
    `PAY-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
  
  // Create payment in database
  const payment = await prisma.$transaction(async (prisma) => {
    // Create payment record
    const newPayment = await prisma.payment.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate,
        referenceNumber,
        notes: data.notes,
        paidBy: data.paidBy,
        status: 'completed',
      },
    });
    
    // Update invoice
    const newPaidAmount = invoice.paidAmount + data.amount;
    const newOutstandingAmount = invoice.totalAmount - newPaidAmount;
    
    // Determine new invoice status
    let newStatus = invoice.status;
    if (newOutstandingAmount <= 0) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    }
    
    await prisma.bill.update({
      where: { id: data.invoiceId },
      data: {
        paidAmount: newPaidAmount,
        outstandingAmount: newOutstandingAmount,
        status: newStatus,
      },
    });
    
    return newPayment;
  });
  
  logger.info('Payment created', { 
    paymentId: payment.id, 
    invoiceId: data.invoiceId,
    amount: data.amount,
    method: data.paymentMethod
  });
  
  // Generate receipt if required
  let receiptUrl = null;
  if (data.receiptRequired) {
    // In a real implementation, this would generate a receipt
    // For now, we'll just simulate it
    receiptUrl = `/api/billing/receipts/${payment.id}`;
  }
  
  return createSuccessResponse({
    ...payment,
    receiptUrl,
  });
});
