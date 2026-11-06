import { z } from 'zod'

export const checkoutSchema = z.object({
  email: z.email('Tulis email yang valid, misalnya nama@email.com.'),
  fullName: z.string().trim().min(3, 'Tulis nama lengkap penerima, minimal 3 huruf.'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8[0-9]{7,12}$/, 'Tulis nomor ponsel yang valid, misalnya 081234567890.'),
  address: z.string().trim().min(10, 'Tulis alamat lengkap dengan nama jalan dan nomor rumah.'),
  city: z.string().trim().min(3, 'Tulis nama kota atau kabupaten tujuan.'),
  province: z.string().trim().min(3, 'Tulis nama provinsi tujuan.'),
  postalCode: z.string().trim().regex(/^[0-9]{5}$/, 'Kode pos terdiri dari 5 angka.'),
  notes: z.string().trim().max(200, 'Catatan maksimal 200 karakter.').optional(),
  shippingMethod: z.enum(['reguler', 'ekspres']),
  paymentMethod: z.enum(['transfer', 'ewallet', 'cod']),
})

export type CheckoutValues = z.infer<typeof checkoutSchema>
