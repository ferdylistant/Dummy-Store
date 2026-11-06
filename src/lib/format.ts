const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function formatRupiah(value: number) {
  return rupiah.format(value)
}

/** Compact price for small labels, such as "Rp 129rb". */
export function formatRupiahShort(value: number) {
  return `Rp ${Math.round(value / 1000)}rb`
}
