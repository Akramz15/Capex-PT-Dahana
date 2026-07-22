import { useEffect, useState, useCallback } from 'react'
import { listCapex, createCapex, updateCapex, deleteCapex, listRealization, listStatus, createRealizationBulk } from '../api/capex'
import { useAuthStore } from '../store/authStore'
import ComplexDataTable from '../components/ui/ComplexDataTable'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import CurrencyInput from '../components/ui/CurrencyInput'
import SearchableSelect from '../components/ui/SearchableSelect'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import LastUpdatedInfo from '../components/ui/LastUpdatedInfo'
import { useDialog } from '../contexts/DialogContext'
import { fmtRupiah, fmtShort } from '../utils'

import { getRkapLockStatus, setRkapLockStatus } from '../api/settings'
import { Lock, Unlock, UploadCloud, Download, Hourglass } from 'lucide-react'
import { uploadCapexExcel, exportRKAPExcel } from '../api/capex'
import { downloadBlob } from '../utils'

const EMPTY_FORM = { tahun: 2026, kode: '', daftar_capex: '', kategori: '', anggaran_rkap: 0, anggaran_perubahan: 0, pic: '', items: {}, sources: [], nd_persetujuan: '' }
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

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
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [currentFilters, setCurrentFilters] = useState({})

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
    const effective_anggaran = (row.anggaran_perubahan ?? row.anggaran_rkap ?? 0);
    setForm({ ...row, items, original_anggaran_perubahan: effective_anggaran })
    setModal('edit')
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

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const res = await exportRKAPExcel({ tahun, ...currentFilters })
      downloadBlob(res.data, `RKAP_Master_${tahun}.xlsx`)
    } catch (e) {
      dialog.alert({ title: 'Error', message: 'Gagal mengunduh laporan excel.', variant: 'danger' })
    } finally {
      setExporting(false)
    }
  }

  const closeModal = () => { setModal(null); setForm(EMPTY_FORM) }

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
    
    // Validasi Total RKAP Bulanan vs Anggaran
    let sumBulanan = 0
    for (let i = 1; i <= 12; i++) {
      sumBulanan += Number(form.items?.[i]?.rkap || 0)
    }
    const targetAnggaran = isLocked ? Number(form.anggaran_perubahan || 0) : Number(form.anggaran_rkap || 0)
    
    if (sumBulanan !== targetAnggaran) {
      dialog.alert({ 
        title: 'Validasi Gagal', 
        message: `Total RKAP Bulanan (${fmtRupiah(sumBulanan)}) tidak sama dengan Anggaran (${fmtRupiah(targetAnggaran)}). Silakan sesuaikan rincian bulanan.`, 
        variant: 'warning' 
      })
      setSaving(false)
      return
    }

    try {
      let capexId = form.id
      if (modal === 'create') {
        const reqAmt = Number(form.anggaran_perubahan || 0)
        const totalSel = (form.sources || []).reduce((acc, sid) => {
          const d = data.find(i => i.id === sid)
          return acc + (d ? (d.anggaran_perubahan ?? d.anggaran_rkap ?? 0) : 0)
        }, 0)
        
        if (isLocked) {
          if (!form.sources || form.sources.length === 0) {
            dialog.alert({ title: 'Peringatan', message: 'Tahun RKAP dikunci. Anda WAJIB memilih Sumber Dana (Capex Lama) untuk pergeseran anggaran.', variant: 'warning' })
            setSaving(false)
            return
          }
          if (totalSel < reqAmt) {
            dialog.alert({ title: 'Peringatan', message: 'Tahun RKAP dikunci. Total dana dari Capex Sumber tidak mencukupi untuk pergeseran anggaran.', variant: 'warning' })
            setSaving(false)
            return
          }
        }
        
        const payload = { ...form, source_capex_ids: form.sources || [] }
        const res = await createCapex(payload)
        capexId = res.data.id
      } else {
        const reqAmt = Number(form.anggaran_perubahan || 0) - Number(form.original_anggaran_perubahan || 0)
        if (isLocked && reqAmt > 0) {
          const totalSel = (form.sources || []).reduce((acc, sid) => {
            const d = data.find(i => i.id === sid)
            return acc + (d ? (d.anggaran_perubahan ?? d.anggaran_rkap ?? 0) : 0)
          }, 0)
          
          if (!form.sources || form.sources.length === 0) {
            dialog.alert({ title: 'Peringatan', message: 'Tahun RKAP dikunci. Anda WAJIB memilih Sumber Dana untuk penambahan anggaran.', variant: 'warning' })
            setSaving(false)
            return
          }
          if (totalSel < reqAmt) {
            dialog.alert({ title: 'Peringatan', message: 'Tahun RKAP dikunci. Total dana dari Capex Sumber tidak mencukupi untuk penambahan anggaran.', variant: 'warning' })
            setSaving(false)
            return
          }
          if (!form.nd_persetujuan) {
            dialog.alert({ title: 'Peringatan', message: 'Tahun RKAP dikunci. Anda WAJIB mengisi ND Persetujuan untuk penambahan anggaran.', variant: 'warning' })
            setSaving(false)
            return
          }
        }
        
        const payload = { ...form, reallocation_source_ids: form.sources || [] }
        await updateCapex(form.id, payload)
      }
      
      // Save 12-month RKAP Plan
      const payloadBulk = {
        capex_id: capexId,
        tahun: form.tahun,
        status: form.status || 'Rencana',
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
      dialog.alert({ title: 'Sukses', message: 'Data berhasil disimpan.', variant: 'success' })
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
          dialog.alert({ title: 'Sukses', message: 'Data berhasil dihapus.', variant: 'success' })
        } catch {
          dialog.alert({ title: 'Error', message: 'Gagal menghapus data.', variant: 'danger' })
        }
      }
    })
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const columns = [
    { header: 'No', render: (_, i) => i + 1, sticky: true, stickyLeft: '0px', width: '60px' },
    { header: 'Kode', accessor: 'kode', sticky: true, stickyLeft: '59px', width: '120px' },
    { header: 'Daftar Capex', accessor: 'daftar_capex', sticky: true, stickyLeft: '178px', width: '250px' },
    { header: 'PIC', accessor: 'pic' },
    { header: 'Tahun', accessor: 'tahun' },
    { header: 'Status', accessor: 'status' },
    ...BULAN.map((bln, i) => ({
      header: bln,
      render: (r) => <span className="rupiah">{r[`b${i+1}_rkap`] > 0 ? fmtRupiah(r[`b${i+1}_rkap`]) : '—'}</span>
    })),
    { header: 'Total', children: [
      { header: 'RKAP Awal', render: (r) => <span className="rupiah fw-bold">{r.anggaran_rkap > 0 ? fmtRupiah(r.anggaran_rkap) : '—'}</span> },
      { header: 'RKAP Revisi', render: (r) => <span className="rupiah fw-bold">{r.anggaran_perubahan != null ? fmtRupiah(r.anggaran_perubahan) : '—'}</span> }
    ]}
  ]

  const renderGroupHeader = (groupName, groupData) => {
    let totalRkapSum = 0;
    let totalPerubahanSum = 0;
    groupData.forEach(r => {
      totalRkapSum += r.anggaran_rkap || 0;
      totalPerubahanSum += r.anggaran_perubahan || 0;
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
          return [
            <td key={`gh-rkap-${i}`} style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'right' }}>
              {sumBlnRkap > 0 ? <span className="rupiah">{fmtRupiah(sumBlnRkap)}</span> : '-'}
            </td>
          ]
        })}
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'right' }}>
          {totalRkapSum > 0 ? <span className="rupiah">{fmtRupiah(totalRkapSum)}</span> : '-'}
        </td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'right' }}>
          {totalPerubahanSum > 0 ? <span className="rupiah">{fmtRupiah(totalPerubahanSum)}</span> : '-'}
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
          return [
            <td key={`ft-rkap-${i}`} style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', textAlign: 'right' }}>
              {sumBlnRkap > 0 ? <span className="rupiah">{fmtRupiah(sumBlnRkap)}</span> : '-'}
            </td>
          ]
        })}
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', textAlign: 'right' }}>
          {sumTotalRKAP > 0 ? <span className="rupiah">{fmtRupiah(sumTotalRKAP)}</span> : '-'}
        </td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', textAlign: 'right' }}>
          {sumTotalPerubahan > 0 ? <span className="rupiah">{fmtRupiah(sumTotalPerubahan)}</span> : '-'}
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
          <p className="page-desc" style={{ marginBottom: '8px' }}>Daftar rencana investasi Capex berdasarkan buku RKAP.</p>
          <LastUpdatedInfo moduleName="RKAP Master" />
        </div>
        {isAdmin && (
          <div className="page-header-actions" style={{ display: 'flex', gap: '8px' }}>
            <button className={`btn ${isLocked ? 'btn-danger' : 'btn-success'}`} onClick={handleToggleLock} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
              {isLocked ? 'Buka Kunci RKAP' : 'Kunci RKAP ' + tahun}
            </button>
            
            <button className="btn btn-outline" onClick={handleExportExcel} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {exporting ? <><Hourglass size={18} /> Mengekspor...</> : <><Download size={18} /> Download Excel</>}
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
            onFilterChange={setCurrentFilters}
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
              {(isLocked && modal === 'create') || (isLocked && modal === 'edit' && Number(form.anggaran_perubahan || 0) > Number(form.original_anggaran_perubahan || 0)) ? (() => {
                const requiredAmount = modal === 'create' 
                  ? Number(form.anggaran_perubahan || 0) 
                  : (Number(form.anggaran_perubahan || 0) - Number(form.original_anggaran_perubahan || 0))
                
                const totalSelectedBalance = (form.sources || []).reduce((acc, sourceId) => {
                  const d = data.find(item => item.id === sourceId)
                  if (!d) return acc
                  return acc + (d.anggaran_perubahan ?? d.anggaran_rkap ?? 0)
                }, 0)
                
                const needsMoreSources = requiredAmount > 0 && totalSelectedBalance < requiredAmount

                return (
                  <>
                    <label className="form-label" htmlFor="f-sumber" style={{ color: '#0284c7' }}>Sumber Dana (Geser Anggaran Dari) <span className="required">*</span></label>
                    
                    {(form.sources || []).map((sourceId, index) => {
                      const d = data.find(item => item.id === sourceId)
                      const eff = d ? (d.anggaran_perubahan ?? d.anggaran_rkap ?? 0) : 0
                      
                      const dropdownOptions = [
                        { value: "", label: "-- Hapus Pilihan Ini --" },
                        ...data.filter(cd => (cd.anggaran_perubahan ?? cd.anggaran_rkap ?? 0) > 0 && cd.id !== form.id && (cd.id === sourceId || !(form.sources || []).includes(cd.id))).map(cd => ({
                          value: cd.id,
                          label: `${cd.kode ? `[${cd.kode}] ` : ''}${cd.daftar_capex} (Sisa: ${fmtShort(cd.anggaran_perubahan ?? cd.anggaran_rkap ?? 0)})`
                        }))
                      ];

                      return (
                        <div key={index} style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
                          <SearchableSelect 
                            value={sourceId}
                            onChange={(val) => {
                              const newSources = [...(form.sources || [])]
                              if (val) {
                                newSources[index] = val
                              } else {
                                newSources.splice(index, 1)
                              }
                              setForm(f => ({ ...f, sources: newSources }))
                            }}
                            options={dropdownOptions}
                            style={{ borderColor: '#0ea5e9', flex: 1 }}
                            className="form-select"
                            placeholder="Pilih Capex Sumber"
                          />
                        </div>
                      )
                    })}
                    
                    {needsMoreSources && (
                      <div style={{ marginBottom: '8px' }}>
                        {(() => {
                           const addOptions = data.filter(cd => (cd.anggaran_perubahan ?? cd.anggaran_rkap ?? 0) > 0 && cd.id !== form.id && !(form.sources || []).includes(cd.id)).map(cd => ({
                             value: cd.id,
                             label: `${cd.kode ? `[${cd.kode}] ` : ''}${cd.daftar_capex} (Sisa: ${fmtShort(cd.anggaran_perubahan ?? cd.anggaran_rkap ?? 0)})`
                           }));
                           
                           return (
                             <SearchableSelect 
                               value=""
                               onChange={(val) => {
                                 if (val) {
                                   setForm(f => ({ ...f, sources: [...(f.sources || []), val] }))
                                 }
                               }}
                               options={addOptions}
                               style={{ borderColor: '#0ea5e9' }}
                               className="form-select"
                               placeholder={`-- Pilih Capex Sumber ${form.sources?.length > 0 ? `ke-${form.sources.length + 1}` : ''} --`}
                             />
                           )
                        })()}
                      </div>
                    )}

                    {requiredAmount > 0 && (
                      <div style={{ fontSize: '12px', color: totalSelectedBalance < requiredAmount ? '#ef4444' : '#10b981', marginTop: '4px', marginBottom: '12px', fontWeight: 500 }}>
                        Kebutuhan Dana: {fmtRupiah(requiredAmount)} | Terkumpul: {fmtRupiah(totalSelectedBalance)}
                        {totalSelectedBalance < requiredAmount ? ' (Masih Kurang)' : ' (Cukup)'}
                      </div>
                    )}
                    
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Wajib memilih sumber dana jika RKAP tahun ini sudah dikunci.</div>

                    <label className="form-label" htmlFor="f-nd" style={{ color: '#0284c7', marginTop: '12px' }}>ND Persetujuan <span className="required">*</span></label>
                    <input id="f-nd" type="text" className="form-input" value={form.nd_persetujuan || ''} onChange={set('nd_persetujuan')} placeholder="Contoh: ND-123/2026" style={{ borderColor: '#0ea5e9' }} />
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Kode/Nomor dokumen persetujuan wajib diisi.</div>
                  </>
                )
              })() : null}
            </div>
          </div>
          
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label" htmlFor="f-perubahan">Anggaran Perubahan (Rp)</label>
            <CurrencyInput id="f-perubahan" className="form-input" value={form.anggaran_perubahan} onChange={set('anggaran_perubahan')} />
            {isLocked && modal === 'create' && (form.sources || []).length > 0 && form.anggaran_perubahan > 0 && (
              <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px', fontWeight: 500 }}>
                ⚠️ Dana sebesar {fmtRupiah(form.anggaran_perubahan)} akan dipotong dari Capex Sumber.
              </div>
            )}
            {isLocked && modal === 'edit' && (form.sources || []).length > 0 && Number(form.anggaran_perubahan || 0) > Number(form.original_anggaran_perubahan || 0) && (
              <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px', fontWeight: 500 }}>
                ⚠️ Tambahan dana sebesar {fmtRupiah(Number(form.anggaran_perubahan) - Number(form.original_anggaran_perubahan))} akan dipotong dari Capex Sumber.
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
    </>
  )
}
