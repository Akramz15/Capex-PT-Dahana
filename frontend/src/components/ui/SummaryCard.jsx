import { fmtShort } from '../../utils'
import { Wallet, Target, Activity } from 'lucide-react'
import { Package, CheckCircle, Hourglass } from 'lucide-react'

const PRESETS = {
  anggaran:   { accent: 'var(--clr-primary)',  iconBg: 'var(--clr-primary-light)',  icon: <Wallet size={20} /> },
  realisasi:  { accent: 'var(--clr-success)',  iconBg: 'var(--clr-success-light)',  icon: <CheckCircle size={20} /> },
  sisa:       { accent: 'var(--clr-warning)',  iconBg: 'var(--clr-warning-light)',  icon: <Hourglass size={20} /> },
  items:      { accent: 'var(--clr-info)',     iconBg: 'var(--clr-info-light)',     icon: <Package size={20} /> },
}

export default function SummaryCard({ label, value, sub, pct, type = 'anggaran', isRupiah = true }) {
  const { accent, iconBg, icon } = PRESETS[type] ?? PRESETS.anggaran

  return (
    <div className="summary-card" style={{ '--card-accent': accent, '--card-icon-bg': iconBg }}>
      <div className="summary-card-icon">{icon}</div>
      <div className="summary-card-body">
        <div className="summary-card-label">{label}</div>
        <div className="summary-card-value rupiah">
          {isRupiah ? fmtShort(value) : value}
        </div>
        <div className="summary-card-sub">
          {sub}
          {pct != null && (
            <span className="summary-card-pct" style={{ marginLeft: 8 }}>{pct}%</span>
          )}
        </div>
      </div>
    </div>
  )
}
