import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Trophy } from 'lucide-react'
import { fmtRupiah, fmtShort } from '../../utils'

const COLORS = [
  'hsl(214, 80%, 48%)',
  'hsl(214, 75%, 55%)',
  'hsl(214, 70%, 65%)',
  'hsl(214, 65%, 75%)',
  'hsl(214, 60%, 85%)'
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--clr-border)', borderRadius: 8, padding: '12px 16px', boxShadow: 'var(--shadow-md)', maxWidth: '300px', whiteSpace: 'normal' }}>
      <p style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, fontSize: 13, marginBottom: 0 }}>
          Anggaran: <strong>Rp {fmtRupiah(p.value)}</strong>
        </p>
      ))}
    </div>
  )
}

export default function Top5CapexChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="table-empty">
        <div className="table-empty-icon"><Trophy size={40} /></div>
        Data belum tersedia
      </div>
    )
  }

  // Ensure names are truncated if too long for the Y axis
  const chartData = data.map(d => ({
    ...d,
    shortName: d.nama.length > 25 ? d.nama.substring(0, 25) + '...' : d.nama
  }))

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="hsl(220 15% 92%)" />
          <XAxis 
            type="number" 
            tickFormatter={fmtShort} 
            tick={{ fontSize: 11, fill: 'var(--clr-text-secondary)' }} 
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis 
            type="category" 
            dataKey="shortName" 
            tick={{ fontSize: 11, fill: 'var(--clr-text-secondary)' }}
            width={120}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{fill: 'var(--clr-bg-alt)'}} />
          <Bar dataKey="anggaran" radius={[0, 4, 4, 0]} barSize={24}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
