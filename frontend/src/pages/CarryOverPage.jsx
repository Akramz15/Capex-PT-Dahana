import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Download, UploadCloud, Hourglass, Search, Upload, Edit, Trash2, Filter } from 'lucide-react'
import { listCapex, getCapex, createCapex, updateCapex, deleteCapex, listRealization, createRealizationBulk, uploadCapexExcel, exportRealizationExcel } from '../api/capex'
import { useAuthStore } from '../store/authStore'
import { fmtRupiah, BULAN_NAMES, downloadBlob } from '../utils'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Modal from '../components/ui/Modal'
import { useDialog } from '../contexts/DialogContext'

export default function CarryOverPage({ tahun }) {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const dialog = useDialog()
  
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [modal, setModal] = useState(false) // false, 'edit', 'add'
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPic, setFilterPic] = useState('')
  
  // Modal states
  const [form, setForm] = useState({
    capex_id: null,
    tahun: new Date().getFullYear(),
    kode: '',
    daftar_capex: '',
    kategori: 'Tanah & Bangunan',
    pic: '',
    anggaran_rkap: 0,
    items: {}
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [resReal, resCapex] = await Promise.all([
        listRealization({ tahun, is_carryover: true }),
        listCapex({ tahun, is_carryover: true })
      ])
      
      const capexMap = {}
      resCapex.data.forEach(c => {
        capexMap[c.id] = {
          capex_id: c.id,
          kode: c.kode,
          daftar_capex: c.daftar_capex,
          kategori: c.kategori || 'Lain-lain',
          main_kategori: c.kode || 'INVESTASI RUTIN',
          anggaran_rkap: c.anggaran_rkap, // Used as Carryover N-1
          pic: c.pic || '',
          status: c.status || '',
          items: {}
        }
      })

      resReal.data.forEach(r => {
        if (!capexMap[r.capex_id]) return
        capexMap[r.capex_id].items[r.bulan] = {
          real: r.nilai_realisasi || 0,
          bast: r.nilai_bast || 0
        }
      })

      setData(Object.values(capexMap))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [tahun])

  useEffect(() => { fetchData() }, [fetchData])

  const processedData = useMemo(() => {
    let res = data;
    if (filterKategori) res = res.filter(d => d.kategori === filterKategori);
    if (filterStatus) res = res.filter(d => (d.status || '') === filterStatus);
    if (filterPic) res = res.filter(d => (d.pic || '') === filterPic);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      res = res.filter(d => 
        (d.daftar_capex || '').toLowerCase().includes(q) ||
        (d.kode || '').toLowerCase().includes(q) ||
        (d.pic || '').toLowerCase().includes(q) ||
        (d.kategori || '').toLowerCase().includes(q)
      );
    }
    return res;
  }, [data, filterKategori, filterStatus, filterPic, searchTerm]);

  const uniqueKategori = useMemo(() => Array.from(new Set(data.map(d => d.kategori).filter(Boolean))).sort(), [data])
  const uniqueStatus = useMemo(() => Array.from(new Set(data.map(d => d.status).filter(Boolean))).sort(), [data])
  const uniquePic = useMemo(() => Array.from(new Set(data.map(d => d.pic).filter(Boolean))).sort(), [data])

  const openEdit = (row) => {
    setForm({
      capex_id: row.capex_id,
      tahun,
      items: row.items
    })
    setModal('edit')
  }
  
  const openAdd = () => {
    setForm({
      tahun,
      kode: '',
      daftar_capex: '',
      kategori: 'Tanah & Bangunan',
      pic: '',
      anggaran_rkap: 0,
      items: {}
    })
    setModal('add')
  }

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      // NOTE: Make sure the export endpoint supports is_carryover or create a new one if necessary
      const res = await exportRealizationExcel({ tahun, is_carryover: true })
      downloadBlob(res.data, `CarryOver_${tahun}.xlsx`)
    } catch (e) {
      dialog.alert({ title: 'Error', message: 'Gagal mengunduh laporan excel.', variant: 'danger' })
    } finally {
      setExporting(false)
    }
  }

  const handleUploadExcel = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setUploading(true)
      await uploadCapexExcel(tahun, file, true) // is_carryover = true
      dialog.alert({ title: 'Sukses', message: 'Data Excel Master Carry Over berhasil diunggah.', variant: 'success' })
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

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        capex_id: form.capex_id,
        tahun: form.tahun,
        items: []
      }
      for (let i = 1; i <= 12; i++) {
        const val = form.items[i]
        if (val) {
           payload.items.push({
             bulan: i,
             nilai_realisasi: Number(val.real || 0),
             nilai_bast: Number(val.bast || 0)
           })
        }
      }
      
      await createRealizationBulk(payload)
      await fetchData()
      setModal(false)
    } catch (e) {
      dialog.alert({ title: 'Error', message: e.response?.data?.detail ?? 'Gagal menyimpan data.', variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const setBulan = (bulan, key, val) => {
    setForm(f => ({
      ...f,
      items: { ...f.items, [bulan]: { ...(f.items[bulan] || { real: 0, bast: 0 }), [key]: val } }
    }))
  }
  
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSaveAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createCapex({
        tahun: form.tahun,
        kode: form.kode,
        daftar_capex: form.daftar_capex,
        kategori: form.kategori,
        pic: form.pic,
        anggaran_rkap: Number(form.anggaran_rkap),
        is_carryover: true
      })
      await fetchData()
      setModal(false)
      dialog.alert({ title: 'Sukses', message: 'Carry Over berhasil ditambahkan.', variant: 'success' })
    } catch (e) {
      dialog.alert({ title: 'Error', message: e.response?.data?.detail ?? 'Gagal menyimpan.', variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    try {
      const confirm = await dialog.confirm({
        title: 'Hapus Carry Over',
        message: `Apakah Anda yakin ingin menghapus data Carry Over "${row.daftar_capex}"?`,
        confirmText: 'Hapus',
        cancelText: 'Batal',
        variant: 'danger'
      })
      
      if (!confirm) return
      
      setLoading(true)
      await deleteCapex(row.capex_id)
      dialog.alert({ title: 'Sukses', message: 'Carry Over berhasil dihapus.', variant: 'success' })
      fetchData()
    } catch (err) {
      dialog.alert({ title: 'Error', message: err?.response?.data?.detail || 'Terjadi kesalahan saat menghapus data.', variant: 'danger' })
    } finally {
      setLoading(false)
    }
  }

  const isInvalidBast = Object.values(form.items || {}).some(item => Number(item.bast || 0) > Number(item.real || 0))

  return (
    <>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="page-header-text">
          <h2 className="page-title">CARRY OVER {tahun}</h2>
          <p className="page-desc">Monitoring realisasi investasi Carry Over.</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: '8px' }}>
            
            {isAdmin && (
              <>
                <input 
                  type="file" 
                  id="upload-excel" 
                  accept=".xlsx, .xls" 
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

            <button className="btn btn-outline" onClick={handleExportExcel} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {exporting ? <><Hourglass size={18} /> Mengekspor...</> : <><Download size={18} /> Download Excel</>}
            </button>

            {isAdmin && (
              <button className="btn btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Tambah Carry Over
              </button>
            )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="table-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', backgroundColor: 'var(--clr-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--clr-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--clr-text-muted)', fontWeight: 500, fontSize: '13.5px', whiteSpace: 'nowrap' }}>
              <Filter size={16} /> Filter:
            </div>
            <select className="form-select" value={filterKategori} onChange={e => setFilterKategori(e.target.value)} style={{ flex: '1 1 180px', maxWidth: '260px', padding: '8px 32px 8px 12px', borderRadius: '6px', backgroundColor: '#fff', textOverflow: 'ellipsis' }}>
              <option value="">Semua Kategori</option>
              {uniqueKategori.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ flex: '1 1 180px', maxWidth: '260px', padding: '8px 32px 8px 12px', borderRadius: '6px', backgroundColor: '#fff', textOverflow: 'ellipsis' }}>
              <option value="">Semua Status</option>
              {uniqueStatus.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="form-select" value={filterPic} onChange={e => setFilterPic(e.target.value)} style={{ flex: '1 1 180px', maxWidth: '260px', padding: '8px 32px 8px 12px', borderRadius: '6px', backgroundColor: '#fff', textOverflow: 'ellipsis' }}>
              <option value="">Semua PIC</option>
              {uniquePic.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ position: 'relative', width: '100%', maxWidth: '100%' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }}>
              <Search size={16} />
            </div>
            <input
              type="text"
              className="form-input"
              placeholder="Cari data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', paddingRight: '16px', borderRadius: '6px', border: '1px solid var(--clr-border)', width: '100%' }}
            />
          </div>
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="table-card" style={{ backgroundColor: 'var(--clr-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--clr-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="table-scroll" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '68vh', position: 'relative', border: '1px solid var(--clr-border)', borderRadius: '4px' }}>
              <table className="data-table" style={{ borderCollapse: 'collapse', minWidth: '1600px', width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, borderBottom: '2px solid #cbd5e1' }}>
                  <tr style={{ backgroundColor: '#f8fafc', color: '#1e293b' }}>
                    <th rowSpan={2} style={{ position: 'sticky', left: 0, zIndex: 20, backgroundColor: '#f8fafc', width: '60px', minWidth: '60px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>NO</th>
                    <th rowSpan={2} style={{ position: 'sticky', left: '60px', zIndex: 20, backgroundColor: '#f8fafc', width: '350px', minWidth: '350px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>URAIAN</th>
                    <th rowSpan={2} style={{ minWidth: '150px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>Carryover N-1</th>
                    <th rowSpan={2} style={{ minWidth: '120px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>User</th>
                    {BULAN_NAMES.map(m => (
                      <th key={m} colSpan={2} style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 8px', textAlign: 'center' }}>{m}</th>
                    ))}
                    <th colSpan={2} style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'center' }}>TOTAL</th>
                    {isAdmin && <th rowSpan={2} style={{ minWidth: '80px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>Aksi</th>}
                  </tr>
                  <tr style={{ backgroundColor: '#f8fafc', color: '#1e293b' }}>
                    {BULAN_NAMES.map(m => (
                      <React.Fragment key={m + '-sub'}>
                        <th style={{ minWidth: '100px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '8px', textAlign: 'center', fontWeight: 'normal' }}>BA</th>
                        <th style={{ minWidth: '100px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '8px', textAlign: 'center', fontWeight: 'normal' }}>PO</th>
                      </React.Fragment>
                    ))}
                    <th style={{ minWidth: '120px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>By PO</th>
                    <th style={{ minWidth: '120px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>By BA</th>
                  </tr>
                </thead>
              <tbody>
                {processedData.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 31 : 30} style={{ textAlign: 'center', padding: '32px', color: '#64748b', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none' }}>
                      Belum ada data Carry Over untuk tahun {tahun}. Silakan tambahkan item Carry Over baru di Master Capex.
                    </td>
                  </tr>
                ) : (
                  // Dynamically group by Kategori to support custom sub-categories
                  // Grouping by Main Kategori (e.g. INVESTASI RUTIN), then by Sub Kategori (e.g. Tanah & Bangunan)
                  processedData.reduce((acc, current) => {
                    const mk = current.main_kategori;
                    if (!acc.includes(mk)) acc.push(mk);
                    return acc;
                  }, []).map((mk) => {
                    const mainData = processedData.filter(d => d.main_kategori === mk)
                    if (mainData.length === 0) return null

                    // Calculate Main Group Totals
                    const mainSumCarryover = mainData.reduce((acc, r) => acc + (r.anggaran_rkap || 0), 0)
                    let mainTotalRealSum = 0
                    let mainTotalBastSum = 0
                    const mainBulanSums = {}
                    for (let i = 1; i <= 12; i++) mainBulanSums[i] = { real: 0, bast: 0 }
                    
                    mainData.forEach(r => {
                      for (let i = 1; i <= 12; i++) {
                        mainBulanSums[i].real += (r.items[i]?.real || 0)
                        mainBulanSums[i].bast += (r.items[i]?.bast || 0)
                      }
                    })
                    Object.values(mainBulanSums).forEach(s => {
                      mainTotalRealSum += s.real
                      mainTotalBastSum += s.bast
                    })

                    return (
                      <React.Fragment key={mk}>
                        {/* MAIN KATEGORI HEADER */}
                        <tr style={{ backgroundColor: '#002060', color: '#fff', fontWeight: 'bold' }}>
                          <td style={{ position: 'sticky', left: 0, zIndex: 5, backgroundColor: '#002060', width: '60px', minWidth: '60px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px' }}></td>
                          <td style={{ position: 'sticky', left: '60px', zIndex: 5, backgroundColor: '#002060', width: '350px', minWidth: '350px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', color: 'white' }}>{mk.toUpperCase()}</td>
                          <td colSpan={isAdmin ? 29 : 28} style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px' }}></td>
                        </tr>
                        
                        {/* SUB KATEGORI LOOP */}
                        {mainData.reduce((subAcc, current) => {
                          const kat = current.kategori || 'Lain-lain';
                          if (!subAcc.includes(kat)) subAcc.push(kat);
                          return subAcc;
                        }, []).map((kat) => {
                          const groupData = mainData.filter(d => d.kategori === kat)
                          if (groupData.length === 0) return null
                          
                          // Calculate Sub Group Totals
                          const groupSumCarryover = groupData.reduce((acc, r) => acc + (r.anggaran_rkap || 0), 0)
                          let groupTotalRealSum = 0
                          let groupTotalBastSum = 0
                          const groupBulanSums = {}
                          for (let i = 1; i <= 12; i++) groupBulanSums[i] = { real: 0, bast: 0 }
                          
                          groupData.forEach(r => {
                            for (let i = 1; i <= 12; i++) {
                              groupBulanSums[i].real += (r.items[i]?.real || 0)
                              groupBulanSums[i].bast += (r.items[i]?.bast || 0)
                            }
                          })
                          Object.values(groupBulanSums).forEach(s => {
                            groupTotalRealSum += s.real
                            groupTotalBastSum += s.bast
                          })
                          
                          return (
                            <React.Fragment key={`${mk}-${kat}`}>
                              {/* SUB KATEGORI HEADER */}
                              <tr style={{ backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 'bold' }}>
                                <td style={{ position: 'sticky', left: 0, zIndex: 5, backgroundColor: '#f1f5f9', width: '60px', minWidth: '60px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '10px 16px' }}></td>
                                <td style={{ position: 'sticky', left: '60px', zIndex: 5, backgroundColor: '#f1f5f9', width: '350px', minWidth: '350px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '10px 16px' }}>{kat}</td>
                                <td colSpan={isAdmin ? 29 : 28} style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '10px 16px' }}></td>
                              </tr>
                              
                              {/* ITEMS */}
                              {groupData.map((row, idx) => {
                                let rowTotalReal = 0
                                let rowTotalBast = 0
                                for (let i = 1; i <= 12; i++) {
                                  rowTotalReal += (row.items[i]?.real || 0)
                                  rowTotalBast += (row.items[i]?.bast || 0)
                                }

                                return (
                                  <tr key={row.capex_id} className="table-row">
                                    <td style={{ position: 'sticky', left: 0, zIndex: 5, backgroundColor: 'var(--clr-surface)', width: '60px', minWidth: '60px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'center' }}>{idx + 1}</td>
                                    <td style={{ position: 'sticky', left: '60px', zIndex: 5, backgroundColor: 'var(--clr-surface)', width: '350px', minWidth: '350px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px' }}>{row.daftar_capex}</td>
                                    <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right' }}>
                                      {row.anggaran_rkap > 0 ? <span className="rupiah">{fmtRupiah(row.anggaran_rkap)}</span> : '-'}
                                    </td>
                                    <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'center' }}>{row.pic || '-'}</td>
                                    
                                    {BULAN_NAMES.flatMap((_, i) => {
                                      const val_po = row.items[i+1]?.real || 0
                                      const val_bast = row.items[i+1]?.bast || 0
                                      return [
                                        <td key={`ba-${i}`} style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right' }}>
                                          {val_bast > 0 ? <span className="rupiah">{fmtRupiah(val_bast)}</span> : '-'}
                                        </td>,
                                        <td key={`po-${i}`} style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right' }}>
                                          {val_po > 0 ? <span className="rupiah">{fmtRupiah(val_po)}</span> : '-'}
                                        </td>
                                      ]
                                    })}
                                    
                                    <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right', fontWeight: 'bold' }}>
                                      {rowTotalReal > 0 ? <span className="rupiah" style={{ color: '#002060' }}>{fmtRupiah(rowTotalReal)}</span> : '-'}
                                    </td>
                                    <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right', fontWeight: 'bold' }}>
                                      {rowTotalBast > 0 ? <span className="rupiah" style={{ color: '#002060' }}>{fmtRupiah(rowTotalBast)}</span> : '-'}
                                    </td>
                                    
                                    {isAdmin && (
                                      <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                          <button 
                                            className="btn btn-outline" 
                                            style={{ padding: '6px 12px', borderColor: '#e2e8f0', color: '#64748b' }} 
                                            onClick={() => openEdit(row)}
                                            title="Edit Realisasi Carry Over"
                                          >
                                            <Edit size={16} />
                                          </button>
                                          <button 
                                            className="btn btn-outline" 
                                            style={{ padding: '6px 12px', borderColor: '#fee2e2', color: '#ef4444', backgroundColor: '#fef2f2' }} 
                                            onClick={() => handleDelete(row)}
                                            title="Hapus Carry Over"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                )
                              })}
                              
                              {/* SUB KATEGORI FOOTER */}
                              <tr style={{ backgroundColor: '#fef3c7', fontWeight: 'bold', color: '#92400e' }}>
                                <td style={{ position: 'sticky', left: 0, zIndex: 5, backgroundColor: '#fef3c7', width: '60px', minWidth: '60px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px' }}></td>
                                <td style={{ position: 'sticky', left: '60px', zIndex: 5, backgroundColor: '#fef3c7', width: '350px', minWidth: '350px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'left' }}>Jumlah {kat}</td>
                                <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right' }}>
                                  {groupSumCarryover > 0 ? <span className="rupiah">{fmtRupiah(groupSumCarryover)}</span> : '-'}
                                </td>
                                <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px' }}></td>
                                {BULAN_NAMES.flatMap((_, i) => {
                                  const sumPo = groupBulanSums[i+1]?.real || 0
                                  const sumBa = groupBulanSums[i+1]?.bast || 0
                                  return [
                                    <td key={`sub-ba-${i}`} style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right' }}>
                                      {sumBa > 0 ? <span className="rupiah">{fmtRupiah(sumBa)}</span> : '-'}
                                    </td>,
                                    <td key={`sub-po-${i}`} style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right' }}>
                                      {sumPo > 0 ? <span className="rupiah">{fmtRupiah(sumPo)}</span> : '-'}
                                    </td>
                                  ]
                                })}
                                <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right' }}>
                                  {groupTotalRealSum > 0 ? <span className="rupiah">{fmtRupiah(groupTotalRealSum)}</span> : '-'}
                                </td>
                                <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right' }}>
                                  {groupTotalBastSum > 0 ? <span className="rupiah">{fmtRupiah(groupTotalBastSum)}</span> : '-'}
                                </td>
                                {isAdmin && <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none' }}></td>}
                              </tr>
                            </React.Fragment>
                          )
                        })}
                        
                        {/* MAIN KATEGORI FOOTER */}
                        <tr style={{ backgroundColor: '#002060', fontWeight: 'bold', color: '#fff' }}>
                          <td colSpan={2} style={{ position: 'sticky', left: 0, zIndex: 6, backgroundColor: '#002060', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'center', color: 'white' }}>TOTAL {mk.toUpperCase()}</td>
                          <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right', color: 'white' }}>
                            {mainSumCarryover > 0 ? <span className="rupiah">{fmtRupiah(mainSumCarryover)}</span> : '-'}
                          </td>
                          <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'center', color: 'white' }}>-</td>
                          {BULAN_NAMES.flatMap((_, i) => {
                            const sumBa = mainBulanSums[i+1]?.bast || 0
                            const sumPo = mainBulanSums[i+1]?.real || 0
                            return [
                              <td key={`main-ba-${i}`} style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right', color: 'white' }}>
                                {sumBa > 0 ? <span className="rupiah">{fmtRupiah(sumBa)}</span> : '-'}
                              </td>,
                              <td key={`main-po-${i}`} style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right', color: 'white' }}>
                                {sumPo > 0 ? <span className="rupiah">{fmtRupiah(sumPo)}</span> : '-'}
                              </td>
                            ]
                          })}
                          <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right', color: 'white' }}>
                            {mainTotalRealSum > 0 ? <span className="rupiah">{fmtRupiah(mainTotalRealSum)}</span> : '-'}
                          </td>
                          <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right', color: 'white' }}>
                            {mainTotalBastSum > 0 ? <span className="rupiah">{fmtRupiah(mainTotalBastSum)}</span> : '-'}
                          </td>
                          {isAdmin && <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none' }}></td>}
                        </tr>
                      </React.Fragment>
                    )
                  })
                )}
                
                {/* Grand Total */}
                {data.length > 0 && (() => {
                   const grandCarryover = data.reduce((acc, r) => acc + (r.anggaran_rkap || 0), 0)
                   let grandReal = 0
                   let grandBast = 0
                   const grandBulan = {}
                   for (let i = 1; i <= 12; i++) {
                     grandBulan[i] = { real: 0, bast: 0 }
                   }
                   
                   data.forEach(row => {
                     for (let i = 1; i <= 12; i++) {
                       grandBulan[i].real += (row.items[i]?.real || 0)
                       grandBulan[i].bast += (row.items[i]?.bast || 0)
                     }
                   })

                   Object.values(grandBulan).forEach(s => {
                     grandReal += s.real
                     grandBast += s.bast
                   })
                   
                   return (
                      <tr style={{ backgroundColor: '#002060', color: 'white', fontWeight: 'bold' }}>
                        <td style={{ position: 'sticky', left: 0, zIndex: 6, backgroundColor: '#002060', width: '60px', minWidth: '60px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'center', color: 'white' }}></td>
                        <td style={{ position: 'sticky', left: '60px', zIndex: 6, backgroundColor: '#002060', width: '350px', minWidth: '350px', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'center', color: 'white' }}>GRAND TOTAL INVESTASI CARRY OVER</td>
                        <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right', color: 'white' }}>
                          <span className="rupiah">{fmtRupiah(grandCarryover)}</span>
                        </td>
                        <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'center', color: 'white' }}>-</td>
                        {BULAN_NAMES.flatMap((_, i) => {
                            const val_po = grandBulan[i+1]?.real || 0
                            const val_bast = grandBulan[i+1]?.bast || 0
                            return [
                              <td key={`gt-ba-${i}`} style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right', color: 'white' }}>
                                {val_bast > 0 ? <span className="rupiah">{fmtRupiah(val_bast)}</span> : '-'}
                              </td>,
                              <td key={`gt-po-${i}`} style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right', color: 'white' }}>
                                {val_po > 0 ? <span className="rupiah">{fmtRupiah(val_po)}</span> : '-'}
                              </td>
                            ]
                        })}
                        <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right', color: 'white' }}>
                          <span className="rupiah">{fmtRupiah(grandReal)}</span>
                        </td>
                        <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', padding: '12px 16px', textAlign: 'right', color: 'white' }}>
                          <span className="rupiah">{fmtRupiah(grandBast)}</span>
                        </td>
                        {isAdmin && <td style={{ boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none' }}></td>}
                      </tr>
                   )
                })()}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {modal === 'edit' && (
        <Modal onClose={() => setModal(false)} title="Edit Realisasi Carry Over">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {isInvalidBast && (
              <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', border: '1px solid #f87171', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ marginTop: '2px' }}>⚠️</div>
                <div style={{ fontSize: '0.875rem', lineHeight: '1.4' }}>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>Peringatan BAST &gt; PO!</strong>
                  Nilai BAST tidak boleh lebih besar dari nilai PO pada bulan yang sama. Mohon periksa kembali baris yang berwarna merah.
                </div>
              </div>
            )}

            <div style={{ overflowX: 'auto', boxShadow: 'inset 0 0 0 1px var(--clr-border)', border: 'none', borderRadius: '6px' }}>
              <table className="table" style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--clr-border)' }}>Bulan</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--clr-border)' }}>Nilai BA (BAST) (Rp)</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--clr-border)' }}>Nilai PO (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {BULAN_NAMES.map((bln, i) => {
                    const m = i + 1
                    const it = form.items[m] || {}
                    
                    const r = Number(it.real || 0)
                    const b = Number(it.bast || 0)
                    const errBast = b > r

                    return (
                      <tr key={m} style={{ backgroundColor: errBast ? '#fff5f5' : 'transparent' }}>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--clr-border)', fontWeight: 500 }}>{bln}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--clr-border)' }}>
                          <input 
                            type="number" 
                            className="input-field" 
                            value={it.bast || ''} 
                            onChange={(e) => setBulan(m, 'bast', e.target.value)}
                            placeholder="0"
                            min="0"
                            style={{ borderColor: errBast ? '#ef4444' : undefined, backgroundColor: errBast ? '#fef2f2' : undefined }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--clr-border)' }}>
                          <input 
                            type="number" 
                            className="input-field" 
                            value={it.real || ''} 
                            onChange={(e) => setBulan(m, 'real', e.target.value)}
                            placeholder="0"
                            min="0"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || isInvalidBast}>
                {saving ? 'Menyimpan...' : 'Simpan Realisasi'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'add' && (
        <Modal onClose={() => setModal(false)} title="Tambah Item Carry Over">
          <form onSubmit={handleSaveAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Kode <span className="text-danger">*</span></label>
              <select className="form-select" value={form.kode} onChange={set('kode')} required>
                <option value="">-- Pilih Kode Grup --</option>
                <option value="INVESTASI RUTIN">INVESTASI RUTIN</option>
                <option value="INVESTASI PENGEMBANGAN">INVESTASI PENGEMBANGAN</option>
              </select>
            </div>
            <div className="form-group">
              <label>Kategori <span className="text-danger">*</span></label>
              <select className="form-select" value={form.kategori} onChange={set('kategori')} required>
                <option value="Tanah & Bangunan">Tanah & Bangunan</option>
                <option value="Peralatan Pabrik">Peralatan Pabrik</option>
                <option value="Alat Berat">Alat Berat</option>
                <option value="Kendaraan">Kendaraan</option>
                <option value="Peralatan Proyek">Peralatan Proyek</option>
                <option value="Peralatan Kantor">Peralatan Kantor</option>
                <option value="Peralatan TI">Peralatan TI</option>
                <option value="Lain-lain">Lain-lain</option>
              </select>
            </div>
            <div className="form-group">
              <label>Uraian / Daftar Capex <span className="text-danger">*</span></label>
              <textarea className="form-input" rows={2} value={form.daftar_capex} onChange={set('daftar_capex')} required />
            </div>
            <div className="form-group">
              <label>PIC</label>
              <input type="text" className="form-input" value={form.pic} onChange={set('pic')} />
            </div>
            <div className="form-group">
              <label>Carryover N-1 (Rp)</label>
              <input type="number" className="form-input" value={form.anggaran_rkap} onChange={set('anggaran_rkap')} min="0" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(false)} disabled={saving}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
