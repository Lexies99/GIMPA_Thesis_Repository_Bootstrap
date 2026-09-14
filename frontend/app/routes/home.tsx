import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Route } from "./+types/home";
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
  PanelLeftClose,
  PanelLeftOpen,
  LogIn,
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gimpa_sidebar_collapsed') === 'true';
    }
    return false;
  });

  // Always force light theme to match clean professional design
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('gimpa_theme', 'light');
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('gimpa_sidebar_collapsed', String(next));
      return next;
    });
  };

  const hasRole = (role: string) => !!user && (user.role === role || (user.roles || []).includes(role as typeof user.role));
  const roleLabel = (() => {
    if (!user) return '';
    if (hasRole('system_admin')) return 'System Admin';
    if (hasRole('head_library')) return 'Head Librarian';
    if (hasRole('librarian')) return 'Librarian';
    if (hasRole('dean')) return 'Dean';
    if (hasRole('hod')) return 'HOD';
    if (hasRole('project_coordinator')) return 'Project Coordinator';
    if (hasRole('project_supervisor')) return 'Project Supervisor';
    if (hasRole('lecturer')) return 'Lecturer';
    if (user.role === 'student' || user.role === 'member') return 'Student';
    return user.role;
  })();

  const isReviewer =
    !user?.mustChangePassword &&
    (hasRole('librarian') || hasRole('project_coordinator') || hasRole('hod') || hasRole('lecturer') || hasRole('project_supervisor'));
  const isAdminAreaUser = hasRole('system_admin');
  const isAdministrationUser = isAdminAreaUser || hasRole('dean') || hasRole('hod') || hasRole('project_coordinator') || hasRole('lecturer');

  const handleTabChange = (tab: string) => {
    const publicTabs = new Set(['catalog', 'search']);
    const isGuest = user?.role === 'guest';
    const isAuthedNonGuest = isAuthenticated && !isGuest;

    if (!isAuthedNonGuest && !publicTabs.has(tab)) {
      navigate('/login');
      return;
    }
    if (tab === 'approval' && !isReviewer) return;
    if (tab === 'librarian' && !isAdministrationUser) return;
    setActiveTab(tab);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isReviewer) return;
      try {
        const token = localStorage.getItem('murrs_access_token');
        if (!token) { if (!cancelled) setOverdueCount(0); return; }
        const pending = await apiGetPendingPapers(token);
        if (!cancelled) setOverdueCount(pending.length);
      } catch { if (!cancelled) setOverdueCount(0); }
    };
    void load();
    const timer = setInterval(() => { void load(); }, 10000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [isReviewer, activeTab, user?.role]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const token = localStorage.getItem('murrs_access_token');
      if (!token || !isAuthenticated || user?.role === 'guest') return;
      try {
        const items = await apiGetNotifications(token);
        if (!cancelled) setNotifications(items);
      } catch { if (!cancelled) setNotifications([]); }
    };
    void load();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.role, activeTab]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationClick = async (id: number) => {
    const token = localStorage.getItem('murrs_access_token');
    if (!token) return;
    try {
      const updated = await apiMarkNotificationRead(id, token);
      setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch {}
  };

  // Nav items
  const navItems = ([
    { tab: 'catalog',   label: 'Catalog',           icon: Book,      show: true },
    { tab: 'search',    label: 'Search & Discovery', icon: Search,    show: true },
    { tab: 'dashboard', label: 'Dashboard',          icon: BarChart3, show: isAuthenticated && user?.role !== 'guest' },
    { tab: 'approval',  label: 'Approval Workflow',  icon: BookOpen,  show: isReviewer,            badge: overdueCount > 0 ? overdueCount : null },
    { tab: 'librarian', label: 'Administration',     icon: Settings,  show: isAdministrationUser },
  ] as Array<{tab:string;label:string;icon:React.ElementType;show:boolean|undefined;badge?:number|null}>).filter(item => item.show);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Inter', 'Outfit', sans-serif" }}>

      {/* ─── LEFT SIDEBAR ─────────────────────────────────────────── */}
      <aside
        style={{
          width: sidebarCollapsed ? '72px' : '240px',
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #2A528A 0%, #1e3f6d 100%)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          boxShadow: '4px 0 24px rgba(42,82,138,0.18)',
          transition: 'width 0.25s ease',
          overflowX: 'hidden',
        }}
      >
        {/* Brand Header */}
        <div style={{
          padding: '18px 14px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          gap: 8,
          minHeight: 64,
        }}>
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              style={{ background: 'rgba(255,255,255,0.13)', border: 'none', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              title="Expand Sidebar"
            >
              <Library style={{ width: 18, height: 18, color: '#fff' }} />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleTabChange('catalog')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', flex: 1, minWidth: 0 }}
                title="GIMPA Thesis Repository"
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Library style={{ width: 18, height: 18, color: '#fff' }} />
                </div>
                <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '0.02em', lineHeight: 1.2 }}>GIMPA</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#E9D498', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>Thesis Repo</div>
                </div>
              </button>
              <button
                type="button"
                onClick={toggleSidebar}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', padding: 4, borderRadius: 6, flexShrink: 0 }}
                title="Collapse"
              >
                <PanelLeftClose style={{ width: 16, height: 16 }} />
              </button>
            </>
          )}
        </div>

        {/* Navigation Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!sidebarCollapsed && (
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.40)', padding: '0 8px', marginBottom: 6, marginTop: 0 }}>
              Navigation
            </p>
          )}

          {navItems.map(({ tab, label, icon: Icon, badge }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)}
                title={label}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                  padding: sidebarCollapsed ? '10px' : '9px 10px',
                  borderRadius: 9,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(255,255,255,0.16)' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 13,
                  textAlign: 'left',
                  transition: 'background 0.15s, color 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)';
                  }
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isActive && (
                    <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, borderRadius: 2, background: '#E9D498' }} />
                  )}
                  <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                  {!sidebarCollapsed && <span>{label}</span>}
                </span>
                {badge != null && badge > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '1px 6px', lineHeight: 1.5 }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Account section */}
          {isAuthenticated && user?.role !== 'guest' && (
            <>
              {!sidebarCollapsed && (
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.40)', padding: '0 8px', marginTop: 20, marginBottom: 6 }}>
                  Account
                </p>
              )}
              {sidebarCollapsed && <div style={{ height: 12 }} />}
              <button
                type="button"
                onClick={() => handleTabChange('profile')}
                title="My Profile"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  padding: sidebarCollapsed ? '10px' : '9px 10px',
                  borderRadius: 9,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === 'profile' ? 'rgba(255,255,255,0.16)' : 'transparent',
                  color: activeTab === 'profile' ? '#fff' : 'rgba(255,255,255,0.75)',
                  fontWeight: activeTab === 'profile' ? 600 : 400,
                  fontSize: 13,
                  gap: 10,
                  transition: 'background 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  if (activeTab !== 'profile') {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                  }
                }}
                onMouseLeave={e => {
                  if (activeTab !== 'profile') {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)';
                  }
                }}
              >
                {activeTab === 'profile' && (
                  <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, borderRadius: 2, background: '#E9D498' }} />
                )}
                <User style={{ width: 16, height: 16, flexShrink: 0 }} />
                {!sidebarCollapsed && <span>My Profile</span>}
              </button>
            </>
          )}
        </div>

        {/* Sidebar Bottom: User Card */}
        <div style={{ padding: '10px 10px 14px', borderTop: '1px solid rgba(255,255,255,0.10)' }}>
          {user && isAuthenticated && user.role !== 'guest' ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'space-between',
              gap: 8,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '8px 10px',
              border: '1px solid rgba(255,255,255,0.10)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #5D6EC7, #9F71DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                {!sidebarCollapsed && (
                  <div style={{ overflow: 'hidden' }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
                    <p style={{ margin: 0, fontSize: 10, color: '#E9D498', marginTop: 2, textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{roleLabel}</p>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <button
                  type="button"
                  onClick={async () => { await logout(); navigate('/login'); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.40)', padding: 4, borderRadius: 6, flexShrink: 0, transition: 'color 0.15s' }}
                  title="Logout"
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#f87171'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.40)'}
                >
                  <LogOut style={{ width: 15, height: 15 }} />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '9px 14px',
                background: 'rgba(255,255,255,0.13)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 9,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.22)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.13)'}
            >
              <LogIn style={{ width: 15, height: 15 }} />
              {!sidebarCollapsed && <span>Sign In</span>}
            </button>
          )}
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ─────────────────────────────────────── */}
      <div style={{
        marginLeft: sidebarCollapsed ? 72 : 240,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        transition: 'margin-left 0.25s ease',
      }}>

        {/* ─── TOP HEADER ─────────────────────────────────────────── */}
        <header style={{
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 28px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 1px 6px rgba(42,82,138,0.06)',
        }}>
          {/* Left: breadcrumb / page title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #2A528A, #5D6EC7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Library style={{ width: 14, height: 14, color: '#fff' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.01em' }}>
              GIMPA Thesis Repository
            </span>
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

            {/* Submit Proposal button (students) */}
            {user && isAuthenticated && (user.role === 'student' || user.role === 'member') && (
              <button
                type="button"
                onClick={() => navigate('/submit-proposal')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px',
                  background: 'linear-gradient(135deg, #5D6EC7, #9F71DB)',
                  border: 'none', borderRadius: 8,
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(93,110,199,0.35)',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
              >
                <Upload style={{ width: 13, height: 13 }} />
                <span>+ Submit Proposal</span>
              </button>
            )}

            {/* Notification Bell */}
            {user && isAuthenticated && user.role !== 'guest' && (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowNotifications(prev => !prev)}
                  style={{
                    width: 38, height: 38, borderRadius: 9,
                    background: '#f1f5f9', border: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', position: 'relative', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#e2e8f0'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'}
                  title="Notifications"
                >
                  <Bell style={{ width: 16, height: 16, color: '#475569' }} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: 2, right: 2,
                      minWidth: 15, height: 15, borderRadius: 999,
                      background: '#ef4444', color: '#fff',
                      fontSize: 8, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 3px', lineHeight: 1,
                    }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                    width: 320, maxHeight: 340, overflowY: 'auto',
                    background: '#fff', border: '1px solid #e2e8f0',
                    borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    zIndex: 100, padding: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Notifications</span>
                      <span style={{ fontSize: 10, background: '#ede9fe', color: '#7c3aed', borderRadius: 999, padding: '2px 8px', fontWeight: 600 }}>
                        {unreadCount} new
                      </span>
                    </div>
                    {notifications.length === 0 ? (
                      <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '12px 0', margin: 0 }}>No new notifications.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {notifications.map(n => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => void handleNotificationClick(n.id)}
                            style={{
                              width: '100%', textAlign: 'left',
                              padding: '9px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                              background: n.is_read ? '#f8fafc' : '#f0f4ff',
                              borderLeft: n.is_read ? '3px solid transparent' : '3px solid #5D6EC7',
                              transition: 'background 0.15s',
                            }}
                          >
                            <p style={{ margin: 0, fontSize: 12, fontWeight: n.is_read ? 400 : 600, color: n.is_read ? '#64748b' : '#1e293b', lineHeight: 1.4 }}>{n.message}</p>
                            <p style={{ margin: '4px 0 0', fontSize: 10, color: '#94a3b8' }}>
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

            {/* ── SIGN IN BUTTON (top-right, for unauthenticated/guest) ── */}
            {(!isAuthenticated || user?.role === 'guest') && (
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '8px 18px',
                  background: 'linear-gradient(135deg, #2A528A, #5D6EC7)',
                  border: 'none', borderRadius: 9,
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(42,82,138,0.30)',
                  transition: 'opacity 0.15s, transform 0.15s',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.90'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
              >
                <LogIn style={{ width: 15, height: 15 }} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* ─── PAGE CONTENT ───────────────────────────────────────── */}
        <main style={{ flex: 1, padding: '28px 28px 40px', background: '#f0f4f8' }}>
          {user?.mustChangePassword && (
            <div style={{
              marginBottom: 20, padding: '14px 18px',
              background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 12,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <Settings style={{ width: 18, height: 18, color: '#d97706', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400e' }}>First-time login — please update your password</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#b45309' }}>Go to <strong>My Profile → Change Password</strong> to secure your account.</p>
              </div>
            </div>
          )}

          {activeTab === 'catalog'   && <PublicCatalog />}
          {activeTab === 'search'    && <SearchDiscovery />}
          {activeTab === 'dashboard' && isAuthenticated && user?.role !== 'guest' && (
            <Dashboard userRole={user?.role || 'student'} />
          )}
          {activeTab === 'profile'  && isAuthenticated && user?.role !== 'guest' && <Profile />}
          {activeTab === 'approval' && isReviewer && <ApprovalWorkflow />}
          {activeTab === 'librarian' && isAdministrationUser && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>Account Management &amp; Administration</h2>
                <AccountManagement />
              </div>
              {isAdminAreaUser && (
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>Library Statistics</h2>
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
