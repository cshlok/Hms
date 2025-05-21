import { NextApiRequest, NextApiResponse } from "next";
import { EligibilityCheckService } from "../../../../features/insurance/services/EligibilityCheckService"; // Adjust path

const eligibilityService = new EligibilityCheckService();

/**
 * @swagger
 * tags:
 *   name: Insurance Eligibility
 *   description: API for checking patient insurance eligibility
 *
 * /api/insurance/eligibility:
 *   post:
 *     summary: Check insurance eligibility for a patient
 *     tags: [Insurance Eligibility]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - policyId
 *             properties:
 *               patientId:
 *                 type: string
 *               policyId:
 *                 type: string
 *               serviceId:
 *                 type: string
 *                 description: Optional service ID for specific eligibility check.
 *     responses:
 *       200:
 *         description: Eligibility status retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/EligibilityStatus" // Assuming EligibilityStatus schema is defined
 *       400:
 *         description: Invalid input.
 *       404:
 *         description: Patient or policy not found.
 *       500:
 *         description: Server error during eligibility check.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "POST") {
        try {
            const { patientId, policyId, serviceId } = req.body as { patientId: string, policyId: string, serviceId?: string };

            if (!patientId || !policyId) {
                return res.status(400).json({ message: "Patient ID and Policy ID are required." });
            }

            const eligibilityStatus = await eligibilityService.checkEligibility(patientId, policyId, serviceId);
            return res.status(200).json(eligibilityStatus);

        } catch (error: any) {
            console.error("Eligibility Check API Error:", error);
            if (error.message.includes("not found")) {
                return res.status(404).json({ message: error.message });
            }
            return res.status(500).json({ message: "Error checking insurance eligibility", error: error.message });
        }
    } else {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

