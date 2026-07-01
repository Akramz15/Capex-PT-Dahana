import { useState, useMemo } from 'react'
import LoadingSpinner from './LoadingSpinner'
import { Inbox } from 'lucide-react'

export default function DataTable({ columns, data, loading, searchKeys = [], actions }) {
  const [search, setSearch]   = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const filtered = useMemo(() => {
    if (!data) return []
    let rows = data
    if (search.trim() && searchKeys.length) {
      const q = search.toLowerCase()
      rows = rows.filter((row) =>
        searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q))
      )
    }
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const va = a[sortKey] ?? ''
        const vb = b[sortKey] ?? ''
        const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [data, search, sortKey, sortDir, searchKeys])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortIcon = (key) => {
    if (sortKey !== key) return ' ↕'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <div>
      <div className="section-header">
        <div className="table-search">
          <span className="table-search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            id="table-search-input"
            type="text"
            placeholder="Cari data..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari data dalam tabel"
          />
        </div>
        {actions && <div className="table-actions">{actions}</div>}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    style={{ cursor: col.sortable === false ? 'default' : 'pointer' }}
                  >
                    {col.label}
                    {col.sortable !== false && sortIcon(col.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="table-empty">
                      <div className="table-empty-icon"><Inbox size={40} /></div>
                      {search ? 'Tidak ada data yang cocok dengan pencarian.' : 'Belum ada data.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr key={row.id ?? i}>
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ padding: '10px 24px', fontSize: 12, color: 'var(--clr-text-muted)', borderTop: '1px solid var(--clr-border)' }}>
          Menampilkan {filtered.length} dari {data?.length ?? 0} data
        </div>
      )}
    </div>
  )
}
