import { useEffect, useState, useCallback } from 'react'
import { listLKU, listCapex, createLKU, updateLKU, deleteLKU } from '../api/capex'
import { useAuthStore } from '../store/authStore'
import ComplexDataTable from '../components/ui/ComplexDataTable'
import Modal from '../components/ui/Modal'
import { useDialog } from '../contexts/DialogContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import CurrencyInput from '../components/ui/CurrencyInput'
import { fmtRupiah } from '../utils'
import { Plus } from 'lucide-react'

const BULAN_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const EMPTY_FORM = {
  capex_id: '', tahun: 2026, kategori_investasi: '', departemen: '',
  rkap_nilai: 0, rkap_target: 0, rencana_twi: 0, realisasi_po: 0, realisasi_bast: 0,
  rencana_per_bulan: {}
}

export default function LKUPage({ tahun }) {
  const user = useAuthStore((s) => s.user)
  const dialog = useDialog()
  const isAdmin = user?.role === 'admin'

  const [data, setData] = useState([])
  const [capexList, setCapexList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [r, c] = await Promise.all([listLKU({ tahun }), listCapex({ tahun })])
      setData(r.data)
      setCapexList(c.data)
    } finally {
      setLoading(false)
    }
  }, [tahun])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => { setForm({ ...EMPTY_FORM, tahun, rencana_per_bulan: {} }); setModal('create') }
  const openEdit = (row) => { setForm({ ...row, rencana_per_bulan: row.rencana_per_bulan || {} }); setModal('edit') }
  const closeModal = () => { setModal(null); setForm(EMPTY_FORM) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        rkap_nilai: Number(form.rkap_nilai),
        rkap_target: Number(form.rkap_target),
        rencana_twi: Number(form.rencana_twi),
        realisasi_po: Number(form.realisasi_po),
        realisasi_bast: Number(form.realisasi_bast)
      }
      if (modal === 'create') await createLKU(payload)
      else await updateLKU(form.id, payload)
      await fetchData()
      closeModal()
    } catch (e) {
      dialog.alert({ title: 'Error', message: e.response?.data?.detail ?? 'Gagal menyimpan data.', variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (row) => {
    dialog.confirm({
      title: 'Konfirmasi Hapus',
      message: 'Hapus data LKU ini?',
      confirmText: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteLKU(row.id)
          setData((p) => p.filter((r) => r.id !== row.id))
        } catch { 
          dialog.alert({ title: 'Error', message: 'Gagal menghapus.', variant: 'danger' })
        }
      }
    })
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setBulan = (bulanIdx, val) => {
    setForm((f) => ({
      ...f,
      rencana_per_bulan: { ...f.rencana_per_bulan, [bulanIdx]: Number(val) }
    }))
  }

  const columns = [
    { header: 'No', render: (_, i) => i + 1 },
    { header: 'Uraian / Capex', accessor: 'capex_master', sticky: true, render: (_, row) => row.capex_master?.daftar_capex ?? row.capex_id },
    { header: 'Departemen', accessor: 'departemen' },
    { header: 'RKAP Nilai', render: (r) => <span className="rupiah">{fmtRupiah(r.rkap_nilai)}</span> },
    { header: 'RKAP Target', render: (r) => <span className="rupiah">{fmtRupiah(r.rkap_target)}</span> },
    { header: 'Rencana TWI', render: (r) => <span className="rupiah">{fmtRupiah(r.rencana_twi)}</span> },
    { header: 'Realisasi PO', render: (r) => <span className="rupiah">{fmtRupiah(r.realisasi_po)}</span> },
    { header: 'Realisasi BAST', render: (r) => <span className="rupiah">{fmtRupiah(r.realisasi_bast)}</span> },
    ...BULAN_NAMES.map((bulan, idx) => ({
      header: bulan,
      render: (r) => <span className="rupiah">{fmtRupiah(r.rencana_per_bulan?.[(idx + 1).toString()])}</span>
    }))
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-title">Laporan Keuangan Unit (LKU) {tahun}</h2>
          <p className="page-desc">Tabel LKU untuk tracking RKAP, TWI, dan Realisasi per bulan.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} style={{ marginRight: '4px', verticalAlign:'text-bottom' }} /> Tambah LKU
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? <LoadingSpinner /> : (
          <ComplexDataTable
            columns={columns}
            data={data}
            onEdit={isAdmin ? openEdit : undefined}
            onDelete={isAdmin ? handleDelete : undefined}
            searchKeys={['departemen', 'kategori_investasi']}
          />
        )}
      </div>

      {modal && (
        <Modal
          title={modal === 'create' ? 'Tambah Data LKU' : 'Edit Data LKU'}
          onClose={closeModal}
          onSubmit={handleSave}
          submitLoading={saving}
          width="700px"
        >
          <div className="form-group">
            <label className="form-label">Item Capex <span className="required">*</span></label>
            <select className="form-select" value={form.capex_id} onChange={set('capex_id')}>
              <option value="">— Pilih Capex —</option>
              {capexList.map((c) => <option key={c.id} value={c.id}>{c.daftar_capex}</option>)}
            </select>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Kategori Investasi</label>
              <input type="text" className="form-input" value={form.kategori_investasi} onChange={set('kategori_investasi')} />
            </div>
            <div className="form-group">
              <label className="form-label">Departemen</label>
              <input type="text" className="form-input" value={form.departemen} onChange={set('departemen')} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">RKAP Nilai</label>
              <CurrencyInput className="form-input" value={form.rkap_nilai} onChange={set('rkap_nilai')} />
            </div>
            <div className="form-group">
              <label className="form-label">RKAP Target</label>
              <CurrencyInput className="form-input" value={form.rkap_target} onChange={set('rkap_target')} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Realisasi PO</label>
              <CurrencyInput className="form-input" value={form.realisasi_po} onChange={set('realisasi_po')} />
            </div>
            <div className="form-group">
              <label className="form-label">Realisasi BAST</label>
              <CurrencyInput className="form-input" value={form.realisasi_bast} onChange={set('realisasi_bast')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Rencana TWI</label>
            <CurrencyInput className="form-input" value={form.rencana_twi} onChange={set('rencana_twi')} />
          </div>

          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Rencana Per Bulan</h4>
            <div className="form-grid-2">
              {BULAN_NAMES.map((bulan, idx) => {
                const monthStr = (idx + 1).toString()
                return (
                  <div className="form-group" key={bulan}>
                    <label className="form-label">{bulan}</label>
                    <CurrencyInput
                      className="form-input"
                      value={form.rencana_per_bulan[monthStr] || 0}
                      onChange={(e) => setBulan(monthStr, e.target.value)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
