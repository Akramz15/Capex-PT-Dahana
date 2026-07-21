import React from 'react'
import { fmtShort, BULAN_NAMES } from '../../utils'

export default function SummaryYTDTable({ data, tahun, bulan, searchQuery = '' }) {
  if (!data || data.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Tidak ada data summary</div>
  }

  const processedData = data.map(kat => {
    const filteredItems = kat.items.filter(item => 
      !searchQuery || item.uraian.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const subtotal_budget = filteredItems.reduce((sum, item) => sum + (item.budget || 0), 0)
    const subtotal_rkap_ytd = filteredItems.reduce((sum, item) => sum + (item.rkap_ytd || 0), 0)
    const subtotal_real_po = filteredItems.reduce((sum, item) => sum + ((item.real_po || 0) - (item.real_bast || 0)), 0)
    const subtotal_real_bast = filteredItems.reduce((sum, item) => sum + (item.real_bast || 0), 0)
    
    const subtotal_pct_po = subtotal_rkap_ytd > 0 ? (subtotal_real_po / subtotal_rkap_ytd) * 100 : 0
    const subtotal_pct_bast = subtotal_rkap_ytd > 0 ? (subtotal_real_bast / subtotal_rkap_ytd) * 100 : 0

    return {
      ...kat,
      items: filteredItems,
      subtotal_budget,
      subtotal_rkap_ytd,
      subtotal_real_po,
      subtotal_real_bast,
      subtotal_pct_po,
      subtotal_pct_bast
    }
  }).filter(kat => kat.items.length > 0)

  // Calculate Grand Totals
  let grandBudget = 0
  let grandRkapYtd = 0
  let grandRealPo = 0
  let grandRealBast = 0

  processedData.forEach(kat => {
    grandBudget += kat.subtotal_budget || 0
    grandRkapYtd += kat.subtotal_rkap_ytd || 0
    grandRealPo += kat.subtotal_real_po || 0
    grandRealBast += kat.subtotal_real_bast || 0
  })

  const grandPctPo = grandRkapYtd > 0 ? ((grandRealPo / grandRkapYtd) * 100).toFixed(1) : '0.0'
  const grandPctBast = grandRkapYtd > 0 ? ((grandRealBast / grandRkapYtd) * 100).toFixed(1) : '0.0'

  const bulanName = BULAN_NAMES[bulan - 1] || ''

  const formatRp = (val) => val == null ? '—' : val === 0 ? 'Rp0' : 'Rp' + fmtShort(val)

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '68vh', position: 'relative', marginBottom: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
          <tr style={{ backgroundColor: '#002B5B', color: 'white' }}>
            <th rowSpan={2} style={{ backgroundColor: '#002B5B', padding: '12px', textAlign: 'center', boxShadow: 'inset 0 0 0 1px #004b99', border: 'none', verticalAlign: 'middle' }}>URAIAN</th>
            <th rowSpan={2} style={{ backgroundColor: '#002B5B', padding: '12px', textAlign: 'center', boxShadow: 'inset 0 0 0 1px #004b99', border: 'none', verticalAlign: 'middle' }}>Budget RKAP {tahun}</th>
            <th rowSpan={2} style={{ backgroundColor: '#002B5B', padding: '12px', textAlign: 'center', boxShadow: 'inset 0 0 0 1px #004b99', border: 'none', verticalAlign: 'middle' }}>RKAP sd {bulanName} {tahun}</th>
            <th colSpan={2} style={{ backgroundColor: '#002B5B', padding: '12px', textAlign: 'center', boxShadow: 'inset 0 0 0 1px #004b99', border: 'none', verticalAlign: 'middle' }}>Realisasi sd {bulanName}-{tahun.toString().slice(-2)}</th>
            <th colSpan={2} style={{ backgroundColor: '#002B5B', padding: '12px', textAlign: 'center', boxShadow: 'inset 0 0 0 1px #004b99', border: 'none', verticalAlign: 'middle' }}>% thd RKAP {bulanName} {tahun}</th>
          </tr>
          <tr style={{ backgroundColor: '#003366', color: 'white' }}>
            <th style={{ backgroundColor: '#003366', padding: '8px', textAlign: 'center', boxShadow: 'inset 0 0 0 1px #004b99', border: 'none' }}>By PO</th>
            <th style={{ backgroundColor: '#003366', padding: '8px', textAlign: 'center', boxShadow: 'inset 0 0 0 1px #004b99', border: 'none' }}>By BAST</th>
            <th style={{ backgroundColor: '#003366', padding: '8px', textAlign: 'center', boxShadow: 'inset 0 0 0 1px #004b99', border: 'none' }}>By PO</th>
            <th style={{ backgroundColor: '#003366', padding: '8px', textAlign: 'center', boxShadow: 'inset 0 0 0 1px #004b99', border: 'none' }}>By BAST</th>
          </tr>
        </thead>
        <tbody>
          {processedData.map((kat, idx) => (
            <React.Fragment key={idx}>
              <tr>
                <td colSpan={7} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 'bold', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                  {kat.kategori}
                </td>
              </tr>
              {kat.items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>{item.uraian}</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>{formatRp(item.budget)}</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>{formatRp(item.rkap_ytd)}</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', color: (item.real_po - item.real_bast) > 0 ? '#16a34a' : 'inherit' }}>{formatRp(item.real_po - item.real_bast)}</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', color: item.real_bast > 0 ? '#0284c7' : 'inherit' }}>{formatRp(item.real_bast)}</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>{item.pct_po.toFixed(1)}%</td>
                  <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>{item.pct_bast.toFixed(1)}%</td>
                </tr>
              ))}
              <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>
                <td style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Jumlah {kat.kategori}</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>{formatRp(kat.subtotal_budget)}</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>{formatRp(kat.subtotal_rkap_ytd)}</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>{formatRp(kat.subtotal_real_po)}</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>{formatRp(kat.subtotal_real_bast)}</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>{kat.subtotal_pct_po.toFixed(1)}%</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>{kat.subtotal_pct_bast.toFixed(1)}%</td>
              </tr>
            </React.Fragment>
          ))}
          <tr style={{ backgroundColor: '#002B5B', color: 'white', fontWeight: 'bold' }}>
            <td style={{ padding: '12px', textAlign: 'left', border: '1px solid #004b99' }}>Total Realisasi Aset</td>
            <td style={{ padding: '12px', border: '1px solid #004b99' }}>{formatRp(grandBudget)}</td>
            <td style={{ padding: '12px', border: '1px solid #004b99' }}>{formatRp(grandRkapYtd)}</td>
            <td style={{ padding: '12px', border: '1px solid #004b99' }}>{formatRp(grandRealPo)}</td>
            <td style={{ padding: '12px', border: '1px solid #004b99' }}>{formatRp(grandRealBast)}</td>
            <td style={{ padding: '12px', border: '1px solid #004b99' }}>{grandPctPo}%</td>
            <td style={{ padding: '12px', border: '1px solid #004b99' }}>{grandPctBast}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
