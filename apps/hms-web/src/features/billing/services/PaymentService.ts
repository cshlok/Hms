import { PrismaClient } from '@prisma/client'; // Assuming Prisma is used
import { Payment, Invoice, PaymentInput, PaymentGatewayResponse } from '../types'; // Assuming types are defined

const prisma = new PrismaClient();

/**
 * @description Service to handle payment processing for patient invoices.
 * Integrates with payment gateways and manages payment reconciliation.
 */
export class PaymentService {
    /**
     * @description Processes a payment for a given invoice.
     * @param invoiceId - The ID of the invoice to be paid.
     * @param paymentInput - Details of the payment (amount, mode, payment gateway token, etc.).
     * @returns {Promise<Payment>} The recorded payment object.
     * @throws {Error} If invoice not found, payment amount mismatch, or payment gateway error.
     */
    async processPayment(invoiceId: string, paymentInput: PaymentInput): Promise<Payment> {
        // 1. Fetch Invoice Details
        // const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
        // if (!invoice) {
        //     throw new Error(`Invoice with ID ${invoiceId} not found.`);
        // }
        // if (invoice.status === 'PAID') {
        //     throw new Error(`Invoice ${invoiceId} is already paid.`);
        // }
        const mockInvoice: Invoice | null = await this.findMockInvoice(invoiceId);
        if (!mockInvoice) {
            throw new Error(`Invoice with ID ${invoiceId} not found or already paid.`);
        }

        // 2. Validate Payment Amount (ensure it doesn't exceed outstanding amount)
        const outstandingAmount = mockInvoice.totalAmount - mockInvoice.amountPaid;
        if (paymentInput.amount > outstandingAmount) {
            throw new Error(`Payment amount ${paymentInput.amount} exceeds outstanding amount ${outstandingAmount} for invoice ${invoiceId}.`);
        }
        if (paymentInput.amount <= 0) {
            throw new Error('Payment amount must be greater than zero.');
        }

        // 3. Integrate with Payment Gateway (placeholder)
        // In a real scenario, you would call the payment gateway API here.
        // const gatewayResponse: PaymentGatewayResponse = await this.callPaymentGateway(
        //     paymentInput.paymentToken, // Or card details, etc.
        //     paymentInput.amount,
        //     paymentInput.currency || 'USD'
        // );

        // Mocking gateway response
        const mockGatewayResponse: PaymentGatewayResponse = {
            success: true,
            transactionId: `txn_${Date.now()}`,
            message: 'Payment processed successfully by mock gateway.',
            amountProcessed: paymentInput.amount,
        };

        if (!mockGatewayResponse.success) {
            throw new Error(`Payment gateway error: ${mockGatewayResponse.message}`);
        }

        // 4. Record the Payment in the Database
        const newPayment: Payment = {
            id: `pay_${Date.now()}`,
            invoiceId: mockInvoice.id,
            patientId: mockInvoice.patientId,
            paymentDate: new Date(),
            amount: mockGatewayResponse.amountProcessed,
            paymentMode: paymentInput.paymentMode,
            transactionReference: mockGatewayResponse.transactionId,
            status: 'COMPLETED',
            notes: paymentInput.notes,
        };

        // const savedPayment = await prisma.payment.create({ data: newPayment });

        // 5. Update Invoice Status and Amount Paid
        // const updatedAmountPaid = mockInvoice.amountPaid + savedPayment.amount;
        // const newInvoiceStatus = updatedAmountPaid >= mockInvoice.totalAmount ? 'PAID' : 'PARTIALLY_PAID';

        // await prisma.invoice.update({
        //     where: { id: invoiceId },
        //     data: {
        //         amountPaid: updatedAmountPaid,
        //         status: newInvoiceStatus,
        //     },
        // });

        // For mock, update the mock invoice
        mockInvoice.amountPaid += newPayment.amount;
        mockInvoice.status = mockInvoice.amountPaid >= mockInvoice.totalAmount ? 'PAID' : 'PARTIALLY_PAID';

        console.log('Payment processed and recorded:', newPayment);
        console.log('Invoice status updated:', mockInvoice);

        return newPayment; // Return the mock payment for now
    }

    /**
     * @description Retrieves all payments for a specific invoice.
     * @param invoiceId - The ID of the invoice.
     * @returns {Promise<Payment[]>} A list of payments for the invoice.
     */
    async getPaymentsForInvoice(invoiceId: string): Promise<Payment[]> {
        // return prisma.payment.findMany({ where: { invoiceId } });
        console.log(`Fetching payments for invoice ${invoiceId}`);
        return []; // Return empty array for now
    }

    // Helper for mock invoice data
    private async findMockInvoice(invoiceId: string): Promise<Invoice | null> {
        // In a real app, this would be a DB call. Here we simulate finding an invoice.
        // This is a very simplified mock. You'd likely have a mock DB or service.
        if (invoiceId === 'inv_123_unpaid') {
            return {
                id: 'inv_123_unpaid',
                patientId: 'pat_001',
                patientName: 'Jane Doe',
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                lineItems: [{ chargeId: 'chg_001', serviceName: 'MRI Scan', quantity: 1, unitPrice: 500, totalPrice: 500 }],
                subtotal: 500,
                discountAmount: 0,
                taxAmount: 50,
                totalAmount: 550,
                amountPaid: 0,
                status: 'DRAFT', 
                invoiceType: 'FINAL',
            };
        }
        return null;
    }

    // Placeholder for actual payment gateway integration
    // private async callPaymentGateway(token: string, amount: number, currency: string): Promise<PaymentGatewayResponse> {
    //     // Actual implementation to call Stripe, PayPal, etc.
    //     console.log(`Calling payment gateway for token ${token}, amount ${amount} ${currency}`);
    //     // Simulate a successful response
    //     return {
    //         success: true,
    //         transactionId: `gw_txn_${Date.now()}`,
    //         message: 'Gateway processed successfully.',
    //         amountProcessed: amount
    //     };
    // }
}

