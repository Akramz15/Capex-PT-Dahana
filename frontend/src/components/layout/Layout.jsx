import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header  from './Header'

export default function Layout({ children }) {
  const location         = useLocation()
  const [tahun, setTahun] = useState(2026)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const childrenWithProps = typeof children === 'function'
    ? children({ tahun })
    : children

  return (
    <div className={`app-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <div className="main-content">
        <Header
          currentPath={location.pathname}
          tahun={tahun}
          onTahunChange={setTahun}
        />
        <main className="page-body">
          {childrenWithProps}
        </main>
      </div>
    </div>
  )
}
