import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  apiChangePassword,
  apiLogin,
  apiLogout,
  apiMe,
  apiRefresh,
  apiRegister,
  apiUpdateUser,
  type ApiUserRole,
  type ApiUser,
} from '../lib/api'

export type UserRole = 'guest' | ApiUserRole

export interface User {
  id: number
  email: string
  schoolId?: string
  school?: string
  name: string
  role: UserRole
  roles?: UserRole[]
  university?: string
  department?: string
  mustChangePassword?: boolean
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string, role: UserRole) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  createAccount: (
    email: string,
    password: string,
    name: string,
    role: ApiUserRole,
    schoolId?: string,
    school?: string,
    department?: string,
  ) => Promise<{ ok: boolean; error?: string }>
  setUser: (user: User | null) => void
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>
  updateProfile: (name: string, department?: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ACCESS_TOKEN_KEY = 'murrs_access_token'
const REFRESH_TOKEN_KEY = 'murrs_refresh_token'
const USER_KEY = 'murrs_user'

const roleFromApiUser = (user: ApiUser): UserRole => user.role || (user.is_admin ? 'librarian' : 'member')
const ROLE_PRIORITY: UserRole[] = [
  'system_admin',
  'head_library',
  'librarian',
  'dean',
  'hod',
  'project_coordinator',
  'project_supervisor',
  'lecturer',
  'staff',
  'student',
  'member',
  'guest',
]

const getEffectiveRole = (roles: UserRole[], fallback: UserRole): UserRole => {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role
  }
  return fallback
}

const buildUser = (apiUser: ApiUser, extras?: Partial<User>): User => {
  const primaryRole = roleFromApiUser(apiUser)
  const apiRoles = (apiUser.roles && apiUser.roles.length > 0 ? apiUser.roles : [primaryRole]) as UserRole[]
  const mergedRoles = Array.from(
    new Set(
      [...apiRoles, ...(extras?.roles || []), primaryRole].filter(Boolean) as UserRole[],
    ),
  )
  const effectiveRole = getEffectiveRole(mergedRoles, primaryRole)
  return {
    id: apiUser.id,
    email: apiUser.email,
    schoolId: apiUser.school_id || extras?.schoolId,
    school: apiUser.school || extras?.school,
    name: apiUser.full_name || apiUser.email.split('@')[0],
    role: effectiveRole,
    roles: mergedRoles,
    university: extras?.university,
    department: apiUser.department || extras?.department,
    mustChangePassword: typeof apiUser.must_change_password === 'boolean' ? apiUser.must_change_password : extras?.mustChangePassword,
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const restore = async () => {
      const storedUser = localStorage.getItem(USER_KEY)
      const storedAccess = localStorage.getItem(ACCESS_TOKEN_KEY)
      const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY)

      if (!storedAccess || !storedUser) return

      try {
        const parsed = JSON.parse(storedUser) as User
        const apiUser = await apiMe(storedAccess)
        const rebuilt = buildUser(apiUser, parsed)
        setUser(rebuilt)
        localStorage.setItem(USER_KEY, JSON.stringify(rebuilt))
      } catch {
        if (!storedRefresh) {
          setUser(null)
          localStorage.removeItem(USER_KEY)
          localStorage.removeItem(ACCESS_TOKEN_KEY)
          return
        }
        try {
          const refreshed = await apiRefresh(storedRefresh)
          localStorage.setItem(ACCESS_TOKEN_KEY, refreshed.access_token)
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshed.refresh_token)
          const apiUser = await apiMe(refreshed.access_token)
          const rebuilt = buildUser(apiUser)
          setUser(rebuilt)
          localStorage.setItem(USER_KEY, JSON.stringify(rebuilt))
        } catch {
          setUser(null)
          localStorage.removeItem(USER_KEY)
          localStorage.removeItem(ACCESS_TOKEN_KEY)
          localStorage.removeItem(REFRESH_TOKEN_KEY)
        }
      }
    }

    restore()
  }, [])

  const login = async (email: string, password: string, role: UserRole): Promise<{ ok: boolean; error?: string }> => {
    if (!email || !password) return { ok: false, error: 'Please enter email and password' }

    if (role === 'guest') {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      const guest: User = {
        id: Date.now(),
        email,
        name: 'Guest',
        role: 'guest',
        roles: ['guest'],
      }
      setUser(guest)
      localStorage.setItem(USER_KEY, JSON.stringify(guest))
      return { ok: true }
    }

    try {
      const tokens = await apiLogin(email, password)
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)

      const apiUser = await apiMe(tokens.access_token)
      const nextUser = buildUser(apiUser, { mustChangePassword: tokens.must_change_password })
      setUser(nextUser)
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
      return { ok: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.'
      return { ok: false, error: message }
    }
  }

  const logout = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (refreshToken) {
      try {
        await apiLogout(refreshToken)
      } catch {}
    }
    setUser(null)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  const createAccount = async (
    email: string,
    password: string,
    name: string,
    role: ApiUserRole,
    schoolId?: string,
    school?: string,
    department?: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!email || !password || !name || !role) {
      return { ok: false, error: 'Please fill in all required fields' }
    }

    try {
      await apiRegister(email, password, name, role, schoolId, school, department)
      return { ok: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Account creation failed. Please try again.'
      return { ok: false, error: message }
    }
  }

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!user || !oldPassword || !newPassword) return false
    if (oldPassword === newPassword) return false

    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!accessToken) return false

    try {
      const apiUser = await apiChangePassword(oldPassword, newPassword, accessToken)
      const updated: User = { ...buildUser(apiUser, user), mustChangePassword: false }
      setUser(updated)
      localStorage.setItem(USER_KEY, JSON.stringify(updated))
      return true
    } catch {
      if (!refreshToken) return false
      try {
        const tokens = await apiRefresh(refreshToken)
        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
        const apiUser = await apiChangePassword(oldPassword, newPassword, tokens.access_token)
        const updated: User = { ...buildUser(apiUser, user), mustChangePassword: false }
        setUser(updated)
        localStorage.setItem(USER_KEY, JSON.stringify(updated))
        return true
      } catch {
        return false
      }
    }
  }

  const updateProfile = async (name: string, department?: string): Promise<boolean> => {
    if (!user || !name) return false

    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!accessToken) return false

    try {
      const apiUser = await apiUpdateUser(user.id, { full_name: name, department }, accessToken)
      const updated: User = { ...buildUser(apiUser), department: department || user.department, university: user.university }
      setUser(updated)
      localStorage.setItem(USER_KEY, JSON.stringify(updated))
      return true
    } catch {
      if (!refreshToken) return false
      try {
        const tokens = await apiRefresh(refreshToken)
        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
        const apiUser = await apiUpdateUser(user.id, { full_name: name, department }, tokens.access_token)
        const updated: User = { ...buildUser(apiUser), department: department || user.department, university: user.university }
        setUser(updated)
        localStorage.setItem(USER_KEY, JSON.stringify(updated))
        return true
      } catch {
        return false
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, createAccount, setUser, changePassword, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
