import PropTypes from 'prop-types';
import { Link, Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { EmptyState } from './Bits.jsx';

// Shown while we check whether someone is logged in
export function Splash() {
  return (
    <div className="splash">
      <span className="brand-mark">C</span>
    </div>
  );
}

// Logged-out visitors are sent to /login, remembering where they were going
export function RequireAuth({ user, children }) {
  const location = useLocation();
  if (user === undefined) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}
RequireAuth.propTypes = { user: PropTypes.object, children: PropTypes.node.isRequired };

export function Forbidden() {
  return (
    <EmptyState title="This page isn't available for your account">
      <p>Ask the student activities office if you think you should have access.</p>
      <Link to="/" className="btn btn-quiet">Back to overview</Link>
    </EmptyState>
  );
}

// <Route element={<RequireRole roles={['admin']} />}> ... </Route>
export function RequireRole({ roles }) {
  const context = useOutletContext();
  if (!roles.includes(context.user.role)) return <Forbidden />;
  return <Outlet context={context} />;
}
RequireRole.propTypes = { roles: PropTypes.arrayOf(PropTypes.string).isRequired };
