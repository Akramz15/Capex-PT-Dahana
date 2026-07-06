import { useEffect, useState, useCallback, useRef } from 'react'
import { listTimeline, listCapex, createTimelineBulk, uploadTimelineExcel, exportTimelineExcel } from '../api/capex'
import { useAuthStore } from '../store/authStore'
import ComplexDataTable from '../components/ui/ComplexDataTable'
import Modal from '../components/ui/Modal'
import { useDialog } from '../contexts/DialogContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { fmtRupiah, downloadBlob } from '../utils'
import { Upload, Download } from 'lucide-react'

const BULAN_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const MINGGU_ARRAY = [1, 2, 3, 4]
const STATUS_OPTIONS = [
  { value: 'K', label: 'Kajian (K)' },
  { value: 'T', label: 'Tender (T)' },
  { value: 'S', label: 'SPMK (S)' },
  { value: 'P', label: 'Pekerjaan (P)' },
  { value: 'B', label: 'BAST (B)' },
  { value: 'SE', label: 'Settlement (SE)' },
  { value: 'C', label: 'Cancel (C)' }
]

const getStatusColor = (code) => {
  switch(code) {
    case 'K': return '#F8B189' // Peach/Orange
    case 'T': return '#92D050' // Light Green
    case 'S': return '#FFCCFF' // Pink
    case 'P': return '#CCFFFF' // Light Blue
    case 'B': return '#993399' // Purple
    case 'SE': return '#0ea5e9' // Ocean Blue
    case 'W': return '#FFFF00' // Yellow (if used)
    case 'C': return '#FF0000' // Red
    default: return 'transparent'
  }
}

const EMPTY_FORM = { capex_id: '', bulan_awal: 1, minggu_awal: 1, bulan_akhir: 1, minggu_akhir: 4, kode_status: 'K' }

export default function TimelinePage({ tahun }) {
  const user = useAuthStore((s) => s.user)
  const dialog = useDialog()
  const isAdmin = user?.role === 'admin'

  const [data, setData] = useState([])
  const [capexList, setCapexList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [currentFilters, setCurrentFilters] = useState({})
  
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const fileInputRef = useRef(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [resTime, resCapex] = await Promise.all([
        listTimeline({ tahun }),
        listCapex({ tahun })
      ])
      
      setCapexList(resCapex.data)

      const capexMap = {}
      resCapex.data.forEach(c => {
        capexMap[c.id] = {
          capex_id: c.id,
          daftar_capex: c.daftar_capex,
          kategori: c.kategori || 'Lain-lain',
          keterangan: c.keterangan || '', // from master if exists, or timeline later
          anggaran_rkap: c.anggaran_rkap,
          departemen: c.pic || '',
          timeline: {}
        }
      })

      resTime.data.forEach(t => {
        if (!capexMap[t.capex_id]) return
        const c = capexMap[t.capex_id]
        if (!c.timeline[t.bulan]) c.timeline[t.bulan] = {}
        c.timeline[t.bulan][t.minggu] = t.kode_status
        if (t.keterangan) c.keterangan = t.keterangan // use latest timeline keterangan
      })

      setData(Object.values(capexMap))
    } finally {
      setLoading(false)
    }
  }, [tahun])

  useEffect(() => { fetchData() }, [fetchData])

  const openEdit = (row) => {
    setForm({ ...EMPTY_FORM, capex_id: row.capex_id })
    setModal(true)
  }
  
  const closeModal = () => { setModal(false); setForm(EMPTY_FORM) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { capex_id, bulan_awal, minggu_awal, bulan_akhir, minggu_akhir, kode_status } = form
      
      const b_start = Number(bulan_awal)
      const b_end = Number(bulan_akhir)
      const m_start = Number(minggu_awal)
      const m_end = Number(minggu_akhir)
      
      if (b_start > b_end || (b_start === b_end && m_start > m_end)) {
        dialog.alert({ title: 'Peringatan', message: 'Bulan/Minggu awal tidak boleh lebih besar dari akhir.', variant: 'warning' })
        setSaving(false)
        return
      }

      const items = []
      
      for (let b = b_start; b <= b_end; b++) {
        const startMinggu = (b === b_start) ? m_start : 1
        const endMinggu = (b === b_end) ? m_end : 4
        
        for (let m = startMinggu; m <= endMinggu; m++) {
          items.push({
            bulan: b,
            minggu: m,
            kode_status: kode_status === '' ? null : kode_status,
            keterangan: ''
          })
        }
      }

      await createTimelineBulk({
        capex_id,
        tahun,
        items
      })
      
      await fetchData()
      closeModal()
    } catch (err) {
      dialog.alert({ title: 'Error', message: err.response?.data?.detail ?? 'Gagal menyimpan data.', variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadExcel = async () => {
    setDownloading(true)
    try {
      const res = await exportTimelineExcel({ tahun, ...currentFilters })
      downloadBlob(res.data, `Timeline_${tahun}.xlsx`)
    } catch (err) {
      dialog.alert({ title: 'Error', message: 'Gagal mengunduh laporan excel.', variant: 'danger' })
    } finally {
      setDownloading(false)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    dialog.confirm({
      title: 'Konfirmasi Upload',
      message: `Anda yakin ingin mengupload data timeline untuk tahun ${tahun}? Data jadwal yang bertabrakan akan diperbarui.`,
      onConfirm: async () => {
        setUploading(true)
        try {
          const res = await uploadTimelineExcel(tahun, file)
          dialog.alert({ title: 'Sukses', message: res.data.message, variant: 'success' })
          await fetchData()
        } catch (err) {
          dialog.alert({ title: 'Error', message: err.response?.data?.detail ?? 'Gagal mengunggah file excel.', variant: 'danger' })
        } finally {
          setUploading(false)
          e.target.value = ''
        }
      },
      onCancel: () => {
        e.target.value = ''
      }
    })
  }

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const columns = [
    { header: 'No', render: (_, i) => i + 1 },
    { header: 'Daftar Capex', accessor: 'daftar_capex', sticky: true },
    { header: 'Keterangan', accessor: 'keterangan' },
    { header: 'Nilai (RKAP)', render: (r) => <span className="rupiah">{fmtRupiah(r.anggaran_rkap)}</span> },
    { header: 'Dept / PIC', accessor: 'departemen' },
    ...BULAN_NAMES.map((bln, bIdx) => ({
      header: bln,
      children: MINGGU_ARRAY.map(m => ({
        header: m.toString(),
        render: (r) => {
          const status = r.timeline[bIdx + 1]?.[m]
          return status ? (
            <div style={{
              width: '100%', height: '100%', minHeight: '24px', 
              backgroundColor: getStatusColor(status), 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '12px',
              color: ['B', 'C'].includes(status) ? '#fff' : '#000'
            }}>
              {status}
            </div>
          ) : null
        }
      }))
    }))
  ]

  const renderGroupHeader = (groupName, groupData) => {
    const totalRkapSum = groupData.reduce((acc, r) => acc + (r.anggaran_rkap || 0), 0);
    return (
      <tr style={{ backgroundColor: '#002060', color: 'white', fontWeight: 'bold' }} className="group-header-row">
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'center' }}></td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', textAlign: 'left', color: 'white' }}>{groupName}</td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white' }}></td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'right' }}>
          {totalRkapSum > 0 ? <span className="rupiah">{fmtRupiah(totalRkapSum)}</span> : '-'}
        </td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white' }}></td>
        {BULAN_NAMES.flatMap((_, bIdx) => 
          MINGGU_ARRAY.map(m => (
            <td key={`gh-${bIdx}-${m}`} style={{ border: '1px solid var(--clr-border)' }}></td>
          ))
        )}
        {isAdmin && <td style={{ border: '1px solid var(--clr-border)' }}></td>}
      </tr>
    )
  }

  const legendContent = (
    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
      {STATUS_OPTIONS.map(opt => (
        <div key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 14, height: 14, backgroundColor: getStatusColor(opt.value), border: '1px solid rgba(0,0,0,0.1)' }}></div>
          {opt.label}
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-title">Timeline (Gantt Chart) {tahun}</h2>
          <p className="page-desc">Jadwal pelaksanaan proyek investasi dari Kajian hingga BAST.</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              style={{ display: 'none' }} 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            <button className="btn btn-outline" onClick={handleUploadClick} disabled={uploading}>
              <Upload size={16} style={{ marginRight: '4px', verticalAlign:'text-bottom' }} /> 
              {uploading ? 'Mengunggah...' : 'Upload Excel'}
            </button>
            <button className="btn btn-outline" onClick={handleDownloadExcel} disabled={downloading}>
              <Download size={16} style={{ marginRight: '4px', verticalAlign:'text-bottom' }} /> 
              {downloading ? 'Unduh...' : 'Download Excel'}
            </button>
          </div>
        )}
        {!isAdmin && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline" onClick={handleDownloadExcel} disabled={downloading}>
              <Download size={16} style={{ marginRight: '4px', verticalAlign:'text-bottom' }} /> 
              {downloading ? 'Unduh...' : 'Download Excel'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? <LoadingSpinner /> : (
            <ComplexDataTable
              columns={columns}
              data={data}
              onEdit={isAdmin ? openEdit : undefined}
              searchKeys={['daftar_capex', 'departemen', 'keterangan']}
              filterOptions={[
                { key: 'kategori', label: 'Kategori' },
                { key: 'departemen', label: 'Departemen' }
              ]}
              customToolbarContent={legendContent}
              groupBy="kategori"
              renderGroupHeader={renderGroupHeader}
              onFilterChange={setCurrentFilters}
            />
        )}
      </div>

      {modal && (
        <Modal
          title={'Blok Jadwal Timeline'}
          onClose={closeModal}
          onSubmit={handleSave}
          submitLoading={saving}
        >
          <div className="form-group">
            <label className="form-label">Item Capex <span className="required">*</span></label>
            <select className="form-select" value={form.capex_id} disabled>
              <option value="">— Pilih Capex —</option>
              {capexList.map((c) => <option key={c.id} value={c.id}>{c.daftar_capex}</option>)}
            </select>
          </div>
          
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Bulan Awal</label>
              <select className="form-select" value={form.bulan_awal} onChange={setF('bulan_awal')}>
                {BULAN_NAMES.map((n, i) => <option key={i+1} value={i+1}>{n}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Minggu Awal</label>
              <select className="form-select" value={form.minggu_awal} onChange={setF('minggu_awal')}>
                {MINGGU_ARRAY.map(m => <option key={m} value={m}>Minggu ke-{m}</option>)}
              </select>
            </div>
          </div>
          
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Bulan Akhir</label>
              <select className="form-select" value={form.bulan_akhir} onChange={setF('bulan_akhir')}>
                {BULAN_NAMES.map((n, i) => <option key={i+1} value={i+1}>{n}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Minggu Akhir</label>
              <select className="form-select" value={form.minggu_akhir} onChange={setF('minggu_akhir')}>
                {MINGGU_ARRAY.map(m => <option key={m} value={m}>Minggu ke-{m}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Status Jadwal</label>
            <select className="form-select" value={form.kode_status} onChange={setF('kode_status')}>
              <option value="">— Kosongkan (Hapus) —</option>
              {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </Modal>
      )}
    </>
  )
}
