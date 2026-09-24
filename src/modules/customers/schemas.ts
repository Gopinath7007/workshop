import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Enter customer name'),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile'),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  gstin: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v),
      'Invalid GSTIN',
    ),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  addressLine1: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CreateCustomerForm = z.infer<typeof createCustomerSchema>;
