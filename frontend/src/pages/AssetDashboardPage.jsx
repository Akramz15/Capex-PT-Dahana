import { useEffect, useState, useMemo } from 'react'
import { getAsetDashboard } from '../api/master_aset'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { fmtRupiah } from '../utils'
import { CheckCircle, Users, BarChart2, Hash, TrendingUp, Inbox } from 'lucide-react'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57']

import SummaryCard from '../components/ui/SummaryCard'

const EmptyChartState = ({ message = "Belum ada data tersedia" }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
    <Inbox size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
    <span style={{ fontSize: '14px', fontWeight: 500, opacity: 0.6 }}>{message}</span>
  </div>
)

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
    })

    const chartYear = Object.values(byYearMap).sort((a,b) => (a.year === 'Unknown' ? 1 : a.year - b.year))
    const chartLocation = Object.values(byLocationMap).sort((a,b) => b.value - a.value).slice(0, 5)

    return { acquis, accum, book, chartYear, chartLocation }
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

    const chartKategori = Object.values(catMap)
    const chartUser = Object.values(userMap).sort((a,b) => b.value - a.value).slice(0, 5)
    
    const peakMonth = [...byMonth].sort((a,b) => b.total - a.total)[0]
    const topUser = chartUser[0]

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
          label="Grand Total Permintaan" 
          value={nomorStats.grandTotal} 
          type="items" 
          isRupiah={false}
        />
        <SummaryCard 
          label="Jumlah Kategori Aset" 
          value={nomorStats.chartKategori.length} 
          type="sisa" 
          isRupiah={false}
        />
        <SummaryCard 
          label="User Terbanyak" 
          value={nomorStats.topUser?.name || '-'} 
          sub={`${nomorStats.topUser?.value || 0} Permintaan`}
          type="realisasi" 
          isRupiah={false}
        />
        <SummaryCard 
          label="Puncak Bulanan" 
          value={nomorStats.peakMonth?.name || '-'} 
          sub={`${nomorStats.peakMonth?.total || 0} Permintaan`}
          type="anggaran" 
          isRupiah={false}
        />
      </div>

      <div className="charts-grid" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Realisasi Permintaan per Bulan</h3>
          </div>
          <div className="chart-body" style={{ height: '300px' }}>
            {nomorStats.byMonth.every(m => m.total === 0) ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nomorStats.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="total" name="Jumlah" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Komposisi Kategori Aset</h3>
          </div>
          <div className="chart-body" style={{ height: '300px' }}>
            {nomorStats.chartKategori.length === 0 ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={nomorStats.chartKategori} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label>
                    {nomorStats.chartKategori.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <div className="chart-header">
            <h3 className="chart-title">Sebaran Berdasarkan User (Top 5)</h3>
          </div>
          <div className="chart-body" style={{ height: '250px' }}>
            {nomorStats.chartUser.length === 0 ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nomorStats.chartUser} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" name="Jumlah" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-color)', marginTop: '24px' }}>
        Laporan Aktiva Tetap
      </h2>
      <div className="cards-grid" style={{ marginBottom: '24px' }}>
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

      <div className="charts-grid">
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <div className="chart-header">
            <h3 className="chart-title">Perkembangan Nilai Aset per Tahun (Kapitalisasi)</h3>
          </div>
          <div className="chart-body" style={{ height: '350px' }}>
            {laporanStats.chartYear.length === 0 ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={laporanStats.chartYear}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(val) => `Rp ${val / 1000000}M`} />
                  <Tooltip formatter={(val) => fmtRupiah(val)} />
                  <Legend />
                  <Line type="monotone" dataKey="acquis" name="Nilai Perolehan" stroke="#3b82f6" strokeWidth={3} />
                  <Line type="monotone" dataKey="book" name="Nilai Buku" stroke="#10b981" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <div className="chart-header">
            <h3 className="chart-title">Sebaran Lokasi Aset (Top 5)</h3>
          </div>
          <div className="chart-body" style={{ height: '300px' }}>
            {laporanStats.chartLocation.length === 0 ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={laporanStats.chartLocation}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" name="Jumlah Aset" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
