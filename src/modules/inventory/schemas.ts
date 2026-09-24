import { z } from 'zod';

export const createPartSchema = z.object({
  name: z.string().trim().min(2, 'Part name required'),
  sku: z.string().trim().optional(),
  partNumber: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  costPrice: z.number().nonnegative('Cost required'),
  sellingPrice: z.number().nonnegative('Selling price required'),
  reorderLevel: z.number().nonnegative().optional(),
  openingStock: z.number().nonnegative().optional(),
  gstPercent: z.number().nonnegative().optional(),
});

export type CreatePartForm = z.infer<typeof createPartSchema>;

export const stockAdjustSchema = z.object({
  quantity: z.number().positive('Enter quantity'),
  notes: z.string().trim().optional(),
});

export type StockAdjustForm = z.infer<typeof stockAdjustSchema>;

export const createVehicleSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .min(5, 'Enter registration number')
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '')),
  customerMobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile'),
  customerName: z.string().trim().min(2, 'Customer name required'),
  brand: z.string().trim().optional(),
  model: z.string().trim().optional(),
  fuelType: z.string().trim().optional(),
  vehicleType: z.string().trim().optional(),
  insuranceProvider: z.string().trim().optional(),
  insuranceExpiry: z.string().trim().optional(),
  ownerName: z.string().trim().optional(),
});

export type CreateVehicleForm = z.infer<typeof createVehicleSchema>;
