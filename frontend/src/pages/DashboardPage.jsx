import { useEffect, useState, useCallback } from 'react'
import { getDashboardSummary, getMonthlyChart, getProgressTable, getDashboardSummaryYtd, exportDashboardSummaryYtd } from '../api/capex'
import { exportCapex } from '../api/capex'
import { useAuthStore } from '../store/authStore'
import SummaryCard from '../components/ui/SummaryCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import BudgetVsRealizationChart from '../components/charts/BudgetVsRealizationChart'
import StatusDistributionChart from '../components/charts/StatusDistributionChart'
import SummaryYTDTable from '../components/ui/SummaryYTDTable'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import { fmtRupiah, fmtShort, downloadBlob } from '../utils'
import { BarChart2 } from 'lucide-react'
import { Hourglass, Download, PieChart } from 'lucide-react'

const COLUMNS = [
  { key: 'kode',              label: 'Kode',        sortable: true },
  { key: 'daftar_capex',      label: 'Nama Capex',  sortable: true },
  { key: 'kategori',          label: 'Kategori',    sortable: true },
  { key: 'anggaran_rkap',     label: 'Anggaran RKAP',  sortable: true,
    render: (v) => <span className="rupiah">{fmtRupiah(v)}</span> },
  { key: 'total_realisasi',   label: 'Realisasi',   sortable: true,
    render: (v) => <span className="rupiah">{fmtRupiah(v)}</span> },
  { key: 'persen_realisasi',  label: '% Realisasi', sortable: true,
    render: (v, row) => (
      <div style={{ minWidth: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
          <span>{v}%</span>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${Math.min(v, 100)}%` }} />
        </div>
      </div>
    ) },
  { key: 'statuses', label: 'Status', sortable: false,
    render: (v) => v?.length ? v.map((s, i) => <Badge key={i} status={s} />) : <Badge status="Rencana" /> },
  { key: 'pic',               label: 'PIC',         sortable: true },
]

export default function DashboardPage({ tahun }) {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const [summary,   setSummary]   = useState(null)
  const [monthly,   setMonthly]   = useState([])
  const [progress,  setProgress]  = useState([])
  const [ytdData,   setYtdData]   = useState([])
  const [ytdBulan,  setYtdBulan]  = useState(new Date().getMonth() + 1)
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportingYtd, setExportingYtd] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [s, m, p, y] = await Promise.all([
        getDashboardSummary(tahun),
        getMonthlyChart(tahun),
        getProgressTable(tahun),
        getDashboardSummaryYtd(tahun, ytdBulan)
      ])
      setSummary(s.data)
      setMonthly(m.data)
      setProgress(p.data)
      setYtdData(y.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [tahun])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchYtdOnly = useCallback(async () => {
    try {
      const res = await getDashboardSummaryYtd(tahun, ytdBulan)
      setYtdData(res.data)
    } catch (e) {
      console.error(e)
    }
  }, [tahun, ytdBulan])

  useEffect(() => {
    // Only fetch if not initially loading (to avoid double fetch)
    if (!loading) fetchYtdOnly()
  }, [ytdBulan]) // eslint-disable-line

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportCapex(tahun)
      downloadBlob(res.data, `Monitoring_Capex_PT_Dahana_${tahun}.xlsx`)
    } catch {
      alert('Gagal mengekspor laporan. Coba lagi.')
    } finally {
      setExporting(false)
    }
  }

  const handleExportYtd = async () => {
    setExportingYtd(true)
    try {
      const res = await exportDashboardSummaryYtd(tahun, ytdBulan)
      downloadBlob(res.data, `Ringkasan_YTD_${tahun}_${ytdBulan}.xlsx`)
    } catch {
      alert('Gagal mengekspor Ringkasan YTD. Coba lagi.')
    } finally {
      setExportingYtd(false)
    }
  }

  if (loading) return <LoadingSpinner message="Memuat dashboard..." />

  return (
    <>
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-title">Dashboard Monitoring Capex {tahun}</h2>
          <p className="page-desc">Ringkasan anggaran, realisasi, dan progress investasi PT Dahana.</p>
        </div>
        {isAdmin && (
          <div className="page-header-actions">
            <button
              className="btn btn-success"
              onClick={handleExport}
              disabled={exporting}
              id="btn-export-excel"
            >
              {exporting ? <><Hourglass size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> Mengekspor...</> : <><Download size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> Download Laporan Excel</>}
            </button>
          </div>
        )}
      </div>

      <div className="cards-grid">
        <SummaryCard
          label="Total Anggaran RKAP"
          value={summary?.total_anggaran_rkap}
          sub={`${summary?.total_capex_items ?? 0} item Capex`}
          type="anggaran"
        />
        <SummaryCard
          label="Total Realisasi"
          value={summary?.total_realisasi}
          sub="Nilai terealisasi s.d. saat ini"
          pct={summary?.persen_realisasi}
          type="realisasi"
        />
        <SummaryCard
          label="Sisa Anggaran"
          value={summary?.sisa_anggaran}
          sub="Anggaran belum terealisasi"
          type="sisa"
        />
        <SummaryCard
          label="Total Item Capex"
          value={summary?.total_capex_items}
          sub={`Tahun ${tahun}`}
          type="items"
          isRupiah={false}
        />
      </div>

      <div className="charts-grid">
        <div className="section" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="section-header">
            <span className="section-title"><BarChart2 size={18} style={{display:'inline', verticalAlign:'text-bottom', marginRight:'6px'}} /> Anggaran vs Realisasi per Bulan</span>
          </div>
          <div className="section-body" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <BudgetVsRealizationChart data={monthly} />
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <span className="section-title"><PieChart size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} /> Distribusi Status</span>
          </div>
          <div className="section-body">
            <StatusDistributionChart 
              data={summary?.status_distribution ?? {}} 
              totalRKAP={summary?.total_anggaran_rkap || 0}
              totalReal={summary?.total_realisasi || 0}
              sisa={summary?.sisa_anggaran || 0}
            />
          </div>
        </div>
      </div>

      <div className="section" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Ringkasan Anggaran & Realisasi (YTD)</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>s.d. Bulan:</span>
            <select
              value={ytdBulan}
              onChange={(e) => setYtdBulan(parseInt(e.target.value))}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={1}>Januari</option>
              <option value={2}>Februari</option>
              <option value={3}>Maret</option>
              <option value={4}>April</option>
              <option value={5}>Mei</option>
              <option value={6}>Juni</option>
              <option value={7}>Juli</option>
              <option value={8}>Agustus</option>
              <option value={9}>September</option>
              <option value={10}>Oktober</option>
              <option value={11}>November</option>
              <option value={12}>Desember</option>
            </select>
            <button 
              className="btn btn-success" 
              onClick={handleExportYtd} 
              disabled={exportingYtd}
              style={{ padding: '6px 12px', fontSize: '0.875rem' }}
            >
              <Download size={14} style={{ marginRight: 6 }} />
              {exportingYtd ? 'Mengekspor...' : 'Unduh Excel'}
            </button>
          </div>
        </div>
        <SummaryYTDTable data={ytdData} tahun={tahun} bulan={ytdBulan} />
      </div>

      <div className="section">
        <DataTable
          columns={COLUMNS}
          data={progress}
          loading={false}
          searchKeys={['daftar_capex', 'kode', 'kategori', 'pic']}
        />
      </div>
    </>
  )
}
