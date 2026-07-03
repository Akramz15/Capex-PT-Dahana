import { DialogProvider } from "./contexts/DialogContext"

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/layout/Layout'
import LoginPage       from './pages/LoginPage'
import DashboardPage   from './pages/DashboardPage'
import RKAPMasterPage  from './pages/RKAPMasterPage'
import RealizationPage from './pages/RealizationPage'
import TimelinePage    from './pages/TimelinePage'
import AssetsPage      from './pages/AssetsPage'
import StatusPage      from './pages/StatusPage'
import LKUPage         from './pages/LKUPage'
import UsersPage       from './pages/UsersPage'
import RiwayatPengalihanPage from './pages/RiwayatPengalihanPage'

function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              {({ tahun }) => (
                <Routes>
                  <Route path="/dashboard"  element={<DashboardPage   tahun={tahun} />} />
                  <Route path="/rkap"       element={<RKAPMasterPage  tahun={tahun} />} />
                  <Route path="/rkap/riwayat" element={<RiwayatPengalihanPage tahun={tahun} />} />
                  <Route path="/realisasi"  element={<RealizationPage tahun={tahun} />} />
                  <Route path="/status"     element={<StatusPage      tahun={tahun} />} />
                  <Route path="/timeline"   element={<TimelinePage    tahun={tahun} />} />
                  <Route path="/lku"        element={<LKUPage         tahun={tahun} />} />
                  <Route path="/aset"       element={<AssetsPage />} />
                  <Route path="/users"      element={<AdminRoute><UsersPage /></AdminRoute>} />
                  <Route path="*"           element={<Navigate to="/dashboard" replace />} />
                </Routes>
              )}
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}


export default function App() {
  return (
    <BrowserRouter>
      <DialogProvider>
        <AppRoutes />
      </DialogProvider>
    </BrowserRouter>
  )
}
