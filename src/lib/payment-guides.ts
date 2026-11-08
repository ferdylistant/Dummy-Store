/** How to pay with each method, shown next to the number or QR code. */
export interface PaymentGuide {
  channel: string
  steps: string[]
}

const fromOtherBank = (bankCode: string): PaymentGuide => ({
  channel: 'Dari bank lain',
  steps: [
    'Buka m-banking atau ATM bank Anda, lalu pilih Transfer ke bank lain.',
    `Pilih bank tujuan dengan kode ${bankCode}.`,
    'Masukkan nomor virtual account sebagai nomor rekening tujuan.',
    'Masukkan jumlah tepat sesuai total tagihan, lalu konfirmasi.',
  ],
})

export const VA_GUIDES: Record<'bca' | 'bni' | 'bri' | 'permata', PaymentGuide[]> = {
  bca: [
    {
      channel: 'BCA mobile',
      steps: [
        'Masuk ke BCA mobile, lalu pilih m-Transfer.',
        'Pilih BCA Virtual Account.',
        'Masukkan nomor virtual account, lalu pilih Send.',
        'Periksa nama toko dan jumlah tagihan, lalu masukkan PIN m-BCA.',
      ],
    },
    {
      channel: 'ATM BCA',
      steps: [
        'Masukkan kartu dan PIN.',
        'Pilih Transaksi Lainnya, lalu Transfer, lalu ke Rek BCA Virtual Account.',
        'Masukkan nomor virtual account, lalu pilih Benar.',
        'Periksa detail tagihan, lalu pilih Ya.',
      ],
    },
    {
      channel: 'KlikBCA',
      steps: [
        'Masuk ke KlikBCA Individual.',
        'Pilih Transfer Dana, lalu Transfer ke BCA Virtual Account.',
        'Masukkan nomor virtual account, lalu Lanjutkan.',
        'Masukkan respon KeyBCA, lalu Kirim.',
      ],
    },
    fromOtherBank('014'),
  ],
  bni: [
    {
      channel: 'BNI Mobile Banking',
      steps: [
        'Masuk ke BNI Mobile Banking, lalu pilih Transfer.',
        'Pilih Virtual Account Billing.',
        'Masukkan nomor virtual account, lalu Lanjut.',
        'Periksa detail tagihan, lalu masukkan password transaksi.',
      ],
    },
    {
      channel: 'ATM BNI',
      steps: [
        'Masukkan kartu dan PIN.',
        'Pilih Menu Lain, lalu Transfer, lalu Rekening Tabungan.',
        'Pilih Ke Rekening BNI, lalu masukkan nomor virtual account.',
        'Periksa detail tagihan, lalu pilih Ya.',
      ],
    },
    {
      channel: 'BNI Internet Banking',
      steps: [
        'Masuk ke BNI Internet Banking.',
        'Pilih Transfer, lalu Virtual Account Billing.',
        'Masukkan nomor virtual account, lalu Lanjut.',
        'Masukkan kode otentikasi token, lalu proses.',
      ],
    },
    fromOtherBank('009'),
  ],
  bri: [
    {
      channel: 'BRImo',
      steps: [
        'Masuk ke BRImo, lalu pilih BRIVA.',
        'Masukkan nomor virtual account.',
        'Periksa nama toko dan jumlah tagihan, lalu pilih Bayar.',
        'Masukkan PIN.',
      ],
    },
    {
      channel: 'ATM BRI',
      steps: [
        'Masukkan kartu dan PIN.',
        'Pilih Transaksi Lain, lalu Pembayaran, lalu Lainnya, lalu BRIVA.',
        'Masukkan nomor virtual account, lalu Benar.',
        'Periksa detail tagihan, lalu pilih Ya.',
      ],
    },
    {
      channel: 'Internet Banking BRI',
      steps: [
        'Masuk ke Internet Banking BRI.',
        'Pilih Pembayaran, lalu BRIVA.',
        'Masukkan nomor virtual account dan password, lalu kirim mToken.',
      ],
    },
    fromOtherBank('002'),
  ],
  permata: [
    {
      channel: 'PermataMobile X',
      steps: [
        'Masuk ke PermataMobile X, lalu pilih Bayar Tagihan.',
        'Pilih Virtual Account.',
        'Masukkan nomor virtual account.',
        'Periksa detail tagihan, lalu masukkan otentikasi transaksi.',
      ],
    },
    {
      channel: 'ATM Permata',
      steps: [
        'Masukkan kartu dan PIN.',
        'Pilih Transaksi Lainnya, lalu Pembayaran, lalu Pembayaran Lainnya.',
        'Pilih Virtual Account, lalu masukkan nomor virtual account.',
        'Periksa detail tagihan, lalu pilih Benar.',
      ],
    },
    fromOtherBank('013'),
  ],
}

export const MANDIRI_GUIDES: PaymentGuide[] = [
  {
    channel: "Livin' by Mandiri",
    steps: [
      "Masuk ke Livin' by Mandiri, lalu pilih Bayar.",
      'Cari penyedia jasa dengan kode perusahaan, lalu pilih Midtrans.',
      'Masukkan kode bayar, lalu Lanjutkan.',
      'Periksa detail tagihan, lalu masukkan PIN.',
    ],
  },
  {
    channel: 'ATM Mandiri',
    steps: [
      'Masukkan kartu dan PIN.',
      'Pilih Bayar/Beli, lalu Lainnya, lalu Multi Payment.',
      'Masukkan kode perusahaan, lalu Benar.',
      'Masukkan kode bayar, lalu Benar. Pilih tagihan, lalu konfirmasi dengan Ya.',
    ],
  },
]

export const QR_GUIDES: Record<'qris' | 'gopay', PaymentGuide[]> = {
  qris: [
    {
      channel: 'Aplikasi pembayaran',
      steps: [
        'Buka aplikasi yang mendukung QRIS: GoPay, OVO, DANA, ShopeePay, LinkAja, atau m-banking.',
        'Pilih Bayar atau Scan, lalu arahkan kamera ke kode QR.',
        'Periksa nama toko dan jumlah tagihan.',
        'Konfirmasi pembayaran dengan PIN.',
      ],
    },
  ],
  gopay: [
    {
      channel: 'Gojek atau GoPay',
      steps: [
        'Di komputer: buka aplikasi Gojek atau GoPay, pilih Bayar, lalu scan kode QR.',
        'Di ponsel: tekan Buka GoPay, aplikasi akan terbuka dengan tagihan ini.',
        'Periksa jumlah tagihan, lalu konfirmasi dengan PIN.',
      ],
    },
  ],
}

export const SHOPEEPAY_GUIDES: PaymentGuide[] = [
  {
    channel: 'ShopeePay',
    steps: [
      'Di ponsel: tekan Buka ShopeePay, aplikasi Shopee akan terbuka dengan tagihan ini.',
      'Di komputer: scan kode QR dengan kamera ponsel yang sudah terpasang aplikasi Shopee.',
      'Periksa jumlah tagihan, lalu konfirmasi dengan PIN ShopeePay.',
    ],
  },
]

export const BANK_NAMES = { bca: 'BCA', bni: 'BNI', bri: 'BRI', permata: 'Permata' } as const
