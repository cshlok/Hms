import { z } from "zod";

// Define sub-schemas if vital_signs and medication_given have specific structures
// For now, using z.record(z.string(), z.any()) as a placeholder
const VitalSignsSchema = z.record(z.string(), z.any()).optional().nullable();
const MedicationGivenSchema = z
  .record(z.string(), z.any())
  .optional()
  .nullable();

export const ProgressNoteSchema = z.object({
  admission_id: z.number().int().positive(),
  note_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"), // Assuming YYYY-MM-DD format
  note_time: z
    .string()
    .regex(
      /^\d{2}:\d{2}(:\d{2})?$/,
      "Time must be in HH:MM or HH:MM:SS format"
    ), // Assuming HH:MM or HH:MM:SS format
  note_type: z.enum(["Doctor", "Nurse", "Consultant"]).optional(), // Optional as it can be set based on user role
  note_content: z.string().min(1, "Note content cannot be empty"),
  vital_signs: VitalSignsSchema,
  medication_given: MedicationGivenSchema,
  // created_by is usually added server-side based on session, not part of input validation
});

export type ProgressNoteInput = z.infer<typeof ProgressNoteSchema>;
