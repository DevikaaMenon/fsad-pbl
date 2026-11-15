import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { auth } from '../../api.js';
import Field from '../../components/Field.jsx';
import { ErrorNote, PageHeader } from '../../components/Bits.jsx';
import useClubs from '../../hooks/useClubs.js';
import { formatDate } from '../../lib/format.js';
import { roleLabel } from '../../lib/permissions.js';

function ProfileForm() {
  const { user, onUserChange, notify } = useOutletContext();
  const [form, setForm] = useState({ name: user.name, email: user.email, usn: user.usn || '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: undefined });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const body = { name: form.name, email: form.email };
      if (!user.usn && form.usn) body.usn = form.usn;
      const updated = await auth.updateProfile(body);
      onUserChange(updated);
      notify('Profile saved');
    } catch (err) {
      setMessage(err.message === 'Validation failed' ? 'Please fix the highlighted fields.' : err.message);
      setErrors(err.details || {});
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="formcard" onSubmit={handleSubmit} noValidate>
      <h2>Profile</h2>
      <ErrorNote message={message} />
      <Field label="Full name" error={errors.name}>
        <input name="name" value={form.name} onChange={handleChange} />
      </Field>
      <div className="row">
        <Field label="Email" error={errors.email}>
          <input name="email" type="email" value={form.email} onChange={handleChange} />
        </Field>
        <Field label="USN" error={errors.usn} hint={user.usn ? 'Contact the office to correct a wrong USN' : 'Needed to join clubs and register for events'}>
          <input name="usn" value={form.usn} onChange={handleChange} disabled={Boolean(user.usn)} />
        </Field>
      </div>
      <div className="formactions">
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const { notify } = useOutletContext();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: undefined });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setErrors({ confirm: "Passwords don't match" });
      return;
    }
    setSaving(true);
    try {
      await auth.changePassword(form.currentPassword, form.newPassword);
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setErrors({});
      notify('Password changed');
    } catch (err) {
      setErrors(Object.keys(err.details || {}).length ? err.details : { currentPassword: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="formcard" onSubmit={handleSubmit} noValidate>
      <h2>Change password</h2>
      <Field label="Current password" error={errors.currentPassword}>
        <input name="currentPassword" type="password" autoComplete="current-password" value={form.currentPassword} onChange={handleChange} />
      </Field>
      <div className="row">
        <Field label="New password" error={errors.newPassword} hint="8+ characters, a letter and a number">
          <input name="newPassword" type="password" autoComplete="new-password" value={form.newPassword} onChange={handleChange} />
        </Field>
        <Field label="Repeat new password" error={errors.confirm}>
          <input name="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={handleChange} />
        </Field>
      </div>
      <div className="formactions">
        <button type="submit" className="btn btn-quiet" disabled={saving}>{saving ? 'Changing…' : 'Change password'}</button>
      </div>
    </form>
  );
}

export default function Account() {
  const { user } = useOutletContext();
  const { clubsById } = useClubs();
  const club = user.leadClub && clubsById[user.leadClub];

  return (
    <>
      <PageHeader eyebrow={roleLabel(user.role)} title="Your account" />
      <p className="lede account-lede">
        {user.role === 'lead' && club && <>You lead <Link to={`/clubs/${club._id}`} className="textlink">{club.name}</Link>. </>}
        {user.role === 'admin' && 'You can manage every club, user and report. '}
        Member since {formatDate(user.createdAt.slice(0, 10), { month: 'long', year: 'numeric' })}.
      </p>
      <div className="stack-forms">
        <ProfileForm />
        <PasswordForm />
      </div>
    </>
  );
}
