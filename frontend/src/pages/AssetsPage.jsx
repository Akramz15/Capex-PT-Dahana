import { useEffect, useState, useCallback } from 'react'
import { listAssets, createAsset, updateAsset, deleteAsset } from '../api/capex'
import { useAuthStore } from '../store/authStore'
import ComplexDataTable from '../components/ui/ComplexDataTable'
import Modal from '../components/ui/Modal'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import CurrencyInput from '../components/ui/CurrencyInput'
import { fmtRupiah, fmtShort } from '../utils'
import { Pencil, Trash2, Plus } from 'lucide-react'

const EMPTY_FORM = {
  no_po: '', tanggal_po: '', no_asset: '', sub_number: '', category: '',
  capitalized_on: '', asset_description: '', acquis_val: 0, accum_dep: 0,
  book_val: 0, currency: 'IDR', location_code: '', lokasi: '', room: '', keterangan: '',
}

const COLUMNS = [
  { header: 'No', render: (_, i) => i + 1 },
  { header: 'No PO',             accessor: 'no_po' },
  { header: 'Tanggal PO',        accessor: 'tanggal_po' },
  { header: 'No Asset',          accessor: 'no_asset' },
  { header: 'Sub number',        accessor: 'sub_number' },
  { header: 'Category',          accessor: 'category' },
  { header: 'Capitalized on',    accessor: 'capitalized_on' },
  { header: 'Asset description', accessor: 'asset_description' },
  { header: 'Acquis.val.',       render: (r) => <span className="rupiah">{fmtRupiah(r.acquis_val)}</span> },
  { header: 'Accum.dep.',        render: (r) => <span className="rupiah">{fmtRupiah(r.accum_dep)}</span> },
  { header: 'Book val.',         render: (r) => <span className="rupiah">{fmtRupiah(r.book_val)}</span> },
  { header: 'Currency',          accessor: 'currency' },
  { header: 'Location',          accessor: 'location_code' },
  { header: 'Lokasi',            accessor: 'lokasi' },
  { header: 'Room',              accessor: 'room' },
  { header: 'Keterangan',        accessor: 'keterangan' }
]

export default function AssetsPage() {
  const user    = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listAssets()
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => { setForm(EMPTY_FORM); setModal('create') }
  const openEdit   = (row) => { setForm(row); setModal('edit') }
  const closeModal = () => { setModal(null); setForm(EMPTY_FORM) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form, acquis_val: Number(form.acquis_val), accum_dep: Number(form.accum_dep), book_val: Number(form.book_val) }
      if (modal === 'create') await createAsset(payload)
      else await updateAsset(form.id, payload)
      await fetchData()
      closeModal()
    } catch (e) {
      alert(e.response?.data?.detail ?? 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus aset "${row.asset_description}"?`)) return
    try {
      await deleteAsset(row.id)
      setData((p) => p.filter((r) => r.id !== row.id))
    } catch { alert('Gagal menghapus.') }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const renderFooter = (filteredData) => {
    const sumAcquis = filteredData.reduce((acc, r) => acc + (Number(r.acquis_val) || 0), 0)
    const sumAccum = filteredData.reduce((acc, r) => acc + (Number(r.accum_dep) || 0), 0)
    const sumBook = filteredData.reduce((acc, r) => acc + (Number(r.book_val) || 0), 0)
    
    return (
      <tr style={{ fontWeight: 'bold', backgroundColor: '#f8f9fa' }}>
        <td colSpan={8} style={{ textAlign: 'right', border: '1px solid var(--clr-border)', padding: '12px 16px' }}>Total</td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px' }}><span className="rupiah">{fmtRupiah(sumAcquis)}</span></td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px' }}><span className="rupiah">{fmtRupiah(sumAccum)}</span></td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px' }}><span className="rupiah">{fmtRupiah(sumBook)}</span></td>
        <td colSpan={5} style={{ border: '1px solid var(--clr-border)', padding: '12px 16px' }}></td>
        {isAdmin && <td style={{ border: '1px solid var(--clr-border)' }}></td>}
      </tr>
    )
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-title">Data Aset</h2>
          <p className="page-desc">Laporan Aktiva Tetap PT Dahana dari hasil kapitalisasi investasi.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" id="btn-tambah-aset" onClick={openCreate}>
            <Plus size={16} style={{ marginRight: '4px', verticalAlign:'text-bottom' }} /> Tambah Aset
          </button>
        )}
      </div>

      <div className="section">
        {loading ? <LoadingSpinner /> : (
          <ComplexDataTable
            columns={COLUMNS}
            data={data}
            onEdit={isAdmin ? openEdit : undefined}
            onDelete={isAdmin ? handleDelete : undefined}
            searchKeys={['no_po', 'asset_description', 'category', 'lokasi']}
            filterOptions={[
              { key: 'category', label: 'Kategori Aset' },
              { key: 'lokasi', label: 'Lokasi' }
            ]}
            renderFooter={renderFooter}
          />
        )}
      </div>

      {modal && (
        <Modal
          title={modal === 'create' ? 'Tambah Aset Baru' : 'Edit Aset'}
          onClose={closeModal}
          onSubmit={handleSave}
          submitLoading={saving}
        >
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="f-no-po">No PO</label>
              <input id="f-no-po" type="text" className="form-input" value={form.no_po} onChange={set('no_po')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="f-tgl-po">Tanggal PO</label>
              <input id="f-tgl-po" type="date" className="form-input" value={form.tanggal_po} onChange={set('tanggal_po')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="f-desc">Deskripsi Aset <span className="required">*</span></label>
            <input id="f-desc" type="text" className="form-input" value={form.asset_description} onChange={set('asset_description')} />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="f-cat">Kategori</label>
              <input list="cat-options" id="f-cat" type="text" className="form-input" value={form.category} onChange={set('category')} placeholder="Pilih atau ketik Kategori" />
              <datalist id="cat-options">
                {Array.from(new Set(data.map(d => d.category).filter(Boolean))).sort().map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="f-cap-on">Kapitalisasi</label>
              <input id="f-cap-on" type="date" className="form-input" value={form.capitalized_on} onChange={set('capitalized_on')} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="f-acquis">Nilai Perolehan (Rp)</label>
              <CurrencyInput id="f-acquis" className="form-input" value={form.acquis_val} onChange={set('acquis_val')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="f-dep">Akumulasi Depresiasi (Rp)</label>
              <CurrencyInput id="f-dep" className="form-input" value={form.accum_dep} onChange={set('accum_dep')} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="f-lokasi">Lokasi</label>
              <input list="lok-options" id="f-lokasi" type="text" className="form-input" value={form.lokasi} onChange={set('lokasi')} placeholder="Pilih atau ketik Lokasi" />
              <datalist id="lok-options">
                {Array.from(new Set(data.map(d => d.lokasi).filter(Boolean))).sort().map(l => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="f-room">Ruangan</label>
              <input id="f-room" type="text" className="form-input" value={form.room} onChange={set('room')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="f-ket-a">Keterangan</label>
            <textarea id="f-ket-a" className="form-textarea" value={form.keterangan} onChange={set('keterangan')} />
          </div>
        </Modal>
      )}
    </>
  )
}
