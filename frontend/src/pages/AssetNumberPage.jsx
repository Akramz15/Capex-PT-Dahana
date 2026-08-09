import { useEffect, useState, useCallback } from 'react'
import { getAsetNomor, createAsetNomor, updateAsetNomor, deleteAsetNomor, uploadAsetNomor, exportAsetNomor } from '../api/master_aset'
import { useAuthStore } from '../store/authStore'
import ComplexDataTable from '../components/ui/ComplexDataTable'
import Modal from '../components/ui/Modal'
import { useDialog } from '../contexts/DialogContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import CurrencyInput from '../components/ui/CurrencyInput'
import LastUpdatedInfo from '../components/ui/LastUpdatedInfo'
import { fmtRupiah } from '../utils'
import { Pencil, Trash2, Plus, Upload, Download } from 'lucide-react'
import { useRef } from 'react'

const EMPTY_FORM = {
  nomor_aset: '', sub_nomor: '', kategori: '', nama_aset: '',
  satuan: '', lokasi: '', nilai: 0, room: '',
  tahun: new Date().getFullYear(), bulan: new Date().getMonth() + 1,
  user_name: '', vendor: '', keterangan: ''
}

const COLUMNS = [
  { header: 'No', render: (_, i) => i + 1, sticky: true, stickyLeft: '0px', width: '65px' },
  { header: 'Nomor Aset', accessor: 'nomor_aset', sticky: true, stickyLeft: '64px', width: '160px' },
  { header: 'Sub#', accessor: 'sub_nomor' },
  { header: 'Kategori', accessor: 'kategori' },
  { header: 'Nama Aset', accessor: 'nama_aset' },
  { header: 'Sat', accessor: 'satuan' },
  { header: 'Lokasi', accessor: 'lokasi' },
  { header: 'Nilai', render: (r) => <span className="rupiah">{fmtRupiah(r.nilai)}</span> },
  { header: 'Room', accessor: 'room' },
  { header: 'Tahun', accessor: 'tahun' },
  { header: 'User', accessor: 'user_name' },
  { header: 'Vendor', accessor: 'vendor' },
  { header: 'Keterangan', accessor: 'keterangan' }
]

export default function AssetNumberPage() {
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
      const res = await getAsetNomor()
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
    setForm(row)
    setEditingId(row.id)
    setModalOpen(true)
  }

  const handleDelete = (row) => {
    dialog.confirm({
      title: 'Hapus Data',
      message: `Hapus nomor aset ${row.nomor_aset || 'ini'}?`,
      confirmText: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteAsetNomor(row.id)
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
      message: `Mengunggah Excel akan MENGHAPUS SEMUA DATA NOMOR ASET LAMA dan menggantinya dengan data dari file "${file.name}". Lanjutkan?`,
      confirmText: 'Unggah',
      variant: 'danger',
      onConfirm: async () => {
        setUploading(true)
        try {
          const formData = new FormData()
          formData.append('file', file)
          const res = await uploadAsetNomor(formData)
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
      const res = await exportAsetNomor()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Permintaan_Nomor_Aset_${new Date().getFullYear()}.xlsx`)
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
      if (editingId) await updateAsetNomor(editingId, form)
      else await createAsetNomor(form)
      setModalOpen(false)
      await fetchData()
    } catch (e) {
      dialog.alert({ title: 'Error', message: 'Gagal menyimpan data' })
    } finally {
      setSubmitting(false)
    }
  }

  const actionCol = {
    header: 'Aksi',
    stickyRight: '0px',
    width: '100px',
    render: (row) => (
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <button onClick={() => handleEdit(row)} className="btn-icon text-blue" title="Edit"><Pencil size={16}/></button>
        <button onClick={() => handleDelete(row)} className="btn-icon text-red" title="Hapus"><Trash2 size={16}/></button>
      </div>
    )
  }

  const isAdmin = user?.role === 'admin'
  const finalCols = isAdmin ? [...COLUMNS, actionCol] : COLUMNS

  if (loading) return <LoadingSpinner fullscreen />

  const tableData = useMemo(() => {
    return data.filter(d => {
      let valid = true
      if (startYear && d.tahun && d.tahun < startYear) valid = false
      if (endYear && d.tahun && d.tahun > endYear) valid = false
      return valid
    })
  }, [data, startYear, endYear])

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-title">Daftar Permintaan Nomor Aset</h2>
          <p className="page-desc" style={{ marginBottom: '8px' }}>Daftar lengkap permintaan nomor aset PT Dahana.</p>
          <LastUpdatedInfo moduleName="Permintaan Nomor Aset" />
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
          columns={finalCols} 
          data={tableData} 
          searchPlaceholder="Cari nama atau nomor aset..." 
          searchKeys={['nomor_aset', 'nama_aset', 'kategori', 'vendor']}
          filterOptions={[
            { key: 'kategori', label: 'Kategori' },
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
          title={editingId ? 'Edit Nomor Aset' : 'Tambah Nomor Aset'}
          onSubmit={handleSave}
          submitLoading={submitting}
        >
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Nomor Aset</label>
              <input className="form-input" value={form.nomor_aset || ''} onChange={e => setForm({...form, nomor_aset: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Sub Nomor</label>
              <input className="form-input" value={form.sub_nomor || ''} onChange={e => setForm({...form, sub_nomor: e.target.value})} />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Nama Aset <span className="required">*</span></label>
            <input className="form-input" value={form.nama_aset || ''} onChange={e => setForm({...form, nama_aset: e.target.value})} required />
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <input className="form-input" value={form.kategori || ''} onChange={e => setForm({...form, kategori: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Satuan</label>
              <input className="form-input" value={form.satuan || ''} onChange={e => setForm({...form, satuan: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Lokasi</label>
              <input className="form-input" value={form.lokasi || ''} onChange={e => setForm({...form, lokasi: e.target.value})} />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Room</label>
              <input className="form-input" value={form.room || ''} onChange={e => setForm({...form, room: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Tahun</label>
              <input type="number" className="form-input" value={form.tahun || ''} onChange={e => setForm({...form, tahun: e.target.value ? parseInt(e.target.value) : ''})} />
            </div>
            <div className="form-group">
              <label className="form-label">Bulan (1-12)</label>
              <input type="number" min="1" max="12" className="form-input" value={form.bulan || ''} onChange={e => setForm({...form, bulan: e.target.value ? parseInt(e.target.value) : ''})} />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">User Name</label>
              <input className="form-input" value={form.user_name || ''} onChange={e => setForm({...form, user_name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Vendor</label>
              <input className="form-input" value={form.vendor || ''} onChange={e => setForm({...form, vendor: e.target.value})} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nilai</label>
            <CurrencyInput className="form-input" value={form.nilai} onChange={val => setForm({...form, nilai: val})} />
          </div>
          <div className="form-group">
            <label className="form-label">Keterangan</label>
            <textarea className="form-input" value={form.keterangan || ''} onChange={e => setForm({...form, keterangan: e.target.value})} rows={3} />
          </div>
        </Modal>
      )}
    </div>
  )
}

