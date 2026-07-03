import * as XLSX from 'xlsx-js-style'

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const headerStyle = {
  font: { bold: true, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "001A4D" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { auto: 1 } },
    bottom: { style: "thin", color: { auto: 1 } },
    left: { style: "thin", color: { auto: 1 } },
    right: { style: "thin", color: { auto: 1 } }
  }
}

const dataStyle = {
  font: { color: { rgb: "000000" } },
  alignment: { vertical: "center" },
  border: {
    top: { style: "thin", color: { auto: 1 } },
    bottom: { style: "thin", color: { auto: 1 } },
    left: { style: "thin", color: { auto: 1 } },
    right: { style: "thin", color: { auto: 1 } }
  }
}

const numberStyle = {
  ...dataStyle,
  alignment: { horizontal: "right", vertical: "center" },
  numFmt: "#,##0"
}

export function exportRkapToExcel(data, tahun) {
  // Row 1
  const header1 = ['No', 'Kode', 'Daftar Capex', 'PIC', 'Tahun', 'Status']
  BULAN.forEach(b => { header1.push(b, '') })
  header1.push('Total', '', '')

  // Row 2
  const header2 = ['', '', '', '', '', '']
  BULAN.forEach(() => { header2.push('RKAP', 'Realisasi') })
  header2.push('RKAP Awal', 'RKAP Revisi', 'Realisasi')

  const wsData = [header1, header2]

  data.forEach((row, i) => {
    const rowData = [
      i + 1,
      row.kode || '',
      row.daftar_capex || '',
      row.pic || '',
      row.tahun || tahun,
      row.status || ''
    ]
    for (let b = 1; b <= 12; b++) {
      rowData.push(row[`b${b}_rkap`] || 0, row[`b${b}_real`] || 0)
    }
    rowData.push(
      row.anggaran_rkap || 0,
      row.anggaran_perubahan || 0,
      row.total_real || 0
    )
    wsData.push(rowData)
  })

  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Apply styles
  const range = XLSX.utils.decode_range(ws['!ref'])
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = {c:C, r:R}
      const cellRef = XLSX.utils.encode_cell(cellAddress)
      if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" }
      
      if (R < 2) {
        ws[cellRef].s = headerStyle
      } else {
        if (typeof ws[cellRef].v === 'number' && C > 5) {
          ws[cellRef].s = numberStyle
        } else if (C === 0) {
          ws[cellRef].s = { ...dataStyle, alignment: { horizontal: "center", vertical: "center" } }
        } else {
          ws[cellRef].s = dataStyle
        }
      }
    }
  }

  // Merges
  ws['!merges'] = [
    { s: {r: 0, c: 0}, e: {r: 1, c: 0} }, // No
    { s: {r: 0, c: 1}, e: {r: 1, c: 1} }, // Kode
    { s: {r: 0, c: 2}, e: {r: 1, c: 2} }, // Daftar Capex
    { s: {r: 0, c: 3}, e: {r: 1, c: 3} }, // PIC
    { s: {r: 0, c: 4}, e: {r: 1, c: 4} }, // Tahun
    { s: {r: 0, c: 5}, e: {r: 1, c: 5} }, // Status
  ]
  // Bulan merges
  for (let i = 0; i < 12; i++) {
    const colStart = 6 + (i * 2)
    ws['!merges'].push({ s: {r: 0, c: colStart}, e: {r: 0, c: colStart + 1} })
  }
  // Total merge
  ws['!merges'].push({ s: {r: 0, c: 30}, e: {r: 0, c: 32} })

  // Cols width
  const cols = [{wch: 5}, {wch: 15}, {wch: 35}, {wch: 15}, {wch: 10}, {wch: 15}]
  for (let i = 0; i < 24; i++) cols.push({wch: 18}) // Bulan
  cols.push({wch: 20}, {wch: 20}, {wch: 20}) // Total
  ws['!cols'] = cols

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'RKAP Master')
  XLSX.writeFile(wb, `Data_RKAP_Master_${tahun}.xlsx`)
}

export function exportRealizationToExcel(data, tahun) {
  // Row 1
  const header1 = ['No', 'Daftar Capex', 'Anggaran', '', 'Status', 'Keterangan']
  BULAN.forEach(b => { header1.push(b, '') })
  header1.push('Total', '', 'PIC')

  // Row 2
  const header2 = ['', '', 'RKAP', 'Perubahan', '', '']
  BULAN.forEach(() => { header2.push('RKAP', 'Realisasi') })
  header2.push('RKAP', 'Realisasi', '')

  const wsData = [header1, header2]

  data.forEach((row, i) => {
    const rowData = [
      i + 1,
      row.daftar_capex || '',
      row.anggaran_rkap || 0,
      row.anggaran_perubahan || 0,
      row.status || '',
      row.keterangan || ''
    ]
    for (let b = 1; b <= 12; b++) {
      rowData.push(row[`b${b}_rkap`] || 0, row[`b${b}_real`] || 0)
    }
    rowData.push(
      row.total_rkap || 0,
      row.total_real || 0,
      row.pic || ''
    )
    wsData.push(rowData)
  })

  // Append footer
  const sumAnggaranRKAP = data.reduce((acc, r) => acc + (r.anggaran_rkap || 0), 0)
  const sumAnggaranPerub = data.reduce((acc, r) => acc + (r.anggaran_perubahan || 0), 0)
  const sumTotalRKAP = data.reduce((acc, r) => acc + (r.total_rkap || 0), 0)
  const sumTotalReal = data.reduce((acc, r) => acc + (r.total_real || 0), 0)
  
  const footerRow = ['Total', '', sumAnggaranRKAP, sumAnggaranPerub, '', '']
  for (let b = 1; b <= 12; b++) {
    const sumBlnRKAP = data.reduce((acc, r) => acc + (r[`b${b}_rkap`] || 0), 0)
    const sumBlnReal = data.reduce((acc, r) => acc + (r[`b${b}_real`] || 0), 0)
    footerRow.push(sumBlnRKAP, sumBlnReal)
  }
  footerRow.push(sumTotalRKAP, sumTotalReal, '')
  wsData.push(footerRow)

  const ws = XLSX.utils.aoa_to_sheet(wsData)

  const range = XLSX.utils.decode_range(ws['!ref'])
  const footerIdx = wsData.length - 1

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = {c:C, r:R}
      const cellRef = XLSX.utils.encode_cell(cellAddress)
      if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" }
      
      if (R < 2 || R === footerIdx) {
        ws[cellRef].s = headerStyle
      } else {
        if (typeof ws[cellRef].v === 'number' && (C === 2 || C === 3 || C > 5)) {
          ws[cellRef].s = numberStyle
        } else if (C === 0) {
          ws[cellRef].s = { ...dataStyle, alignment: { horizontal: "center", vertical: "center" } }
        } else {
          ws[cellRef].s = dataStyle
        }
      }
    }
  }

  // Merges
  ws['!merges'] = [
    { s: {r: 0, c: 0}, e: {r: 1, c: 0} }, // No
    { s: {r: 0, c: 1}, e: {r: 1, c: 1} }, // Daftar Capex
    { s: {r: 0, c: 2}, e: {r: 0, c: 3} }, // Anggaran
    { s: {r: 0, c: 4}, e: {r: 1, c: 4} }, // Status
    { s: {r: 0, c: 5}, e: {r: 1, c: 5} }, // Keterangan
  ]
  // Bulan merges
  for (let i = 0; i < 12; i++) {
    const colStart = 6 + (i * 2)
    ws['!merges'].push({ s: {r: 0, c: colStart}, e: {r: 0, c: colStart + 1} })
  }
  // Total merge
  ws['!merges'].push({ s: {r: 0, c: 30}, e: {r: 0, c: 31} })
  // PIC merge
  ws['!merges'].push({ s: {r: 0, c: 32}, e: {r: 1, c: 32} })
  
  // Footer merges
  ws['!merges'].push({ s: {r: footerIdx, c: 0}, e: {r: footerIdx, c: 1} }) // Total string
  ws['!merges'].push({ s: {r: footerIdx, c: 4}, e: {r: footerIdx, c: 5} }) // Empty spaces

  // Cols width
  const cols = [{wch: 5}, {wch: 35}, {wch: 18}, {wch: 18}, {wch: 15}, {wch: 25}]
  for (let i = 0; i < 24; i++) cols.push({wch: 18}) // Bulan
  cols.push({wch: 20}, {wch: 20}, {wch: 15}) // Total + PIC
  ws['!cols'] = cols

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Realisasi')
  XLSX.writeFile(wb, `Data_Realisasi_${tahun}.xlsx`)
}
