import { useEffect, useState, useCallback, useMemo } from 'react'
import { getAsetLaporan, createAsetLaporan, updateAsetLaporan, deleteAsetLaporan, uploadAsetLaporan, exportAsetLaporan } from '../api/master_aset'
import { useAuthStore } from '../store/authStore'
import ComplexDataTable from '../components/ui/ComplexDataTable'
import Modal from '../components/ui/Modal'
import { useDialog } from '../contexts/DialogContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import CurrencyInput from '../components/ui/CurrencyInput'
import LastUpdatedInfo from '../components/ui/LastUpdatedInfo'
import { fmtRupiah, fmtShort } from '../utils'
import { Pencil, Trash2, Plus, Upload, Download, Filter } from 'lucide-react'
import { useRef } from 'react'

const EMPTY_FORM = {
  deskripsi: '', asset_number: '', sub_number: '', capitalized_on: '',
  asset_description: '', acquis_val: 0, accum_dep: 0, book_val: 0,
  currency: 'IDR', useful_life: '', location_code: '', lokasi: '', room: ''
}

const COLUMNS = [
  { header: 'No', render: (_, i) => i + 1, sticky: true, stickyLeft: '0px', width: '75px' },
  { header: 'Deskripsi', accessor: 'deskripsi', sticky: true, stickyLeft: '74px', width: '200px' },
  { header: 'Asset Number', accessor: 'asset_number' },
  { header: 'Sub Number', accessor: 'sub_number' },
  { header: 'Capitalized On', render: (r) => r.capitalized_on ? r.capitalized_on.split('T')[0] : '—' },
  { header: 'Asset Description', accessor: 'asset_description' },
  { header: 'Acquis.val.', render: (r) => <span className="rupiah">{fmtRupiah(r.acquis_val)}</span> },
  { header: 'Accum.dep.', render: (r) => <span className="rupiah">{fmtRupiah(r.accum_dep)}</span> },
  { header: 'Book val.', render: (r) => <span className="rupiah">{fmtRupiah(r.book_val)}</span> },
  { header: 'Currency', accessor: 'currency' },
  { header: 'Useful Life', accessor: 'useful_life' },
  { header: 'Location Code', accessor: 'location_code' },
  { header: 'Lokasi', accessor: 'lokasi' },
  { header: 'Room', accessor: 'room' }
]

export default function AssetReportPage() {
  const { user } = useAuthStore()
  const dialog = useDialog()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [startYear, setStartYear] = useState('')
  const [endYear, setEndYear] = useState('')
  const fileInputRef = useRef(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getAsetLaporan()
      setData(res || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleEdit = (row) => {
    setForm({
      ...row,
      capitalized_on: row.capitalized_on ? row.capitalized_on.split('T')[0] : ''
    })
    setEditingId(row.id)
    setModalOpen(true)
  }

  const handleDelete = (row) => {
    dialog.confirm({
      title: 'Hapus Data',
      message: `Hapus Laporan Aktiva ${row.deskripsi || 'ini'}?`,
      confirmText: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteAsetLaporan(row.id)
          await fetchData()
        } catch (e) {
          dialog.alert({ title: 'Error', message: 'Gagal menghapus data' })
        }
      }
    })
  }

  const handleUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    dialog.confirm({
      title: 'Peringatan Unggah',
      message: `Mengunggah Excel akan MENGHAPUS SEMUA DATA LAPORAN AKTIVA LAMA dan menggantinya dengan data dari file "${file.name}". Lanjutkan?`,
      confirmText: 'Unggah',
      variant: 'danger',
      onConfirm: async () => {
        setUploading(true)
        try {
          const formData = new FormData()
          formData.append('file', file)
          const res = await uploadAsetLaporan(formData)
          dialog.alert({ title: 'Sukses', message: res.message || 'Berhasil upload', variant: 'success' })
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

  const handleDownloadExcel = async () => {
    setDownloading(true)
    try {
      const res = await exportAsetLaporan()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Laporan_Aktiva_Tetap_${new Date().getFullYear()}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
    } catch (err) {
      dialog.alert({ title: 'Error', message: 'Gagal mengunduh laporan excel.', variant: 'danger' })
    } finally {
      setDownloading(false)
    }
  }

  const handleSave = async () => {
    setSubmitting(true)
    try {
      const payload = { ...form }
      if (!payload.capitalized_on) payload.capitalized_on = null

      if (editingId) await updateAsetLaporan(editingId, payload)
      else await createAsetLaporan(payload)
      setModalOpen(false)
      await fetchData()
    } catch (e) {
      dialog.alert({ title: 'Error', message: 'Gagal menyimpan data' })
    } finally {
      setSubmitting(false)
    }
  }

  const isAdmin = user?.role === 'admin'


  const tableData = useMemo(() => {
    return data.filter(d => {
      let valid = true
      const year = d.capitalized_on ? d.capitalized_on.substring(0, 4) : ''
      if (startYear && year && year < startYear) valid = false
      if (endYear && year && year > endYear) valid = false
      return valid
    })
  }, [data, startYear, endYear])

  if (loading) return <LoadingSpinner fullscreen />

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-title">Laporan Aktiva Tetap</h2>
          <p className="page-desc" style={{ marginBottom: '8px' }}>Laporan Aktiva Tetap PT Dahana dari hasil kapitalisasi investasi.</p>
          <LastUpdatedInfo moduleName="Laporan Aktiva Tetap" />
        </div>
        <div className="header-actions">
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
              <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setModalOpen(true); }}>
                <Plus size={16} style={{ marginRight: '4px', verticalAlign:'text-bottom' }} /> Tambah Data
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <ComplexDataTable 
          columns={COLUMNS} 
          data={tableData} 
          onEdit={isAdmin ? handleEdit : undefined}
          onDelete={isAdmin ? handleDelete : undefined}
          searchPlaceholder="Cari deskripsi atau nomor aset..." 
          searchKeys={['asset_number', 'asset_description', 'lokasi']}
          filterOptions={[
            { key: 'lokasi', label: 'Lokasi' },
            { key: 'room', label: 'Room' }
          ]}
          customToolbarContent={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--clr-text-muted)', fontWeight: 500, fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                <Filter size={16} /> Lintas Tahun:
              </div>
              <input 
                type="number" 
                className="form-input" 
                style={{ width: '100px', padding: '6px 12px' }}
                placeholder="Mulai" 
                value={startYear} 
                onChange={(e) => setStartYear(e.target.value)}
              />
              <span style={{ color: 'var(--clr-text-muted)' }}>-</span>
              <input 
                type="number" 
                className="form-input" 
                style={{ width: '100px', padding: '6px 12px' }}
                placeholder="Akhir" 
                value={endYear} 
                onChange={(e) => setEndYear(e.target.value)}
              />
            </div>
          }
        />
      </div>

      {modalOpen && (
        <Modal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          title={editingId ? 'Edit Laporan Aktiva' : 'Tambah Laporan Aktiva'}
          onSubmit={handleSave}
          submitLoading={submitting}
        >
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Deskripsi Laporan</label>
            <input className="form-input" value={form.deskripsi || ''} onChange={e => setForm({...form, deskripsi: e.target.value})} />
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Asset Number</label>
              <input className="form-input" value={form.asset_number || ''} onChange={e => setForm({...form, asset_number: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Sub Number</label>
              <input className="form-input" value={form.sub_number || ''} onChange={e => setForm({...form, sub_number: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Capitalized On</label>
              <input type="date" className="form-input" value={form.capitalized_on || ''} onChange={e => setForm({...form, capitalized_on: e.target.value})} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Asset Description</label>
            <input className="form-input" value={form.asset_description || ''} onChange={e => setForm({...form, asset_description: e.target.value})} />
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Acquis. Val.</label>
              <CurrencyInput className="form-input" value={form.acquis_val} onChange={val => setForm({...form, acquis_val: val})} />
            </div>
            <div className="form-group">
              <label className="form-label">Accum. Dep.</label>
              <CurrencyInput className="form-input" value={form.accum_dep} onChange={val => setForm({...form, accum_dep: val})} />
            </div>
            <div className="form-group">
              <label className="form-label">Book Val.</label>
              <CurrencyInput className="form-input" value={form.book_val} onChange={val => setForm({...form, book_val: val})} />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Currency</label>
              <input className="form-input" value={form.currency || ''} onChange={e => setForm({...form, currency: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Useful Life</label>
              <input className="form-input" value={form.useful_life || ''} onChange={e => setForm({...form, useful_life: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Location Code</label>
              <input className="form-input" value={form.location_code || ''} onChange={e => setForm({...form, location_code: e.target.value})} />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Lokasi</label>
              <input className="form-input" value={form.lokasi || ''} onChange={e => setForm({...form, lokasi: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Room</label>
              <input className="form-input" value={form.room || ''} onChange={e => setForm({...form, room: e.target.value})} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
