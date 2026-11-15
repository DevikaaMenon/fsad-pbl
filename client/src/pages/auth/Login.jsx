import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../../api.js';
import Field from '../../components/Field.jsx';
import { ErrorNote } from '../../components/Bits.jsx';
import AuthShell from './AuthShell.jsx';

// seeded by `npm run seed`; hide with VITE_SHOW_DEMO=false
const DEMO = [
  { label: 'Admin', email: 'admin@rvce.edu.in', note: 'Student Activities Office' },
  { label: 'Club lead', email: 'arjun.das@rvce.edu.in', note: 'Arjun Das · Coding Club' },
  { label: 'Student', email: 'priya.menon@rvce.edu.in', note: 'Priya Menon' },
];
const DEMO_PASSWORD = 'clubhub123';
const showDemo = import.meta.env.VITE_SHOW_DEMO !== 'false';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: undefined });
  }

  async function signIn(email, password) {
    setBusy(true);
    setMessage('');
    try {
      const user = await auth.login(email, password);
      onLogin(user); // tell App who is logged in
      navigate(from, { replace: true });
    } catch (err) {
      setMessage(err.message);
      setErrors(err.details || {});
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    signIn(form.email, form.password);
  }

  return (
    <AuthShell title="Log in" subtitle={<>New here? <Link to="/register" className="textlink">Create a student account</Link></>}>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <ErrorNote message={message} />
        <Field label="College email" error={errors.email}>
          <input name="email" type="email" autoComplete="username" value={form.email} onChange={handleChange} autoFocus />
        </Field>
        <Field label="Password" error={errors.password}>
          <input name="password" type="password" autoComplete="current-password" value={form.password} onChange={handleChange} />
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>

      {showDemo && (
        <div className="demo">
          <p className="demo-title">Demo accounts <span className="muted">· password {DEMO_PASSWORD}</span></p>
          {DEMO.map((d) => (
            <button key={d.email} type="button" className="demo-row" disabled={busy} onClick={() => signIn(d.email, DEMO_PASSWORD)}>
              <span className="demo-role">{d.label}</span>
              <span className="demo-note">{d.note}</span>
            </button>
          ))}
        </div>
      )}
    </AuthShell>
  );
}

Login.propTypes = { onLogin: PropTypes.func.isRequired };
