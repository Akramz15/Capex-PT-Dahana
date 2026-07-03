import * as XLSX from 'xlsx'

export function exportRkapToExcel(data, tahun) {
  const wsData = [
    ['No', 'Kode', 'Daftar Capex', 'PIC', 'Tahun', 'Status', 
     'Januari RKAP', 'Januari Realisasi', 'Februari RKAP', 'Februari Realisasi',
     'Maret RKAP', 'Maret Realisasi', 'April RKAP', 'April Realisasi',
     'Mei RKAP', 'Mei Realisasi', 'Juni RKAP', 'Juni Realisasi',
     'Juli RKAP', 'Juli Realisasi', 'Agustus RKAP', 'Agustus Realisasi',
     'September RKAP', 'September Realisasi', 'Oktober RKAP', 'Oktober Realisasi',
     'November RKAP', 'November Realisasi', 'Desember RKAP', 'Desember Realisasi',
     'Total RKAP Awal', 'Total RKAP Revisi', 'Total Realisasi'
    ]
  ]

  data.forEach((row, i) => {
    wsData.push([
      i + 1,
      row.kode || '',
      row.daftar_capex || '',
      row.pic || '',
      row.tahun || tahun,
      row.status || '',
      row.b1_rkap || 0, row.b1_real || 0,
      row.b2_rkap || 0, row.b2_real || 0,
      row.b3_rkap || 0, row.b3_real || 0,
      row.b4_rkap || 0, row.b4_real || 0,
      row.b5_rkap || 0, row.b5_real || 0,
      row.b6_rkap || 0, row.b6_real || 0,
      row.b7_rkap || 0, row.b7_real || 0,
      row.b8_rkap || 0, row.b8_real || 0,
      row.b9_rkap || 0, row.b9_real || 0,
      row.b10_rkap || 0, row.b10_real || 0,
      row.b11_rkap || 0, row.b11_real || 0,
      row.b12_rkap || 0, row.b12_real || 0,
      row.anggaran_rkap || 0,
      row.anggaran_perubahan || 0,
      row.total_real || 0
    ])
  })

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'RKAP Master')
  XLSX.writeFile(wb, `Data_RKAP_Master_${tahun}.xlsx`)
}

export function exportRealizationToExcel(data, tahun) {
  const wsData = [
    ['No', 'Daftar Capex', 'Anggaran RKAP', 'Anggaran Perubahan', 'Status', 'Keterangan',
     'Januari RKAP', 'Januari Realisasi', 'Februari RKAP', 'Februari Realisasi',
     'Maret RKAP', 'Maret Realisasi', 'April RKAP', 'April Realisasi',
     'Mei RKAP', 'Mei Realisasi', 'Juni RKAP', 'Juni Realisasi',
     'Juli RKAP', 'Juli Realisasi', 'Agustus RKAP', 'Agustus Realisasi',
     'September RKAP', 'September Realisasi', 'Oktober RKAP', 'Oktober Realisasi',
     'November RKAP', 'November Realisasi', 'Desember RKAP', 'Desember Realisasi',
     'Total RKAP', 'Total Realisasi', 'PIC'
    ]
  ]

  data.forEach((row, i) => {
    wsData.push([
      i + 1,
      row.daftar_capex || '',
      row.anggaran_rkap || 0,
      row.anggaran_perubahan || 0,
      row.status || '',
      row.keterangan || '',
      row.b1_rkap || 0, row.b1_real || 0,
      row.b2_rkap || 0, row.b2_real || 0,
      row.b3_rkap || 0, row.b3_real || 0,
      row.b4_rkap || 0, row.b4_real || 0,
      row.b5_rkap || 0, row.b5_real || 0,
      row.b6_rkap || 0, row.b6_real || 0,
      row.b7_rkap || 0, row.b7_real || 0,
      row.b8_rkap || 0, row.b8_real || 0,
      row.b9_rkap || 0, row.b9_real || 0,
      row.b10_rkap || 0, row.b10_real || 0,
      row.b11_rkap || 0, row.b11_real || 0,
      row.b12_rkap || 0, row.b12_real || 0,
      row.total_rkap || 0,
      row.total_real || 0,
      row.pic || ''
    ])
  })

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Realisasi')
  XLSX.writeFile(wb, `Data_Realisasi_${tahun}.xlsx`)
}
