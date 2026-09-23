import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { LogIn, BookOpen, AlertCircle, Eye, EyeOff, Library } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async () => {
    setError('')

    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    const result = await login(email, password, 'student')
    setLoading(false)

    if (!result.ok) {
      setError(result.error || 'Login failed. Please check your credentials.')
      return
    }

    navigate('/')
  }

  const handleGuestAccess = async () => {
    const result = await login('guest@murrs.edu', 'guest', 'guest')
    if (result.ok) {
      navigate('/')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #f0f4f8 0%, #e4eaf5 100%)',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      {/* ── MOBILE TOP BANNER (visible < 1024px) ────────── */}
      <div
        className="login-mobile-banner"
        style={{
          background: 'linear-gradient(155deg, #2A528A 0%, #5D6EC7 60%, #9F71DB 100%)',
          position: 'relative',
          overflow: 'hidden',
          padding: '32px 24px 28px',
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Brand logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div
              style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.2)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Library size={20} color="#fff" />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '16px', lineHeight: 1.2 }}>GIMPA</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Thesis Repository</div>
            </div>
          </div>

          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '24px', lineHeight: 1.3, margin: '0 0 10px' }}>
            Access the Knowledge Repository
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 20px', maxWidth: '480px' }}>
            Discover, review, and manage academic theses, research proposals, and scholarly publications from GIMPA.
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '28px' }}>
            {[
              { label: 'Theses', value: '2,400+' },
              { label: 'Students', value: '850+' },
              { label: 'Departments', value: '12' },
            ].map((stat) => (
              <div key={stat.label}>
                <div style={{ color: '#E9D498', fontWeight: 800, fontSize: '20px' }}>{stat.value}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginTop: '2px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT WRAPPER ────────────────────────── */}
      <div
        className="login-layout-wrapper"
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* ── DESKTOP LEFT PANEL (visible ≥ 1024px) ──── */}
        <div
          className="login-desktop-panel"
          style={{
            width: '440px',
            minWidth: '380px',
            flexShrink: 0,
            background: 'linear-gradient(155deg, #2A528A 0%, #5D6EC7 60%, #9F71DB 100%)',
            position: 'relative',
            overflow: 'hidden',
            display: 'none', /* shown via CSS media query */
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px',
          }}
        >
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ position: 'absolute', bottom: '60px', left: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', bottom: '-40px', right: '20px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

          {/* Brand */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
              <div
                style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.2)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Library size={22} color="#fff" />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '18px', lineHeight: 1.2 }}>GIMPA</div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Thesis Repository</div>
              </div>
            </div>

            <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '32px', lineHeight: 1.25, margin: '0 0 16px' }}>
              Access the Knowledge Repository
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '15px', lineHeight: 1.65, margin: 0 }}>
              Discover, review, and manage academic theses, research proposals, and scholarly publications from GIMPA.
            </p>
          </div>

          {/* Stats row */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', gap: '24px' }}>
              {[
                { label: 'Theses', value: '2,400+' },
                { label: 'Students', value: '850+' },
                { label: 'Departments', value: '12' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div style={{ color: '#E9D498', fontWeight: 800, fontSize: '22px' }}>{stat.value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '2px' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT LOGIN PANEL ─────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 24px',
            background: 'transparent',
            minWidth: 0,
          }}
        >
          <div style={{ width: '100%', maxWidth: '420px' }}>

            {/* Card */}
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                boxShadow: '0 4px 24px rgba(42,82,138,0.1), 0 1px 4px rgba(42,82,138,0.06)',
                border: '1px solid #dde3ee',
                overflow: 'hidden',
              }}
            >
              {/* Card Header */}
              <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid #edf0f7' }}>
                <h2 style={{ color: '#1a2340', fontWeight: 700, fontSize: '20px', margin: '0 0 4px' }}>Sign In</h2>
                <p style={{ color: '#6b7a9a', fontSize: '13px', margin: 0 }}>Use your GIMPA institutional credentials</p>
              </div>

              {/* Card Body */}
              <div style={{ padding: '28px 32px' }}>
                {/* Error alert */}
                {error && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '12px 14px',
                      background: 'rgba(239,68,68,0.06)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: '10px',
                      marginBottom: '20px',
                    }}
                  >
                    <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span style={{ fontSize: '13px', color: '#dc2626' }}>{error}</span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Email */}
                  <div>
                    <label
                      htmlFor="login-email"
                      style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#3d4f6e', marginBottom: '6px' }}
                    >
                      Email Address
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      placeholder="name@gimpa.edu.gh"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={handleKeyDown}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        fontSize: '14px',
                        border: '1.5px solid #dde3ee',
                        borderRadius: '8px',
                        background: '#f5f7fa',
                        color: '#1a2340',
                        outline: 'none',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#5D6EC7'
                        e.target.style.boxShadow = '0 0 0 3px rgba(93,110,199,0.15)'
                        e.target.style.background = '#fff'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#dde3ee'
                        e.target.style.boxShadow = 'none'
                        e.target.style.background = '#f5f7fa'
                      }}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="login-password"
                      style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#3d4f6e', marginBottom: '6px' }}
                    >
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{
                          width: '100%',
                          padding: '10px 44px 10px 14px',
                          fontSize: '14px',
                          border: '1.5px solid #dde3ee',
                          borderRadius: '8px',
                          background: '#f5f7fa',
                          color: '#1a2340',
                          outline: 'none',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#5D6EC7'
                          e.target.style.boxShadow = '0 0 0 3px rgba(93,110,199,0.15)'
                          e.target.style.background = '#fff'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#dde3ee'
                          e.target.style.boxShadow = 'none'
                          e.target.style.background = '#f5f7fa'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#9aaabb',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 0,
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit button */}
                  <button
                    type="button"
                    onClick={handleLogin}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '11px 20px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#fff',
                      background: loading
                        ? 'rgba(42,82,138,0.6)'
                        : 'linear-gradient(135deg, #2A528A 0%, #5D6EC7 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: loading ? 'none' : '0 4px 14px rgba(42,82,138,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      letterSpacing: '0.015em',
                    }}
                  >
                    <LogIn size={16} />
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>
                </div>
              </div>

              {/* Card Footer - Guest Access */}
              <div
                style={{
                  padding: '16px 32px 24px',
                  borderTop: '1px solid #edf0f7',
                  background: '#fafbfd',
                }}
              >
                <p style={{ fontSize: '12px', color: '#6b7a9a', margin: '0 0 10px', textAlign: 'center' }}>
                  Want to explore without an account?
                </p>
                <button
                  type="button"
                  onClick={handleGuestAccess}
                  style={{
                    width: '100%',
                    padding: '9px 20px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#3d4f6e',
                    background: '#fff',
                    border: '1.5px solid #dde3ee',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                  onMouseOver={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#5D6EC7'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#2A528A'
                    ;(e.currentTarget as HTMLButtonElement).style.background = '#f5f7fa'
                  }}
                  onMouseOut={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#dde3ee'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#3d4f6e'
                    ;(e.currentTarget as HTMLButtonElement).style.background = '#fff'
                  }}
                >
                  Continue as Guest →
                </button>
              </div>
            </div>

            {/* Footer note */}
            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#9aaabb' }}>
              © {new Date().getFullYear()} GIMPA Thesis Repository · Institutional Access Only
            </p>
          </div>
        </div>
      </div>

      {/* ── CSS for responsive login layout ──────────── */}
      <style>{`
        /* Mobile: show top banner, hide desktop side panel */
        .login-mobile-banner {
          display: block;
        }
        .login-desktop-panel {
          display: none !important;
        }
        .login-layout-wrapper {
          flex-direction: column;
        }

        /* Desktop (≥1024px): hide top banner, show side panel */
        @media (min-width: 1024px) {
          .login-mobile-banner {
            display: none !important;
          }
          .login-desktop-panel {
            display: flex !important;
          }
          .login-layout-wrapper {
            flex-direction: row;
          }
        }
      `}</style>
    </div>
  )
}
