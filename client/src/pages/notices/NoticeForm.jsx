import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api.js';
import Field from '../../components/Field.jsx';
import { ErrorNote, Loading, PageHeader } from '../../components/Bits.jsx';
import useClubs from '../../hooks/useClubs.js';
import { manageableClubs } from '../../lib/permissions.js';

export default function NoticeForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify, user } = useOutletContext();
  const clubs = manageableClubs(user, useClubs().clubs);

  const [form, setForm] = useState({ club: searchParams.get('club') || (user.role === 'lead' ? user.leadClub : ''), title: '', body: '', pinned: false });
  const [loaded, setLoaded] = useState(!isEdit);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get('announcements', id)
      .then((n) => { setForm({ club: n.club, title: n.title, body: n.body, pinned: n.pinned }); setLoaded(true); })
      .catch((err) => setMessage(err.message));
  }, [id, isEdit]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    if (errors[name]) setErrors({ ...errors, [name]: undefined });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const saved = isEdit ? await api.update('announcements', id, form) : await api.create('announcements', form);
      notify(isEdit ? 'Notice updated' : 'Notice posted');
      navigate(`/clubs/${saved.club}/notices`);
    } catch (err) {
      setMessage(err.message === 'Validation failed' ? 'Please fix the highlighted fields.' : err.message);
      setErrors(err.details || {});
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader back={{ to: '/notices', label: 'Notice board' }} title={isEdit ? 'Edit notice' : 'Post a notice'} />
      {!loaded && !message ? <Loading /> : (
        <form className="formcard" onSubmit={handleSubmit} noValidate>
          <ErrorNote message={message} />
          <Field label="From" error={errors.club}>
            <select name="club" value={form.club} onChange={handleChange}>
              <option value="">Choose a club</option>
              {clubs.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Headline" error={errors.title} hint={`${form.title.length}/100`}>
            <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Auditions this Friday" />
          </Field>
          <Field label="Notice" error={errors.body} hint={`${form.body.length}/2000`}>
            <textarea name="body" rows="7" value={form.body} onChange={handleChange} />
          </Field>
          <label className="switch">
            <input name="pinned" type="checkbox" checked={form.pinned} onChange={handleChange} />
            <span className="switch-track" />
            <span>
              <strong>Pin to the top</strong>
              <small>Pinned notices stay above newer ones.</small>
            </span>
          </label>
          <div className="formactions">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Post notice'}</button>
            <button type="button" className="btn btn-quiet" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      )}
    </>
  );
}
