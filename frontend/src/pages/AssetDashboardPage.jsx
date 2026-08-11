import { useEffect, useState, useMemo } from 'react'
import { getAsetDashboard } from '../api/master_aset'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, LabelList, AreaChart, Area } from 'recharts'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { fmtRupiah } from '../utils'
import { CheckCircle, Users, BarChart2, Hash, TrendingUp, Inbox } from 'lucide-react'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57']
const PREMIUM_COLORS = ['#126487', '#ec6a28', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#264653', '#8ab17d', '#e07a5f', '#3d5a80', '#6d597a']

import SummaryCard from '../components/ui/SummaryCard'

const EmptyChartState = ({ message = "Belum ada data tersedia" }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
    <Inbox size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
    <span style={{ fontSize: '14px', fontWeight: 500, opacity: 0.6 }}>{message}</span>
  </div>
)

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.05)' }}>
        <p style={{ margin: '0 0 6px 0', fontWeight: 700, color: '#333', fontSize: '13px', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
          {data.name}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', fontSize: '12px', color: '#555', marginBottom: '4px' }}>
          <span>Total Aset (Unit):</span>
          <span style={{ fontWeight: 700, color: payload[0].fill }}>{data.value.toLocaleString('id-ID')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', fontSize: '12px', color: '#555' }}>
          <span>Persentase:</span>
          <span style={{ fontWeight: 700, color: payload[0].fill }}>{data.percent ? data.percent.toFixed(1) : 0}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function AssetDashboardPage({ tahun }) {
  const [data, setData] = useState({ laporan: [], nomor: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAsetDashboard(tahun)
      .then(res => setData(res || { laporan: [], nomor: [] }))
      .catch(err => {
        console.error(err)
        setData({ laporan: [], nomor: [] })
      })
      .finally(() => setLoading(false))
  }, [tahun])

  // --- Aggregations for Laporan Aktiva Tetap ---
  const laporanStats = useMemo(() => {
    let acquis = 0, accum = 0, book = 0
    const byYearMap = {}
    const byLocationMap = {}
    const byCategoryMap = {}

    const laporanData = Array.isArray(data?.laporan) ? data.laporan : []
    laporanData.forEach(item => {
      acquis += item.acquis_val || 0
      accum += item.accum_dep || 0
      book += item.book_val || 0

      const year = item.capitalized_on ? new Date(item.capitalized_on).getFullYear() : 'Unknown'
      if (!byYearMap[year]) byYearMap[year] = { year, acquis: 0, accum: 0, book: 0 }
      byYearMap[year].acquis += item.acquis_val || 0
      byYearMap[year].accum += item.accum_dep || 0
      byYearMap[year].book += item.book_val || 0

      const loc = item.lokasi || 'Unknown'
      if (!byLocationMap[loc]) byLocationMap[loc] = { name: loc, value: 0 }
      byLocationMap[loc].value += 1

      const cat = item.deskripsi || 'Lain-lain'
      if (!byCategoryMap[cat]) byCategoryMap[cat] = { name: cat, acquis_val: 0, count: 0 }
      byCategoryMap[cat].acquis_val += item.acquis_val || 0
      byCategoryMap[cat].count += 1
    })

    const endYear = (tahun && tahun !== 'Semua Tahun') ? Number(tahun) : new Date().getFullYear()
    
    // Sort all available years first
    const allYearsSorted = Object.values(byYearMap)
      .filter(a => a.year !== 'Unknown')
      .sort((a,b) => a.year - b.year)

    // Calculate cumulative sum for 2015 up to endYear
    const chartYear = []
    for (let y = 2015; y <= endYear; y++) {
       let sumAcquis = 0
       let sumBook = 0
       for (const item of allYearsSorted) {
           if (item.year <= y) {
               sumAcquis += item.acquis
               sumBook += item.book
           }
       }
       chartYear.push({ year: y, acquis: sumAcquis, book: sumBook })
    }
    
    const sortedLocations = Object.values(byLocationMap).sort((a,b) => b.value - a.value)
    const totalLocationsCount = sortedLocations.reduce((acc, curr) => acc + curr.value, 0)
    let chartLocation = sortedLocations.slice(0, 10).map(item => ({...item, percent: totalLocationsCount ? (item.value / totalLocationsCount) * 100 : 0}))
    const otherLocations = sortedLocations.slice(10)
    if (otherLocations.length > 0) {
      const otherValue = otherLocations.reduce((acc, curr) => acc + curr.value, 0)
      chartLocation.push({ name: 'Lain Lain', value: otherValue, percent: totalLocationsCount ? (otherValue / totalLocationsCount) * 100 : 0 })
    }

    const chartCategory = Object.values(byCategoryMap).sort((a,b) => b.acquis_val - a.acquis_val)

    return { acquis, accum, book, chartYear, chartLocation, chartCategory }
  }, [data.laporan])

  // --- Aggregations for Permintaan Nomor Aset ---
  const nomorStats = useMemo(() => {
    const nomorData = Array.isArray(data?.nomor) ? data.nomor : []
    let grandTotal = nomorData.length
    const byMonth = Array.from({length: 12}, (_, i) => ({ name: `Bln ${i+1}`, total: 0 }))
    const catMap = {}
    const userMap = {}

    nomorData.forEach(item => {
      if (item.bulan >= 1 && item.bulan <= 12) {
        byMonth[item.bulan - 1].total += 1
      }
      
      const cat = item.kategori || 'Lainnya'
      if (!catMap[cat]) catMap[cat] = { name: cat, value: 0 }
      catMap[cat].value += 1

      const u = item.user_name || 'Unknown'
      if (!userMap[u]) userMap[u] = { name: u, value: 0 }
      userMap[u].value += 1
    })

    const chartKategori = Object.values(catMap).sort((a,b) => b.value - a.value)
    const chartUser = Object.values(userMap).sort((a,b) => a.name.localeCompare(b.name))
    
    const peakMonth = [...byMonth].sort((a,b) => b.total - a.total)[0]
    const topUser = Object.values(userMap).sort((a,b) => b.value - a.value)[0]

    return { grandTotal, byMonth, chartKategori, chartUser, peakMonth, topUser }
  }, [data.nomor])

  if (loading) return <LoadingSpinner fullscreen />

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Aset</h1>
          <p className="page-subtitle">Ringkasan Aktiva Tetap & Permintaan Nomor Aset {tahun}</p>
        </div>
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-color)' }}>
        Permintaan Nomor Aset s/d {tahun}
      </h2>
      <div className="cards-grid" style={{ marginBottom: '24px' }}>
        <SummaryCard 
          label="GRAND TOTAL" 
          value={nomorStats.grandTotal} 
          type="items" 
          isRupiah={false}
          sub="unit"
        />
        <SummaryCard 
          label="JUMLAH KATEGORI" 
          value={nomorStats.chartKategori.length} 
          type="sisa" 
          isRupiah={false}
          sub="kategori"
        />
        <SummaryCard 
          label="USER TERBANYAK" 
          value={nomorStats.topUser?.name || '-'} 
          sub={`(${nomorStats.topUser?.value || 0})`}
          type="realisasi" 
          isRupiah={false}
        />
        <SummaryCard 
          label="PUNCAK BULANAN" 
          value={nomorStats.peakMonth?.name || '-'} 
          sub={`(${nomorStats.peakMonth?.total || 0})`}
          type="anggaran" 
          isRupiah={false}
        />
      </div>

      <div className="charts-grid" style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '20px' }}>
        <div className="section">
          <div className="section-header">
            <h3 className="section-title">KOMPOSISI KATEGORI ASET</h3>
          </div>
          <div className="section-body" style={{ height: '300px' }}>
            {nomorStats.chartKategori.length === 0 ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nomorStats.chartKategori} layout="vertical" margin={{ left: 20, right: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" name="Jumlah Aset (unit)" fill="#1d4ed8" barSize={15}>
                    <LabelList dataKey="value" position="right" style={{ fontSize: '11px', fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h3 className="section-title">REALISASI PERMINTAAN NOMOR ASET PER BULAN</h3>
          </div>
          <div className="section-body" style={{ height: '300px' }}>
            {nomorStats.byMonth.every(m => m.total === 0) ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nomorStats.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={45} interval={0} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="total" name="Jumlah Aset (unit)" fill="#1d4ed8" barSize={20}>
                    <LabelList dataKey="total" position="top" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        <div className="section">
          <div className="section-header">
            <h3 className="section-title">SEBARAN BERDASARKAN USER</h3>
          </div>
          <div className="section-body" style={{ height: '300px', overflowY: 'auto', padding: '0 12px' }}>
            {nomorStats.chartUser.length === 0 ? <EmptyChartState /> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#1e293b', fontWeight: 'bold' }}>
                    <th style={{ textAlign: 'center', padding: '8px 4px' }}>No.</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>User</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Jumlah Aset (unit)</th>
                  </tr>
                </thead>
                <tbody>
                  {nomorStats.chartUser.map((u, idx) => (
                    <tr key={u.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ textAlign: 'center', padding: '6px 4px' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={u.name}>{u.name}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '10px', backgroundColor: '#e2e8f0', borderRadius: '2px', display: 'flex' }}>
                            <div style={{ width: `${(u.value / nomorStats.topUser.value) * 100}%`, backgroundColor: idx % 2 === 0 ? '#1d4ed8' : '#f97316', borderRadius: '2px' }} />
                          </div>
                          <span style={{ minWidth: '20px', textAlign: 'right', fontWeight: 600 }}>{u.value}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: 'var(--text-color)', marginTop: '40px' }}>
        Laporan Aktiva Tetap
      </h2>
      <div className="cards-grid" style={{ marginBottom: '20px' }}>
        <SummaryCard 
          label="Total Nilai Perolehan" 
          value={laporanStats.acquis} 
          type="anggaran" 
        />
        <SummaryCard 
          label="Total Akum. Penyusutan" 
          value={laporanStats.accum} 
          type="sisa" 
        />
        <SummaryCard 
          label="Total Nilai Buku" 
          value={laporanStats.book} 
          type="realisasi" 
        />
      </div>

      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="section">
          <div className="section-header">
            <h3 className="section-title" style={{ textAlign: 'left', color: '#444', fontSize: '16px', flex: 1 }}>
              Laporan Aktiva Tetap PT Dahana 2015-{tahun === 'Semua Tahun' || !tahun ? new Date().getFullYear() : tahun}
            </h3>
          </div>
          <div className="section-body" style={{ height: '350px' }}>
            {laporanStats.chartYear.length === 0 ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={laporanStats.chartYear} margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  <defs>
                    <linearGradient id="colorAcquis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#126487" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#126487" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBook" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec6a28" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ec6a28" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#666', fontWeight: 500 }} axisLine={false} tickLine={false} tickMargin={12} padding={{ left: 30, right: 30 }} />
                  <YAxis tick={{ fontSize: 12, fill: '#666', fontWeight: 500 }} axisLine={false} tickLine={false} width={45} tickFormatter={(val) => Number((val / 1000000000).toFixed(0)).toLocaleString('id-ID')} />
                  <Tooltip 
                    formatter={(val) => fmtRupiah(val)} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="top" align="left" height={40} wrapperStyle={{ paddingLeft: '55px', marginTop: '-15px' }} iconType="circle" />
                  <Area type="monotone" dataKey="acquis" name="Nilai Perolehan" stroke="#126487" strokeWidth={4} fillOpacity={1} fill="url(#colorAcquis)" activeDot={{ r: 6, strokeWidth: 0, fill: '#126487' }} dot={false} />
                  <Area type="monotone" dataKey="book" name="Nilai Buku" stroke="#ec6a28" strokeWidth={4} fillOpacity={1} fill="url(#colorBook)" activeDot={{ r: 6, strokeWidth: 0, fill: '#ec6a28' }} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h3 className="section-title" style={{ textAlign: 'center' }}>LOKASI ASET PT DAHANA {tahun}</h3>
          </div>
          <div className="section-body" style={{ height: '350px' }}>
            {laporanStats.chartLocation.length === 0 ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie 
                    data={laporanStats.chartLocation} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="40%" cy="50%" 
                    innerRadius={80}
                    outerRadius={120} 
                    paddingAngle={3}
                    cornerRadius={5}
                    labelLine={false}
                    stroke="none"
                  >
                    {laporanStats.chartLocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PREMIUM_COLORS[index % PREMIUM_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle" 
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', color: '#444', maxHeight: '300px', overflowY: 'auto' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h3 className="section-title" style={{ textAlign: 'center' }}>
              Nilai Perolehan 
              <span style={{ fontWeight: 400, color: '#888', fontSize: '13px', marginLeft: '8px' }}>(Dalam Miliar Rupiah)</span>
            </h3>
          </div>
          <div className="section-body" style={{ height: '400px' }}>
            {laporanStats.chartCategory.length === 0 ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={laporanStats.chartCategory} layout="vertical" margin={{ left: 60, right: 80, top: 20 }}>
                  <defs>
                    <linearGradient id="gradientAcquis" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#fb923c" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#666', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(val) => fmtRupiah(val)} cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="acquis_val" name="Nilai Perolehan" fill="url(#gradientAcquis)" barSize={16} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="acquis_val" position="right" formatter={(v) => (v / 1000000000).toFixed(2).replace('.', ',')} style={{ fontSize: '11px', fontWeight: 600, fill: '#555' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div style={{ textAlign: 'center', fontWeight: 600, fontSize: '14px', marginTop: '12px', color: '#444' }}>
              Total nilai perolehan: {fmtRupiah(laporanStats.acquis)}
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h3 className="section-title" style={{ textAlign: 'center' }}>Jumlah Aset</h3>
          </div>
          <div className="section-body" style={{ height: '400px' }}>
            {laporanStats.chartCategory.length === 0 ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={laporanStats.chartCategory} layout="vertical" margin={{ left: 60, right: 80, top: 20 }}>
                  <defs>
                    <linearGradient id="gradientCount" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#1d4ed8" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#666', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" name="Jumlah Aset" fill="url(#gradientCount)" barSize={16} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="count" position="right" style={{ fontSize: '11px', fontWeight: 600, fill: '#555' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div style={{ textAlign: 'center', fontWeight: 600, fontSize: '14px', marginTop: '12px', color: '#444' }}>
              Total Jumlah Aset: {laporanStats.chartCategory.reduce((acc, curr) => acc + curr.count, 0).toLocaleString('id-ID')} Unit
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
