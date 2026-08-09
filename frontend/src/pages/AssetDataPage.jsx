import { useEffect, useState, useCallback, useMemo } from 'react'
import { getAsetData, createAsetData, updateAsetData, deleteAsetData } from '../api/master_aset'
import { useAuthStore } from '../store/authStore'
import ComplexDataTable from '../components/ui/ComplexDataTable'
import Modal from '../components/ui/Modal'
import { useDialog } from '../contexts/DialogContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import CurrencyInput from '../components/ui/CurrencyInput'
import LastUpdatedInfo from '../components/ui/LastUpdatedInfo'
import { fmtRupiah, fmtShort } from '../utils'
import { Pencil, Trash2, Plus, Filter } from 'lucide-react'

const EMPTY_FORM = {
  asset_number: '', sub_number: '', capitalized_on: '',
  asset_description: '', acquis_val: 0, accum_dep: 0, book_val: 0,
  currency: 'IDR', useful_life: '', location_code: '', room: ''
}

const COLUMNS = [
  { header: 'No', render: (_, i) => i + 1, sticky: true, stickyLeft: '0px', width: '60px' },
  { header: 'Asset Number', accessor: 'asset_number', sticky: true, stickyLeft: '59px', width: '150px' },
  { header: 'Sub Number', accessor: 'sub_number' },
  { header: 'Capitalized On', render: (r) => fmtShort(r.capitalized_on) },
  { header: 'Asset Description', accessor: 'asset_description' },
  { header: 'Acquis.val.', render: (r) => <span className="rupiah">{fmtRupiah(r.acquis_val)}</span> },
  { header: 'Accum.dep.', render: (r) => <span className="rupiah">{fmtRupiah(r.accum_dep)}</span> },
  { header: 'Book val.', render: (r) => <span className="rupiah">{fmtRupiah(r.book_val)}</span> },
  { header: 'Currency', accessor: 'currency' },
  { header: 'Useful Life', accessor: 'useful_life' },
  { header: 'Location Code', accessor: 'location_code' },
  { header: 'Room', accessor: 'room' }
]

export default function AssetDataPage() {
  const { user } = useAuthStore()
  const dialog = useDialog()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  
  const [startYear, setStartYear] = useState('')
  const [endYear, setEndYear] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getAsetData()
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
      message: `Hapus Data Aset ${row.asset_description || 'ini'}?`,
      confirmText: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteAsetData(row.id)
          await fetchData()
        } catch (e) {
          dialog.alert({ title: 'Error', message: 'Gagal menghapus data' })
        }
      }
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = { ...form }
      if (!payload.capitalized_on) payload.capitalized_on = null

      if (editingId) await updateAsetData(editingId, payload)
      else await createAsetData(payload)
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
          <h2 className="page-title">Data Aset</h2>
          <p className="page-desc" style={{ marginBottom: '8px' }}>Daftar lengkap Master Data Aset PT Dahana.</p>
          <LastUpdatedInfo moduleName="Data Aset" />
        </div>
        <div className="header-actions">
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setModalOpen(true); }}>
              <Plus size={16} /> Tambah Data
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <ComplexDataTable 
          columns={finalCols} 
          data={tableData} 
          searchPlaceholder="Cari deskripsi atau nomor aset..." 
          searchKeys={['asset_number', 'asset_description', 'location_code']}
          filterOptions={[
            { key: 'location_code', label: 'Kode Lokasi' },
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Data Aset' : 'Tambah Data Aset'}>
        <form onSubmit={handleSave} className="form-grid">
          <div className="form-group">
            <label>Asset Number</label>
            <input className="form-control" value={form.asset_number || ''} onChange={e => setForm({...form, asset_number: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Sub Number</label>
            <input className="form-control" value={form.sub_number || ''} onChange={e => setForm({...form, sub_number: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Capitalized On</label>
            <input type="date" className="form-control" value={form.capitalized_on || ''} onChange={e => setForm({...form, capitalized_on: e.target.value})} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Asset Description</label>
            <input className="form-control" value={form.asset_description || ''} onChange={e => setForm({...form, asset_description: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Acquis. Val.</label>
            <CurrencyInput value={form.acquis_val} onChange={val => setForm({...form, acquis_val: val})} />
          </div>
          <div className="form-group">
            <label>Accum. Dep.</label>
            <CurrencyInput value={form.accum_dep} onChange={val => setForm({...form, accum_dep: val})} />
          </div>
          <div className="form-group">
            <label>Book Val.</label>
            <CurrencyInput value={form.book_val} onChange={val => setForm({...form, book_val: val})} />
          </div>
          <div className="form-group">
            <label>Currency</label>
            <input className="form-control" value={form.currency || ''} onChange={e => setForm({...form, currency: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Useful Life</label>
            <input className="form-control" value={form.useful_life || ''} onChange={e => setForm({...form, useful_life: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Location Code</label>
            <input className="form-control" value={form.location_code || ''} onChange={e => setForm({...form, location_code: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Room</label>
            <input className="form-control" value={form.room || ''} onChange={e => setForm({...form, room: e.target.value})} />
          </div>

          <div className="modal-actions" style={{ gridColumn: '1 / -1' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
