import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { logout as apiLogout } from '../../api/auth'
import { LayoutDashboard, ClipboardList, TrendingUp, Calendar, Factory, Key, Eye } from 'lucide-react'
import { useDialog } from '../../contexts/DialogContext'

import logoUrl from '../../assets/MONITORING CAPEX.png'

const NAV_ITEMS = [
  { to: '/dashboard',   icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/rkap',        icon: <ClipboardList size={18} />, label: 'RKAP Master' },
  { to: '/realisasi',   icon: <TrendingUp size={18} />, label: 'Realisasi' },
  { to: '/timeline',    icon: <Calendar size={18} />, label: 'Timeline' },
  { to: '/aset',        icon: <Factory size={18} />, label: 'Data Aset' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const dialog = useDialog()

  const handleLogout = async () => {
    try { await apiLogout() } catch { /* ignore */ }
    logout()
    navigate('/login')
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <aside className="sidebar">
      <div className="sidebar-brand" style={{ display: 'flex', justifyContent: 'center', padding: '24px 24px 12px 24px' }}>
        <div style={{ backgroundColor: 'white', width: '100%', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', overflow: 'hidden', padding: '0', display: 'flex', justifyContent: 'center' }}>
          <img src={logoUrl} alt="Monitoring Capex Logo" style={{ height: '150px', width: 'auto', maxWidth: 'none', display: 'block', margin: '-50px 0 -45px 0' }} />
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Menu Utama</div>
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name ?? 'Pengguna'}</div>
            <div className="sidebar-user-role">{user?.role === 'admin' ? <><Key size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Admin</> : <><Eye size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Manajemen</>}</div>
          </div>
          <button
            className="sidebar-logout"
            onClick={() => {
              dialog.confirm({
                title: 'Konfirmasi Logout',
                message: 'Apakah Anda yakin ingin keluar dari sistem?',
                confirmText: 'Keluar',
                variant: 'danger',
                onConfirm: handleLogout
              });
            }}
            title="Keluar"
            aria-label="Logout"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
