import { z } from "zod";

/**
 * Validation schema for updating user profile.
 * Explicitly excludes email, role, and status to prevent privilege escalation.
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[0-9\s-]{7,15}$/, "Please enter a valid phone number")
    .or(z.literal(""))
    .nullable()
    .optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^[+]?[0-9\s-]{7,15}$/, "Please enter a valid WhatsApp number")
    .or(z.literal(""))
    .nullable()
    .optional(),
  contactPreferences: z
    .object({
      showPhone: z.boolean(),
      showWhatsapp: z.boolean(),
    })
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
