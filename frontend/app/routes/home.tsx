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
import { Book, Users, BookOpen, Settings, BarChart3, Library, Upload, Search, LogOut, User, Bell } from 'lucide-react';
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Library className="size-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">GIMPA Thesis Repository</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user && isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative"
                      onClick={() => setShowNotifications((prev) => !prev)}
                    >
                      <Bell className="size-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] px-1 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                    {showNotifications && (
                      <div className="absolute right-0 mt-2 w-96 max-h-80 overflow-y-auto rounded-md border bg-card shadow-lg z-50 p-2">
                        <p className="text-xs font-semibold px-2 py-1">Notifications</p>
                        {notifications.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-2 py-2">No notifications yet.</p>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => void handleNotificationClick(n.id)}
                              className={`w-full text-left px-2 py-2 rounded text-xs ${n.is_read ? 'text-muted-foreground' : 'bg-muted/60'}`}
                            >
                              <p>{n.message}</p>
                              <p className="text-[10px] mt-1">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {roleLabel}
                    </p>
                    {user.university && (
                      <p className="text-xs text-muted-foreground">{user.university}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await logout();
                      navigate('/login');
                    }}
                    className="flex items-center gap-2"
                  >
                    <LogOut className="size-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="capitalize">Guest User</Badge>
                  <Button
                    size="sm"
                    onClick={() => navigate('/login')}
                  >
                    Login
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {user?.mustChangePassword && (
          <div className="mb-4 rounded-md border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            First-time login detected. Change your temporary password in the Profile tab to continue using all features.
          </div>
        )}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className={`grid w-full mb-6 ${
            isAdministrationUser ? 'grid-cols-7' :
            isReviewer ? 'grid-cols-6' :
            user?.role === 'student' || user?.role === 'member' ? 'grid-cols-5' :
            'grid-cols-2'
          }`}>
            <TabsTrigger value="catalog" className="flex items-center gap-2">
              <Book className="size-4" />
              <span className="hidden sm:inline">Catalog</span>
            </TabsTrigger>
            
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="size-4" />
              <span className="hidden sm:inline">Search</span>
            </TabsTrigger>

            {isAuthenticated && user?.role !== 'guest' && (
              <TabsTrigger 
                value="dashboard" 
                className="flex items-center gap-2"
              >
                <BarChart3 className="size-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
            )}

            {isAuthenticated && user?.role !== 'guest' && (
              <TabsTrigger 
                value="profile"
                className="flex items-center gap-2"
              >
                <User className="size-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
            )}

            {isReviewer && (
              <TabsTrigger 
                value="approval"
                className="flex items-center gap-2 relative"
              >
                <BookOpen className="size-4" />
                <span className="hidden sm:inline">Approval</span>
                {overdueCount > 0 && (
                  <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
                    {overdueCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}

            {isAdministrationUser && (
              <TabsTrigger 
                value="librarian"
                className="flex items-center gap-2"
              >
                <Settings className="size-4" />
                <span className="hidden sm:inline">Administration</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="catalog">
            <PublicCatalog />
          </TabsContent>

          <TabsContent value="search">
            <SearchDiscovery />
          </TabsContent>

          {isAuthenticated && user?.role !== 'guest' && (
            <TabsContent value="dashboard">
              <Dashboard userRole={user?.role || 'student'} />
            </TabsContent>
          )}

          {isReviewer && (
            <TabsContent value="approval">
              <ApprovalWorkflow />
            </TabsContent>
          )}

          {isAdministrationUser && (
            <TabsContent value="librarian">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Account Management</h2>
                  <AccountManagement />
                </div>
                {isAdminAreaUser && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Library Statistics</h2>
                  <LibraryStats />
                </div>
                )}
              </div>
            </TabsContent>
          )}

          {isAuthenticated && user?.role !== 'guest' && (
            <TabsContent value="profile">
              <Profile />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
