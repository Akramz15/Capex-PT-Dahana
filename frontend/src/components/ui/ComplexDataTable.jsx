import React, { useState, useMemo } from 'react';
import { Pencil, Trash2, Inbox, Search, Filter } from 'lucide-react';

/**
 * ComplexDataTable
 * Supports multi-level headers and horizontal scrolling.
 * 
 * columns definition:
 * {
 *   header: "String", 
 *   accessor: "key_in_data", (optional)
 *   render: (row) => JSX, (optional)
 *   sticky: true/false, (optional)
 *   children: [ ... nested columns ... ] (optional)
 * }
 */
function ComplexDataTable({ columns, data, onEdit, onDelete, onCustomAction, emptyMessage = "Data belum tersedia", searchKeys = [], filterOptions = [], renderFooter = null, groupBy = null, renderGroupHeader = null, customToolbarContent = null }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState({});

  // Helper to calculate max depth of headers
  const getDepth = (cols) => {
    let max = 1;
    cols.forEach(c => {
      if (c.children && c.children.length > 0) {
        max = Math.max(max, 1 + getDepth(c.children));
      }
    });
    return max;
  };

  // Helper to calculate total leaf columns (colspan)
  const getColSpan = (col) => {
    if (!col.children || col.children.length === 0) return 1;
    return col.children.reduce((acc, child) => acc + getColSpan(child), 0);
  };

  const depth = getDepth(columns);
  
  // Build rows for thead
  const headerRows = Array.from({ length: depth }, () => []);

  const traverseColumns = (cols, currentLevel) => {
    cols.forEach(col => {
      const colSpan = getColSpan(col);
      const rowSpan = (!col.children || col.children.length === 0) ? (depth - currentLevel) : 1;
      
      headerRows[currentLevel].push({
        ...col,
        colSpan,
        rowSpan
      });

      if (col.children && col.children.length > 0) {
        traverseColumns(col.children, currentLevel + 1);
      }
    });
  };

  traverseColumns(columns, 0);

  // Flatten leaf columns to render table body
  const leafColumns = [];
  const getLeafColumns = (cols) => {
    cols.forEach(col => {
      if (!col.children || col.children.length === 0) {
        leafColumns.push(col);
      } else {
        getLeafColumns(col.children);
      }
    });
  };
  getLeafColumns(columns);

  // Derive options for smart filters dynamically from data
  const derivedFilterOptions = useMemo(() => {
    const opts = {};
    filterOptions.forEach(fo => {
      const uniqueVals = new Set();
      data.forEach(row => {
        const val = row[fo.key];
        if (val) uniqueVals.add(String(val));
      });
      opts[fo.key] = Array.from(uniqueVals).sort();
    });
    return opts;
  }, [data, filterOptions]);

  // Search and smart filtering
  const filteredData = data.filter((row) => {
    let matchesSearch = true;
    if (searchTerm && searchKeys.length > 0) {
      const term = searchTerm.toLowerCase();
      matchesSearch = searchKeys.some((key) => {
        const val = row[key];
        if (val == null) return false;
        return String(val).toLowerCase().includes(term);
      });
    }

    let matchesFilters = true;
    for (const filterKey in activeFilters) {
      const selectedValue = activeFilters[filterKey];
      if (selectedValue && selectedValue !== '') {
        if (String(row[filterKey]) !== selectedValue) {
          matchesFilters = false;
          break;
        }
      }
    }

    return matchesSearch && matchesFilters;
  });

  return (
    <div>
      {(searchKeys.length > 0 || filterOptions.length > 0 || customToolbarContent) && (
        <div className="table-toolbar" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--clr-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--clr-border)', boxShadow: 'var(--shadow-sm)' }}>
          
          {/* Row 1: Custom Content (Legend, etc) */}
          {customToolbarContent && (
            <div style={{ width: '100%' }}>
              {customToolbarContent}
            </div>
          )}

          {/* Row 2: Built-in Filters */}
          {filterOptions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--clr-text-muted)', fontWeight: 500, fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                <Filter size={16} /> Filter:
              </div>
              {filterOptions.map(fo => (
                <select
                  key={`filter-${fo.key}`}
                  className="form-select"
                  style={{ 
                    flex: '1 1 180px', 
                    maxWidth: '260px', 
                    padding: '8px 32px 8px 12px', 
                    borderRadius: '6px', 
                    backgroundColor: '#fff',
                    textOverflow: 'ellipsis' 
                  }}
                  value={activeFilters[fo.key] || ''}
                  onChange={(e) => setActiveFilters(prev => ({ ...prev, [fo.key]: e.target.value }))}
                >
                  <option value="">Semua {fo.label}</option>
                  {derivedFilterOptions[fo.key]?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ))}
            </div>
          )}

          {/* Row 3: Search */}
          {searchKeys.length > 0 && (
            <div style={{ position: 'relative', width: '100%', maxWidth: '100%' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }}>
                <Search size={16} />
              </div>
              <input
                type="text"
                className="form-input"
                placeholder="Cari data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '40px', paddingRight: '16px', borderRadius: '6px', border: '1px solid var(--clr-border)', width: '100%' }}
              />
            </div>
          )}
        </div>
      )}
      <div className="table-container" style={{ overflowX: 'auto', position: 'relative' }}>
        <table className="data-table" style={{ minWidth: 'max-content' }}>
        <thead>
          {headerRows.map((row, rowIndex) => (
            <tr key={`header-row-${rowIndex}`}>
              {row.map((col, colIndex) => (
                <th 
                  key={`header-${rowIndex}-${colIndex}`} 
                  colSpan={col.colSpan} 
                  rowSpan={col.rowSpan}
                  style={{
                    textAlign: 'center',
                    border: '1px solid var(--clr-border)'
                  }}
                >
                  {col.header}
                </th>
              ))}
              {/* Action column header only on the first row */}
              {rowIndex === 0 && (onEdit || onDelete || onCustomAction) && (
                <th rowSpan={depth} style={{ width: '100px', border: '1px solid var(--clr-border)', textAlign: 'center' }}>Aksi</th>
              )}
            </tr>
          ))}
        </thead>
        <tbody>
          {(() => {
            if (filteredData.length === 0) {
              return (
                <tr>
                  <td colSpan={leafColumns.length + ((onEdit || onDelete || onCustomAction) ? 1 : 0)} style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="table-empty">
                      <div className="table-empty-icon"><Inbox size={40} /></div>
                      {emptyMessage}
                    </div>
                  </td>
                </tr>
              )
            }

            const renderRow = (row, rowIndex) => (
              <tr key={`row-${row.id || rowIndex}`}>
                {leafColumns.map((col, colIndex) => (
                  <td 
                    key={`cell-${row.id || rowIndex}-${colIndex}`}
                    style={{ border: '1px solid var(--clr-border)' }}
                  >
                    {col.render ? col.render(row, rowIndex) : row[col.accessor]}
                  </td>
                ))}
                {(onEdit || onDelete || onCustomAction) && (
                  <td style={{ textAlign: 'center', border: '1px solid var(--clr-border)', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'nowrap', alignItems: 'center' }}>
                      {onCustomAction && onCustomAction(row)}
                      {onEdit && (
                        <button className="btn btn-outline btn-sm" onClick={() => onEdit(row)}>
                          <Pencil size={14} style={{ marginRight: '4px', verticalAlign:'text-bottom' }} /> Edit
                        </button>
                      )}
                      {onDelete && (
                        <button className="btn btn-danger btn-sm" onClick={() => onDelete(row)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )

            if (groupBy) {
              const groups = {}
              filteredData.forEach(r => {
                const g = r[groupBy] || 'Lain-lain'
                if (!groups[g]) groups[g] = []
                groups[g].push(r)
              })
              
              let globalRowIndex = 0;
              return Object.keys(groups).map((g, gIndex) => {
                const gData = groups[g]
                return (
                  <React.Fragment key={`group-${gIndex}`}>
                    {renderGroupHeader && renderGroupHeader(g, gData)}
                    {gData.map((row) => {
                      const renderedRow = renderRow(row, globalRowIndex);
                      globalRowIndex++;
                      return renderedRow;
                    })}
                  </React.Fragment>
                )
              })
            }

            return filteredData.map((row, i) => renderRow(row, i))
          })()}
        </tbody>
        {renderFooter && <tfoot>{renderFooter(filteredData)}</tfoot>}
        </table>
      </div>
    </div>
  );
}

export default React.memo(ComplexDataTable, (prev, next) => prev.data === next.data);
