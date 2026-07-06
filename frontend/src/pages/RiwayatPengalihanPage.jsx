import { useEffect, useState, useCallback } from 'react'
import { getAuditLogs, exportAuditLogsExcel } from '../api/capex'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { fmtRupiah, downloadBlob } from '../utils'
import { Download } from 'lucide-react'

export default function RiwayatPengalihanPage({ tahun }) {
  const [loading, setLoading] = useState(true)
  const [auditLogs, setAuditLogs] = useState([])
  const [exporting, setExporting] = useState(false)

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
          <div style={{ overflowX: 'auto' }}>
            {auditLogs.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Belum ada riwayat pengalihan anggaran di tahun {tahun}.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', border: '1px solid #e2e8f0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', color: '#334155', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', width: '50px', textAlign: 'center' }}>No</th>
                    <th style={{ padding: '12px 16px', minWidth: '120px' }}>Waktu</th>
                    <th style={{ padding: '12px 16px', minWidth: '200px' }}>Penerima Dana (Tujuan)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', minWidth: '150px' }}>Nilai Dialihkan</th>
                    <th style={{ padding: '12px 16px', minWidth: '200px' }}>Sumber Dana (Asal)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', minWidth: '180px' }}>Saldo Penerima</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', minWidth: '180px' }}>Saldo Sumber</th>
                    <th style={{ padding: '12px 16px', minWidth: '150px' }}>ND Persetujuan</th>
                    <th style={{ padding: '12px 16px' }}>PIC</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, index) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc'}>
                      <td style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                      <td style={{ padding: '16px', color: '#475569' }}>
                        <div>{new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td style={{ padding: '16px', fontWeight: '500', color: '#0f172a' }}>{log.target_capex_name}</td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>
                        + Rp {fmtRupiah(log.anggaran)}
                      </td>
                      <td style={{ padding: '16px', color: '#334155' }}>{log.source_capex_name}</td>
                      
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'line-through' }}>{fmtRupiah(log.target_nilai_awal)}</div>
                        <div style={{ color: '#059669', fontWeight: '500' }}>{fmtRupiah(log.target_nilai_akhir)}</div>
                      </td>
                      
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'line-through' }}>{fmtRupiah(log.source_nilai_awal)}</div>
                        <div style={{ color: '#dc2626', fontWeight: '500' }}>{fmtRupiah(log.source_nilai_akhir)}</div>
                      </td>
                      
                      <td style={{ padding: '16px', color: '#475569' }}>{log.nd_persetujuan || '-'}</td>
                      <td style={{ padding: '16px', color: '#475569' }}>{log.user_name}</td>
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
