import { z } from 'zod'
import { PAYMENT_VALUES } from '@/lib/payment-methods'

export const checkoutSchema = z.object({
  email: z.email('Tulis email yang valid, misalnya nama@email.com.'),
  fullName: z.string().trim().min(3, 'Tulis nama lengkap penerima, minimal 3 huruf.'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8[0-9]{7,12}$/, 'Tulis nomor ponsel yang valid, misalnya 081234567890.'),
  address: z.string().trim().min(10, 'Tulis nama jalan, nomor rumah, RT/RW.'),
  /** Village code. The server reads every region name and the postal code from it. */
  regionCode: z.string().regex(/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/, 'Pilih provinsi sampai desa atau kelurahan.'),
  // Shown in the review. The server ignores them and uses regionCode.
  province: z.string(),
  city: z.string(),
  district: z.string(),
  village: z.string(),
  postalCode: z.string(),
  notes: z.string().trim().max(200, 'Catatan maksimal 200 karakter.').optional(),
  /** "reguler" and "ekspres" are the flat rates. Courier rates look like "jne:reg". */
  shippingMethod: z.string().min(1, 'Pilih pengiriman.'),
  paymentMethod: z.enum(PAYMENT_VALUES, { error: 'Pilih metode pembayaran.' }),
})

export type CheckoutValues = z.infer<typeof checkoutSchema>
