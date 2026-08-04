import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Route } from "./+types/home";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PublicCatalog } from '../components/library/PublicCatalog';
import { UserAccount } from '../components/library/UserAccount';
import { LibraryStats } from '../components/library/LibraryStats';
import { ApprovalWorkflow } from '../components/library/ApprovalWorkflow';
import { SearchDiscovery } from '../components/library/SearchDiscovery';
import { DocumentUpload } from '../components/library/DocumentUpload';
import { Dashboard } from '../components/library/Dashboard';
import { AccountManagement } from '../components/library/AccountManagement';
import { Profile } from '../components/library/Profile';
import { useAuth } from '../context/AuthContext';
import {
  Book,
  Users,
  BookOpen,
  Settings,
  BarChart3,
  Library,
  Upload,
  Search,
  LogOut,
  User,
  Bell,
  Sun,
  Moon,
  Laptop,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { apiGetPendingPapers, apiGetNotifications, apiMarkNotificationRead, type ApiNotification } from '../lib/api';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "GIMPA Thesis Repository" },
    { name: "description", content: "GIMPA Thesis Repository Platform" },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('catalog');
  const [overdueCount, setOverdueCount] = useState(0);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('gimpa_theme') as 'light' | 'dark' | 'system') || 'dark';
    }
    return 'dark';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gimpa_sidebar_collapsed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
      let activeTheme = theme;
      if (theme === 'system') {
        activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', activeTheme);
      localStorage.setItem('gimpa_theme', theme);
    };
    applyTheme(themeMode);

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode]);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('gimpa_sidebar_collapsed', String(next));
      return next;
    });
  };
  const hasRole = (role: string) => !!user && (user.role === role || (user.roles || []).includes(role as typeof user.role))
  const roleLabel = (() => {
    if (!user) return ''
    if (hasRole('system_admin')) return 'System Admin'
    if (hasRole('head_library')) return 'Head Library'
    if (hasRole('librarian')) return 'Librarian'
    if (hasRole('dean')) return 'Dean'
    if (hasRole('hod')) return 'HOD'
    if (hasRole('project_coordinator')) return 'Project Coordinator'
    if (hasRole('project_supervisor')) return 'Project Supervisor'
    if (hasRole('lecturer')) return 'Lecturer'
    if (user.role === 'student' || user.role === 'member') return 'Student'
    return user.role
  })()
  const isReviewer =
    !user?.mustChangePassword &&
    (hasRole('librarian') || hasRole('project_coordinator') || hasRole('hod') || hasRole('lecturer') || hasRole('project_supervisor'))
  const isAdminAreaUser = hasRole('system_admin')
  const isAdministrationUser = isAdminAreaUser || hasRole('dean') || hasRole('hod') || hasRole('project_coordinator') || hasRole('lecturer')

  const handleTabChange = (tab: string) => {
    const publicTabs = new Set(['catalog', 'search']);

    // Treat guest as unauthenticated: only allow public tabs
    const isGuest = user?.role === 'guest';
    const isAuthedNonGuest = isAuthenticated && !isGuest;

    if (!isAuthedNonGuest && !publicTabs.has(tab)) {
      navigate('/login');
      return;
    }

    // Role-based guards for authenticated non-guest users
    if (tab === 'approval' && !isReviewer) return;
    if (tab === 'librarian' && !isAdministrationUser) return;

    setActiveTab(tab);
  };

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!isReviewer) return
      try {
        const token = localStorage.getItem('murrs_access_token')
        if (!token) {
          if (!cancelled) setOverdueCount(0)
          return
        }
        const pending = await apiGetPendingPapers(token)
        if (!cancelled) setOverdueCount(pending.length)
      } catch {
        if (!cancelled) setOverdueCount(0)
      }
    }
    void load()
    const timer = setInterval(() => {
      void load()
    }, 10000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [isReviewer, activeTab, user?.role])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const token = localStorage.getItem('murrs_access_token')
      if (!token || !isAuthenticated || user?.role === 'guest') return
      try {
        const items = await apiGetNotifications(token)
        if (!cancelled) setNotifications(items)
      } catch {
        if (!cancelled) setNotifications([])
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.role, activeTab])

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationClick = async (id: number) => {
    const token = localStorage.getItem('murrs_access_token')
    if (!token) return
    try {
      const updated = await apiMarkNotificationRead(id, token)
      setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)))
    } catch {}
  }

  return (
    <div className="ta-app-canvas min-h-screen flex transition-colors duration-300">
      {/* Left Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} fixed inset-y-0 left-0 ta-sidebar border-r flex flex-col z-50 shadow-2xl transition-all duration-300`}>
        {/* Brand Logo & Collapse Toggle Header */}
        <div className="px-3.5 py-3.5 border-b flex items-center justify-between gap-2" style={{borderColor:'var(--border-color)'}}>
          {sidebarCollapsed ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => handleTabChange('catalog')}
                className="border-none bg-transparent p-0 cursor-pointer group"
                title="Go to Catalog Homepage"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0 group-hover:scale-105 transition-transform">
                  <Library className="size-4.5 text-white" />
                </div>
              </button>
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg hover:bg-purple-500/10 transition-colors shrink-0"
                style={{color:'var(--text-muted)'}}
                title="Expand Sidebar"
              >
                <PanelLeftOpen className="size-4" />
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleTabChange('catalog')}
                className="flex items-center gap-2.5 text-left border-none bg-transparent p-0 cursor-pointer group min-w-0 flex-1"
                title="Go to Catalog Homepage"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0 group-hover:scale-105 transition-transform">
                  <Library className="size-4.5 text-white" />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-sm font-extrabold tracking-wide leading-tight group-hover:text-purple-400 transition-colors truncate" style={{color:'var(--text-main)'}}>
                    GIMPA
                  </span>
                  <span className="text-[10px] font-semibold text-purple-400 tracking-wider uppercase leading-tight mt-0.5 truncate">
                    Thesis Repo
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg hover:bg-purple-500/10 transition-colors shrink-0"
                style={{color:'var(--text-muted)'}}
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="size-4" />
              </button>
            </>
          )}
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {/* Section: Overview */}
          <div>
            {!sidebarCollapsed && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                OVERVIEW
              </p>
            )}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleTabChange('catalog')}
                title="Catalog"
                className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} transition-all ${
                  activeTab === 'catalog'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Book className="size-4 shrink-0" />
                  {!sidebarCollapsed && <span>Catalog</span>}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('search')}
                title="Search & Discovery"
                className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} transition-all ${
                  activeTab === 'search'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Search className="size-4 shrink-0" />
                  {!sidebarCollapsed && <span>Search & Discovery</span>}
                </span>
              </button>

              {isAuthenticated && user?.role !== 'guest' && (
                <button
                  type="button"
                  onClick={() => handleTabChange('dashboard')}
                  title="Dashboard"
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <BarChart3 className="size-4 shrink-0" />
                    {!sidebarCollapsed && <span>Dashboard</span>}
                  </span>
                </button>
              )}

              {isReviewer && (
                <button
                  type="button"
                  onClick={() => handleTabChange('approval')}
                  title="Approval Workflow"
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} transition-all ${
                    activeTab === 'approval'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <BookOpen className="size-4 shrink-0" />
                    {!sidebarCollapsed && <span>Approval Workflow</span>}
                  </span>
                  {overdueCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {overdueCount}
                    </span>
                  )}
                </button>
              )}

              {isAdministrationUser && (
                <button
                  type="button"
                  onClick={() => handleTabChange('librarian')}
                  title="Administration"
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} transition-all ${
                    activeTab === 'librarian'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Settings className="size-4 shrink-0" />
                    {!sidebarCollapsed && <span>Administration</span>}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Section: Account */}
          {isAuthenticated && user?.role !== 'guest' && (
            <div>
              {!sidebarCollapsed && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                  ACCOUNT
                </p>
              )}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleTabChange('profile')}
                  title="My Profile"
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} transition-all ${
                    activeTab === 'profile'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <User className="size-4 shrink-0" />
                    {!sidebarCollapsed && <span>My Profile</span>}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Bottom User Profile Card */}
        {user && isAuthenticated ? (
          <div className="p-3 border-t" style={{borderColor:'var(--border-color)',backgroundColor:'var(--bg-sidebar)'}}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} gap-2 p-2 rounded-xl border`} style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                {!sidebarCollapsed && (
                  <div className="text-left truncate">
                    <p className="text-xs font-bold m-0 leading-tight truncate" style={{color:'var(--text-main)'}}>{user.name}</p>
                    <p className="text-[10px] text-purple-400 font-mono m-0 mt-0.5 truncate capitalize">{roleLabel}</p>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    navigate('/login');
                  }}
                  className="text-slate-400 hover:text-red-400 p-1 transition-colors shrink-0"
                  title="Logout"
                >
                  <LogOut className="size-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-white/10">
            <Button
              onClick={() => navigate('/login')}
              className="btn-ta-purple w-full text-xs"
            >
              {sidebarCollapsed ? <User className="size-4" /> : 'Sign In'}
            </Button>
          </div>
        )}
      </aside>

      {/* Main Right Content Area */}
      <div className={`${sidebarCollapsed ? 'pl-20' : 'pl-64'} flex-1 flex flex-col min-h-screen transition-all duration-300`}>
        {/* Top Header Navbar */}
        <header className="ta-header border-b sticky top-0 z-40 backdrop-blur-md px-6 py-3">
          <div className="flex items-center justify-end gap-4">
            {/* Header Right Actions */}
            <div className="flex items-center gap-3">
              {/* Header Theme Switcher Widget */}
              <div className="flex items-center p-1 rounded-xl border text-xs" style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)'}}>
                <button
                  type="button"
                  onClick={() => setThemeMode('light')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    themeMode === 'light'
                      ? 'bg-purple-600 text-white shadow-md font-semibold'
                      : 'hover:text-purple-400'
                  }`}
                  style={themeMode !== 'light' ? {color:'var(--text-muted)'} : undefined}
                  title="Light Theme"
                >
                  <Sun className="size-3.5" />
                  <span className="hidden md:inline">Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    themeMode === 'dark'
                      ? 'bg-purple-600 text-white shadow-md font-semibold'
                      : 'hover:text-purple-400'
                  }`}
                  style={themeMode !== 'dark' ? {color:'var(--text-muted)'} : undefined}
                  title="Dark Theme"
                >
                  <Moon className="size-3.5" />
                  <span className="hidden md:inline">Dark</span>
                </button>

                <button
                  type="button"
                  onClick={() => setThemeMode('system')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    themeMode === 'system'
                      ? 'bg-purple-600 text-white shadow-md font-semibold'
                      : 'hover:text-purple-400'
                  }`}
                  style={themeMode !== 'system' ? {color:'var(--text-muted)'} : undefined}
                  title="System Theme"
                >
                  <Laptop className="size-3.5" />
                  <span className="hidden md:inline">System</span>
                </button>
              </div>

              {user && isAuthenticated && (user.role === 'student' || user.role === 'member') && (
                <Button
                  onClick={() => navigate('/submit-proposal')}
                  className="btn-ta-purple text-xs flex items-center gap-1.5"
                >
                  <Upload className="size-3.5" />
                  <span>+ Submit Proposal</span>
                </Button>
              )}

              {user && isAuthenticated && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowNotifications((prev) => !prev)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all hover:border-purple-400/50 hover:text-purple-400"
                    style={{backgroundColor:'var(--bg-input)',borderColor:'var(--border-color)',color:'var(--text-sub)',position:'relative'}}
                  >
                    <Bell className="size-4" />
                    {unreadCount > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          minWidth: '14px',
                          height: '14px',
                          borderRadius: '7px',
                          backgroundColor: '#ef4444',
                          color: '#fff',
                          fontSize: '8px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 2px',
                          lineHeight: 1,
                        }}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 max-h-80 overflow-y-auto rounded-2xl shadow-2xl z-50 p-3 backdrop-blur-xl border" style={{backgroundColor:'var(--bg-card)',borderColor:'var(--border-color)'}}>
                      <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-white/10">
                        <p className="text-xs font-semibold m-0" style={{color:'var(--text-main)'}}>Notifications</p>
                        <span className="text-[10px] text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full">{unreadCount} new</span>
                      </div>
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-400 px-2 py-3 text-center">No new notifications.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => void handleNotificationClick(n.id)}
                              className={`w-full text-left p-2.5 rounded-xl text-xs transition-all border ${
                                n.is_read
                                  ? 'bg-slate-900/40 text-slate-400 border-transparent'
                                  : 'bg-purple-950/30 text-slate-200 border-purple-500/30 hover:bg-purple-900/40'
                              }`}
                            >
                              <p className="m-0 font-medium">{n.message}</p>
                              <p className="text-[10px] text-slate-500 mt-1 m-0">
                                {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 space-y-6">
          {user?.mustChangePassword && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 backdrop-blur-md flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Settings className="size-4" />
              </div>
              <div>
                <p className="font-semibold text-amber-300 m-0">First-time login security notice</p>
                <p className="m-0 text-amber-200/80">Please update your temporary password in the Profile tab to protect your repository account.</p>
              </div>
            </div>
          )}

          {activeTab === 'catalog' && <PublicCatalog />}
          {activeTab === 'search' && <SearchDiscovery />}
          {activeTab === 'dashboard' && isAuthenticated && user?.role !== 'guest' && (
            <Dashboard userRole={user?.role || 'student'} />
          )}
          {activeTab === 'profile' && isAuthenticated && user?.role !== 'guest' && <Profile />}
          {activeTab === 'approval' && isReviewer && <ApprovalWorkflow />}
          {activeTab === 'librarian' && isAdministrationUser && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-4" style={{color:'var(--text-main)'}}>Account Management & Administration</h2>
                <AccountManagement />
              </div>
              {isAdminAreaUser && (
                <div>
                  <h2 className="text-xl font-bold mb-4" style={{color:'var(--text-main)'}}>Library Statistics</h2>
                  <LibraryStats />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
