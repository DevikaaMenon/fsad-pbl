import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { api, CATEGORIES } from '../../api.js';
import Field from '../../components/Field.jsx';
import { ErrorNote, Loading, PageHeader } from '../../components/Bits.jsx';
import { Forbidden } from '../../components/Guards.jsx';
import { canManage } from '../../lib/permissions.js';

const EMPTY = { name: '', category: 'Technical', description: '', coordinator: '', email: '', foundedYear: '', isActive: true };

export default function ClubForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { notify, user } = useOutletContext();

  const [form, setForm] = useState(EMPTY);
  const [loaded, setLoaded] = useState(!isEdit);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get('clubs', id)
      .then((c) => {
        setForm({
          name: c.name, category: c.category, description: c.description || '', coordinator: c.coordinator,
          email: c.email || '', foundedYear: c.foundedYear ?? '', isActive: c.isActive,
        });
        setLoaded(true);
      })
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
    const body = { ...form, foundedYear: form.foundedYear === '' ? null : Number(form.foundedYear) };
    try {
      const saved = isEdit ? await api.update('clubs', id, body) : await api.create('clubs', body);
      notify(isEdit ? 'Club details updated' : `${saved.name} created`);
      navigate(`/clubs/${saved._id}`);
    } catch (err) {
      setMessage(err.details && Object.keys(err.details).length ? 'Please fix the highlighted fields.' : err.message);
      setErrors(err.details || {});
      setSaving(false);
    }
  }

  if (isEdit && !canManage(user, id)) return <Forbidden />;

  return (
    <>
      <PageHeader
        back={isEdit ? { to: `/clubs/${id}`, label: 'Back to club' } : { to: '/clubs', label: 'Clubs' }}
        title={isEdit ? 'Edit club' : 'New club'}
      />
      {!loaded && !message ? <Loading /> : (
        <form className="formcard" onSubmit={handleSubmit} noValidate>
          <ErrorNote message={message} />
          <Field label="Club name" error={errors.name}>
            <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Robotics Club" autoFocus={!isEdit} />
          </Field>
          <div className="row">
            <Field label="Category" error={errors.category}>
              <select name="category" value={form.category} onChange={handleChange}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Founded" error={errors.foundedYear} hint="Year, optional">
              <input name="foundedYear" type="number" value={form.foundedYear} onChange={handleChange} placeholder="2015" />
            </Field>
          </div>
          <div className="row">
            <Field label="Faculty coordinator" error={errors.coordinator}>
              <input name="coordinator" value={form.coordinator} onChange={handleChange} placeholder="Dr. / Prof. …" />
            </Field>
            <Field label="Club email" error={errors.email}>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="club@rvce.edu.in" />
            </Field>
          </div>
          <Field label="About the club" error={errors.description} hint={`${form.description.length}/500`}>
            <textarea name="description" rows="4" value={form.description} onChange={handleChange} placeholder="What does the club do? When does it meet?" />
          </Field>
          <label className="switch">
            <input name="isActive" type="checkbox" checked={form.isActive} onChange={handleChange} />
            <span className="switch-track" />
            <span>
              <strong>Accepting members</strong>
              <small>Turn off if the club is on a break this semester.</small>
            </span>
          </label>
          <div className="formactions">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create club'}</button>
            <button type="button" className="btn btn-quiet" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      )}
    </>
  );
}
