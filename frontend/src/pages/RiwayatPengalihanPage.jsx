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
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e1b4b', color: 'white', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 8px', textAlign: 'center', borderRight: '1px solid #4338ca' }}>No</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', borderRight: '1px solid #4338ca' }}>Nama Kajian</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', borderRight: '1px solid #4338ca' }}>Usulan Nilai Awal</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', borderRight: '1px solid #4338ca' }}>Nilai RKAP</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', borderRight: '1px solid #4338ca' }}>Selisih</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', borderRight: '1px solid #4338ca' }}>Anggaran Pengganti</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', borderRight: '1px solid #4338ca' }}>Anggaran Awal</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', borderRight: '1px solid #4338ca' }}>Anggaran Sisa</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', borderRight: '1px solid #4338ca' }}>ND Persetujuan</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', borderRight: '1px solid #4338ca' }}>User</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left' }}>Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, index) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>{index + 1}</td>
                      <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{log.source_capex_name}</td>
                      <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>{fmtRupiah(log.source_nilai_awal)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>{fmtRupiah(log.source_nilai_akhir)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>{fmtRupiah(log.anggaran)}</td>
                      <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{log.target_capex_name}</td>
                      <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>{fmtRupiah(log.target_nilai_awal)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>{fmtRupiah(log.target_nilai_akhir)}</td>
                      <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{log.nd_persetujuan}</td>
                      <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{log.user_name}</td>
                      <td style={{ padding: '8px' }}>{new Date(log.created_at).toLocaleString('id-ID')}</td>
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
