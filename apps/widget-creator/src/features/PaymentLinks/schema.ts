import { z } from 'zod/v3';

export const paymentLinkSchema = z.object({
  asset: z.object({
    symbol: z.string().min(1, 'Asset is required'),
    blockchain: z.string().min(1, 'Blockchain is required'),
    icon: z.string().optional(),
  }),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Amount must be a positive number',
    }),
  recipient: z.string().min(1, 'Recipient address is required'),
  description: z
    .string()
    .max(200, 'Description must be 200 characters or less')
    .optional()
    .or(z.literal('')),
});

export type PaymentLinkFormValues = z.infer<typeof paymentLinkSchema>;
