import { useEffect, useState, useCallback } from 'react'
import { getDashboardSummary, getMonthlyChart, getProgressTable } from '../api/capex'
import { exportCapex } from '../api/capex'
import { useAuthStore } from '../store/authStore'
import SummaryCard from '../components/ui/SummaryCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import BudgetVsRealizationChart from '../components/charts/BudgetVsRealizationChart'
import StatusDistributionChart from '../components/charts/StatusDistributionChart'
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
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [s, m, p] = await Promise.all([
        getDashboardSummary(tahun),
        getMonthlyChart(tahun),
        getProgressTable(tahun),
      ])
      setSummary(s.data)
      setMonthly(m.data)
      setProgress(p.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [tahun])

  useEffect(() => { fetchData() }, [fetchData])

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
