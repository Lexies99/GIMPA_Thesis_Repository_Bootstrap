import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../context/AuthContext'
import { LogIn, BookOpen, AlertCircle, Eye, EyeOff } from 'lucide-react'

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
    <div className="min-h-screen bg-[#0b0d1b] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white tracking-wide m-0">GIMPA Thesis Repository</h2>
          <p className="text-xs text-slate-400">Sign in to access research papers, supervisor reviews & repository tools</p>
        </div>

        {/* Guest Access Card */}
        <div className="ta-card p-4 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-white m-0">Quick Guest Access</h3>
            <p className="text-xs text-slate-400 m-0">Explore thesis catalog and search abstracts without signing in</p>
          </div>
          <Button onClick={handleGuestAccess} className="btn-ta-glass w-full text-xs">
            Continue as Guest →
          </Button>
        </div>

        {/* Login Form Card */}
        <div className="ta-card p-6 space-y-5">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-white m-0">Account Sign In</h3>
            <p className="text-xs text-slate-400 m-0">Use your institutional GIMPA credentials</p>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <p className="m-0">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-xs font-medium text-slate-300">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@gimpa.edu.gh"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="mt-1"
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-xs font-medium text-slate-300">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button onClick={handleLogin} className="btn-ta-purple w-full text-xs py-2.5" disabled={loading}>
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
