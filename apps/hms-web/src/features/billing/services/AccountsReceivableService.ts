import { PrismaClient } from "@prisma/client"; // Assuming Prisma is used
import { Invoice, Patient, AccountStatement, OverdueNotice } from "../types"; // Assuming types are defined

const prisma = new PrismaClient();

/**
 * @description Service to manage accounts receivable, including outstanding invoices, patient account statements,
 * payment reminders, and collections processes.
 */
export class AccountsReceivableService {
    /**
     * @description Retrieves the outstanding balance for a specific patient.
     * @param patientId - The ID of the patient.
     * @returns {Promise<number>} The total outstanding amount for the patient.
     */
    async getPatientOutstandingBalance(patientId: string): Promise<number> {
        // const invoices = await prisma.invoice.findMany({
        //     where: {
        //         patientId: patientId,
        //         status: { in: ["DRAFT", "FINALIZED", "PARTIALLY_PAID"] }, // Consider all non-fully paid invoices
        //     },
        // });
        // let totalOutstanding = 0;
        // invoices.forEach(invoice => {
        //     totalOutstanding += (invoice.totalAmount - invoice.amountPaid);
        // });
        // return totalOutstanding;

        // Mock implementation
        console.log(`Calculating outstanding balance for patient ${patientId}`);
        return 1250.75; // Mock outstanding balance
    }

    /**
     * @description Generates an account statement for a patient for a given period.
     * @param patientId - The ID of the patient.
     * @param startDate - The start date for the statement period.
     * @param endDate - The end date for the statement period.
     * @returns {Promise<AccountStatement>} The generated account statement.
     */
    async generateAccountStatement(patientId: string, startDate: Date, endDate: Date): Promise<AccountStatement> {
        // 1. Fetch patient details
        // const patient = await prisma.patient.findUnique({ where: { id: patientId } });
        // if (!patient) throw new Error("Patient not found");
        const mockPatient = { id: patientId, name: "Alice Wonderland", address: "123 Rabbit Hole" };

        // 2. Fetch invoices within the period
        // const invoices = await prisma.invoice.findMany({
        //     where: {
        //         patientId: patientId,
        //         invoiceDate: { gte: startDate, lte: endDate },
        //     },
        //     orderBy: { invoiceDate: "asc" },
        // });

        // 3. Fetch payments within the period
        // const payments = await prisma.payment.findMany({
        //     where: {
        //         patientId: patientId,
        //         paymentDate: { gte: startDate, lte: endDate },
        //     },
        //     orderBy: { paymentDate: "asc" },
        // });

        // Mock data for statement
        const mockInvoices: Partial<Invoice>[] = [
            { id: "inv_stmt_1", invoiceDate: new Date(startDate.getTime() + 86400000), totalAmount: 300, amountPaid: 300, status: "PAID" },
            { id: "inv_stmt_2", invoiceDate: new Date(startDate.getTime() + (5 * 86400000)), totalAmount: 500, amountPaid: 100, status: "PARTIALLY_PAID" },
        ];
        const mockPayments = [
            { id: "pay_stmt_1", paymentDate: new Date(startDate.getTime() + 86400000), amount: 300, invoiceId: "inv_stmt_1" },
            { id: "pay_stmt_2", paymentDate: new Date(startDate.getTime() + (6 * 86400000)), amount: 100, invoiceId: "inv_stmt_2" },
        ];

        const openingBalance = 0; // This would be calculated based on previous period
        let closingBalance = openingBalance;
        mockInvoices.forEach(inv => closingBalance += (inv.totalAmount || 0));
        mockPayments.forEach(pay => closingBalance -= (pay.amount || 0));

        const statement: AccountStatement = {
            statementId: `stmt_${Date.now()}`,
            patientId: mockPatient.id,
            patientName: mockPatient.name,
            statementDate: new Date(),
            periodStartDate: startDate,
            periodEndDate: endDate,
            openingBalance: openingBalance, // Calculation needed for real scenario
            invoices: mockInvoices as Invoice[],
            payments: mockPayments as any[], // Cast as Payment type in real scenario
            closingBalance: closingBalance, // Calculation needed
        };

        console.log("Account statement generated:", statement);
        return statement;
    }

    /**
     * @description Sends a payment reminder for an overdue invoice.
     * @param invoiceId - The ID of the overdue invoice.
     * @returns {Promise<OverdueNotice>} Details of the reminder sent.
     */
    async sendPaymentReminder(invoiceId: string): Promise<OverdueNotice> {
        // const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
        // if (!invoice || invoice.status === "PAID" || new Date() <= invoice.dueDate) {
        //     throw new Error("Invoice is not overdue or already paid.");
        // }
        // const patient = await prisma.patient.findUnique({ where: { id: invoice.patientId } });
        // if (!patient) throw new Error("Patient not found for the invoice.");

        // Mock implementation
        const mockOverdueInvoice: Partial<Invoice> = { id: invoiceId, totalAmount: 200, amountPaid: 50, dueDate: new Date(Date.now() - (5 * 86400000)), patientId: "pat_overdue" };
        const mockPatientForReminder = { id: "pat_overdue", name: "Bob The Builder", email: "bob@example.com" };

        if (new Date() <= (mockOverdueInvoice.dueDate || new Date())) {
            throw new Error("Invoice is not overdue.");
        }

        const notice: OverdueNotice = {
            noticeId: `notice_${Date.now()}`,
            invoiceId: mockOverdueInvoice.id!,
            patientId: mockPatientForReminder.id,
            sentDate: new Date(),
            method: "EMAIL", // or SMS
            message: `Dear ${mockPatientForReminder.name}, your invoice ${mockOverdueInvoice.id} for ${mockOverdueInvoice.totalAmount} was due on ${mockOverdueInvoice.dueDate?.toDateString()}. Please make a payment at your earliest convenience.`,
        };

        // Simulate sending email/SMS
        console.log(`Sending payment reminder for invoice ${invoiceId} to ${mockPatientForReminder.email}:`, notice.message);
        return notice;
    }

    // Further methods for collections management, aging reports etc. can be added here.
}

