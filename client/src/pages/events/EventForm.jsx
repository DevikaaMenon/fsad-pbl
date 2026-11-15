import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { api, STATUSES } from '../../api.js';
import Field from '../../components/Field.jsx';
import { ErrorNote, Loading, PageHeader } from '../../components/Bits.jsx';
import useClubs from '../../hooks/useClubs.js';
import { manageableClubs } from '../../lib/permissions.js';

export default function EventForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify, user } = useOutletContext();
  const clubs = manageableClubs(user, useClubs().clubs);

  const [form, setForm] = useState({
    title: '', club: searchParams.get('club') || (user.role === 'lead' ? user.leadClub : ''), date: '', time: '10:00', venue: 'Seminar Hall',
    capacity: 50, budget: 0, status: 'Upcoming', description: '',
  });
  const [loaded, setLoaded] = useState(!isEdit);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get('events', id)
      .then((ev) => {
        setForm({
          title: ev.title, club: ev.club, date: ev.date, time: ev.time, venue: ev.venue,
          capacity: ev.capacity, budget: ev.budget, status: ev.status, description: ev.description || '',
        });
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
    const body = {
      ...form,
      budget: form.budget === '' ? 0 : Number(form.budget),
      capacity: form.capacity === '' ? undefined : Number(form.capacity),
    };
    try {
      const saved = isEdit ? await api.update('events', id, body) : await api.create('events', body);
      notify(isEdit ? 'Event updated' : 'Event scheduled');
      navigate(`/events/${saved._id}`);
    } catch (err) {
      setMessage(err.message === 'Validation failed' ? 'Please fix the highlighted fields.' : err.message);
      setErrors(err.details || {});
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader back={isEdit ? { to: `/events/${id}`, label: 'Back to event' } : { to: '/events', label: 'Events' }} title={isEdit ? 'Edit event' : 'Schedule an event'} />
      {!loaded && !message ? <Loading /> : (
        <form className="formcard" onSubmit={handleSubmit} noValidate>
          <ErrorNote message={message} />
          <Field label="Title" error={errors.title}>
            <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Intro to Robotics workshop" autoFocus={!isEdit} />
          </Field>
          <Field label="Organised by" error={errors.club}>
            <select name="club" value={form.club} onChange={handleChange}>
              <option value="">Choose a club</option>
              {clubs.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="row row-3">
            <Field label="Date" error={errors.date}>
              <input name="date" type="date" value={form.date} onChange={handleChange} />
            </Field>
            <Field label="Start time" error={errors.time}>
              <input name="time" type="time" value={form.time} onChange={handleChange} />
            </Field>
            <Field label="Venue" error={errors.venue}>
              <input name="venue" value={form.venue} onChange={handleChange} />
            </Field>
          </div>
          <div className="row row-3">
            <Field label="Seats" error={errors.capacity}>
              <input name="capacity" type="number" min="1" value={form.capacity} onChange={handleChange} />
            </Field>
            <Field label="Budget (₹)" error={errors.budget}>
              <input name="budget" type="number" min="0" step="0.01" value={form.budget} onChange={handleChange} />
            </Field>
            <Field label="Status" error={errors.status}>
              <select name="status" value={form.status} onChange={handleChange}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Details" error={errors.description} hint="What should students know before coming?">
            <textarea name="description" rows="4" value={form.description} onChange={handleChange} />
          </Field>
          <div className="formactions">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Schedule event'}</button>
            <button type="button" className="btn btn-quiet" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      )}
    </>
  );
}
