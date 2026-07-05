import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { login } from '../api/auth'
import { AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { Briefcase } from 'lucide-react'
import logoUrl from '../assets/Logo_DAHANA_CAGEUR.png'

export default function LoginPage() {
  const navigate  = useNavigate()
  const setAuth   = useAuthStore((s) => s.setAuth)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(email, password)
      setAuth(res.data.user, res.data.access_token)
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail[0].msg)
      } else {
        setError(detail ?? 'Email atau password salah. Coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header" style={{ textAlign: 'center' }}>
          <img 
            src={logoUrl} 
            alt="Logo PT Dahana" 
            style={{ 
              width: '100%', 
              maxWidth: '450px', 
              height: 'auto', 
              display: 'block', 
              margin: '-150px auto -163px auto', /* Margin minus yang jauh lebih besar untuk merapatkan kontainer */
              objectFit: 'contain'
            }} 
          />
          {/* <h1 className="login-title" style={{ marginTop: 0 }}>Monitoring Capex</h1> */}
          <p className="login-sub">PT Dahana Sistem Monitoring Investasi</p>
        </div>

        {error && <div className="login-error" role="alert"><AlertTriangle size={16} style={{display:'inline', verticalAlign:'text-bottom', marginRight:'4px'}} /> {error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">
              Email <span className="required">*</span>
            </label>
            <input
              id="email-input"
              type="email"
              className="form-input"
              placeholder="nama@dahana.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">
              Password <span className="required">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  padding: '0',
                  margin: '0',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
            id="login-submit-btn"
          >
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
