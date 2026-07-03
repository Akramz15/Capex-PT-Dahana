import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { fmtShort, fmtRupiah } from '../../utils'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--clr-border)', borderRadius: 8, padding: '12px 16px', boxShadow: 'var(--shadow-md)', minWidth: '220px' }}>
      <p style={{ fontWeight: 700, marginBottom: 8, fontSize: 13, borderBottom: '1px solid var(--clr-border)', paddingBottom: '4px' }}>{label}</p>
      
      {/* Bars (Bulanan) */}
      <p style={{ fontSize: 11, color: 'var(--clr-text-secondary)', marginBottom: 2, marginTop: 4 }}>Nilai Bulanan:</p>
      {payload.filter(p => p.dataKey === 'rkapBulanan' || p.dataKey === 'realisasiBulanan').map((p) => (
        <p key={p.name} style={{ color: p.color, fontSize: 12, marginBottom: 2 }}>
          {p.name}: <strong>Rp {fmtRupiah(p.value)}</strong>
        </p>
      ))}

      {/* Lines (Kumulatif) */}
      <p style={{ fontSize: 11, color: 'var(--clr-text-secondary)', marginBottom: 2, marginTop: 8 }}>Nilai Kumulatif (S-Curve):</p>
      {payload.filter(p => p.dataKey === 'rkapKumulatif' || p.dataKey === 'realisasiKumulatif').map((p) => (
        <p key={p.name} style={{ color: p.color, fontSize: 12, marginBottom: 2 }}>
          {p.name}: <strong>Rp {fmtRupiah(p.value)}</strong>
        </p>
      ))}
    </div>
  )
}

export default function CumulativeTrendChart({ data = [], range = 12 }) {
  // Map monthly and cumulative data
  let cumRkap = 0
  let cumReal = 0
  const chartData = data.map(d => {
    cumRkap += (d.rkap || 0)
    cumReal += (d.realisasi || 0)
    return {
      bulan: d.bulan,
      rkapBulanan: d.rkap || 0,
      realisasiBulanan: d.realisasi || 0,
      rkapKumulatif: cumRkap,
      realisasiKumulatif: cumReal
    }
  })

  // Group by chunks if range is 3 (Triwulan) or 6 (Semester)
  let displayData = chartData
  if (range === 3 || range === 6) {
    const chunked = []
    let chunkRkapBulanan = 0
    let chunkRealBulanan = 0
    
    for (let i = 0; i < chartData.length; i++) {
      chunkRkapBulanan += chartData[i].rkapBulanan
      chunkRealBulanan += chartData[i].realisasiBulanan
      
      if ((i + 1) % range === 0 || i === chartData.length - 1) {
        const label = range === 3 ? `Q${Math.ceil((i + 1) / 3)}` : `Smt ${Math.ceil((i + 1) / 6)}`
        chunked.push({
          bulan: label,
          rkapBulanan: chunkRkapBulanan,
          realisasiBulanan: chunkRealBulanan,
          rkapKumulatif: chartData[i].rkapKumulatif, // cumulative at end of chunk
          realisasiKumulatif: chartData[i].realisasiKumulatif
        })
        chunkRkapBulanan = 0
        chunkRealBulanan = 0
      }
    }
    displayData = chunked
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={400}>
      <ComposedChart data={displayData} margin={{ top: 20, right: 10, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 92%)" />
        <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: 'var(--clr-text-secondary)' }} axisLine={false} tickLine={false} />
        
        {/* Left Y-Axis for Bars (Monthly) */}
        <YAxis 
          yAxisId="left" 
          tickFormatter={fmtShort} 
          tick={{ fontSize: 11, fill: 'var(--clr-text-secondary)' }} 
          axisLine={false} 
          tickLine={false} 
          width={60} 
        />
        
        {/* Right Y-Axis for Lines (Cumulative) */}
        <YAxis 
          yAxisId="right" 
          orientation="right" 
          tickFormatter={fmtShort} 
          tick={{ fontSize: 11, fill: 'var(--clr-text-secondary)' }} 
          axisLine={false} 
          tickLine={false} 
          width={60} 
        />
        
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
        
        {/* Bars (Bulanan) mapped to Left Axis */}
        <Bar yAxisId="left" dataKey="rkapBulanan" name="Rencana Bulanan" fill="hsl(214 80% 85%)" radius={[4, 4, 0, 0]} barSize={range > 1 ? 40 : 20} />
        <Bar yAxisId="left" dataKey="realisasiBulanan" name="Realisasi Bulanan" fill="hsl(145 63% 75%)" radius={[4, 4, 0, 0]} barSize={range > 1 ? 40 : 20} />
        
        {/* Lines (Kumulatif) mapped to Right Axis */}
        <Line yAxisId="right" type="monotone" dataKey="rkapKumulatif" name="Kumulatif Rencana" stroke="hsl(214 80% 48%)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        <Line yAxisId="right" type="monotone" dataKey="realisasiKumulatif" name="Kumulatif Realisasi" stroke="hsl(145 63% 42%)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
