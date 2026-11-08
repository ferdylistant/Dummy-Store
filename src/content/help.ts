import { formatRupiah } from '@/lib/format'
import { SHIPPING_OPTIONS } from '@/lib/pricing'
import type { StoreSettings } from '@/services/store'

export const faqItems = (store: StoreSettings) => [
  {
    question: 'Berapa lama pesanan sampai?',
    answer: `Pengiriman reguler membutuhkan ${SHIPPING_OPTIONS.reguler.eta}, dan pengiriman ekspres membutuhkan ${SHIPPING_OPTIONS.ekspres.eta}.`,
  },
  {
    question: 'Apakah ada gratis ongkir?',
    answer: `Ada. Pengiriman reguler gratis untuk belanja mulai ${formatRupiah(store.freeShippingMin)}.`,
  },
  {
    question: 'Bagaimana jika ukurannya tidak pas?',
    answer: `Produk bisa ditukar atau dikembalikan dalam ${store.returnDays} hari setelah diterima, selama belum dipakai dan label masih terpasang.`,
  },
  {
    question: 'Metode pembayaran apa saja yang tersedia?',
    answer: 'Kami menerima transfer bank, dompet digital, dan bayar di tempat untuk area tertentu.',
  },
]

export const sizeChart = [
  { size: 'S', chest: '96', length: '68' },
  { size: 'M', chest: '102', length: '70' },
  { size: 'L', chest: '108', length: '72' },
  { size: 'XL', chest: '114', length: '74' },
  { size: 'XXL', chest: '120', length: '76' },
]

export const pantsChart = [
  { size: '28', waist: '72' },
  { size: '30', waist: '77' },
  { size: '32', waist: '82' },
  { size: '34', waist: '87' },
  { size: '36', waist: '92' },
]
