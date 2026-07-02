import { useEffect, useState, useCallback } from 'react'
import { listStatus, listCapex, createStatus, updateStatus, deleteStatus } from '../api/capex'
import { useAuthStore } from '../store/authStore'
import ComplexDataTable from '../components/ui/ComplexDataTable'
import Modal from '../components/ui/Modal'
import { useDialog } from '../contexts/DialogContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import CurrencyInput from '../components/ui/CurrencyInput'
import { fmtRupiah } from '../utils'

const STATUS_TABS = ['PO', 'Tender', 'Kajian', 'BAADK', 'Lainnya']
const EMPTY_FORM = { capex_id: '', tahun: 2026, status_type: 'PO', anggaran_rkap: 0, anggaran_perubahan: 0, total_realisasi: 0, keterangan: '', keterangan_rekap: '', rekap_nilai: 0 }

export default function StatusPage({ tahun }) {
  const user = useAuthStore((s) => s.user)
  const dialog = useDialog()
  const isAdmin = user?.role === 'admin'

  const [activeTab, setActiveTab] = useState('PO')
  const [data, setData] = useState([])
  const [capexList, setCapexList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [r, c] = await Promise.all([listStatus({ tahun }), listCapex({ tahun })])
      setData(r.data.map(item => {
        let ket = item.keterangan || ''
        let ket_rekap = item.keterangan_rekap || ''
        if (ket.includes('|||')) {
          const parts = ket.split('|||')
          ket = parts[0]
          if (!ket_rekap) ket_rekap = parts[1] || ''
        }
        return { ...item, keterangan_parsed: ket, keterangan_rekap_parsed: ket_rekap }
      }))
      setCapexList(c.data)
    } finally {
      setLoading(false)
    }
  }, [tahun])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => { setForm({ ...EMPTY_FORM, tahun, status_type: activeTab }); setModal('create') }
  const openEdit = (row) => { 
    setForm({
      ...row,
      keterangan: row.keterangan_parsed,
      keterangan_rekap: row.keterangan_rekap_parsed
    })
    setModal('edit') 
  }
  const closeModal = () => { setModal(null); setForm(EMPTY_FORM) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        anggaran_rkap: Number(form.anggaran_rkap),
        anggaran_perubahan: Number(form.anggaran_perubahan),
        total_realisasi: Number(form.total_realisasi),
        rekap_nilai: Number(form.rekap_nilai),
        keterangan: form.keterangan || '',
        keterangan_rekap: form.keterangan_rekap || ''
      }
      
      if (modal === 'create') await createStatus(payload)
      else await updateStatus(form.id, payload)
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
      message: 'Hapus data status ini?',
      confirmText: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteStatus(row.id)
          setData((p) => p.filter((r) => r.id !== row.id))
        } catch { 
          dialog.alert({ title: 'Error', message: 'Gagal menghapus.', variant: 'danger' })
        }
      }
    })
  }

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const filteredData = data.filter((d) => d.status_type === activeTab)

  const columns = [
    { header: 'No', render: (_, i) => i + 1, sticky: true },
    { header: 'Daftar Capex', accessor: 'capex_master', sticky: true, render: (_, row) => row.capex_master?.daftar_capex ?? row.capex_id },
    { header: 'Anggaran', children: [
      { header: 'RKAP', render: (r) => <span className="rupiah">{fmtRupiah(r.anggaran_rkap)}</span> },
      { header: 'Perubahan', render: (r) => <span className="rupiah">{fmtRupiah(r.anggaran_perubahan)}</span> }
    ]},
    { header: `Realisasi ${activeTab}`, render: (r) => <span className="rupiah">{fmtRupiah(r.total_realisasi)}</span> },
    { header: 'Keterangan', accessor: 'keterangan_parsed' },
    { header: 'Rekap Nilai', children: [
      { header: 'Keterangan', accessor: 'keterangan_rekap_parsed' },
      { header: 'Nilai', render: (r) => <span className="rupiah">{fmtRupiah(r.rekap_nilai)}</span> }
    ]}
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-title">Monitoring Status & Tahapan {tahun}</h2>
          <p className="page-desc">Tabel Investasi berdasarkan buku RKAP - Tab Status.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>
            Tambah {activeTab}
          </button>
        )}
      </div>

      <div className="section" style={{ padding: 0, backgroundColor: 'transparent', boxShadow: 'none' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === tab ? 'var(--primary)' : 'var(--card-bg)',
                color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
                fontWeight: activeTab === tab ? 600 : 500,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                whiteSpace: 'nowrap'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div>
        {loading ? <LoadingSpinner /> : (
          <ComplexDataTable
            columns={columns}
            data={filteredData}
            onEdit={isAdmin ? openEdit : undefined}
            onDelete={isAdmin ? handleDelete : undefined}
            searchKeys={['keterangan_parsed', 'keterangan_rekap_parsed']}
          />
        )}
      </div>

      {modal && (
        <Modal
          title={modal === 'create' ? `Tambah Data ${activeTab}` : 'Edit Data Status'}
          onClose={closeModal}
          onSubmit={handleSave}
          submitLoading={saving}
          width="700px"
        >
          <div className="form-group">
            <label className="form-label">Item Capex <span className="required">*</span></label>
            <select className="form-select" value={form.capex_id} onChange={setF('capex_id')}>
              <option value="">— Pilih Capex —</option>
              {capexList.map((c) => <option key={c.id} value={c.id}>{c.daftar_capex}</option>)}
            </select>
          </div>
          
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Anggaran RKAP</label>
              <CurrencyInput className="form-input" value={form.anggaran_rkap} onChange={setF('anggaran_rkap')} />
            </div>
            <div className="form-group">
              <label className="form-label">Anggaran Perubahan</label>
              <CurrencyInput className="form-input" value={form.anggaran_perubahan} onChange={setF('anggaran_perubahan')} />
            </div>
          </div>
          
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Total Realisasi</label>
              <CurrencyInput className="form-input" value={form.total_realisasi} onChange={setF('total_realisasi')} />
            </div>
            <div className="form-group">
              <label className="form-label">Status Tab</label>
              <select className="form-select" value={form.status_type} onChange={setF('status_type')}>
                {STATUS_TABS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Keterangan PO/Tender</label>
            <textarea className="form-textarea" value={form.keterangan} onChange={setF('keterangan')} />
          </div>

          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Rekap Nilai</h4>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Keterangan Rekap</label>
                <input type="text" className="form-input" value={form.keterangan_rekap} onChange={setF('keterangan_rekap')} />
              </div>
              <div className="form-group">
                <label className="form-label">Nilai Rekap</label>
                <CurrencyInput className="form-input" value={form.rekap_nilai} onChange={setF('rekap_nilai')} />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
