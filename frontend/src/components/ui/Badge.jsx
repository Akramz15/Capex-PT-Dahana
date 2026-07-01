const STATUS_CLASS = {
  PO:      'badge-po',
  Tender:  'badge-tender',
  Kajian:  'badge-kajian',
  BAADK:   'badge-baadk',
  Lainnya: 'badge-lainnya',
  Rencana: 'badge-rencana',
}

export default function Badge({ status }) {
  const cls = STATUS_CLASS[status] ?? 'badge-rencana'
  return <span className={`badge ${cls}`}>{status ?? '—'}</span>
}
