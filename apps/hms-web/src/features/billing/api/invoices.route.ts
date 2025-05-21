import { NextApiRequest, NextApiResponse } from "next";
import { InvoiceService } from "../../../../features/billing/services/InvoiceService"; // Adjust path as per actual structure
import { Invoice } from "../../../../features/billing/types"; // Adjust path

const invoiceService = new InvoiceService();

/**
 * @swagger
 * /api/billing/invoices:
 *   post:
 *     summary: Generate a new invoice for a patient
 *     description: Creates an invoice based on billable charges for a patient.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: The ID of the patient for whom to generate the invoice.
 *               chargeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional array of specific charge IDs to include in this invoice.
 *               invoiceType:
 *                 type: string
 *                 description: Type of invoice (e.g., 'INTERIM', 'FINAL'). Defaults to 'FINAL'.
 *                 default: 'FINAL'
 *     responses:
 *       201:
 *         description: Invoice generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Invoice"
 *       400:
 *         description: Invalid input, patient not found, or no billable charges.
 *       500:
 *         description: Server error.
 *
 * /api/billing/invoices/{invoiceId}:
 *   get:
 *     summary: Retrieve a specific invoice by ID
 *     description: Fetches the details of a single invoice.
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the invoice to retrieve.
 *     responses:
 *       200:
 *         description: Invoice details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Invoice"
 *       404:
 *         description: Invoice not found.
 *       500:
 *         description: Server error.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { invoiceId } = req.query;

    if (req.method === "POST") {
        try {
            const { patientId, chargeIds, invoiceType } = req.body as { patientId: string, chargeIds?: string[], invoiceType?: string };
            if (!patientId) {
                return res.status(400).json({ message: "Patient ID is required." });
            }
            const newInvoice = await invoiceService.generateInvoice(patientId, chargeIds, invoiceType);
            return res.status(201).json(newInvoice);
        } catch (error: any) {
            console.error("Error generating invoice:", error);
            if (error.message.includes("not found") || error.message.includes("No billable charges")) {
                return res.status(400).json({ message: error.message });
            }
            return res.status(500).json({ message: "Error generating invoice", error: error.message });
        }
    } else if (req.method === "GET") {
        if (typeof invoiceId === 'string') {
            try {
                const invoice = await invoiceService.getInvoiceById(invoiceId);
                if (!invoice) {
                    return res.status(404).json({ message: `Invoice with ID ${invoiceId} not found.` });
                }
                return res.status(200).json(invoice);
            } catch (error: any) {
                console.error(`Error fetching invoice ${invoiceId}:`, error);
                return res.status(500).json({ message: `Error fetching invoice ${invoiceId}`, error: error.message });
            }
        }
        // Potentially add a GET /api/billing/invoices to list all invoices or invoices for a patient (with query params)
        else {
            return res.status(400).json({ message: "Invoice ID is required for GET requests to this endpoint, or use a different endpoint for listing invoices." });
        }
    } else {
        res.setHeader("Allow", ["POST", "GET"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

