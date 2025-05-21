import { NextApiRequest, NextApiResponse } from "next";
import { TPA, InsurancePolicy } from "../../../../features/insurance/types"; // Adjust path as per actual structure
import { ClaimProcessingService } from "../../../../features/insurance/services/ClaimProcessingService"; // Adjust path

const claimService = new ClaimProcessingService();

/**
 * @swagger
 * /api/insurance/claims:
 *   post:
 *     summary: Submit a new insurance claim
 *     description: Creates and submits a new insurance claim for a patient.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - policyId
 *               - serviceCodes
 *               - diagnosisCodes
 *               - totalAmount
 *             properties:
 *               patientId:
 *                 type: string
 *               policyId:
 *                 type: string
 *               serviceCodes:
 *                 type: array
 *                 items:
 *                   type: string
 *               diagnosisCodes:
 *                 type: array
 *                 items:
 *                   type: string
 *               totalAmount:
 *                 type: number
 *               notes:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Claim submitted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Claim"
 *       400:
 *         description: Invalid input or error during claim submission.
 *       500:
 *         description: Server error.
 *   get:
 *     summary: Retrieve claim status
 *     description: Fetches the status of a previously submitted insurance claim.
 *     parameters:
 *       - in: query
 *         name: claimId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the claim to check.
 *     responses:
 *       200:
 *         description: Claim status retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ClaimStatusResponse"
 *       400:
 *         description: Claim ID is required.
 *       404:
 *         description: Claim not found.
 *       500:
 *         description: Server error.
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "POST") {
        try {
            const { patientId, policyId, serviceCodes, diagnosisCodes, totalAmount, notes } = req.body as {
                patientId: string;
                policyId: string;
                serviceCodes: string[];
                diagnosisCodes: string[];
                totalAmount: number;
                notes?: string;
            };

            if (!patientId || !policyId || !serviceCodes || !diagnosisCodes || totalAmount === undefined) {
                return res.status(400).json({ message: "Missing required fields for creating a claim." });
            }

            const claimDetails: Omit<Claim, "id" | "patientId" | "policyId" | "submissionDate" | "status"> = {
                serviceCodes,
                diagnosisCodes,
                totalAmount,
                notes,
            };

            const newClaim = await claimService.submitClaim(patientId, policyId, claimDetails);
            return res.status(201).json(newClaim);
        } catch (error: any) {
            console.error("Error creating claim:", error);
            // Determine appropriate status code based on error type if possible
            if (error.message.includes("not found")) {
                return res.status(404).json({ message: error.message });
            }
            return res.status(500).json({ message: "Error creating insurance claim", error: error.message });
        }
    } else if (req.method === "GET") {
        const { claimId } = req.query;
        if (!claimId || typeof claimId !== 'string') {
            return res.status(400).json({ message: "Claim ID is required as a query parameter for GET requests." });
        }
        try {
            const status = await claimService.checkClaimStatus(claimId as string);
            if (!status) {
                return res.status(404).json({ message: `Claim with ID ${claimId} not found.` });
            }
            return res.status(200).json(status);
        } catch (error: any) {
            console.error(`Error fetching claim ${claimId}:`, error);
            if (error.message.includes("not found")) {
                return res.status(404).json({ message: error.message });
            }
            return res.status(500).json({ message: `Error fetching claim ${claimId}`, error: error.message });
        }
    } else {
        res.setHeader("Allow", ["POST", "GET"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

