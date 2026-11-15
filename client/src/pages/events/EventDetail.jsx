import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { api } from '../../api.js';
import Field from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';
import { DateTile, EmptyState, ErrorNote, Loading, Monogram, SeatBar, StatusPill } from '../../components/Bits.jsx';
import useConfirm from '../../hooks/useConfirm.jsx';
import { daysFromToday, formatDate, formatRupees, formatTime, timeAgo, whenLabel } from '../../lib/format.js';
import { canManage } from '../../lib/permissions.js';

function RegisterForm({ eventId, onRegistered }) {
  const [form, setForm] = useState({ name: '', usn: '', email: '' });
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
      const reg = await api.create('registrations', { ...form, event: eventId });
      setForm({ name: '', usn: '', email: '' });
      setErrors({});
      onRegistered(reg); // tell the parent page
    } catch (err) {
      setMessage(err.message === 'Validation failed' ? '' : err.message);
      setErrors(err.details || {});
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit} noValidate>
      <h2 className="panel-title">Register a student</h2>
      <ErrorNote message={message} />
      <Field label="Name" error={errors.name}><input name="name" value={form.name} onChange={handleChange} /></Field>
      <Field label="USN" error={errors.usn}><input name="usn" value={form.usn} onChange={handleChange} placeholder="1RV24MC000" /></Field>
      <Field label="Email" error={errors.email} hint="Optional"><input name="email" type="email" value={form.email} onChange={handleChange} /></Field>
      <button type="submit" className="btn btn-primary btn-block" disabled={saving}>{saving ? 'Registering…' : 'Register'}</button>
    </form>
  );
}
RegisterForm.propTypes = { eventId: PropTypes.string.isRequired, onRegistered: PropTypes.func.isRequired };

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify, user } = useOutletContext();
  const [event, setEvent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [club, setClub] = useState(null);
  const [regs, setRegs] = useState([]);
  const [error, setError] = useState('');
  const [confirm, dialog] = useConfirm();

  useEffect(() => {
    setEvent(null);
    api.get('events', id)
      .then((ev) => {
        setEvent(ev);
        return Promise.all([
          api.get('clubs', ev.club),
          canManage(user, ev.club) ? api.list('registrations', { event: id }) : [],
        ]);
      })
      .then(([c, r]) => { setClub(c); setRegs(r); })
      .catch((err) => setError(err.message));
  }, [id, user]);

  function handleRegistered(reg) {
    setRegs([...regs, reg]);
    setEvent({ ...event, registered: event.registered + 1 });
    notify(`${reg.name} registered`);
  }

  async function toggleAttended(reg) {
    try {
      const updated = await api.update('registrations', reg._id, { attended: !reg.attended });
      setRegs(regs.map((r) => (r._id === updated._id ? updated : r)));
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  // a student registering / cancelling for themselves
  async function registerSelf() {
    setBusy(true);
    try {
      const reg = await api.create('registrations', { event: id });
      setEvent({ ...event, registered: event.registered + 1, myRegistration: reg });
      notify("You're registered. See you there!");
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function cancelSelf() {
    confirm({
      title: 'Cancel your registration?',
      message: 'Your seat will go to someone else.',
      confirmLabel: 'Cancel registration',
      danger: true,
      onConfirm: async () => {
        await api.remove('registrations', event.myRegistration._id);
        setEvent((ev) => ({ ...ev, registered: ev.registered - 1, myRegistration: null }));
        notify('Registration cancelled');
      },
    });
  }

  function removeReg(reg) {
    confirm({
      title: `Remove ${reg.name}'s registration?`,
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: async () => {
        await api.remove('registrations', reg._id);
        setRegs((list) => list.filter((r) => r._id !== reg._id));
        setEvent((ev) => ({ ...ev, registered: ev.registered - 1 }));
        notify('Registration removed');
      },
    });
  }

  function askDelete() {
    confirm({
      title: `Delete "${event.title}"?`,
      message: regs.length ? `${regs.length} registrations will be deleted with it.` : undefined,
      confirmLabel: 'Delete event',
      danger: true,
      onConfirm: async () => {
        await api.remove('events', id);
        notify('Event deleted');
        navigate('/events', { replace: true });
      },
    });
  }

  if (error) return <EmptyState title={error}><Link to="/events" className="btn btn-quiet">Back to events</Link></EmptyState>;
  if (!event) return <Loading />;

  const manager = canManage(user, event.club);
  const open = event.status === 'Upcoming' && event.registered < event.capacity;
  const attended = regs.filter((r) => r.attended).length;
  const mine = event.myRegistration;

  return (
    <>
      <Link to="/events" className="backlink"><Icon name="back" size={15} /> Events</Link>
      <header className="eventhero">
        <DateTile date={event.date} size="lg" />
        <div className="eventhero-text">
          <div className="clubhero-tags">
            {club && (
              <Link to={`/clubs/${club._id}/events`} className="eventhero-club">
                <Monogram name={club.name} category={club.category} size="sm" /> {club.name}
              </Link>
            )}
            {event.status !== 'Upcoming' && <StatusPill status={event.status} />}
          </div>
          <h1>{event.title}</h1>
          <p className="clubhero-meta">
            <span><Icon name="calendar" size={14} /> {formatDate(event.date, { weekday: 'long', day: 'numeric', month: 'long' })}{Math.abs(daysFromToday(event.date)) < 7 && ` · ${whenLabel(event.date)}`}</span>
            <span><Icon name="clock" size={14} /> {formatTime(event.time)}</span>
            <span><Icon name="place" size={14} /> {event.venue}</span>
            {event.budget > 0 && <span><Icon name="wallet" size={14} /> {formatRupees(event.budget)}</span>}
          </p>
        </div>
        {manager && (
          <div className="clubhero-actions">
            <Link to={`/events/${id}/edit`} className="btn btn-quiet"><Icon name="edit" size={15} /> Edit</Link>
            <button type="button" className="iconbtn iconbtn-danger" title="Delete event" onClick={askDelete}><Icon name="trash" size={17} /></button>
          </div>
        )}
      </header>

      <div className="split split-wide">
        <section>
          {event.description && <p className="prose">{event.description}</p>}
          {manager ? (<>
          <div className="section-head">
            <h2>Registrations</h2>
            {event.status === 'Completed' && regs.length > 0 && (
              <span className="muted">{attended} of {regs.length} attended</span>
            )}
          </div>
          {regs.length === 0 ? <EmptyState title="No one has registered yet" /> : (
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>USN</th><th>Registered</th><th>Attended</th><th><span className="sr-only">Remove</span></th></tr>
                </thead>
                <tbody>
                  {regs.map((r) => (
                    <tr key={r._id}>
                      <td><span className="cell-strong">{r.name}</span>{r.email && <span className="cell-sub">{r.email}</span>}</td>
                      <td className="mono">{r.usn}</td>
                      <td className="nowrap muted">{timeAgo(r.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className={`tick${r.attended ? ' tick-on' : ''}`}
                          onClick={() => toggleAttended(r)}
                          disabled={event.status === 'Cancelled'}
                          aria-pressed={r.attended}
                          aria-label={`${r.name} attended`}
                        >
                          {r.attended && <Icon name="check" size={14} />}
                        </button>
                      </td>
                      <td className="cell-actions">
                        <button type="button" className="iconbtn iconbtn-danger" title="Remove" onClick={() => removeReg(r)}><Icon name="x" size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </>) : (
            !event.description && <p className="muted">No extra details for this event.</p>
          )}
        </section>

        <aside className="sidecol">
          <div className="panel">
            <h2 className="panel-title">Seats</h2>
            <SeatBar registered={event.registered} capacity={event.capacity} />
          </div>
          {mine ? (
            <div className="panel panel-good">
              <p className="panel-title"><Icon name="check" size={16} /> You&apos;re registered</p>
              <p className="muted">
                {mine.attended ? 'Marked as attended. Thanks for coming!' : `Registered ${timeAgo(mine.createdAt)}.`}
              </p>
              {event.status === 'Upcoming' && <button type="button" className="btn btn-quiet btn-block" onClick={cancelSelf}>Cancel registration</button>}
            </div>
          ) : open && user.usn && !manager ? (
            <div className="panel">
              <p className="panel-title">Want to go?</p>
              <p className="muted">We&apos;ll register you as {user.name} ({user.usn}).</p>
              <button type="button" className="btn btn-primary btn-block" onClick={registerSelf} disabled={busy}>{busy ? 'Registering…' : 'Register'}</button>
            </div>
          ) : !open ? (
            <div className="panel panel-muted">
              <p>
                {event.status === 'Upcoming' ? 'This event is full.' : `Registrations are closed: this event is ${event.status.toLowerCase()}.`}
              </p>
            </div>
          ) : null}
          {manager && open && <RegisterForm eventId={id} onRegistered={handleRegistered} />}
        </aside>
      </div>
      {dialog}
    </>
  );
}
