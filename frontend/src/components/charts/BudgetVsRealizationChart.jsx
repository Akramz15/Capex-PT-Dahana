import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
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

export default function BudgetVsRealizationChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 92%)" />
        <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: 'var(--clr-text-secondary)' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'var(--clr-text-secondary)' }} axisLine={false} tickLine={false} width={60} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="rkap"       name="Anggaran RKAP" fill="hsl(214 80% 65%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="realisasi"  name="Realisasi"     fill="hsl(145 63% 50%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
