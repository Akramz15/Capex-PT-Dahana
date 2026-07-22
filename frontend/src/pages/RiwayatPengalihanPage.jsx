import { useEffect, useState, useCallback } from 'react'
import { getAuditLogs, exportAuditLogsExcel, undoReallocation } from '../api/capex'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { fmtRupiah, downloadBlob } from '../utils'
import { Download, RotateCcw } from 'lucide-react'
import { useDialog } from '../contexts/DialogContext'

export default function RiwayatPengalihanPage({ tahun }) {
  const [loading, setLoading] = useState(true)
  const [auditLogs, setAuditLogs] = useState([])
  const [exporting, setExporting] = useState(false)
  const dialog = useDialog()

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAuditLogs(tahun)
      setAuditLogs(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [tahun])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleUndo = (log) => {
    dialog.confirm({
      title: 'Konfirmasi Undo',
      message: `Anda yakin ingin membatalkan pengalihan sebesar ${fmtRupiah(log.anggaran)} ke ${log.target_capex_name}? Saldo akan otomatis ditarik dan dikembalikan ke ${log.source_capex_name}.`,
      confirmText: 'Ya, Batalkan',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await undoReallocation(log.id)
          dialog.alert({ title: 'Sukses', message: 'Pengalihan berhasil dibatalkan.', variant: 'success' })
          fetchLogs()
        } catch (e) {
          dialog.alert({ title: 'Error', message: e.response?.data?.detail ?? 'Gagal membatalkan pengalihan.', variant: 'danger' })
        }
      }
    })
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-header-text">
          <h2 className="page-title">Riwayat Pengalihan {tahun}</h2>
          <p className="page-desc">Log riwayat pengalihan (pergeseran) anggaran antar Capex.</p>
        </div>
        <button 
          className="btn btn-outline" 
          onClick={async () => {
            setExporting(true)
            try {
              const res = await exportAuditLogsExcel({ tahun })
              downloadBlob(res.data, `Riwayat_Pengalihan_${tahun}.xlsx`)
            } catch (err) {
              console.error(err)
              alert('Gagal mengekspor riwayat pengalihan.')
            } finally {
              setExporting(false)
            }
          }}
          disabled={exporting || auditLogs.length === 0}
        >
          <Download size={16} style={{ marginRight: '8px' }} />
          {exporting ? 'Mengekspor...' : 'Download Excel'}
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {loading ? <LoadingSpinner /> : (
          <div className="table-scroll" style={{ overflowX: 'auto', paddingBottom: '12px' }}>
            {auditLogs.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Belum ada riwayat pengalihan anggaran di tahun {tahun}.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', border: '1px solid #e2e8f0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', color: '#334155', borderBottom: '2px solid #cbd5e1', textAlign: 'center' }}>
                    <th style={{ padding: '12px 16px', width: '50px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>No</th>
                    <th style={{ padding: '12px 16px', minWidth: '200px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>Capex Baru</th>
                    <th style={{ padding: '12px 16px', minWidth: '150px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>Nilai</th>
                    <th style={{ padding: '12px 16px', minWidth: '200px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>Sumber Anggaran (Asal)</th>
                    <th style={{ padding: '12px 16px', minWidth: '150px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>Nilai Awal</th>
                    <th style={{ padding: '12px 16px', minWidth: '150px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>Sisa Anggaran (Asal)</th>
                    <th style={{ padding: '12px 16px', minWidth: '150px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>ND Persetujuan</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>User</th>
                    <th style={{ padding: '12px 16px', minWidth: '120px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>Waktu</th>
                    <th style={{ padding: '12px 16px', minWidth: '80px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, index) => (
                    <tr key={log.id} style={{ 
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc', 
                      transition: 'background-color 0.2s',
                      opacity: (log.keterangan || '').includes('[DIBATALKAN]') ? 0.5 : 1
                    }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc'}>
                      <td style={{ padding: '16px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0', textDecoration: (log.keterangan || '').includes('[DIBATALKAN]') ? 'line-through' : 'none' }}>{index + 1}</td>
                      <td style={{ padding: '16px', fontWeight: '500', color: '#0f172a', border: '1px solid #e2e8f0', textDecoration: (log.keterangan || '').includes('[DIBATALKAN]') ? 'line-through' : 'none' }}>{log.target_capex_name}</td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold', color: '#059669', border: '1px solid #e2e8f0', textDecoration: (log.keterangan || '').includes('[DIBATALKAN]') ? 'line-through' : 'none' }}>
                        {fmtRupiah(log.anggaran)}
                      </td>
                      <td style={{ padding: '16px', color: '#334155', border: '1px solid #e2e8f0', textDecoration: (log.keterangan || '').includes('[DIBATALKAN]') ? 'line-through' : 'none' }}>{log.source_capex_name}</td>
                      <td style={{ padding: '16px', textAlign: 'right', color: '#64748b', border: '1px solid #e2e8f0', textDecoration: (log.keterangan || '').includes('[DIBATALKAN]') ? 'line-through' : 'none' }}>
                        {fmtRupiah(log.source_nilai_awal)}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: '500', color: '#dc2626', border: '1px solid #e2e8f0', textDecoration: (log.keterangan || '').includes('[DIBATALKAN]') ? 'line-through' : 'none' }}>
                        {fmtRupiah(log.source_nilai_akhir)}
                      </td>
                      <td style={{ padding: '16px', color: '#475569', border: '1px solid #e2e8f0', textDecoration: (log.keterangan || '').includes('[DIBATALKAN]') ? 'line-through' : 'none' }}>{log.nd_persetujuan || '-'}</td>
                      <td style={{ padding: '16px', color: '#475569', border: '1px solid #e2e8f0', textDecoration: (log.keterangan || '').includes('[DIBATALKAN]') ? 'line-through' : 'none' }}>{log.user_name}</td>
                      <td style={{ padding: '16px', color: '#475569', border: '1px solid #e2e8f0', textDecoration: (log.keterangan || '').includes('[DIBATALKAN]') ? 'line-through' : 'none' }}>
                        <div>{new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        {!(log.keterangan || '').includes('[DIBATALKAN]') ? (
                          <button 
                            className="btn btn-outline" 
                            style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '6px 10px' }}
                            onClick={() => handleUndo(log)}
                            title="Batalkan Pengalihan Ini"
                          >
                            <RotateCcw size={16} />
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}>DIBATALKAN</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  )
}
