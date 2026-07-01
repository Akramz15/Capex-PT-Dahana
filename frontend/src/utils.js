/** Format angka ke Rupiah Indonesia: 1.500.000 */
export const fmtRupiah = (val) => {
  if (val == null || isNaN(val)) return '—'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

/** Format angka menjadi singkatan: 1.5 M, 500 Jt */
export const fmtShort = (val) => {
  if (val == null || isNaN(val)) return '—'
  const n = Number(val)
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(0)} Jt`
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)} Rb`
  return String(n)
}

/** Trigger file download dari Blob response */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const BULAN_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
]
