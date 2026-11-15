import { Link, useLocation, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/Bits.jsx';

export default function NotFound() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <EmptyState title="We couldn't find that page">
      <p>There&apos;s nothing at <code>{pathname}</code>.</p>
      <div className="formactions">
        <button type="button" className="btn btn-quiet" onClick={() => navigate(-1)}>Go back</button>
        <Link to="/" className="btn btn-primary">Overview</Link>
      </div>
    </EmptyState>
  );
}
