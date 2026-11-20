import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import type { Route } from "./+types/home";
import { PublicCatalog } from '../components/library/PublicCatalog';
import { LibraryStats } from '../components/library/LibraryStats';
import { ApprovalWorkflow } from '../components/library/ApprovalWorkflow';
import { SearchDiscovery } from '../components/library/SearchDiscovery';
import { Dashboard } from '../components/library/Dashboard';
import { AccountManagement } from '../components/library/AccountManagement';
import { Profile } from '../components/library/Profile';
import { PhdHub } from '../components/library/PhdHub';
import { MyThesisSubmissions, isSubmissionActive } from '../components/library/MyThesisSubmissions';
import { useAuth } from '../context/AuthContext';
import {
  Book,
  BookOpen,
  Settings,
  BarChart3,
  Upload,
  Search,
  LogOut,
  User,
  Bell,
  LogIn,
  Menu,
  X,
  GraduationCap,
  Building2,
  Globe,
  HelpCircle,
  Sun,
  Moon,
  FileText,
} from 'lucide-react';
import { apiGetPendingPapers, apiGetNotifications, apiMarkNotificationRead, apiGetMyPapers, type ApiNotification } from '../lib/api';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "GIMPA Thesis Repository" },
    { name: "description", content: "GIMPA Thesis Repository Platform" },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) return tab;
    }
    return 'catalog';
  });
  const [overdueCount, setOverdueCount] = useState(0);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasActiveSubmission, setHasActiveSubmission] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gimpa_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('gimpa_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileDrawerOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const hasRole = (role: string) => !!user && (user.role === role || (user.roles || []).includes(role as typeof user.role));
  const roleLabel = (() => {
    if (!user) return 'Public Guest';
    if (hasRole('system_admin')) return 'System Admin';
    if (hasRole('deputy_rector')) return 'Deputy Rector';
    if (hasRole('head_library')) return 'Head Librarian';
    if (hasRole('librarian')) return 'Librarian';
    if (hasRole('dean')) return 'Dean';
    if (hasRole('hod')) return 'HOD';
    if (hasRole('project_coordinator')) return 'Project Coordinator';
    if (hasRole('project_supervisor')) return 'Project Supervisor';
    if (hasRole('lecturer')) return 'Lecturer';
    if (user.role === 'student' || user.role === 'member') return 'Student';
    if (user.role === 'guest') return 'Public Guest';
    return user.role;
  })();

  const isSystemAdmin = hasRole('system_admin');
  const isDeputyRector = hasRole('deputy_rector');
  const isLibrarian = !isSystemAdmin && (hasRole('librarian') || hasRole('head_library'));
  const isAcademicLeadership = isDeputyRector || hasRole('dean') || hasRole('hod') || hasRole('project_coordinator');
  const isSupervisorRole = hasRole('project_supervisor') || hasRole('lecturer');
  const isPhdStudent =
    (user?.role === 'student' || user?.role === 'member') &&
    (Boolean(user?.program && (user.program.toLowerCase().includes('phd') || user.program.toLowerCase().includes('doctor'))));

  const canViewPhdHub = !isLibrarian && (isSystemAdmin || isDeputyRector || isAcademicLeadership || isSupervisorRole || isPhdStudent);

  const isReviewer =
    !user?.mustChangePassword &&
    (isLibrarian || isAcademicLeadership || isSupervisorRole || isSystemAdmin || isDeputyRector);

  const isAdminAreaUser = isSystemAdmin || isDeputyRector;
  const isAdministrationUser = isSystemAdmin || isDeputyRector || hasRole('dean') || hasRole('hod') || hasRole('project_coordinator');

  const handleTabChange = (tab: string) => {
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
    const publicTabs = new Set(['catalog', 'search']);
    const isGuest = user?.role === 'guest';
    const isAuthedNonGuest = isAuthenticated && !isGuest;

    if (!isAuthedNonGuest && !publicTabs.has(tab)) {
      navigate('/login');
      return;
    }
    if (tab === 'phd' && !canViewPhdHub) return;
    if (tab === 'approval' && !isReviewer) return;
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  useEffect(() => {
    if (activeTab === 'phd' && !canViewPhdHub) {
      setActiveTab('dashboard');
    }
    if (activeTab === 'approval' && !isReviewer) {
      setActiveTab('dashboard');
    }
    if (activeTab === 'librarian' && !isAdministrationUser) {
      setActiveTab('dashboard');
    }
  }, [activeTab, canViewPhdHub, isReviewer, isAdministrationUser]);

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

  useEffect(() => {
    let cancelled = false;
    const loadMySubs = async () => {
      const token = localStorage.getItem('murrs_access_token');
      if (!token || !isAuthenticated || user?.role === 'guest') {
        if (!cancelled) setHasActiveSubmission(false);
        return;
      }
      try {
        const mine = await apiGetMyPapers(token);
        if (!cancelled) {
          setHasActiveSubmission(mine.some((p) => isSubmissionActive(p.status)));
        }
      } catch {
        if (!cancelled) setHasActiveSubmission(false);
      }
    };
    void loadMySubs();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.role, activeTab]);

  const isStudentRole = !!user && (user.role === 'student' || user.role === 'member');

  const navItems = ([
    { tab: 'dashboard',   label: 'Dashboard & Reports',   icon: BarChart3,     show: isAuthenticated && user?.role !== 'guest' },
    { tab: 'submissions', label: 'My Thesis Submissions', icon: FileText,      show: isAuthenticated && isStudentRole, badge: hasActiveSubmission ? 1 : null },
    { tab: 'catalog',     label: 'Catalog',               icon: Book,          show: true },
    { tab: 'search',      label: 'Search & Discovery',    icon: Search,        show: true },
    { tab: 'approval',    label: 'Approval Workflow',     icon: BookOpen,      show: isReviewer, badge: overdueCount > 0 ? overdueCount : null },
    { tab: 'phd',         label: 'PhD Hub',               icon: GraduationCap, show: canViewPhdHub },
    { tab: 'librarian',   label: 'Schools and users',     icon: Building2,     show: isAdministrationUser },
    { tab: 'profile',     label: 'My Profile',            icon: User,          show: isAuthenticated && user?.role !== 'guest' },
  ] as Array<{tab:string;label:string;icon:React.ElementType;show:boolean|undefined;badge?:number|null}>).filter(item => item.show);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: "'Outfit', 'Inter', sans-serif" }}>

      {/* ─── FULL-WIDTH FINPLANNER SAGE TOP HEADER ────────────────────── */}
      <header
        className="gimpa-header"
        style={{
          background: 'var(--bg-header)',
          borderBottom: '1px solid var(--border-header)',
          padding: isMobile ? '0 16px' : '0 36px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 60,
        }}
      >
        {/* Left: Brand Emblem + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="gimpa-mobile-menu-btn"
            style={{
              background: 'rgba(128,128,128,0.14)',
              border: 'none',
              borderRadius: 8,
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-main)',
            }}
            title="Toggle Menu"
          >
            {mobileDrawerOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange(isAuthenticated && user?.role !== 'guest' ? 'dashboard' : 'catalog')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: '2px solid var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-main)',
            }}>
              <Globe style={{ width: 18, height: 18, strokeWidth: 2.2 }} />
            </div>
            <span style={{
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--text-main)',
              letterSpacing: '-0.01em',
            }}>
              GIMPA Repository
            </span>
          </button>
        </div>

        {/* Right: Clean Minimal Outline Icons + Theme Toggle + Primary Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16 }}>
          {/* Submit Proposal / Active Submission Pill (Students) */}
          {user && isAuthenticated && (user.role === 'student' || user.role === 'member') && (
            <button
              type="button"
              onClick={() => {
                if (hasActiveSubmission) {
                  handleTabChange('submissions');
                } else {
                  navigate('/submit-proposal');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: isMobile ? '7px 12px' : '8px 16px',
                background: 'var(--fp-olive)',
                border: 'none',
                borderRadius: 8,
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title={hasActiveSubmission ? 'View your active thesis submission (1 at a time)' : 'Submit a new thesis proposal'}
            >
              {hasActiveSubmission ? <FileText style={{ width: 14, height: 14 }} /> : <Upload style={{ width: 14, height: 14 }} />}
              <span>
                {hasActiveSubmission
                  ? (isMobile ? 'My Submission' : 'Active Submission (1/1)')
                  : (isMobile ? '+ Submit' : '+ Submit Proposal')}
              </span>
            </button>
          )}

          {/* Light / Dark Mode Toggle Pill */}
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid var(--border-header)',
              background: 'var(--fp-sage)',
              color: 'var(--fp-sage-text)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <>
                <Sun style={{ width: 15, height: 15 }} />
                {!isMobile && <span>Light</span>}
              </>
            ) : (
              <>
                <Moon style={{ width: 15, height: 15 }} />
                {!isMobile && <span>Dark</span>}
              </>
            )}
          </button>

          {/* Profile Icon */}
          {user && isAuthenticated && user.role !== 'guest' && (
            <button
              type="button"
              onClick={() => handleTabChange('profile')}
              style={{
                background: 'none',
                border: 'none',
                padding: 6,
                cursor: 'pointer',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: activeTab === 'profile' ? 1 : 0.8,
              }}
              title="My Profile"
            >
              <User style={{ width: 21, height: 21, strokeWidth: 1.9 }} />
            </button>
          )}

          {/* Notifications / Help Icon */}
          {user && isAuthenticated && user.role !== 'guest' ? (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowNotifications(prev => !prev)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 6,
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
                title="Notifications"
              >
                <Bell style={{ width: 21, height: 21, strokeWidth: 1.9 }} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 999,
                    background: 'var(--fp-olive)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 10px)',
                  width: 340,
                  maxHeight: 380,
                  overflowY: 'auto',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 14,
                  boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
                  zIndex: 100,
                  padding: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>Notifications</span>
                    <span style={{ fontSize: 11, background: 'var(--fp-sage)', color: 'var(--fp-sage-text)', borderRadius: 999, padding: '2px 10px', fontWeight: 600 }}>
                      {unreadCount} new
                    </span>
                  </div>
                  {notifications.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', margin: 0 }}>No new notifications.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {notifications.map(n => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => void handleNotificationClick(n.id)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: 'none',
                            cursor: 'pointer',
                            background: n.is_read ? 'var(--bg-main)' : 'var(--bg-subtle)',
                            borderLeft: n.is_read ? '3px solid transparent' : '3px solid var(--fp-olive)',
                          }}
                        >
                          <p style={{ margin: 0, fontSize: 12.5, fontWeight: n.is_read ? 400 : 600, color: 'var(--text-main)', lineHeight: 1.45 }}>{n.message}</p>
                          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                            {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleTabChange('search')}
              style={{
                background: 'none',
                border: 'none',
                padding: 6,
                cursor: 'pointer',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Search & Help"
            >
              <HelpCircle style={{ width: 21, height: 21, strokeWidth: 1.9 }} />
            </button>
          )}

          {/* Settings / Administration Icon */}
          {user && isAuthenticated && user.role !== 'guest' && (
            <button
              type="button"
              onClick={() => handleTabChange(isAdministrationUser ? 'librarian' : 'profile')}
              style={{
                background: 'none',
                border: 'none',
                padding: 6,
                cursor: 'pointer',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={isAdministrationUser ? "Administration Settings" : "Account Settings"}
            >
              <Settings style={{ width: 21, height: 21, strokeWidth: 1.9 }} />
            </button>
          )}

          {/* Logout / Sign In Icon */}
          {user && isAuthenticated && user.role !== 'guest' ? (
            <button
              type="button"
              onClick={async () => { await logout(); navigate('/login'); }}
              style={{
                background: 'none',
                border: 'none',
                padding: 6,
                cursor: 'pointer',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Log out"
            >
              <LogOut style={{ width: 21, height: 21, strokeWidth: 1.9 }} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: 'var(--fp-olive)',
                border: 'none',
                borderRadius: 8,
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Log in"
            >
              <LogIn style={{ width: 15, height: 15 }} />
              <span>Log in</span>
            </button>
          )}
        </div>
      </header>

      {/* ─── BODY CONTAINER (SIDEBAR + MAIN WORKSPACE) ──────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 64px)' }}>

        {/* Mobile Backdrop */}
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className={`gimpa-mobile-backdrop ${mobileDrawerOpen ? 'open' : ''}`}
        />

        {/* ─── LEFT SIDEBAR ─────────────────────────────────────────── */}
        <aside
          className={`gimpa-sidebar ${mobileDrawerOpen ? 'open' : ''}`}
          style={{
            padding: '32px 20px',
          }}
        >
          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {navItems.map(({ tab, label, icon: Icon, badge }) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleTabChange(tab)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    background: isActive ? 'var(--fp-sage)' : 'transparent',
                    color: isActive ? 'var(--fp-sage-text)' : 'var(--text-main)',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: 14,
                    textAlign: 'left',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Icon style={{ width: 18, height: 18, color: isActive ? 'var(--fp-sage-text)' : 'var(--text-main)', strokeWidth: isActive ? 2.1 : 1.7, flexShrink: 0 }} />
                    <span>{label}</span>
                  </span>
                  {badge != null && badge > 0 && (
                    <span style={{
                      background: 'var(--fp-olive)',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 999,
                      padding: '2px 8px',
                      lineHeight: 1.4,
                    }}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom Summary Section */}
          <div style={{
            marginTop: 32,
            padding: '20px 8px',
            borderTop: '1px solid var(--border-color)',
            borderBottom: '1px solid var(--border-color)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginBottom: 4 }}>
              {user && isAuthenticated && user.role !== 'guest' ? 'Active role & account' : 'Repository status'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {roleLabel}
            </div>
            {user && isAuthenticated && user.role !== 'guest' && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </div>
            )}
          </div>
        </aside>

        {/* ─── MAIN WORKSPACE CANVAS ────────────────────────────────── */}
        <main
          className="gimpa-main-content"
          style={{
            flex: 1,
            padding: isMobile ? '24px 16px 40px' : '40px 52px 64px',
            background: 'var(--bg-main)',
            width: '100%',
            maxWidth: '100%',
            overflowX: 'hidden',
          }}
        >
          {user?.mustChangePassword && (
            <div style={{
              marginBottom: 28,
              padding: '16px 22px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Settings style={{ width: 18, height: 18, color: 'var(--fp-olive)', flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>First-time login — please update your password</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>Go to <strong>My Profile → Change Password</strong> to secure your account.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('profile')}
                className="btn-fp-sage"
                style={{ padding: '8px 16px', fontSize: 12.5 }}
              >
                Update Password
              </button>
            </div>
          )}

          {activeTab === 'catalog'     && <PublicCatalog />}
          {activeTab === 'search'      && <SearchDiscovery />}
          {activeTab === 'submissions' && isAuthenticated && user?.role !== 'guest' && <MyThesisSubmissions />}
          {activeTab === 'dashboard'   && isAuthenticated && user?.role !== 'guest' && (
            <Dashboard userRole={user?.role || 'student'} onTabChange={handleTabChange} />
          )}
          {activeTab === 'phd' && canViewPhdHub && <PhdHub />}
          {activeTab === 'profile'  && isAuthenticated && user?.role !== 'guest' && <Profile />}
          {activeTab === 'approval' && isReviewer && <ApprovalWorkflow />}
          {activeTab === 'librarian' && isAdministrationUser && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
              <AccountManagement />
              {isAdminAreaUser && (
                <div>
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
