import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { BarChart3 } from 'lucide-react'
import { fmtRupiah } from '../../utils'

const COLORS = {
  PO:      'hsl(214, 80%, 52%)',
  Tender:  'hsl(38, 92%, 50%)',
  Kajian:  'hsl(199, 89%, 48%)',
  BAADK:   'hsl(145, 63%, 42%)',
  Lainnya: 'hsl(270, 60%, 55%)',
  Rencana: 'hsl(220, 10%, 70%)',
}

const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const r  = innerRadius + (outerRadius - innerRadius) * 0.5
  const x  = cx + r * Math.cos(-midAngle * RADIAN)
  const y  = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function StatusDistributionChart({ data = {}, totalRKAP = 0, totalReal = 0, sisa = 0 }) {
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0 || ['PO', 'Kajian', 'Tender', 'BAADK', 'Lainnya'].includes(item.name))

  if (!chartData.length) return (
    <div className="table-empty">
      <div className="table-empty-icon"><BarChart3 size={40} /></div>
      Data belum tersedia
    </div>
  )

  const getPct = (val) => {
    if (totalRKAP <= 0) return '0%'
    const pct = (val / totalRKAP * 100)
    if (pct > 0 && pct < 0.05) return '< 0,1%'
    return pct.toFixed(1).replace('.', ',') + '%'
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ flex: '1 1 240px', minWidth: '240px' }}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            outerRadius={90}
            innerRadius={50}
            dataKey="value"
            labelLine={false}
            label={renderLabel}
          >
            {chartData.map(({ name }) => (
              <Cell key={name} fill={COLORS[name] ?? 'hsl(220 15% 70%)'} />
            ))}
          </Pie>
          <Tooltip formatter={(v, n) => [`Rp ${fmtRupiah(v)}`, n]} />
        </PieChart>
      </ResponsiveContainer>
      </div>

      <div style={{ flex: '1 1 300px', overflowX: 'auto', paddingRight: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            {chartData.map((item, i) => (
              <tr key={item.name}>
                <td style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtRupiah(item.value)}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>{getPct(item.value)}</td>
                <td style={{ padding: '8px 12px', borderLeft: `6px solid ${COLORS[item.name] || '#ccc'}`, backgroundColor: 'var(--clr-bg-alt, #f8f9fa)', fontWeight: 500 }}>
                  {item.name === 'BAADK' ? 'BA/ADK' : item.name}
                </td>
              </tr>
            ))}
            
            <tr><td colSpan={3} style={{ borderBottom: '2px solid #000', padding: '4px' }}></td></tr>
            
            <tr>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{fmtRupiah(totalReal)}</td>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{getPct(totalReal)}</td>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>Total Realisasi</td>
            </tr>
            <tr>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{fmtRupiah(sisa)}</td>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{getPct(sisa)}</td>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>Sisa</td>
            </tr>
            <tr>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{fmtRupiah(totalRKAP)}</td>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>100%</td>
              <td style={{ padding: '12px', fontWeight: 'bold' }}>Total</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
