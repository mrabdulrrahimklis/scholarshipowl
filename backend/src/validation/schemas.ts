import { z } from "zod";

// Input validation shared by the GraphQL resolvers. GraphQL types cover the
// argument *shape*; these Zod schemas enforce the business rules (email format,
// GPA range, enums, "at least one field", etc.) and produce the field errors.

// ---- Programs ----
export const listProgramsQuery = z.object({
  search: z.string().trim().optional(),
  degreeType: z.enum(["bachelors", "masters", "phd", "certificate"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type ListProgramsQuery = z.infer<typeof listProgramsQuery>;

// ---- Profiles ----
export const createProfileBody = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Valid email required"),
  educationLevel: z.string().trim().min(1, "Education level is required"),
  gpa: z.coerce.number().min(0).max(4).optional(),
  testScores: z.string().trim().max(500).optional(),
  targetTerm: z.string().trim().min(1, "Target term is required"),
});
export type CreateProfileBody = z.infer<typeof createProfileBody>;

// Partial update. gpa/testScores are nullable so the client can *clear* them
// (send null); a completely empty update is rejected with a validation error.
export const updateProfileBody = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120).optional(),
    email: z.string().trim().email("Valid email required").optional(),
    educationLevel: z.string().trim().min(1, "Education level is required").optional(),
    gpa: z.coerce.number().min(0).max(4).nullable().optional(),
    testScores: z.string().trim().max(500).nullable().optional(),
    targetTerm: z.string().trim().min(1, "Target term is required").optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Provide at least one field to update",
  });
export type UpdateProfileBody = z.infer<typeof updateProfileBody>;

// ---- Checklist ----
export const createChecklistBody = z.object({ programId: z.string().min(1) });

export const updateChecklistItemBody = z
  .object({
    status: z.enum(["not_started", "in_progress", "complete"]).optional(),
    notes: z.string().max(2000).optional(),
    counselorNotes: z.string().max(2000).optional(),
  })
  .refine(
    (v) => v.status !== undefined || v.notes !== undefined || v.counselorNotes !== undefined,
    { message: "Provide at least one of: status, notes, counselorNotes" },
  );

// ---- Reminders ----
// Cap is generous (10 years) so genuinely far-future items are never silently
// hidden; the UI filters to a shorter window client-side.
export const remindersQuery = z.object({
  withinDays: z.coerce.number().int().min(1).max(3650).default(14),
});
export type RemindersQuery = z.infer<typeof remindersQuery>;
