import { Component, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  RotateCcw,
  Settings,
  X,
} from 'lucide-react';
import { service } from '../services/preview';
import type { Role } from '../domain/types';
import { AppContext, useApp } from './context';
import { Avatar, Button, Modal, Notice } from '../components/ui';
import { Dashboard } from '../features/dashboard/Dashboard';
import { Directory, ProfessorProfile } from '../features/discovery/Discovery';
import { Meetings, MeetingDetails, Requests } from '../features/bookings/Meetings';
import { ChooseTime, MeetingRequest } from '../features/bookings/BookingFlow';
import { SignIn, Onboarding } from '../features/identity/Identity';
import { Notifications } from '../features/notifications/Notifications';
import { NotesPage } from '../features/notes/NotesPage';
import { AvailabilityPage } from '../features/availability/AvailabilityPage';
import { ProfileEditor } from '../features/profiles/ProfileEditor';
import { ConnectionsPage } from '../features/connections/ConnectionsPage';
import { FacultyAccessPage, BookingSupportPage } from '../features/admin/AdminPages';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="error-page">
        <h1>Let’s try that again.</h1>
        <p>The preview couldn’t display this page. Reload to restore your saved demo.</p>
        <div className="row">
          <Button onClick={() => window.location.reload()}>Reload preview</Button>
          <Button
            variant="secondary"
            onClick={() => {
              service.reset();
              this.setState({ error: false });
              window.location.assign('/');
            }}
          >
            Reset preview data
          </Button>
        </div>
      </main>
    ) : (
      this.props.children
    );
  }
}

export function App() {
  const state = useSyncExternalStore(service.subscribe, service.getSnapshot);
  const [toast, setToast] = useState('');
  const [dialog, setDialog] = useState<{ title: string; body: string } | null>(null);
  const user = state.profiles[state.session?.userId ?? 'student-viswa'];
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  return (
    <ErrorBoundary>
      <AppContext.Provider
        value={{
          state,
          user,
          notify: setToast,
          explain: (title, body) => setDialog({ title, body }),
        }}
      >
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            path="/*"
            element={state.session ? <Shell /> : <Navigate to="/signin" replace />}
          />
        </Routes>
        {toast && (
          <div className="toast" role="status">
            {toast}
            <button aria-label="Dismiss notification" onClick={() => setToast('')}>
              <X size={16} />
            </button>
          </div>
        )}
        {dialog && (
          <Modal title={dialog.title} onClose={() => setDialog(null)}>
            <p>{dialog.body}</p>
            <Button onClick={() => setDialog(null)}>Got it</Button>
          </Modal>
        )}
      </AppContext.Provider>
    </ErrorBoundary>
  );
}

function Shell() {
  const { state, user, notify } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [account, setAccount] = useState(false);
  const [reset, setReset] = useState(false);
  useEffect(() => {
    setMenu(false);
    setAccount(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  const role = state.session!.role;
  const nav =
    role === 'student'
      ? [
          ['/', 'Dashboard'],
          ['/professors', 'Find Professors'],
          ['/meetings', 'My Meetings'],
          ['/saved', 'Saved Professors'],
          ['/notes', 'Notes'],
        ]
      : role === 'professor'
        ? [
            ['/', 'Dashboard'],
            ['/requests', 'Requests'],
            ['/meetings', 'My Meetings'],
            ['/availability', 'Availability'],
            ['/connections', 'Connections'],
            ['/notes', 'Notes'],
          ]
        : [
            ['/admin/access', 'Faculty access'],
            ['/admin/bookings', 'Booking support'],
          ];
  const unread = state.notifications.filter((n) => n.userId === user.id && !n.read).length;
  function switchRole(next: Role) {
    service.switchRole(next);
    navigate(next === 'admin' ? '/admin/access' : '/');
    notify(`Now viewing the ${next} preview`);
  }
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="preview-bar">
        <div className="preview-inner">
          <span>
            <span className="preview-dot" /> Interactive preview{' '}
            <span className="preview-extra">· Sample data, real possibilities</span>
          </span>
          <div className="preview-controls">
            <label>
              View as{' '}
              <select
                aria-label="Preview role"
                value={role}
                onChange={(e) => switchRole(e.target.value as Role)}
              >
                <option value="student">Student</option>
                <option value="professor">Professor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button
              onClick={() => setReset(true)}
              title="Reset preview data"
              aria-label="Reset demo"
            >
              <RotateCcw size={13} />
              <span>Reset demo</span>
            </button>
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="nav-container">
          <Link className="brand" to="/">
            <span className="brand-icon">
              <GraduationCap size={23} />
            </span>
            Faculty<span>Connect</span>
          </Link>
          <nav className={`main-nav ${menu ? 'is-open' : ''}`} aria-label="Main navigation">
            {nav.map(([to, text]) => (
              <NavLink end={to === '/'} to={to} key={to}>
                {text}
              </NavLink>
            ))}
          </nav>
          <div className="nav-end">
            <NavLink
              to="/notifications"
              className="notification-button"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            >
              <Bell size={19} />
              {unread > 0 && <span className="notification-dot" />}
            </NavLink>
            <div className="account-wrap">
              <button
                className="account-button"
                onClick={() => setAccount(!account)}
                aria-label="Open account menu"
                aria-expanded={account}
              >
                <Avatar profile={user} size="sm" />
                <ChevronDown size={14} />
              </button>
              {account && (
                <div className="account-menu">
                  <strong>{user.name}</strong>
                  <span className="muted">{role} preview</span>
                  <Link to="/profile">
                    <Settings size={16} />
                    My profile & settings
                  </Link>
                  <button
                    onClick={() => {
                      service.signOut();
                      navigate('/signin');
                    }}
                  >
                    <LogOut size={16} />
                    Sign out of preview
                  </button>
                </div>
              )}
            </div>
            <button
              className="mobile-toggle"
              aria-label={menu ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" className="main-container" key={role}>
        {!service.persistenceAvailable && (
          <div style={{ marginBottom: 22 }}>
            <Notice tone="warning">
              Browser storage is unavailable. Your changes work in this tab, but may be lost when
              you reload.
            </Notice>
          </div>
        )}
        <Routes>
          <Route
            path="/"
            element={role === 'admin' ? <Navigate to="/admin/access" replace /> : <Dashboard />}
          />
          <Route path="/professors" element={<Directory />} />
          <Route path="/saved" element={<Directory saved />} />
          <Route path="/professors/:id" element={<ProfessorProfile />} />
          <Route path="/professors/:id/book" element={<ChooseTime />} />
          <Route path="/professors/:id/request" element={<MeetingRequest />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/meetings/:id" element={<MeetingDetails />} />
          <Route path="/meetings/:id/reschedule" element={<ChooseTime reschedule />} />
          <Route
            path="/requests"
            element={
              <RoleGate role="professor">
                <Requests />
              </RoleGate>
            }
          />
          <Route
            path="/availability"
            element={
              <RoleGate role="professor">
                <AvailabilityPage key={user.id} />
              </RoleGate>
            }
          />
          <Route
            path="/connections"
            element={
              <RoleGate role="professor">
                <ConnectionsPage />
              </RoleGate>
            }
          />
          <Route path="/profile" element={<ProfileEditor key={user.id} />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route
            path="/admin/access"
            element={
              <RoleGate role="admin">
                <FacultyAccessPage />
              </RoleGate>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <RoleGate role="admin">
                <BookingSupportPage />
              </RoleGate>
            }
          />
          <Route
            path="*"
            element={
              <div className="empty-state">
                <h1>Page not found</h1>
                <Link className="button button-primary" to="/">
                  Back to dashboard
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <span>
          <GraduationCap size={16} /> A little guidance. A world of possibility.
        </span>
        <span>
          30-minute meetings <span className="footer-dot">·</span> Frontend preview
        </span>
      </footer>
      {reset && (
        <Modal title="Start a fresh preview?" onClose={() => setReset(false)}>
          <p>
            This resets demo bookings, shared notes, private drafts, saved professors, profile
            edits, and availability on this browser.
          </p>
          <div className="row">
            <Button variant="secondary" onClick={() => setReset(false)}>
              Keep my changes
            </Button>
            <Button
              onClick={() => {
                service.reset();
                setReset(false);
                navigate('/');
                notify('Demo data has been reset');
              }}
            >
              Reset demo
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const { state } = useApp();
  return state.session?.role === role ? (
    children
  ) : (
    <Notice>This screen belongs to the {role} preview. Use “View as” to explore it.</Notice>
  );
}
