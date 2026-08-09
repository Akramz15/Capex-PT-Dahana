const PAGE_META = {
  '/dashboard':  { title: 'Dashboard',      breadcrumb: 'Dashboard' },
  '/rkap':       { title: 'RKAP Master',    breadcrumb: 'RKAP Master' },
  '/rkap/riwayat': { title: 'Riwayat Pengalihan', breadcrumb: 'RKAP Master › Riwayat Pengalihan' },
  '/realisasi':  { title: 'Realisasi',      breadcrumb: 'Realisasi' },
  '/carry-over': { title: 'Carry Over',     breadcrumb: 'Carry Over' },
  '/timeline':   { title: 'Timeline',       breadcrumb: 'Timeline' },
  '/master-aset/dashboard': { title: 'Asset (Dashboard)', breadcrumb: 'Asset (Dashboard)' },
  '/master-aset/nomor': { title: 'Nomor Aset', breadcrumb: 'Asset (Dashboard) › Nomor Aset' },
  '/master-aset/laporan': { title: 'Laporan Aktiva Tetap', breadcrumb: 'Asset (Dashboard) › Laporan Aktiva Tetap' },
  '/aset':       { title: 'Data Aset',      breadcrumb: 'Asset (Dashboard) › Data Aset' },
  '/users':      { title: 'Manajemen User', breadcrumb: 'Manajemen User' },
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
