import React, { useEffect, useState, useCallback } from 'react'
import { listRealization, listCapex, createRealizationBulk, deleteRealization, uploadRealizationExcel, exportRealizationExcel } from '../api/capex'
import { getRkapLockStatus } from '../api/settings'
import { useAuthStore } from '../store/authStore'
import ComplexDataTable from '../components/ui/ComplexDataTable'
import Modal from '../components/ui/Modal'
import { useDialog } from '../contexts/DialogContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Badge from '../components/ui/Badge'
import CurrencyInput from '../components/ui/CurrencyInput'
import StatusDistributionChart from '../components/charts/StatusDistributionChart'
import LastUpdatedInfo from '../components/ui/LastUpdatedInfo'
import { fmtRupiah, fmtShort, downloadBlob } from '../utils'
import { UploadCloud, Download, Hourglass } from 'lucide-react'


const BULAN_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const STATUS_OPTIONS = ['PO', 'Tender', 'Kajian', 'BAST', 'Lainnya', 'Rencana']

const EMPTY_FORM = {
  capex_id: '',
  tahun: 2026,
  status: 'Rencana',
  keterangan: '',
  pic: '',
  items: {}
}

export default function RealizationPage({ tahun }) {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const dialog = useDialog()

  const [data, setData] = useState([])
  const [capexList, setCapexList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [currentFilters, setCurrentFilters] = useState({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [resReal, resCapex] = await Promise.all([
        listRealization({ tahun }),
        listCapex({ tahun })
      ])
      
      setCapexList(resCapex.data)

      // Group realization data by capex
      const capexMap = {}
      resCapex.data.forEach(c => {
        capexMap[c.id] = {
          capex_id: c.id,
          kode: c.kode || '-',
          daftar_capex: c.daftar_capex,
          kategori: c.kategori || 'Lain-lain',
          anggaran_rkap: c.anggaran_rkap,
          anggaran_perubahan: c.anggaran_perubahan,
          total_rkap: 0,
          total_real: 0,
          total_bast: 0,
          status: '',
          keterangan: '',
          pic: c.pic || '',
          status_month: 0,
          items_raw: []
        }
      })

      resReal.data.forEach(r => {
        if (!capexMap[r.capex_id]) return
        const c = capexMap[r.capex_id]
        c[`b${r.bulan}_rkap`] = r.nilai_rkap
        c[`b${r.bulan}_real`] = r.nilai_realisasi
        c[`b${r.bulan}_bast`] = r.nilai_bast
        c.total_rkap += r.nilai_rkap || 0
        c.total_real += r.nilai_realisasi || 0
        c.total_bast += r.nilai_bast || 0
        
        // Take the latest status based on month
        if (r.status && r.bulan > c.status_month) {
          c.status = r.status
          c.status_month = r.bulan
        }
        
        // Take keterangan and pic if they exist (last encountered or similar to old logic)
        if (r.keterangan) c.keterangan = r.keterangan
        if (r.pic) c.pic = r.pic
        
        c.items_raw.push(r)
      })

      setData(Object.values(capexMap))
    } finally {
      setLoading(false)
    }
  }, [tahun])

  useEffect(() => { fetchData() }, [fetchData])

  const openEdit = (row) => {
    const items = {}
    // Pre-fill existing months
    row.items_raw.forEach(r => {
      items[r.bulan] = { rkap: r.nilai_rkap, real: r.nilai_realisasi, bast: r.nilai_bast }
    })
    
    setForm({
      capex_id: row.capex_id,
      tahun,
      status: row.status || 'Rencana',
      keterangan: row.keterangan || '',
      pic: row.pic || '',
      items
    })
    setModal(true)
  }

  const handleDelete = (row) => {
    dialog.confirm({
      title: 'Konfirmasi Hapus Realisasi',
      message: `Hapus seluruh data realisasi untuk "${row.daftar_capex}" tahun ${tahun}?`,
      confirmText: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        try {
          // Find all realization IDs for this capex and year
          const idsToDelete = row.items_raw.map(r => r.id)
          await Promise.all(idsToDelete.map(id => deleteRealization(id)))
          await fetchData()
        } catch {
          dialog.alert({ title: 'Error', message: 'Gagal menghapus data.', variant: 'danger' })
        }
      }
    })
  }

  const handleUploadExcel = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setUploading(true)
      await uploadRealizationExcel(tahun, file)
      dialog.alert({ title: 'Sukses', message: 'Data Realisasi berhasil diunggah.', variant: 'success' })
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
      const res = await exportRealizationExcel({ tahun, ...currentFilters })
      downloadBlob(res.data, `Realisasi_${tahun}.xlsx`)
    } catch (e) {
      dialog.alert({ title: 'Error', message: 'Gagal mengunduh laporan excel.', variant: 'danger' })
    } finally {
      setExporting(false)
    }
  }

  const closeModal = () => { setModal(false); setForm(EMPTY_FORM) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        capex_id: form.capex_id,
        tahun: form.tahun,
        status: form.status,
        keterangan: form.keterangan,
        pic: form.pic,
        items: []
      }
      
      for (let i = 1; i <= 12; i++) {
        const item = form.items[i]
        if (item) {
          payload.items.push({
            bulan: i,
            nilai_rkap: Number(item.rkap || 0),
            nilai_realisasi: Number(item.real || 0),
            nilai_bast: Number(item.bast || 0)
          })
        }
      }
      
      await createRealizationBulk(payload)
      await fetchData()
      closeModal()
    } catch (e) {
      dialog.alert({ title: 'Error', message: e.response?.data?.detail ?? 'Gagal menyimpan data.', variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  
  const setBulan = (bulan, key, val) => {
    setForm(f => ({
      ...f,
      items: {
        ...f.items,
        [bulan]: {
          ...(f.items[bulan] || { rkap: 0, real: 0, bast: 0 }),
          [key]: val
        }
      }
    }))
  }

  const renderGroupHeader = (groupName, groupData) => {
    let totalAnggaranRkap = 0;
    let totalAnggaranPerubahan = 0;
    let totalRkapSum = 0;
    let totalRealSum = 0;
    let totalBastSum = 0;

    groupData.forEach(r => {
      totalAnggaranRkap += r.anggaran_rkap || 0;
      totalAnggaranPerubahan += r.anggaran_perubahan || 0;
      totalRkapSum += r.total_rkap || 0;
      totalRealSum += r.total_real || 0;
      totalBastSum += r.total_bast || 0;
    });

    return (
      <tr style={{ backgroundColor: '#002060', color: 'white', fontWeight: 'bold' }} className="group-header-row">
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'center' }}></td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', textAlign: 'left', color: 'white' }}>{groupName}</td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'right' }}>
          {totalAnggaranRkap > 0 ? <span className="rupiah">{fmtRupiah(totalAnggaranRkap)}</span> : '-'}
        </td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'right' }}>
          {totalAnggaranPerubahan > 0 ? <span className="rupiah">{fmtRupiah(totalAnggaranPerubahan)}</span> : '-'}
        </td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white' }}></td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white' }}></td>
        {BULAN_NAMES.flatMap((_, i) => {
          const sumBlnReal = groupData.reduce((acc, r) => acc + (r[`b${i+1}_real`] || 0), 0);
          const sumBlnBast = groupData.reduce((acc, r) => acc + (r[`b${i+1}_bast`] || 0), 0);
          return [
            <td key={`gh-real-${i}`} style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'right' }}>
              {sumBlnReal > 0 ? <span className="rupiah">{fmtRupiah(sumBlnReal)}</span> : '-'}
            </td>,
            <td key={`gh-bast-${i}`} style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'right' }}>
              {sumBlnBast > 0 ? <span className="rupiah">{fmtRupiah(sumBlnBast)}</span> : '-'}
            </td>
          ];
        })}
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'right' }}>
          {totalRealSum > 0 ? <span className="rupiah">{fmtRupiah(totalRealSum)}</span> : '-'}
        </td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white', textAlign: 'right' }}>
          {totalBastSum > 0 ? <span className="rupiah">{fmtRupiah(totalBastSum)}</span> : '-'}
        </td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', color: 'white' }}></td>
        {isAdmin && <td style={{ border: '1px solid var(--clr-border)' }}></td>}
      </tr>
    );
  };

  const columns = [
    { header: 'No', render: (_, i) => i + 1, sticky: true, stickyLeft: '0px', width: '60px' },
    { header: 'Daftar Capex', accessor: 'daftar_capex', sticky: true, stickyLeft: '59px', width: '250px' },
    { header: 'Anggaran', children: [
      { header: 'RKAP', render: (r) => <span className="rupiah">{fmtRupiah(r.anggaran_rkap)}</span> },
      { header: 'Perubahan', render: (r) => <span className="rupiah">{fmtRupiah(r.anggaran_perubahan)}</span> }
    ]},
    { header: 'Status', accessor: 'status' },
    { header: 'Keterangan', accessor: 'keterangan' },
    ...BULAN_NAMES.map((bln, i) => ({
      header: bln,
      children: [
        { header: 'PO', render: (r) => <span className="rupiah">{fmtRupiah(r[`b${i+1}_real`])}</span> },
        { header: 'BAST', render: (r) => <span className="rupiah">{fmtRupiah(r[`b${i+1}_bast`])}</span> }
      ]
    })),
    { header: 'Total', children: [
      { header: 'PO', render: (r) => <span className="rupiah fw-bold">{fmtRupiah(r.total_real)}</span> },
      { header: 'BAST', render: (r) => <span className="rupiah fw-bold">{fmtRupiah(r.total_bast)}</span> }
    ]},
    { header: 'PIC', accessor: 'pic' }
  ]

  const renderFooter = (filteredData) => {
    const sumAnggaranRKAP = filteredData.reduce((acc, r) => acc + (r.anggaran_rkap || 0), 0)
    const sumAnggaranPerub = filteredData.reduce((acc, r) => acc + (r.anggaran_perubahan || 0), 0)
    const sumTotalRKAP = filteredData.reduce((acc, r) => acc + (r.total_rkap || 0), 0)
    const sumTotalReal = filteredData.reduce((acc, r) => acc + (r.total_real || 0), 0)
    const sumTotalBast = filteredData.reduce((acc, r) => acc + (r.total_bast || 0), 0)
    
    return (
      <tr style={{ backgroundColor: '#001a4d', color: 'white', fontWeight: 'bold' }}>
        <td colSpan={2} style={{ textAlign: 'center', border: '1px solid var(--clr-border)', padding: '12px 16px' }}>Total</td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px' }}><span className="rupiah">{fmtRupiah(sumAnggaranRKAP)}</span></td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px' }}><span className="rupiah">{fmtRupiah(sumAnggaranPerub)}</span></td>
        <td colSpan={2} style={{ border: '1px solid var(--clr-border)', padding: '12px 16px' }}></td>
        {BULAN_NAMES.flatMap((_, i) => {
          const sumBlnReal = filteredData.reduce((acc, r) => acc + (r[`b${i+1}_real`] || 0), 0)
          const sumBlnBast = filteredData.reduce((acc, r) => acc + (r[`b${i+1}_bast`] || 0), 0)
          return [
            <td key={`ft-real-${i}`} style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', textAlign: 'right' }}><span className="rupiah">{fmtRupiah(sumBlnReal)}</span></td>,
            <td key={`ft-bast-${i}`} style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', textAlign: 'right' }}><span className="rupiah">{fmtRupiah(sumBlnBast)}</span></td>
          ]
        })}
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', textAlign: 'right' }}><span className="rupiah">{fmtRupiah(sumTotalReal)}</span></td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px', textAlign: 'right' }}><span className="rupiah">{fmtRupiah(sumTotalBast)}</span></td>
        <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px' }}></td>
        {isAdmin && <td style={{ border: '1px solid var(--clr-border)', padding: '12px 16px' }}></td>}
      </tr>
    )
  }
  const isInvalidBast = Object.values(form.items || {}).some(item => Number(item.bast || 0) > Number(item.real || 0));

  return (
    <>
      <div className="page-header">
        <div className="page-header-text">
          <h2 className="page-title">Realisasi {tahun}</h2>
          <p className="page-desc" style={{ marginBottom: '8px' }}>Log realisasi investasi bulanan setiap item Capex.</p>
          <LastUpdatedInfo moduleName="Realisasi" />
        </div>
        {isAdmin && (
          <div className="page-header-actions" style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline" onClick={handleExportExcel} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {exporting ? <><Hourglass size={18} /> Mengekspor...</> : <><Download size={18} /> Download Excel</>}
            </button>

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
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? <LoadingSpinner /> : (
          <>
            {(() => {
              // Calculate status distribution for the chart at the top
              // De-duplicate by capex_id so each project's budget is only counted once
              const seenCapex = new Map()
              data.forEach(r => {
                if (!seenCapex.has(r.capex_id)) {
                  seenCapex.set(r.capex_id, {
                    rkap: r.anggaran_rkap || 0,
                    perubahan: r.anggaran_perubahan || 0
                  })
                }
              })
              let totalRKAP = 0
              let totalPerubahan = 0
              for (const vals of seenCapex.values()) {
                totalRKAP += vals.rkap
                totalPerubahan += vals.perubahan
              }
              const sumRKAP = totalPerubahan > 0 ? totalPerubahan : totalRKAP
              
              const statSums = { PO: 0, Kajian: 0, Tender: 0, BAST: 0, Lainnya: 0 }
              data.forEach(r => {
                let st = r.status || ''
                if (st === 'BA/ADK' || st === 'BAADK') st = 'BAST'
                if (statSums[st] !== undefined) {
                  statSums[st] += (r.total_real || 0)
                } else {
                  statSums.Lainnya += (r.total_real || 0)
                }
              })
              const subtotal = statSums.PO + statSums.Kajian + statSums.Tender + statSums.BAST + statSums.Lainnya
              const sisa = sumRKAP - subtotal
              
              return data.length > 0 ? (
                <div className="section mb-6" style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '24px', border: '1px solid var(--clr-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b' }}>Distribusi Status Realisasi (Berdasarkan Nilai Aktual)</h3>
                  <StatusDistributionChart 
                    data={statSums} 
                    totalRKAP={sumRKAP} 
                    totalReal={subtotal} 
                    sisa={sisa} 
                  />
                </div>
              ) : null
            })()}

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
              renderFooter={renderFooter}
              groupBy="kategori"
              renderGroupHeader={renderGroupHeader}
              onFilterChange={setCurrentFilters}
            />
          </>
        )}
      </div>

      {modal && (
        <Modal
          title={'Update Realisasi (12 Bulan)'}
          onClose={closeModal}
          onSubmit={handleSave}
          submitLoading={saving}
          submitDisabled={isInvalidBast}
          width="800px"
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
              <label className="form-label" htmlFor="f-status-r">Status Keseluruhan</label>
              <select id="f-status-r" className="form-select" value={form.status} onChange={setF('status')}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="f-pic-r">PIC</label>
              <input list="pic-options" id="f-pic-r" type="text" className="form-input" value={form.pic} onChange={setF('pic')} placeholder="Pilih atau ketik PIC" />
              <datalist id="pic-options">
                {Array.from(new Set(data.map(d => d.pic).filter(Boolean))).sort().map(p => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="f-ket-r">Keterangan Keseluruhan</label>
            <textarea id="f-ket-r" className="form-textarea" value={form.keterangan} onChange={setF('keterangan')} />
          </div>

          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Isian Realisasi Bulanan</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
              {BULAN_NAMES.map((bulan, idx) => {
                const b = idx + 1
                return (
                  <div key={b} style={{ border: `1px solid ${Number(form.items[b]?.bast || 0) > Number(form.items[b]?.real || 0) ? '#ef4444' : 'var(--clr-border)'}`, padding: '10px', borderRadius: '4px', backgroundColor: Number(form.items[b]?.bast || 0) > Number(form.items[b]?.real || 0) ? '#fef2f2' : 'transparent' }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '13px', textAlign: 'center', color: Number(form.items[b]?.bast || 0) > Number(form.items[b]?.real || 0) ? '#ef4444' : 'inherit' }}>{bulan}</div>
                    
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Realisasi PO</div>
                    <CurrencyInput className="form-input" style={{ padding: '6px', fontSize: '13px', textAlign: 'right' }} 
                      value={form.items[b]?.real ?? ''} 
                      onChange={(e) => setBulan(b, 'real', e.target.value)} 
                      placeholder="Rp 0" />
                      
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '8px', marginBottom: '4px' }}>Realisasi BAST</div>
                    <CurrencyInput className="form-input" style={{ padding: '6px', fontSize: '13px', textAlign: 'right', borderColor: Number(form.items[b]?.bast || 0) > Number(form.items[b]?.real || 0) ? '#ef4444' : '' }} 
                      value={form.items[b]?.bast ?? ''} 
                      onChange={(e) => setBulan(b, 'bast', e.target.value)} 
                      placeholder="Rp 0" />
                      
                    {Number(form.items[b]?.bast || 0) > Number(form.items[b]?.real || 0) && (
                      <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px', textAlign: 'center' }}>
                        BAST melebihi PO
                      </div>
                    )}
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
