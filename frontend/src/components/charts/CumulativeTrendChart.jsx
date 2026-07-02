import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { fmtShort } from '../../utils'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--clr-border)', borderRadius: 8, padding: '12px 16px', boxShadow: 'var(--shadow-md)' }}>
      <p style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, fontSize: 12, marginBottom: 3 }}>
          {p.name}: <strong>{fmtShort(p.value)}</strong>
        </p>
      ))}
    </div>
  )
}

export default function CumulativeTrendChart({ data = [], range = 12 }) {
  // Convert monthly data into cumulative data
  let cumRkap = 0
  let cumReal = 0
  const cumulativeData = data.map(d => {
    cumRkap += (d.rkap || 0)
    cumReal += (d.realisasi || 0)
    return {
      bulan: d.bulan,
      rkap: cumRkap,
      realisasi: cumReal
    }
  })

  // Group by chunks if range is 3 (Triwulan) or 6 (Semester)
  let displayData = cumulativeData
  
  if (range === 3 || range === 6) {
    const chunked = []
    for (let i = 0; i < cumulativeData.length; i += range) {
      // The cumulative value at the END of the period
      const endIndex = Math.min(i + range - 1, cumulativeData.length - 1)
      const endItem = cumulativeData[endIndex]
      const label = range === 3 ? `Q${(i / 3) + 1}` : `Smt ${(i / 6) + 1}`
      chunked.push({
        bulan: label,
        rkap: endItem.rkap,
        realisasi: endItem.realisasi
      })
    }
    displayData = chunked
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
      <LineChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 92%)" />
        <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: 'var(--clr-text-secondary)' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--clr-text-secondary)' }} axisLine={false} tickLine={false} width={60} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="rkap" name="Kumulatif RKAP" stroke="hsl(214 80% 65%)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="realisasi" name="Kumulatif Realisasi" stroke="hsl(145 63% 50%)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
