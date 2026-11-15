import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../api.js';
import Field from '../../components/Field.jsx';
import { ErrorNote } from '../../components/Bits.jsx';
import AuthShell from './AuthShell.jsx';

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', usn: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: undefined });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setErrors({ confirm: "Passwords don't match" });
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const { confirm, ...body } = form; // eslint-disable-line no-unused-vars
      const user = await auth.register(body);
      onLogin(user);
      navigate('/', { replace: true });
    } catch (err) {
      setMessage(err.message === 'Validation failed' ? 'Please fix the highlighted fields.' : err.message);
      setErrors(err.details || {});
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle={<>Already registered? <Link to="/login" className="textlink">Log in</Link></>}>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <ErrorNote message={message} />
        <Field label="Full name" error={errors.name}>
          <input name="name" autoComplete="name" value={form.name} onChange={handleChange} autoFocus />
        </Field>
        <div className="row">
          <Field label="USN" error={errors.usn}>
            <input name="usn" value={form.usn} onChange={handleChange} placeholder="1RV24MC000" />
          </Field>
          <Field label="College email" error={errors.email}>
            <input name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} />
          </Field>
        </div>
        <Field label="Password" error={errors.password} hint="At least 8 characters, with a letter and a number">
          <input name="password" type="password" autoComplete="new-password" value={form.password} onChange={handleChange} />
        </Field>
        <Field label="Confirm password" error={errors.confirm}>
          <input name="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={handleChange} />
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="muted small-print">New accounts are student accounts. The student activities office can make you a club lead.</p>
      </form>
    </AuthShell>
  );
}

Register.propTypes = { onLogin: PropTypes.func.isRequired };
