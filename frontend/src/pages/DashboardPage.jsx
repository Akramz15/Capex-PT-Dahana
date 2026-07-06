import { useEffect, useState, useCallback } from 'react'
import { getDashboardSummary, getMonthlyChart, getProgressTable, getDashboardSummaryYtd, exportDashboardSummaryYtd } from '../api/capex'
import { useAuthStore } from '../store/authStore'
import SummaryCard from '../components/ui/SummaryCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useDialog } from '../contexts/DialogContext'
import BudgetVsRealizationChart from '../components/charts/BudgetVsRealizationChart'
import CumulativeTrendChart from '../components/charts/CumulativeTrendChart'
import AchievementOverviewChart from '../components/charts/AchievementOverviewChart'
import CategoryDistributionChart from '../components/charts/CategoryDistributionChart'
import Top5CapexChart from '../components/charts/Top5CapexChart'
import SummaryYTDTable from '../components/ui/SummaryYTDTable'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import { fmtRupiah, fmtShort, downloadBlob } from '../utils'
import { BarChart2, TrendingUp } from 'lucide-react'
import { Hourglass, Download } from 'lucide-react'

const COLUMNS = [
  { key: 'kode',              label: 'Kode',        sortable: true },
  { key: 'daftar_capex',      label: 'Nama Capex',  sortable: true },
  { key: 'kategori',          label: 'Kategori',    sortable: true },
  { key: 'anggaran_aktif',    label: 'Anggaran Aktif',  sortable: true,
    render: (_, row) => <span className="rupiah">{fmtRupiah(row.anggaran_perubahan > 0 ? row.anggaran_perubahan : row.anggaran_rkap)}</span> },
  { key: 'total_realisasi',   label: 'Realisasi',   sortable: true,
    render: (v) => <span className="rupiah">{fmtRupiah(v)}</span> },
  { key: 'persen_realisasi',  label: '% Realisasi', sortable: true,
    render: (v, row) => {
      let bg = 'var(--clr-danger-light)';
      let color = 'var(--clr-danger)';
      if (v >= 100) { bg = 'var(--clr-success-light)'; color = 'var(--clr-success)'; }
      else if (v >= 50) { bg = 'var(--clr-warning-light)'; color = 'var(--clr-warning)'; }
      return (
        <span className="badge" style={{ backgroundColor: bg, color: color, fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
          {v.toFixed(1)}%
        </span>
      )
    }
  }
]

export default function DashboardPage({ tahun }) {
  const dialog = useDialog()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const [summary, setSummary] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportingYtd, setExportingYtd] = useState(false)

  // Chart configuration state — persisted in localStorage
  const [chartMode, setChartMode] = useState(
    () => localStorage.getItem('dashboard_chart_mode') ?? 'line'
  )
  const [chartRange, setChartRange] = useState(1) // 1=Bulanan, 3=Triwulan, 6=Semester, 12=Tahunan

  const [ytdBulan, setYtdBulan] = useState(new Date().getMonth() + 1)
  const [ytdData, setYtdData] = useState([])

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const [sumRes, monRes, progRes, ytdRes] = await Promise.all([
        getDashboardSummary(tahun),
        getMonthlyChart(tahun),
        getProgressTable(tahun),
        getDashboardSummaryYtd(tahun, ytdBulan)
      ])
      setSummary(sumRes.data)
      setMonthly(monRes.data)
      setProgress(progRes.data)
      setYtdData(ytdRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [tahun, ytdBulan])

  const fetchYtdOnly = useCallback(async () => {
    try {
      const ytdRes = await getDashboardSummaryYtd(tahun, ytdBulan)
      setYtdData(ytdRes.data)
    } catch (e) {
      console.error(e)
    }
  }, [tahun, ytdBulan])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  useEffect(() => {
    if (!loading) fetchYtdOnly()
  }, [ytdBulan]) // eslint-disable-line

  const handleExportYtd = async () => {
    setExportingYtd(true)
    try {
      const res = await exportDashboardSummaryYtd(tahun, ytdBulan)
      downloadBlob(res.data, `Ringkasan_YTD_${tahun}_${ytdBulan}.xlsx`)
    } catch (e) {
      let msg = 'Terjadi kesalahan yang tidak diketahui.'
      if (!e.response) {
        msg = 'Server backend tidak dapat dihubungi. Pastikan backend sudah berjalan di port 8000.'
      } else if (e.response.status === 401) {
        msg = 'Sesi login telah berakhir. Silakan login ulang.'
      } else if (e.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text()
          const json = JSON.parse(text)
          msg = json.detail || msg
        } catch { msg = `Server error (${e.response.status})` }
      } else {
        msg = e.response?.data?.detail || e.message || msg
      }
      dialog.alert({ title: 'Gagal Mengunduh Ringkasan YTD', message: msg, variant: 'danger' })
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

      <div className="section" style={{ display: 'flex', flexDirection: 'column', marginTop: '24px' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="section-title">
            {chartMode === 'bar' && 'Anggaran vs Realisasi per Bulan'}
            {chartMode === 'line' && 'Tren Kumulatif (S-Curve)'}
            {chartMode === 'achievement' && 'Ikhtisar Pencapaian Realisasi'}
            {chartMode === 'kategori' && 'Distribusi Anggaran per Kategori'}
            {chartMode === 'top5' && 'Top 5 Capex Terbesar'}
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {chartMode === 'line' && (
              <select 
                className="form-select" 
                style={{ padding: '4px 8px', fontSize: '13px', minWidth: '110px' }}
                value={chartRange}
                onChange={(e) => setChartRange(Number(e.target.value))}
              >
                <option value={1}>Per Bulan</option>
                <option value={3}>Triwulan (3 Bulan)</option>
                <option value={6}>Semester (6 Bulan)</option>
              </select>
            )}
            <select
              className="form-select"
              style={{ padding: '6px 12px', fontSize: '13px', minWidth: '240px', fontWeight: 500, border: '1px solid var(--clr-border)', borderRadius: '6px' }}
              value={chartMode}
              onChange={(e) => { setChartMode(e.target.value); localStorage.setItem('dashboard_chart_mode', e.target.value) }}
            >
              <option value="achievement">Ikhtisar Pencapaian Realisasi</option>
              <option value="bar">Anggaran vs Realisasi per Bulan</option>
              <option value="line">Tren Kumulatif / S-Curve</option>
              <option value="kategori">Distribusi per Kategori</option>
              <option value="top5">Top 5 Capex Terbesar</option>
            </select>
          </div>
        </div>
        <div className="section-body" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {chartMode === 'bar' && <BudgetVsRealizationChart data={monthly} />}
          {chartMode === 'line' && <CumulativeTrendChart data={monthly} range={chartRange} />}
          {chartMode === 'achievement' && (
            <AchievementOverviewChart
              totalAnggaran={(summary?.total_anggaran_perubahan > 0 ? summary.total_anggaran_perubahan : summary?.total_anggaran_rkap) || 0}
              totalRealisasi={summary?.total_realisasi || 0}
              sisaAnggaran={summary?.sisa_anggaran || 0}
              persenRealisasi={summary?.persen_realisasi || 0}
              totalItems={summary?.total_capex_items || 0}
            />
          )}
          {chartMode === 'kategori' && (
            <CategoryDistributionChart 
              data={summary?.kategori_distribution ?? {}} 
              totalBudget={summary?.total_anggaran_perubahan > 0 ? summary?.total_anggaran_perubahan : summary?.total_anggaran_rkap}
            />
          )}
          {chartMode === 'top5' && <Top5CapexChart data={summary?.top5_capex ?? []} />}

          <div style={{ marginTop: '24px', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '6px', borderLeft: '4px solid var(--clr-primary)', fontSize: '0.875rem', color: '#475569' }}>
            <strong>Fungsi Grafik:</strong>{' '}
            {chartMode === 'achievement' && 'Ikhtisar tunggal kemajuan penyerapan anggaran secara keseluruhan: seberapa besar dari total anggaran yang sudah berhasil direalisasikan, dilengkapi sinyal status (Baik / Perlu Diperhatikan / Kritis). Gunakan grafik ini untuk jawaban cepat: "Kita sudah sampai mana?"'}
            {chartMode === 'bar' && 'Membandingkan total Anggaran yang direncanakan dengan nilai Realisasi aktual secara per bulan selama tahun ini.'}
            {chartMode === 'line' && 'Kurva-S (S-Curve): memantau tren kumulatif penyerapan anggaran dari waktu ke waktu. Berguna untuk melihat apakah laju penyerapan sesuai target.'}
            {chartMode === 'kategori' && 'Menampilkan porsi alokasi anggaran terbesar berdasarkan kategori Capex (Rutin, Pengembangan, dll.) sehingga bisa diketahui kelompok mana yang mendominasi investasi tahun ini.'}
            {chartMode === 'top5' && 'Menyoroti 5 proyek dengan nilai anggaran terbesar di tahun ini. Berguna untuk memantau proyek-proyek strategis prioritas yang perlu perhatian khusus.'}
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
            {isAdmin && (
              <button 
                className="btn btn-outline" 
                onClick={handleExportYtd} 
                disabled={exportingYtd}
                style={{ padding: '6px 12px', fontSize: '0.875rem' }}
              >
                <Download size={14} style={{ marginRight: 6 }} />
                {exportingYtd ? 'Mengekspor...' : 'Download Excel'}
              </button>
            )}
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
