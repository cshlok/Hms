import { NextApiRequest, NextApiResponse } from "next";
import { AccountsReceivableService } from "../../../../features/billing/services/AccountsReceivableService"; // Adjust path as per actual structure

const arService = new AccountsReceivableService();

/**
 * @swagger
 * /api/billing/accounts/{patientId}/balance:
 *   get:
 *     summary: Get outstanding balance for a patient
 *     description: Retrieves the total outstanding account balance for a specific patient.
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the patient.
 *     responses:
 *       200:
 *         description: Outstanding balance retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patientId:
 *                   type: string
 *                 outstandingBalance:
 *                   type: number
 *       404:
 *         description: Patient not found.
 *       500:
 *         description: Server error.
 *
 * /api/billing/accounts/{patientId}/statement:
 *   get:
 *     summary: Generate an account statement for a patient
 *     description: Generates and returns an account statement for a patient over a specified period.
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the patient.
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: The start date for the statement period (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: The end date for the statement period (YYYY-MM-DD).
 *     responses:
 *       200:
 *         description: Account statement generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/AccountStatement" # Assuming AccountStatement schema is defined
 *       400:
 *         description: Invalid input or date range.
 *       404:
 *         description: Patient not found.
 *       500:
 *         description: Server error.
 *
 * /api/billing/invoices/{invoiceId}/reminders:
 *   post:
 *     summary: Send a payment reminder for an overdue invoice
 *     description: Triggers the sending of a payment reminder for a specified overdue invoice.
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the overdue invoice.
 *     responses:
 *       200:
 *         description: Payment reminder sent successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/OverdueNotice" # Assuming OverdueNotice schema is defined
 *       400:
 *         description: Invoice is not overdue or already paid.
 *       404:
 *         description: Invoice or patient not found.
 *       500:
 *         description: Server error.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { query } = req;
    // Example: /api/billing/accounts/patient123/balance
    // Example: /api/billing/accounts/patient123/statement?startDate=2023-01-01&endDate=2023-03-31
    // Example: /api/billing/invoices/inv456/reminders

    const pathSegments = req.url?.split("?")[0].split("/").filter(Boolean);

    if (!pathSegments || pathSegments.length < 3) {
        return res.status(400).json({ message: "Invalid API path" });
    }

    const mainResource = pathSegments[2]; // 'accounts' or 'invoices'
    const resourceId = pathSegments[3];
    const subResource = pathSegments[4];

    try {
        if (req.method === "GET") {
            if (mainResource === "accounts" && resourceId && subResource === "balance") {
                const patientId = resourceId;
                const balance = await arService.getPatientOutstandingBalance(patientId);
                return res.status(200).json({ patientId, outstandingBalance: balance });
            } else if (mainResource === "accounts" && resourceId && subResource === "statement") {
                const patientId = resourceId;
                const { startDate, endDate } = query as { startDate?: string, endDate?: string };
                if (!startDate || !endDate || isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
                    return res.status(400).json({ message: "Valid startDate and endDate query parameters are required." });
                }
                const statement = await arService.generateAccountStatement(patientId, new Date(startDate), new Date(endDate));
                return res.status(200).json(statement);
            }
        } else if (req.method === "POST") {
            if (mainResource === "invoices" && resourceId && subResource === "reminders") {
                const invoiceId = resourceId;
                const notice = await arService.sendPaymentReminder(invoiceId);
                return res.status(200).json(notice);
            }
        }

        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).json({ message: `Method ${req.method} Not Allowed or path not recognized` });

    } catch (error: any) {
        console.error("AR API Error:", error);
        if (error.message.includes("not found")) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("Invalid") || error.message.includes("required") || error.message.includes("not overdue")) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: "Server error processing Accounts Receivable request", error: error.message });
    }
}

