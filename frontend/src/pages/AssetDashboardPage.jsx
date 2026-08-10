import { useEffect, useState, useMemo } from 'react'
import { getAsetDashboard } from '../api/master_aset'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, LabelList } from 'recharts'
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
    const chartYear = Object.values(byYearMap)
      .filter(a => a.year !== 'Unknown' && Number(a.year) >= 2015 && Number(a.year) <= endYear)
      .sort((a,b) => a.year - b.year)
    
    const sortedLocations = Object.values(byLocationMap).sort((a,b) => b.value - a.value)
    let chartLocation = sortedLocations.slice(0, 10)
    const otherLocations = sortedLocations.slice(10)
    if (otherLocations.length > 0) {
      const otherValue = otherLocations.reduce((acc, curr) => acc + curr.value, 0)
      chartLocation.push({ name: 'Lain Lain', value: otherValue })
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

      <div className="charts-grid" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '24px' }}>
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

      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '24px' }}>
        <div className="section">
          <div className="section-header">
            <h3 className="section-title" style={{ justifyContent: 'center', textAlign: 'center', color: '#555', fontSize: '16px', flex: 1 }}>
              Laporan Aktiva Tetap PT Dahana<br/>2015-{tahun === 'Semua Tahun' || !tahun ? new Date().getFullYear() : tahun}
            </h3>
          </div>
          <div className="section-body" style={{ height: '350px' }}>
            {laporanStats.chartYear.length === 0 ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={laporanStats.chartYear} margin={{ top: 30, right: 30, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#555', fontWeight: 600 }} axisLine={false} tickLine={false} tickMargin={10} />
                  <YAxis tick={{ fontSize: 11, fill: '#555', fontWeight: 600 }} axisLine={false} tickLine={false} width={45} tickFormatter={(val) => Number((val / 1000000000).toFixed(0)).toLocaleString('id-ID')} />
                  <Tooltip formatter={(val) => fmtRupiah(val)} />
                  <Legend verticalAlign="top" align="left" height={36} wrapperStyle={{ paddingLeft: '45px', marginTop: '-10px' }} iconType="circle" />
                  <Line type="monotone" dataKey="acquis" name="Nilai Perolehan" stroke="#126487" strokeWidth={3} dot={{ r: 5, fill: '#126487', strokeWidth: 0 }}>
                    <LabelList dataKey="acquis" position="top" offset={12} formatter={(v) => Number(v) > 0 ? Number((v / 1000000000).toFixed(0)).toLocaleString('id-ID') : ''} style={{ fontSize: '11px', fontWeight: 600, fill: '#333' }} />
                  </Line>
                  <Line type="monotone" dataKey="book" name="Nilai Buku" stroke="#ec6a28" strokeWidth={3} dot={{ r: 5, fill: '#ec6a28', strokeWidth: 0 }}>
                    <LabelList dataKey="book" position="bottom" offset={12} formatter={(v) => Number(v) > 0 ? Number((v / 1000000000).toFixed(0)).toLocaleString('id-ID') : ''} style={{ fontSize: '11px', fontWeight: 600, fill: '#333' }} />
                  </Line>
                </LineChart>
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
                <PieChart>
                  <Pie 
                    data={laporanStats.chartLocation} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" cy="50%" 
                    outerRadius={75} 
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                    style={{ fontSize: '11px' }}
                  >
                    {laporanStats.chartLocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h3 className="section-title" style={{ textAlign: 'center' }}>Nilai Perolehan<br/>(Dalam Miliar Rupiah)</h3>
          </div>
          <div className="section-body" style={{ height: '400px' }}>
            {laporanStats.chartCategory.length === 0 ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={laporanStats.chartCategory} layout="vertical" margin={{ left: 60, right: 80, top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => fmtRupiah(val)} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="acquis_val" name="Nilai Perolehan" fill="#f97316" barSize={15}>
                    <LabelList dataKey="acquis_val" position="right" formatter={(v) => (v / 1000000000).toFixed(2).replace('.', ',')} style={{ fontSize: '11px', fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginTop: '12px' }}>
              Total nilai perolehan : {fmtRupiah(laporanStats.acquis)}
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h3 className="section-title" style={{ textAlign: 'center' }}>Jumlah Aset</h3>
          </div>
          <div className="section-body" style={{ height: '400px' }}>
            {laporanStats.chartCategory.length === 0 ? <EmptyChartState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={laporanStats.chartCategory} layout="vertical" margin={{ left: 60, right: 80, top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="count" name="Jumlah Aset" fill="#1d4ed8" barSize={15}>
                    <LabelList dataKey="count" position="right" style={{ fontSize: '11px', fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginTop: '12px' }}>
              Total Jumlah Aset : {laporanStats.chartCategory.reduce((acc, curr) => acc + curr.count, 0).toLocaleString('id-ID')} Unit
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
