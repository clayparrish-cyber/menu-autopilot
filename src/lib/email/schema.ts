// lib/email/schema.ts
import { z } from "zod";

export const sendEmailSchema = z.object({
  recipientIds: z
    .array(z.string().min(1))
    .min(1, "At least one recipient is required")
    .max(20, "Maximum 20 recipients allowed"),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;
