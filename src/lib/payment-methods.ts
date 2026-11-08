/** Midtrans Snap codes the store offers. server/src/orders.ts accepts the same list. */
export const PAYMENT_GROUPS = [
  {
    title: 'Virtual account',
    hint: 'Transfer lewat ATM, m-banking, atau internet banking',
    methods: [
      { value: 'bca_va', label: 'BCA' },
      { value: 'bni_va', label: 'BNI' },
      { value: 'bri_va', label: 'BRI' },
      { value: 'echannel', label: 'Mandiri' },
      { value: 'permata_va', label: 'Permata' },
    ],
  },
  {
    title: 'Dompet digital dan QRIS',
    hint: 'Bayar dari aplikasi di ponsel',
    methods: [
      { value: 'gopay', label: 'GoPay' },
      { value: 'shopeepay', label: 'ShopeePay' },
      { value: 'other_qris', label: 'QRIS' },
    ],
  },
  {
    title: 'Kartu',
    hint: 'Kartu kredit atau debit Visa, Mastercard, JCB',
    methods: [{ value: 'credit_card', label: 'Kartu kredit atau debit' }],
  },
] as const

export type PaymentMethod = (typeof PAYMENT_GROUPS)[number]['methods'][number]['value']

export const PAYMENT_VALUES = PAYMENT_GROUPS.flatMap((group) => group.methods.map((method) => method.value)) as [
  PaymentMethod,
  ...PaymentMethod[],
]

export function paymentLabel(value: string) {
  for (const group of PAYMENT_GROUPS) {
    const method = group.methods.find((item) => item.value === value)
    if (method) return group.title === 'Virtual account' ? `Virtual account ${method.label}` : method.label
  }
  return value
}
