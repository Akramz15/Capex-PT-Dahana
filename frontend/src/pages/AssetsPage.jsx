import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { listAssets, createAsset, updateAsset, deleteAsset, uploadAssetsExcel, exportAssetsExcel } from '../api/capex'
import { useAuthStore } from '../store/authStore'
import ComplexDataTable from '../components/ui/ComplexDataTable'
import Modal from '../components/ui/Modal'
import { useDialog } from '../contexts/DialogContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import CurrencyInput from '../components/ui/CurrencyInput'
import { fmtRupiah, fmtShort, downloadBlob } from '../utils'
import { Pencil, Trash2, Plus, Upload, Filter, Download } from 'lucide-react'

const EMPTY_FORM = {
  kajian_no: '', kajian_tanggal: '', kajian_perihal: '',
  no_po: '', tanggal_po: '', no_asset: '', sub_number: '', category: '',
  capitalized_on: '', asset_description: '', acquis_val: 0, accum_dep: 0,
  book_val: 0, currency: 'IDR', location_code: '', lokasi: '', room: '', keterangan: '', kategori_aset: '',
}

const COLUMNS = [
  { header: 'No', render: (_, i) => i + 1, sticky: true, stickyLeft: '0px', width: '60px' },
  { header: 'Asset description', accessor: 'asset_description', sticky: true, stickyLeft: '59px', width: '250px' },
  { 
    header: 'Kajian Investasi', 
    children: [
      { header: 'No', accessor: 'kajian_no' },
      { header: 'Tanggal', accessor: 'kajian_tanggal' },
      { header: 'Perihal', accessor: 'kajian_perihal' }
    ]
  },
  { header: 'No PO',             accessor: 'no_po' },
  { header: 'Tanggal PO',        accessor: 'tanggal_po' },
  { header: 'No Asset',          accessor: 'no_asset' },
  { header: 'Sub number',        accessor: 'sub_number' },
  { header: 'Category (SAP)',    accessor: 'category' },
  { header: 'Capitalized on',    accessor: 'capitalized_on' },
  { header: 'Acquis.val.',       render: (r) => <span className="rupiah">{fmtRupiah(r.acquis_val)}</span> },
  { header: 'Accum.dep.',        render: (r) => <span className="rupiah">{fmtRupiah(r.accum_dep)}</span> },
  { header: 'Book val.',         render: (r) => <span className="rupiah">{fmtRupiah(r.book_val)}</span> },
  { header: 'Currency',          accessor: 'currency' },
  {
    header: 'Location',
    children: [
       { header: 'Code', accessor: 'location_code' },
       { header: 'Name', accessor: 'lokasi' }
    ]
  },
  { header: 'Room',              accessor: 'room' },
  { header: 'Keterangan',        accessor: 'keterangan' }
]

export default function AssetsPage() {
  const user    = useAuthStore((s) => s.user)
  const dialog = useDialog()
  const isAdmin = user?.role === 'admin'

  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [currentFilters, setCurrentFilters] = useState({})
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const fileInputRef = useRef(null)
  
  const [startYear, setStartYear] = useState('')
  const [endYear, setEndYear] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listAssets()
      const mappedData = res.data.map(d => ({
        ...d,
        kajian_tahun: d.kajian_tanggal ? d.kajian_tanggal.substring(0, 4) : ''
      }))
      setData(mappedData)
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
      const acq = Number(form.acquis_val) || 0
      const acc = Number(form.accum_dep) || 0
      const payload = { 
        ...form, 
        acquis_val: acq, 
        accum_dep: acc, 
        book_val: acq - acc 
      }
      if (modal === 'create') await createAsset(payload)
      else await updateAsset(form.id, payload)
      await fetchData()
      closeModal()
    } catch (e) {
      dialog.alert({ title: 'Error', message: e.response?.data?.detail ?? 'Gagal menyimpan.', variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (row) => {
    dialog.confirm({
      title: 'Konfirmasi Hapus',
      message: `Hapus aset "${row.asset_description}"?`,
      confirmText: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteAsset(row.id)
          setData((p) => p.filter((r) => r.id !== row.id))
        } catch { 
          dialog.alert({ title: 'Error', message: 'Gagal menghapus.', variant: 'danger' })
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
      message: `Mengunggah Excel akan MENGHAPUS SEMUA DATA ASET LAMA dan menggantinya dengan data dari file "${file.name}". Lanjutkan?`,
      confirmText: 'Unggah',
      variant: 'danger',
      onConfirm: async () => {
        setUploading(true)
        try {
          const formData = new FormData()
          formData.append('file', file)
          const res = await uploadAssetsExcel(formData)
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

  const handleDownloadExcel = async () => {
    setDownloading(true)
    try {
      const res = await exportAssetsExcel(currentFilters)
      downloadBlob(res.data, `Data_Aset_${new Date().getFullYear()}.xlsx`)
    } catch (err) {
      dialog.alert({ title: 'Error', message: 'Gagal mengunduh laporan excel.', variant: 'danger' })
    } finally {
      setDownloading(false)
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const tableData = useMemo(() => {
    return data.filter(d => {
      let valid = true
      if (startYear && d.kajian_tahun && d.kajian_tahun < startYear) valid = false
      if (endYear && d.kajian_tahun && d.kajian_tahun > endYear) valid = false
      return valid
    })
  }, [data, startYear, endYear])

  const renderFooter = (filteredData) => {
    const sumAcquis = filteredData.reduce((acc, r) => acc + (Number(r.acquis_val) || 0), 0)
    const sumAccum = filteredData.reduce((acc, r) => acc + (Number(r.accum_dep) || 0), 0)
    const sumBook = filteredData.reduce((acc, r) => acc + (Number(r.book_val) || 0), 0)
    
    return (
      <tr style={{ fontWeight: 'bold', backgroundColor: '#f8f9fa' }}>
        <td colSpan={11} style={{ textAlign: 'right', border: '1px solid var(--clr-border)', padding: '12px 16px', position: 'sticky', left: '0', zIndex: 6, backgroundColor: '#f8f9fa' }}>Total</td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px' }}><span className="rupiah">{fmtRupiah(sumAcquis)}</span></td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px' }}><span className="rupiah">{fmtRupiah(sumAccum)}</span></td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px' }}><span className="rupiah">{fmtRupiah(sumBook)}</span></td>
        <td colSpan={5} style={{ border: '1px solid var(--clr-border)', padding: '12px 16px' }}></td>
        {isAdmin && <td style={{ border: '1px solid var(--clr-border)' }}></td>}
      </tr>
    )
  }

  const renderGroupHeader = (g, gData) => {
    const sumAcquis = gData.reduce((acc, r) => acc + (Number(r.acquis_val) || 0), 0)
    const sumAccum = gData.reduce((acc, r) => acc + (Number(r.accum_dep) || 0), 0)
    const sumBook = gData.reduce((acc, r) => acc + (Number(r.book_val) || 0), 0)
    
    return (
      <tr style={{ backgroundColor: '#09255c', color: 'white', fontWeight: 'bold' }}>
        <td colSpan={11} style={{ padding: '8px 16px', border: '1px solid var(--clr-border)', position: 'sticky', left: '0', zIndex: 6, backgroundColor: '#09255c', color: 'white' }}>
          {g}
        </td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '8px 16px', color: 'white' }}><span className="rupiah">{fmtRupiah(sumAcquis)}</span></td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '8px 16px', color: 'white' }}><span className="rupiah">{fmtRupiah(sumAccum)}</span></td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '8px 16px', color: 'white' }}><span className="rupiah">{fmtRupiah(sumBook)}</span></td>
        <td colSpan={5} style={{ border: '1px solid var(--clr-border)', padding: '8px 16px', color: 'white' }}></td>
        {isAdmin && <td style={{ border: '1px solid var(--clr-border)', color: 'white' }}></td>}
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
            <button className="btn btn-primary" id="btn-tambah-aset" onClick={openCreate}>
              <Plus size={16} style={{ marginRight: '4px', verticalAlign:'text-bottom' }} /> Tambah Aset
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
            columns={COLUMNS}
            data={tableData}
            onEdit={isAdmin ? openEdit : undefined}
            onDelete={isAdmin ? handleDelete : undefined}
            searchKeys={['asset_description', 'kajian_no', 'no_po', 'no_asset', 'lokasi', 'room', 'keterangan', 'kategori_aset']}
            filterOptions={[
              { key: 'kategori_aset', label: 'Kategori Laporan' },
              { key: 'category', label: 'Category (SAP)' },
              { key: 'lokasi', label: 'Lokasi' }
            ]}
            onFilterChange={setCurrentFilters}
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
            groupBy="kategori_aset"
            groupOrder={[
              "Pengembangan Aplikasi Proses Bisnis",
              "Pengembangan Infrastruktur Perkantoran",
              "Pembuatan dan Peremajaan Mobile Manufacturing Truck (MMT)",
              "Pembuatan dan Peremajaan On Site Plant (OSP)",
              "Blasting Equipment",
              "Pabrik CE",
              "Peralatan & Fasilitas Produksi",
              "Peralatan Laboratorium",
              "Peralatan & Fasilitas IT",
              "Pengembangan Bisnis Baru"
            ]}
            renderGroupHeader={renderGroupHeader}
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
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label" htmlFor="f-kajian-no">Kajian Investasi No</label>
              <input id="f-kajian-no" type="text" className="form-input" value={form.kajian_no} onChange={set('kajian_no')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="f-kajian-tgl">Kajian Investasi Tanggal</label>
              <input id="f-kajian-tgl" type="date" className="form-input" value={form.kajian_tanggal} onChange={set('kajian_tanggal')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="f-kajian-per">Kajian Investasi Perihal</label>
              <input id="f-kajian-per" type="text" className="form-input" value={form.kajian_perihal} onChange={set('kajian_perihal')} />
            </div>
            
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" htmlFor="f-kategori-lap">Kategori Laporan</label>
              <input id="f-kategori-lap" type="text" className="form-input" placeholder="Misal: Pengembangan Infrastruktur Perkantoran" value={form.kategori_aset} onChange={set('kategori_aset')} />
            </div>
          </div>
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
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="f-no-asset">No Asset</label>
              <input id="f-no-asset" type="text" className="form-input" value={form.no_asset} onChange={set('no_asset')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="f-sub-number">Sub Number</label>
              <input id="f-sub-number" type="text" className="form-input" value={form.sub_number} onChange={set('sub_number')} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="f-cat">Category</label>
              <input list="cat-options" id="f-cat" type="text" className="form-input" value={form.category} onChange={set('category')} placeholder="Pilih atau ketik Kategori" />
              <datalist id="cat-options">
                {Array.from(new Set(data.map(d => d.category).filter(Boolean))).sort().map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="f-cap-on">Capitalized on</label>
              <input id="f-cap-on" type="date" className="form-input" value={form.capitalized_on} onChange={set('capitalized_on')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="f-desc">Asset description <span className="required">*</span></label>
            <input id="f-desc" type="text" className="form-input" value={form.asset_description} onChange={set('asset_description')} />
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label" htmlFor="f-currency">Currency</label>
              <input id="f-currency" type="text" className="form-input" value={form.currency} onChange={set('currency')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="f-acquis">Acquis.val.</label>
              <CurrencyInput id="f-acquis" className="form-input" value={form.acquis_val} onChange={set('acquis_val')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="f-dep">Accum.dep.</label>
              <CurrencyInput id="f-dep" className="form-input" value={form.accum_dep} onChange={set('accum_dep')} />
            </div>
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label" htmlFor="f-loc-code">Location Code</label>
              <input id="f-loc-code" type="text" className="form-input" value={form.location_code} onChange={set('location_code')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="f-lokasi">Location Name</label>
              <input list="lok-options" id="f-lokasi" type="text" className="form-input" value={form.lokasi} onChange={set('lokasi')} placeholder="Pilih atau ketik Lokasi" />
              <datalist id="lok-options">
                {Array.from(new Set(data.map(d => d.lokasi).filter(Boolean))).sort().map(l => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="f-room">Room</label>
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
