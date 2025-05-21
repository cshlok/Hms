import { NextApiRequest, NextApiResponse } from "next";
import { ChargeCaptureService } from "../../../../features/billing/services/ChargeCaptureService"; // Adjust path as per actual structure
import { ChargeInput } from "../../../../features/billing/types"; // Adjust path

const chargeCaptureService = new ChargeCaptureService();

/**
 * @swagger
 * /api/billing/charges:
 *   post:
 *     summary: Record a new charge for a patient
 *     description: Submits charge information from clinical/service modules to be recorded against a patient account.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - serviceId
 *               - quantity
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: The ID of the patient.
 *               serviceId:
 *                 type: string
 *                 description: The ID or code of the service/item being charged.
 *               serviceName:
 *                 type: string
 *                 description: The name of the service/item.
 *               quantity:
 *                 type: number
 *                 description: The quantity of the service/item.
 *               unitPrice:
 *                 type: number
 *                 description: The unit price of the service (optional, can be fetched from ChargeMaster).
 *               department:
 *                 type: string
 *                 description: The department originating the charge.
 *               notes:
 *                 type: string
 *                 description: Optional notes about the charge.
 *     responses:
 *       201:
 *         description: Charge recorded successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PatientCharge" # Assuming PatientCharge schema is defined elsewhere
 *       400:
 *         description: Invalid input data or patient not found.
 *       500:
 *         description: Server error.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "POST") {
        try {
            const { patientId, ...chargeData } = req.body as { patientId: string } & ChargeInput;
            if (!patientId) {
                return res.status(400).json({ message: "Patient ID is required." });
            }
            const newCharge = await chargeCaptureService.recordCharge(patientId, chargeData);
            return res.status(201).json(newCharge);
        } catch (error: any) {
            console.error("Error recording charge:", error);
            if (error.message.includes("not found") || error.message.includes("Invalid charge input")) {
                return res.status(400).json({ message: error.message });
            }
            return res.status(500).json({ message: "Error recording charge", error: error.message });
        }
    }
    // Add GET handler if needed to retrieve charges via API, though service method exists
    // if (req.method === "GET") { ... }
    else {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

