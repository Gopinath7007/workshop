import { z } from 'zod';

export const createJobCardSchema = z.object({
  customerName: z.string().trim().min(2, 'Enter customer name'),
  customerMobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile'),
  customerGstin: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v),
      'Invalid GSTIN',
    ),
  registrationNumber: z
    .string()
    .trim()
    .min(5, 'Enter registration number')
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '')),
  brand: z.string().trim().optional(),
  model: z.string().trim().optional(),
  fuelType: z.string().trim().optional(),
  complaints: z.string().trim().min(3, 'Describe the complaint'),
  odometerIn: z.number().int().nonnegative().optional(),
  estimatedCost: z.number().nonnegative().optional(),
});

export type CreateJobCardForm = z.infer<typeof createJobCardSchema>;

export const estimateQuickSchema = z.object({
  laborDescription: z.string().trim().min(2, 'Labor description required'),
  laborAmount: z.number().positive('Labor amount required'),
  partDescription: z.string().trim().optional(),
  partAmount: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional(),
});

export type EstimateQuickForm = z.infer<typeof estimateQuickSchema>;
