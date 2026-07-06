import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { fmtRupiah, fmtShort } from '../../utils'
import { TrendingUp, TrendingDown, Minus, Wallet, CheckCircle, Hourglass, AlertTriangle } from 'lucide-react'

/**
 * AchievementOverviewChart
 * 
 * FUNGSI: Menjawab satu pertanyaan utama manajemen:
 * "Seberapa jauh kita sudah menyerap anggaran tahun ini?"
 * 
 * Berbeda dengan "Distribusi Status" di halaman Realisasi (yang menunjukkan
 * SEBARAN fase pengerjaan per kategori status), grafik ini fokus pada:
 * - Persentase penyerapan anggaran total (angka tunggal yang langsung terbaca)
 * - Perbandingan nilai terserap vs sisa anggaran
 * - Sinyal kesehatan penyerapan (baik / perlu perhatian / kritis)
 */

const STATUS_THRESHOLDS = {
  great:   { min: 75, color: 'hsl(145, 63%, 42%)',  label: 'Baik',              icon: TrendingUp,    bg: 'hsl(145, 63%, 95%)' },
  good:    { min: 50, color: 'hsl(38,  92%, 45%)',  label: 'Perlu Diperhatikan', icon: Minus,         bg: 'hsl(38, 92%, 95%)'  },
  warning: { min: 25, color: 'hsl(25,  90%, 52%)',  label: 'Tertinggal',         icon: TrendingDown,  bg: 'hsl(25, 90%, 95%)'  },
  danger:  { min: 0,  color: 'hsl(0,   75%, 52%)',  label: 'Kritis',             icon: AlertTriangle, bg: 'hsl(0, 75%, 95%)'   },
}

function getThreshold(pct) {
  if (pct >= 75) return STATUS_THRESHOLDS.great
  if (pct >= 50) return STATUS_THRESHOLDS.good
  if (pct >= 25) return STATUS_THRESHOLDS.warning
  return STATUS_THRESHOLDS.danger
}

export default function AchievementOverviewChart({ 
  totalAnggaran = 0, 
  totalRealisasi = 0, 
  sisaAnggaran = 0,
  persenRealisasi = 0,
  totalItems = 0,
}) {
  const pct = Math.min(persenRealisasi ?? (totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0), 100)
  const threshold = getThreshold(pct)
  const StatusIcon = threshold.icon

  // Data for the donut gauge
  const donutData = [
    { name: 'Terserap', value: pct },
    { name: 'Sisa',     value: Math.max(100 - pct, 0) },
  ]

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
      
      {/* ── Left: Donut Gauge ── */}
      <div style={{ position: 'relative', flex: '0 0 260px', height: '260px' }}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              startAngle={90}
              endAngle={-270}
              innerRadius={90}
              outerRadius={120}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={threshold.color} />
              <Cell fill="hsl(220, 13%, 91%)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center overlay: big percentage */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: threshold.color, lineHeight: 1 }}>
            {pct.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
            Penyerapan
          </div>
          <div style={{
            marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
            backgroundColor: threshold.bg, color: threshold.color,
          }}>
            <StatusIcon size={10} />
            {threshold.label}
          </div>
        </div>
      </div>

      {/* ── Right: KPI breakdown ── */}
      <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
      {/* 3 KPI rows */}
        {[
          {
            icon: Wallet,
            iconColor: 'hsl(214, 80%, 52%)',
            iconBg: 'hsl(214, 80%, 95%)',
            label: 'Total Anggaran Aktif',
            desc: `${totalItems} item Capex tahun ini`,
            value: `Rp ${fmtShort(totalAnggaran)}`,
          },
          {
            icon: CheckCircle,
            iconColor: 'hsl(145, 63%, 42%)',
            iconBg: 'hsl(145, 63%, 95%)',
            label: 'Total Realisasi s.d. Sekarang',
            desc: 'Nilai yang sudah dibayarkan / terealisasi',
            value: `Rp ${fmtShort(totalRealisasi)}`,
          },
          {
            icon: Hourglass,
            iconColor: 'hsl(38, 92%, 45%)',
            iconBg: 'hsl(38, 92%, 95%)',
            label: 'Sisa Anggaran Belum Terserap',
            desc: 'Masih tersedia untuk direalisasikan',
            value: `Rp ${fmtShort(sisaAnggaran)}`,
          },
        ].map(({ icon: Icon, iconColor, iconBg, label, desc, value }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 14px', borderRadius: '8px',
            backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={18} color={iconColor} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '1px' }}>{desc}</div>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
