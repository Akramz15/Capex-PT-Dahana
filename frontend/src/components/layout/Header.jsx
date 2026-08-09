const PAGE_META = {
  '/dashboard':  { title: 'Dashboard',      breadcrumb: 'Ringkasan & Grafik' },
  '/rkap':       { title: 'RKAP Master',    breadcrumb: 'Daftar Investasi Capex' },
  '/rkap/riwayat': { title: 'Riwayat Pengalihan', breadcrumb: 'RKAP Master' },
  '/realisasi':  { title: 'Realisasi',      breadcrumb: 'Progress Realisasi Bulanan' },
  '/carry-over': { title: 'Carry Over',     breadcrumb: 'Carry Over Investasi' },
  '/timeline':   { title: 'Timeline',       breadcrumb: 'Jadwal Kajian Investasi' },
  '/master-aset/dashboard': { title: 'Asset (Dashboard)', breadcrumb: 'Dashboard Aset' },
  '/master-aset/nomor': { title: 'Nomor Aset', breadcrumb: 'Permintaan Nomor Aset' },
  '/master-aset/laporan': { title: 'Laporan Aktiva Tetap', breadcrumb: 'Aktiva Tetap PT Dahana' },
  '/aset':       { title: 'Data Aset',      breadcrumb: 'Tabel Keseluruhan Aset' },
  '/users':      { title: 'Manajemen User', breadcrumb: 'Pengaturan Hak Akses' },
}

export default function Header({ currentPath, tahun, onTahunChange }) {
  const meta  = PAGE_META[currentPath] ?? { title: 'Capex Monitoring', breadcrumb: '' }
  const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031]

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">{meta.title}</h1>
        <span className="header-breadcrumb">Monitoring Capex › {meta.breadcrumb}</span>
      </div>

      <div className="header-right">
        {!currentPath.startsWith('/aset') && (
          <select
            className="header-year-select"
            value={tahun}
            onChange={(e) => onTahunChange(Number(e.target.value))}
            aria-label="Pilih Tahun"
            id="year-selector"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}
      </div>
    </header>
  )
}
