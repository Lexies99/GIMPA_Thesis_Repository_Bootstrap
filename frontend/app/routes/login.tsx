import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { AlertCircle, Eye, EyeOff, Globe } from 'lucide-react'

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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white text-[#1a1d1a] font-sans">
      {/* ── LEFT SAGE PANEL (FinPlanner Image 5) ── */}
      <div className="w-full lg:w-[44%] bg-[#d8e5c7] flex flex-col justify-between p-8 lg:p-12 relative overflow-hidden min-h-[280px] lg:min-h-screen">
        {/* Top-left Brand */}
        <div className="flex items-center gap-3 z-10">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-full border-2 border-[#1a1d1a] text-[#1a1d1a]">
            <Globe className="h-5 w-5 stroke-[2]" />
          </div>
          <span className="text-[19px] font-bold tracking-tight text-[#1a1d1a]">
            GIMPA Repository
          </span>
        </div>

        {/* Center Illustration matching FinPlanner Image 5 */}
        <div className="flex-1 flex items-center justify-center py-6 lg:py-0">
          <svg
            viewBox="0 0 420 420"
            className="w-full max-w-[340px] lg:max-w-[380px] h-auto select-none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Large soft off-white circle backdrop */}
            <circle cx="235" cy="205" r="142" fill="#f4f6f0" />

            {/* Subtle top horizontal line inside circle */}
            <line x1="150" y1="128" x2="352" y2="128" stroke="#dcdfd6" strokeWidth="1.5" />

            {/* Clipped area chart inside circle */}
            <clipPath id="fpCircleClip">
              <circle cx="235" cy="205" r="142" />
            </clipPath>
            <g clipPath="url(#fpCircleClip)">
              {/* Olive green area chart hills */}
              <path
                d="M168 285 C172 245, 185 225, 200 223 C220 220, 238 198, 258 200 C278 202, 295 222, 315 218 C335 214, 355 185, 380 182 L380 285 Z"
                fill="#5a6552"
              />
              {/* Dashed guide lines */}
              <line x1="258" y1="200" x2="375" y2="200" stroke="#282838" strokeWidth="1.2" strokeDasharray="4 4" />
              <line x1="200" y1="223" x2="375" y2="223" stroke="#282838" strokeWidth="1.2" strokeDasharray="4 4" />

              {/* Vertical drop lines from chart points */}
              <line x1="200" y1="223" x2="200" y2="285" stroke="#282838" strokeWidth="1.5" />
              <line x1="258" y1="200" x2="258" y2="285" stroke="#282838" strokeWidth="1.5" />
              <line x1="315" y1="218" x2="315" y2="285" stroke="#282838" strokeWidth="1.5" />

              {/* Baseline */}
              <line x1="158" y1="285" x2="380" y2="285" stroke="#282838" strokeWidth="1.8" />

              {/* Data node dots */}
              <circle cx="200" cy="223" r="6" fill="#282838" />
              <circle cx="258" cy="200" r="6" fill="#282838" />
              <circle cx="315" cy="218" r="6" fill="#282838" />
            </g>

            {/* Small decorative botanical leaf at bottom left */}
            <path
              d="M98 378 C84 360, 78 338, 75 325 C90 330, 104 348, 102 378 Z"
              fill="#f4f6f0"
            />
            <path
              d="M95 378 C90 362, 84 345, 78 330"
              stroke="#d8e5c7"
              strokeWidth="1.5"
            />

            {/* Character standing on the left pointing at the first chart node */}
            {/* Ground line */}
            <line x1="65" y1="378" x2="195" y2="378" stroke="#c5d4b2" strokeWidth="1.8" />

            {/* Shoes */}
            <path d="M114 371 L126 371 L130 378 L112 378 Z" fill="#282838" />
            <path d="M138 371 L150 371 L155 378 L136 378 Z" fill="#282838" />

            {/* Ankles */}
            <rect x="116" y="364" width="6" height="8" fill="#f2d6ce" />
            <rect x="140" y="364" width="6" height="8" fill="#f2d6ce" />

            {/* Dark trousers */}
            <path
              d="M104 282 L144 282 L148 365 L137 365 L128 310 L124 365 L113 365 Z"
              fill="#282838"
            />

            {/* Right arm pointing up to first chart node (200, 223) */}
            <path
              d="M136 238 L188 222 L191 230 L142 252 Z"
              fill="#dce7d0"
            />
            {/* Pointing hand */}
            <circle cx="192" cy="224" r="5" fill="#f2d6ce" />

            {/* Torso / Sweater in soft sage */}
            <path
              d="M100 232 C100 226, 108 222, 122 222 C136 222, 144 226, 146 236 L144 284 L103 284 Z"
              fill="#dce7d0"
            />

            {/* Neck & Head */}
            <rect x="117" y="212" width="10" height="12" rx="4" fill="#f2d6ce" />
            <circle cx="123" cy="203" r="12" fill="#f2d6ce" />
            {/* Hair */}
            <path
              d="M110 204 C109 192, 118 186, 128 189 C134 191, 136 196, 134 200 C128 197, 122 198, 118 203 C116 206, 113 208, 110 204 Z"
              fill="#282838"
            />

            {/* Left arm holding thesis document */}
            <path
              d="M100 234 L94 268 L116 274 L118 265 L106 260 L110 238 Z"
              fill="#dce7d0"
            />

            {/* Thesis / Document card in hand */}
            <rect x="114" y="256" width="26" height="34" rx="3" fill="#ffffff" stroke="#dcdfd6" strokeWidth="1.2" />
            <line x1="119" y1="264" x2="134" y2="264" stroke="#b8c0b4" strokeWidth="2" strokeLinecap="round" />
            <line x1="119" y1="270" x2="135" y2="270" stroke="#b8c0b4" strokeWidth="2" strokeLinecap="round" />
            <line x1="119" y1="276" x2="132" y2="276" stroke="#b8c0b4" strokeWidth="2" strokeLinecap="round" />
            <line x1="119" y1="282" x2="128" y2="282" stroke="#b8c0b4" strokeWidth="2" strokeLinecap="round" />
            {/* Hand holding document */}
            <circle cx="115" cy="272" r="4.5" fill="#f2d6ce" />
          </svg>
        </div>

        {/* Subtle bottom caption */}
        <div className="text-[12px] text-[#5a6552] font-medium hidden lg:block">
          Ghana Institute of Management and Public Administration · Digital Thesis Archive
        </div>
      </div>

      {/* ── RIGHT WHITE LOGIN PANEL (FinPlanner Image 5) ── */}
      <div className="flex-1 bg-white flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-[380px]">
          <h1 className="text-[36px] font-bold text-[#1a1d1a] text-center tracking-tight mb-10">
            Log in
          </h1>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 mb-6 rounded-xl bg-[#fdf2f0] border border-[#f5d0ca] text-[#c93b2b] text-[13px]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label
                htmlFor="login-email"
                className="block text-[13px] font-medium text-[#1a1d1a] mb-2"
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="name@gimpa.edu.gh"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-12 px-4 rounded-lg border border-[#e2e5dc] bg-white text-[14px] text-[#1a1d1a] placeholder:text-[#8c9489] focus:outline-none focus:border-[#5a6552] focus:ring-2 focus:ring-[#5a6552]/15 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-[13px] font-medium text-[#1a1d1a] mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-12 pl-4 pr-11 rounded-lg border border-[#e2e5dc] bg-white text-[14px] text-[#1a1d1a] placeholder:text-[#8c9489] focus:outline-none focus:border-[#5a6552] focus:ring-2 focus:ring-[#5a6552]/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8c9489] hover:text-[#1a1d1a] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="w-full h-12 rounded-lg bg-[#dce7d0] hover:bg-[#ceddc0] text-[#1a1d1a] font-bold text-[14px] transition-colors cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </div>
          </div>

          {/* Secondary actions */}
          <div className="mt-8 pt-6 border-t border-[#eaece4] flex flex-col gap-3 text-center">
            <button
              type="button"
              onClick={handleGuestAccess}
              className="w-full h-10 rounded-lg border border-[#e2e5dc] bg-[#fafbf8] hover:bg-[#f0f4ea] text-[#1a1d1a] text-[13px] font-medium transition-colors cursor-pointer"
            >
              Continue as Guest
            </button>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="text-[12px] text-[#6e766b] hover:text-[#1a1d1a] transition-colors cursor-pointer"
            >
              GIMPA Academic Staff? Request an account →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
