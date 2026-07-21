import React, { useState } from 'react'
import { fmtShort, BULAN_NAMES } from '../../utils'
import { Search } from 'lucide-react'

export default function SummaryCarryOverTable({ data, tahun, bulan, searchQuery }) {

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
        Tidak ada data Carry Over.
      </div>
    )
  }

  // Filter and process data based on search
  const processedData = data.map(group => {
    const filteredItems = group.items.filter(item => 
      !searchQuery || item.uraian.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filteredItems.length === 0) return null;

    // Recalculate subtotals for filtered items
    const subtotal_budget = filteredItems.reduce((sum, item) => sum + item.budget, 0);
    const subtotal_real_po = filteredItems.reduce((sum, item) => sum + (item.real_po - item.real_bast), 0); // Sisa PO
    const subtotal_real_bast = filteredItems.reduce((sum, item) => sum + item.real_bast, 0);
    const subtotal_pct_po = subtotal_budget > 0 ? (subtotal_real_po / subtotal_budget) * 100 : 0;
    const subtotal_pct_bast = subtotal_budget > 0 ? (subtotal_real_bast / subtotal_budget) * 100 : 0;

    return {
      ...group,
      items: filteredItems,
      subtotal_budget,
      subtotal_real_po,
      subtotal_real_bast,
      subtotal_pct_po,
      subtotal_pct_bast
    };
  }).filter(Boolean); // Remove null groups

  // Calculate Grand Totals for filtered data
  let grandBudget = 0
  let grandPo = 0
  let grandBast = 0

  processedData.forEach(d => {
    grandBudget += d.subtotal_budget
    grandPo += d.subtotal_real_po
    grandBast += d.subtotal_real_bast
  })

  const grandPctPo = grandBudget > 0 ? (grandPo / grandBudget) * 100 : 0
  const grandPctBast = grandBudget > 0 ? (grandBast / grandBudget) * 100 : 0

  return (
    <div>
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '68vh', position: 'relative', border: '1px solid var(--clr-border)', borderRadius: '6px' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
            <tr>
              <th rowSpan={2} style={{ backgroundColor: '#002060', color: 'white', padding: '12px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)', border: 'none', textAlign: 'center', verticalAlign: 'middle', minWidth: '250px' }}>
                URAIAN
              </th>
              <th rowSpan={2} style={{ backgroundColor: '#002060', color: 'white', padding: '12px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)', border: 'none', textAlign: 'center', verticalAlign: 'middle', minWidth: '120px' }}>
                Carryover {tahun}
              </th>
              <th colSpan={2} style={{ backgroundColor: '#002060', color: 'white', padding: '12px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)', border: 'none', textAlign: 'center' }}>
                Realisasi sd {BULAN_NAMES[bulan - 1]}-{String(tahun).slice(-2)}
              </th>
              <th colSpan={2} style={{ backgroundColor: '#002060', color: 'white', padding: '12px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)', border: 'none', textAlign: 'center' }}>
                % terhadap Carryover {tahun}
              </th>
            </tr>
            <tr>
              <th style={{ backgroundColor: '#002060', color: 'white', padding: '8px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)', border: 'none', textAlign: 'center' }}>By PO</th>
              <th style={{ backgroundColor: '#002060', color: 'white', padding: '8px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)', border: 'none', textAlign: 'center' }}>By BA</th>
              <th style={{ backgroundColor: '#002060', color: 'white', padding: '8px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)', border: 'none', textAlign: 'center' }}>By PO</th>
              <th style={{ backgroundColor: '#002060', color: 'white', padding: '8px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)', border: 'none', textAlign: 'center' }}>By BA</th>
            </tr>
          </thead>
          <tbody>
            {processedData.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  Tidak ada data yang cocok dengan pencarian "{search}"
                </td>
              </tr>
            ) : (
              processedData.reduce((acc, d) => {
                const mk = d.main_kategori || 'INVESTASI RUTIN';
                if (!acc.includes(mk)) acc.push(mk);
                return acc;
              }, []).map((mk, mkIdx) => {
                const mainData = processedData.filter(d => (d.main_kategori || 'INVESTASI RUTIN') === mk);
                if (mainData.length === 0) return null;

                let mainBudget = 0;
                let mainPo = 0;
                let mainBast = 0;
                mainData.forEach(d => {
                  mainBudget += d.subtotal_budget;
                  mainPo += d.subtotal_real_po;
                  mainBast += d.subtotal_real_bast;
                });
                const mainPctPo = mainBudget > 0 ? (mainPo / mainBudget) * 100 : 0;
                const mainPctBast = mainBudget > 0 ? (mainBast / mainBudget) * 100 : 0;

                return (
                  <React.Fragment key={`main-${mkIdx}`}>
                    <tr>
                      <td colSpan={6} style={{ backgroundColor: '#002060', color: 'white', fontWeight: 'bold', padding: '10px 12px', border: '1px solid var(--clr-border)' }}>
                        {mk.toUpperCase()}
                      </td>
                    </tr>
                    {mainData.map((d, i) => (
                      <React.Fragment key={`sub-${mkIdx}-${i}`}>
                        <tr>
                          <td colSpan={6} style={{ backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 'bold', padding: '8px 12px', paddingLeft: '24px', border: '1px solid var(--clr-border)' }}>
                            {d.kategori}
                          </td>
                        </tr>
                        {d.items.map((item, j) => (
                          <tr key={j}>
                            <td style={{ padding: '8px 12px', border: '1px solid var(--clr-border)', paddingLeft: '36px' }}>{item.uraian}</td>
                            <td style={{ padding: '8px 12px', border: '1px solid var(--clr-border)', textAlign: 'right' }}>
                              {item.budget > 0 ? fmtShort(item.budget) : '-'}
                            </td>
                            <td style={{ padding: '8px 12px', border: '1px solid var(--clr-border)', textAlign: 'right' }}>
                              {(item.real_po - item.real_bast) > 0 ? fmtShort(item.real_po - item.real_bast) : '-'}
                            </td>
                            <td style={{ padding: '8px 12px', border: '1px solid var(--clr-border)', textAlign: 'right' }}>
                              {item.real_bast > 0 ? fmtShort(item.real_bast) : '-'}
                            </td>
                            <td style={{ padding: '8px 12px', border: '1px solid var(--clr-border)', textAlign: 'right' }}>
                              {item.pct_po > 0 ? `${item.pct_po.toFixed(2)}%` : '-'}
                            </td>
                            <td style={{ padding: '8px 12px', border: '1px solid var(--clr-border)', textAlign: 'right' }}>
                              {item.pct_bast > 0 ? `${item.pct_bast.toFixed(2)}%` : '-'}
                            </td>
                          </tr>
                        ))}
                        {/* Subtotal Kategori */}
                        <tr style={{ backgroundColor: '#fef3c7', fontWeight: 600, color: '#92400e' }}>
                          <td style={{ padding: '8px 12px', border: '1px solid var(--clr-border)', textAlign: 'right' }}>Jumlah {d.kategori}</td>
                          <td style={{ padding: '8px 12px', border: '1px solid var(--clr-border)', textAlign: 'right' }}>
                            {d.subtotal_budget > 0 ? fmtShort(d.subtotal_budget) : '-'}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid var(--clr-border)', textAlign: 'right' }}>
                            {d.subtotal_real_po > 0 ? fmtShort(d.subtotal_real_po) : '-'}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid var(--clr-border)', textAlign: 'right' }}>
                            {d.subtotal_real_bast > 0 ? fmtShort(d.subtotal_real_bast) : '-'}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid var(--clr-border)', textAlign: 'right' }}>
                            {d.subtotal_pct_po > 0 ? `${d.subtotal_pct_po.toFixed(2)}%` : '-'}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid var(--clr-border)', textAlign: 'right' }}>
                            {d.subtotal_pct_bast > 0 ? `${d.subtotal_pct_bast.toFixed(2)}%` : '-'}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                    {/* Main Total */}
                    <tr style={{ backgroundColor: '#002060', fontWeight: 'bold', color: '#fff' }}>
                      <td style={{ padding: '10px 12px', border: '1px solid var(--clr-border)', textAlign: 'right', color: 'white' }}>TOTAL {mk.toUpperCase()}</td>
                      <td style={{ padding: '10px 12px', border: '1px solid var(--clr-border)', textAlign: 'right', color: 'white' }}>
                        {mainBudget > 0 ? fmtShort(mainBudget) : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', border: '1px solid var(--clr-border)', textAlign: 'right', color: 'white' }}>
                        {mainPo > 0 ? fmtShort(mainPo) : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', border: '1px solid var(--clr-border)', textAlign: 'right', color: 'white' }}>
                        {mainBast > 0 ? fmtShort(mainBast) : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', border: '1px solid var(--clr-border)', textAlign: 'right', color: 'white' }}>
                        {mainPctPo > 0 ? `${mainPctPo.toFixed(2)}%` : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', border: '1px solid var(--clr-border)', textAlign: 'right', color: 'white' }}>
                        {mainPctBast > 0 ? `${mainPctBast.toFixed(2)}%` : '-'}
                      </td>
                    </tr>
                  </React.Fragment>
                )
              })
            )}
            
            {/* Grand Total */}
            {processedData.length > 0 && (
              <tr style={{ backgroundColor: '#002060', color: 'white', fontWeight: 'bold' }}>
                <td style={{ padding: '12px', border: '1px solid var(--clr-border)', color: 'white' }}>Total Realisasi Aset</td>
                <td style={{ padding: '12px', border: '1px solid var(--clr-border)', textAlign: 'right', color: 'white' }}>
                  {grandBudget > 0 ? fmtShort(grandBudget) : '-'}
                </td>
                <td style={{ padding: '12px', border: '1px solid var(--clr-border)', textAlign: 'right', color: 'white' }}>
                  {grandPo > 0 ? fmtShort(grandPo) : '-'}
                </td>
                <td style={{ padding: '12px', border: '1px solid var(--clr-border)', textAlign: 'right', color: 'white' }}>
                  {grandBast > 0 ? fmtShort(grandBast) : '-'}
                </td>
                <td style={{ padding: '12px', border: '1px solid var(--clr-border)', textAlign: 'right', color: 'white' }}>
                  {grandPctPo > 0 ? `${grandPctPo.toFixed(2)}%` : '-'}
                </td>
                <td style={{ padding: '12px', border: '1px solid var(--clr-border)', textAlign: 'right', color: 'white' }}>
                  {grandPctBast > 0 ? `${grandPctBast.toFixed(2)}%` : '-'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
