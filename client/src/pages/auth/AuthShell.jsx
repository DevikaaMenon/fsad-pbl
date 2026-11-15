import PropTypes from 'prop-types';

// Two-panel frame shared by the login and sign-up pages
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="brand">
          <span className="brand-mark">C</span>
          <span>
            <span className="brand-name">ClubHub</span>
            <span className="brand-sub">RVCE Student Activities</span>
          </span>
        </div>
        <div className="auth-pitch">
          <p className="auth-quote">Every club, event and notice on campus, in one place.</p>
          <ul>
            <li>Find clubs and ask to join</li>
            <li>Register for events in one click</li>
            <li>Club leads run members, events and attendance</li>
          </ul>
        </div>
        <p className="auth-foot">Student Activities Office · RV College of Engineering</p>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <h1>{title}</h1>
          {subtitle && <p className="muted auth-sub">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}

AuthShell.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.node,
  children: PropTypes.node.isRequired,
};
