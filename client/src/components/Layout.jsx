import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary.jsx';
import Icon from './Icon.jsx';
import { api } from '../api.js';
import { initials } from '../lib/format.js';
import { roleLabel } from '../lib/permissions.js';

function navFor(user) {
  const common = [
    { to: '/', label: 'Overview', icon: 'home', end: true },
    { to: '/clubs', label: 'Clubs', icon: 'clubs', end: user.role === 'lead' },
    { to: '/events', label: 'Events', icon: 'calendar' },
    { to: '/notices', label: 'Notice board', icon: 'notice' },
  ];
  if (user.role === 'student') {
    return [...common, { to: '/requests', label: 'My requests', icon: 'inbox', badge: 'pendingRequests' }];
  }
  const manager = [
    ...common,
    { to: '/members', label: 'Members', icon: 'users' },
    { to: '/requests', label: 'Join requests', icon: 'inbox', badge: 'pendingRequests' },
  ];
  if (user.role === 'lead') {
    return [{ to: `/clubs/${user.leadClub}`, label: 'My club', icon: 'star' }, ...manager];
  }
  return [...manager, { to: '/reports', label: 'Reports', icon: 'chart' }, { to: '/users', label: 'Users', icon: 'shield' }];
}

export default function Layout({ user, onUserChange, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const refreshStats = useCallback(() => {
    api.stats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => { refreshStats(); }, [refreshStats, user._id]);

  const notify = useCallback((message, tone = 'ok') => {
    clearTimeout(timer.current);
    setToast({ message, tone, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 3200);
    refreshStats();
  }, [refreshStats]);

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  async function handleLogout() {
    await onLogout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-mark">C</span>
          <span>
            <span className="brand-name">ClubHub</span>
            <span className="brand-sub">RVCE Student Activities</span>
          </span>
        </Link>
        <nav className="nav">
          {navFor(user).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-item">
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.badge && stats?.[item.badge] > 0 && <span className="nav-badge">{stats[item.badge]}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="userbox">
          <Link to="/account" className="userchip" title="Your account">
            <span className="avatar">{initials(user.name)}</span>
            <span className="userchip-text">
              <span className="userchip-name">{user.name}</span>
              <span className="userchip-role">{roleLabel(user.role)}</span>
            </span>
          </Link>
          <button type="button" className="logout" onClick={handleLogout} title="Log out" aria-label="Log out">
            <Icon name="logout" size={17} />
          </button>
        </div>
      </aside>

      <main className="main">
        <ErrorBoundary key={location.pathname}>
          <Outlet context={{ notify, stats, refreshStats, user, onUserChange }} />
        </ErrorBoundary>
      </main>

      {toast && (
        <div key={toast.id} className={`toast toast-${toast.tone}`} role="status">
          <Icon name={toast.tone === 'error' ? 'x' : 'check'} size={16} />
          {toast.message}
        </div>
      )}
    </div>
  );
}

Layout.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
    leadClub: PropTypes.string,
  }).isRequired,
  onUserChange: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
};
