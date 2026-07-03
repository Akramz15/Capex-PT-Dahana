import { useEffect, useState, useCallback } from 'react'
import { listCapex, createCapex, updateCapex, deleteCapex, listRealization, listStatus, createRealizationBulk } from '../api/capex'
import { useAuthStore } from '../store/authStore'
import ComplexDataTable from '../components/ui/ComplexDataTable'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import CurrencyInput from '../components/ui/CurrencyInput'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useDialog } from '../contexts/DialogContext'
import { fmtRupiah, fmtShort } from '../utils'

import { getRkapLockStatus, setRkapLockStatus } from '../api/settings'
import { Lock, Unlock, History, UploadCloud } from 'lucide-react'
import { getAuditLogs, uploadCapexExcel } from '../api/capex'

const EMPTY_FORM = { tahun: 2026, kode: '', daftar_capex: '', kategori: '', anggaran_rkap: 0, anggaran_perubahan: 0, pic: '', items: {}, source_capex_id: '' }
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export default function RKAPMasterPage({ tahun }) {
  const user    = useAuthStore((s) => s.user)
  const dialog  = useDialog()
  const isAdmin = user?.role === 'admin'

  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [auditLogs, setAuditLogs] = useState([])
  const [uploading, setUploading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [resCapex, resReal, resStatus, lockRes] = await Promise.all([
        listCapex({ tahun }),
        listRealization({ tahun }),
        listStatus({ tahun }),
        getRkapLockStatus(tahun)
      ])
      
      setIsLocked(lockRes.is_locked)
      
      const merged = resCapex.data.map(capex => {
        const row = { ...capex }
        const reals = resReal.data.filter(r => r.capex_id === capex.id)
        const statuses = resStatus.data.filter(s => s.capex_id === capex.id && s.status_type !== 'Lainnya')
        
        reals.forEach(r => {
          row[`b${r.bulan}_rkap`] = r.nilai_rkap
          row[`b${r.bulan}_real`] = r.nilai_realisasi
          if (r.status) row.status = r.status
        })
        
        row.total_rkap = capex.anggaran_rkap || 0
        row.anggaran_perubahan = capex.anggaran_perubahan || 0
        
        row.total_real = reals.reduce((acc, r) => acc + (r.nilai_realisasi || 0), 0)
        
        return row
      })
      setData(merged)
    } finally {
      setLoading(false)
    }
  }, [tahun])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => { setForm({ ...EMPTY_FORM, tahun }); setModal('create') }
  const openEdit   = (row) => {
    const items = {}
    for (let i = 1; i <= 12; i++) {
      items[i] = { rkap: row[`b${i}_rkap`] || 0, real: row[`b${i}_real`] || 0 }
    }
    setForm({ ...row, items })
    setModal('edit')
  }
  
  const openAuditLogs = async () => {
    try {
      setLoading(true)
      const res = await getAuditLogs(tahun)
      setAuditLogs(res.data)
      setModal('audit')
    } catch (e) {
      dialog.alert({ title: 'Error', message: 'Gagal mengambil riwayat pengalihan.', variant: 'danger' })
    } finally {
      setLoading(false)
    }
  }

  const handleUploadExcel = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setUploading(true)
      await uploadCapexExcel(tahun, file)
      dialog.alert({ title: 'Sukses', message: 'Data Excel berhasil diunggah.', variant: 'success' })
      await fetchData()
    } catch (err) {
      let msg = 'Gagal mengunggah file.'
      if (err.response?.data?.detail) msg = err.response.data.detail
      dialog.alert({ title: 'Error', message: msg, variant: 'danger' })
    } finally {
      setUploading(false)
      e.target.value = null
    }
  }




  const closeModal = () => { setModal(null); setForm(EMPTY_FORM); setAuditLogs([]) }

  const handleToggleLock = () => {
    dialog.confirm({
      title: 'Konfirmasi',
      message: `Anda yakin ingin ${isLocked ? 'MEMBUKA KUNCI' : 'MENGUNCI'} RKAP tahun ${tahun}?`,
      confirmText: isLocked ? 'Buka Kunci' : 'Kunci',
      variant: isLocked ? 'primary' : 'warning',
      onConfirm: async () => {
        try {
          setLoading(true)
          await setRkapLockStatus(tahun, !isLocked)
          await fetchData()
        } catch (e) {
          dialog.alert({ title: 'Error', message: 'Gagal mengubah status kunci RKAP.', variant: 'danger' })
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let capexId = form.id
      if (modal === 'create') {
        if (isLocked && !form.source_capex_id) {
          dialog.alert({ title: 'Peringatan', message: 'Tahun RKAP dikunci. Anda WAJIB memilih Sumber Dana (Capex Lama) untuk pergeseran anggaran.', variant: 'warning' })
          setSaving(false)
          return
        }
        const res = await createCapex(form)
        capexId = res.data.id
      } else {
        await updateCapex(form.id, form)
      }
      
      // Save 12-month RKAP Plan
      const payloadBulk = {
        capex_id: capexId,
        tahun: form.tahun,
        status: form.status || 'Draft',
        keterangan: form.keterangan || '',
        pic: form.pic || '',
        items: []
      }
      for (let i = 1; i <= 12; i++) {
        const item = form.items?.[i] || {}
        payloadBulk.items.push({
          bulan: i,
          nilai_rkap: Number(item.rkap || 0),
          nilai_realisasi: Number(item.real || 0) // preserve existing actuals
        })
      }
      await createRealizationBulk(payloadBulk)

      await fetchData()
      closeModal()
    } catch (e) {
      let msg = 'Gagal menyimpan data.'
      const detail = e.response?.data?.detail
      if (Array.isArray(detail)) {
        msg = detail[0].msg
      } else if (typeof detail === 'string') {
        msg = detail
      }
      dialog.alert({ title: 'Error', message: msg, variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (row) => {
    dialog.confirm({
      title: 'Konfirmasi Hapus',
      message: `Hapus "${row.daftar_capex}"?`,
      confirmText: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteCapex(row.id)
          await fetchData()
        } catch {
          dialog.alert({ title: 'Error', message: 'Gagal menghapus data.', variant: 'danger' })
        }
      }
    })
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const columns = [
    { header: 'No', render: (_, i) => i + 1, sticky: true },
    { header: 'Kode', accessor: 'kode', sticky: true },
    { header: 'Daftar Capex', accessor: 'daftar_capex', sticky: true },
    { header: 'PIC', accessor: 'pic' },
    { header: 'Tahun', accessor: 'tahun' },
    { header: 'Status', accessor: 'status' },
    ...BULAN.map((bln, i) => ({
      header: bln,
      children: [
        { header: 'RKAP', render: (r) => <span className="rupiah">{fmtRupiah(r[`b${i+1}_rkap`])}</span> },
        { header: 'Realisasi', render: (r) => <span className="rupiah">{fmtRupiah(r[`b${i+1}_real`])}</span> }
      ]
    })),
    { header: 'Total', children: [
      { header: 'RKAP Awal', render: (r) => <span className="rupiah fw-bold">{fmtRupiah(r.anggaran_rkap)}</span> },
      { header: 'RKAP Revisi', render: (r) => <span className="rupiah fw-bold">{fmtRupiah(r.anggaran_perubahan)}</span> },
      { header: 'Realisasi', render: (r) => <span className="rupiah fw-bold">{fmtRupiah(r.total_real)}</span> }
    ]}
  ]

  const renderGroupHeader = (groupName, groupData) => {
    let totalRkapSum = 0;
    let totalPerubahanSum = 0;
    let totalRealSum = 0;
    groupData.forEach(r => {
      totalRkapSum += r.anggaran_rkap || 0;
      totalPerubahanSum += r.anggaran_perubahan || 0;
      totalRealSum += r.total_real || 0;
    });

    return (
      <tr style={{ backgroundColor: '#002060', color: 'white', fontWeight: 'bold' }} className="group-header-row">
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'center' }}></td>
        <td colSpan={3} style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', textAlign: 'left', color: 'white' }}>
          {groupName}
        </td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white' }}></td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white' }}></td>
        {BULAN.flatMap((_, i) => {
          const sumBlnRkap = groupData.reduce((acc, r) => acc + (r[`b${i+1}_rkap`] || 0), 0)
          const sumBlnReal = groupData.reduce((acc, r) => acc + (r[`b${i+1}_real`] || 0), 0)
          return [
            <td key={`gh-rkap-${i}`} style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'right' }}>
              {sumBlnRkap > 0 ? <span className="rupiah">{fmtRupiah(sumBlnRkap)}</span> : '-'}
            </td>,
            <td key={`gh-real-${i}`} style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'right' }}>
              {sumBlnReal > 0 ? <span className="rupiah">{fmtRupiah(sumBlnReal)}</span> : '-'}
            </td>
          ]
        })}
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'right' }}>
          {totalRkapSum > 0 ? <span className="rupiah">{fmtRupiah(totalRkapSum)}</span> : '-'}
        </td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'right' }}>
          {totalPerubahanSum > 0 ? <span className="rupiah">{fmtRupiah(totalPerubahanSum)}</span> : '-'}
        </td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'right' }}>
          {totalRealSum > 0 ? <span className="rupiah">{fmtRupiah(totalRealSum)}</span> : '-'}
        </td>
        {isAdmin && <td style={{ border: '1px solid var(--clr-border)' }}></td>}
      </tr>
    )
  }

  const renderFooter = (filteredData) => {
    const sumTotalRKAP = filteredData.reduce((acc, r) => acc + (r.anggaran_rkap || 0), 0)
    const sumTotalPerubahan = filteredData.reduce((acc, r) => acc + (r.anggaran_perubahan || 0), 0)
    const sumTotalReal = filteredData.reduce((acc, r) => acc + (r.total_real || 0), 0)
    
    return (
      <tr style={{ backgroundColor: '#001a4d', color: 'white', fontWeight: 'bold' }}>
        <td colSpan={6} style={{ textAlign: 'center', border: '1px solid var(--clr-border)', padding: '12px 16px' }}>Total Keseluruhan</td>
        {BULAN.flatMap((_, i) => {
          const sumBlnRkap = filteredData.reduce((acc, r) => acc + (r[`b${i+1}_rkap`] || 0), 0)
          const sumBlnReal = filteredData.reduce((acc, r) => acc + (r[`b${i+1}_real`] || 0), 0)
          return [
            <td key={`ft-rkap-${i}`} style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', textAlign: 'right' }}>
              {sumBlnRkap > 0 ? <span className="rupiah">{fmtRupiah(sumBlnRkap)}</span> : '-'}
            </td>,
            <td key={`ft-real-${i}`} style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', textAlign: 'right' }}>
              {sumBlnReal > 0 ? <span className="rupiah">{fmtRupiah(sumBlnReal)}</span> : '-'}
            </td>
          ]
        })}
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', textAlign: 'right' }}>
          {sumTotalRKAP > 0 ? <span className="rupiah">{fmtRupiah(sumTotalRKAP)}</span> : '-'}
        </td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', textAlign: 'right' }}>
          {sumTotalPerubahan > 0 ? <span className="rupiah">{fmtRupiah(sumTotalPerubahan)}</span> : '-'}
        </td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', textAlign: 'right' }}>
          {sumTotalReal > 0 ? <span className="rupiah">{fmtRupiah(sumTotalReal)}</span> : '-'}
        </td>
        {isAdmin && <td style={{ border: '1px solid var(--clr-border)' }}></td>}
      </tr>
    )
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-title">RKAP Master {tahun}</h2>
          <p className="page-desc">Daftar rencana investasi Capex berdasarkan buku RKAP.</p>
        </div>
        {isAdmin && (
          <div className="page-header-actions" style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={openAuditLogs} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={18} />
              Riwayat Pengalihan
            </button>
            <button className={`btn ${isLocked ? 'btn-danger' : 'btn-success'}`} onClick={handleToggleLock} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
              {isLocked ? 'Buka Kunci RKAP' : 'Kunci RKAP ' + tahun}
            </button>
            

            {!isLocked && (
              <>
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  id="upload-excel" 
                  style={{ display: 'none' }} 
                  onChange={handleUploadExcel} 
                />
                <button 
                  className="btn btn-outline" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => document.getElementById('upload-excel').click()}
                  disabled={uploading}
                >
                  <UploadCloud size={18} />
                  {uploading ? 'Mengunggah...' : 'Upload Excel'}
                </button>
              </>
            )}

            <button className="btn btn-primary" id="btn-tambah-capex" onClick={openCreate}>
              Tambah Capex
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
            onDelete={isAdmin ? handleDelete : undefined}
            searchKeys={['kode', 'daftar_capex', 'pic', 'kategori', 'status']}
            filterOptions={[
              { key: 'kategori', label: 'Kategori' },
              { key: 'status', label: 'Status' },
              { key: 'pic', label: 'PIC' }
            ]}
            groupBy="kategori"
            renderGroupHeader={renderGroupHeader}
            renderFooter={renderFooter}
          />
        )}
      </div>

      {(modal === 'create' || modal === 'edit') && (
        <Modal
          title={modal === 'create' ? 'Tambah Capex Baru' : 'Edit Capex'}
          onClose={closeModal}
          onSubmit={handleSave}
          submitLoading={saving}
          width="800px"
        >
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="f-tahun">Tahun <span className="required">*</span></label>
              <input id="f-tahun" type="number" className="form-input" value={form.tahun} onChange={set('tahun')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="f-kode">Kode</label>
              <input id="f-kode" type="text" className="form-input" value={form.kode} onChange={set('kode')} placeholder="APP-01" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="f-nama">Nama / Daftar Capex <span className="required">*</span></label>
            <input id="f-nama" type="text" className="form-input" value={form.daftar_capex} onChange={set('daftar_capex')} />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="f-kategori">Kategori</label>
              <input list="kategori-options" id="f-kategori" type="text" className="form-input" value={form.kategori} onChange={set('kategori')} placeholder="Pilih atau ketik kategori baru" />
              <datalist id="kategori-options">
                {Array.from(new Set(data.map(d => d.kategori).filter(Boolean))).sort().map(k => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="f-pic">PIC</label>
              <input list="pic-options" id="f-pic" type="text" className="form-input" value={form.pic} onChange={set('pic')} placeholder="Pilih atau ketik PIC baru" />
              <datalist id="pic-options">
                {Array.from(new Set(data.map(d => d.pic).filter(Boolean))).sort().map(p => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="f-rkap">Anggaran RKAP (Rp)</label>
              <CurrencyInput id="f-rkap" className="form-input" value={isLocked && modal === 'create' ? 0 : form.anggaran_rkap} onChange={set('anggaran_rkap')} disabled={isLocked} />
              {isLocked && <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>RKAP dikunci. Tidak dapat diubah.</div>}
            </div>
            
            <div className="form-group">
              {isLocked && modal === 'create' ? (
                <>
                  <label className="form-label" htmlFor="f-sumber" style={{ color: '#0284c7' }}>Sumber Dana (Geser Anggaran Dari) <span className="required">*</span></label>
                  <select id="f-sumber" className="form-select" value={form.source_capex_id || ''} onChange={set('source_capex_id')} style={{ borderColor: '#0ea5e9' }}>
                    <option value="">-- Pilih Capex Sumber --</option>
                    {data.filter(d => d.anggaran_perubahan > 0).map(d => (
                      <option key={d.id} value={d.id}>{d.kode ? `[${d.kode}]` : ''} {d.daftar_capex} (Sisa: {fmtShort(d.anggaran_perubahan)})</option>
                    ))}
                  </select>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Wajib dipilih karena RKAP tahun ini sudah dikunci.</div>
                </>
              ) : null}
            </div>
          </div>
          
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label" htmlFor="f-perubahan">Anggaran Perubahan (Rp)</label>
            <CurrencyInput id="f-perubahan" className="form-input" value={form.anggaran_perubahan} onChange={set('anggaran_perubahan')} />
            {isLocked && modal === 'create' && form.source_capex_id && form.anggaran_perubahan > 0 && (
              <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px', fontWeight: 500 }}>
                ⚠️ Dana sebesar {fmtRupiah(form.anggaran_perubahan)} akan dipotong dari Capex Sumber.
              </div>
            )}
          </div>

          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Rencana RKAP Bulanan (Rp)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
              {BULAN.map((bulan, idx) => {
                const b = idx + 1
                return (
                  <div key={b} style={{ border: '1px solid var(--clr-border)', padding: '10px', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '12px', textAlign: 'center' }}>{bulan}</div>
                    <CurrencyInput className="form-input" style={{ padding: '6px', fontSize: '13px', textAlign: 'right' }} 
                      value={form.items?.[b]?.rkap ?? ''} 
                      onChange={(e) => {
                        const val = e.target.value
                        setForm(f => ({
                          ...f,
                          items: {
                            ...f.items,
                            [b]: { ...f.items?.[b], rkap: val }
                          }
                        }))
                      }} />
                  </div>
                )
              })}
            </div>
          </div>
        </Modal>
      )}

      {modal === 'audit' && (
        <Modal
          title={`Riwayat Pengalihan Anggaran (${tahun})`}
          onClose={closeModal}
          width="900px"
          hideSubmit
        >
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {auditLogs.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Belum ada riwayat pengalihan anggaran di tahun {tahun}.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Waktu</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Oleh</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Keterangan</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Anggaran Digeser</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px' }}>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{log.user_name}</td>
                      <td style={{ padding: '12px' }}>{log.keterangan}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500', color: '#0369a1' }}>
                        {fmtRupiah(log.anggaran)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
