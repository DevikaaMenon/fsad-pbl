import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { api, ROLES } from '../../api.js';
import Field from '../../components/Field.jsx';
import { ErrorNote, Loading, PageHeader } from '../../components/Bits.jsx';
import useClubs from '../../hooks/useClubs.js';
import { manageableClubs } from '../../lib/permissions.js';

export default function MemberForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify, user } = useOutletContext();
  const clubs = manageableClubs(user, useClubs().clubs);

  const [form, setForm] = useState({
    name: '', usn: '', email: '', role: 'Member',
    club: searchParams.get('club') || (user.role === 'lead' ? user.leadClub : ''),
    joinedOn: new Date().toISOString().slice(0, 10),
  });
  const [loaded, setLoaded] = useState(!isEdit);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get('members', id)
      .then((m) => {
        setForm({ name: m.name, usn: m.usn, email: m.email || '', role: m.role, club: m.club, joinedOn: m.joinedOn });
        setLoaded(true);
      })
      .catch((err) => setMessage(err.message));
  }, [id, isEdit]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: undefined });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const saved = isEdit ? await api.update('members', id, form) : await api.create('members', form);
      notify(isEdit ? 'Member updated' : `${saved.name} added`);
      navigate(`/clubs/${saved.club}/members`);
    } catch (err) {
      setMessage(err.message === 'Validation failed' ? 'Please fix the highlighted fields.' : err.message);
      setErrors(err.details || {});
      setSaving(false);
    }
  }

  const backTo = form.club ? { to: `/clubs/${form.club}/members`, label: 'Back to club' } : { to: '/members', label: 'Members' };

  return (
    <>
      <PageHeader back={backTo} title={isEdit ? 'Edit member' : 'Add a member'} />
      {!loaded && !message ? <Loading /> : (
        <form className="formcard" onSubmit={handleSubmit} noValidate>
          <ErrorNote message={message} />
          <div className="row">
            <Field label="Full name" error={errors.name}>
              <input name="name" value={form.name} onChange={handleChange} autoFocus={!isEdit} />
            </Field>
            <Field label="USN" error={errors.usn}>
              <input name="usn" value={form.usn} onChange={handleChange} placeholder="1RV24MC000" />
            </Field>
          </div>
          <div className="row">
            <Field label="Club" error={errors.club}>
              <select name="club" value={form.club} onChange={handleChange}>
                <option value="">Choose a club</option>
                {clubs.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Role" error={errors.role}>
              <select name="role" value={form.role} onChange={handleChange}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
          </div>
          <div className="row">
            <Field label="Email" error={errors.email} hint="Optional">
              <input name="email" type="email" value={form.email} onChange={handleChange} />
            </Field>
            <Field label="Joined on" error={errors.joinedOn}>
              <input name="joinedOn" type="date" value={form.joinedOn} onChange={handleChange} />
            </Field>
          </div>
          <div className="formactions">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add member'}</button>
            <button type="button" className="btn btn-quiet" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      )}
    </>
  );
}
