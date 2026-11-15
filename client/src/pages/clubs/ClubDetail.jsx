import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import Icon from '../../components/Icon.jsx';
import { CategoryTag, EmptyState, ErrorNote, Loading, Monogram } from '../../components/Bits.jsx';
import { EventRow, NoticeCard, RequestCard } from '../../components/Cards.jsx';
import MemberTable from '../../components/MemberTable.jsx';
import useConfirm from '../../hooks/useConfirm.jsx';
import { categoryColor, plural } from '../../lib/format.js';
import { canManage, isAdmin } from '../../lib/permissions.js';
import { Forbidden } from '../../components/Guards.jsx';

// /clubs/:id — loads the club once and shares it with the tab routes via <Outlet context>
export default function ClubDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify, user } = useOutletContext();
  const [club, setClub] = useState(null);
  const [membership, setMembership] = useState(null); // the user's own member record here
  const [myRequest, setMyRequest] = useState(null); // their pending join request here
  const [error, setError] = useState('');
  const [confirm, dialog] = useConfirm();
  const manager = canManage(user, id);

  const reload = useCallback(() => {
    api.get('clubs', id).then(setClub).catch((err) => setError(err.message));
    if (user.usn) {
      api.list('members', { mine: 'true' }).then((list) => setMembership(list.find((m) => m.club === id) || null)).catch(() => {});
      api.list('requests', { mine: 'true', status: 'Pending' }).then((list) => setMyRequest(list.find((r) => r.club === id) || null)).catch(() => {});
    }
  }, [id, user.usn]);

  useEffect(() => { setClub(null); setError(''); reload(); }, [reload]);

  function askLeave() {
    confirm({
      title: `Leave ${club.name}?`,
      message: 'You will be taken off the member list. You can ask to join again later.',
      confirmLabel: 'Leave club',
      danger: true,
      onConfirm: async () => {
        try {
          await api.remove('members', membership._id);
          notify(`You left ${club.name}`);
          reload();
        } catch (err) {
          notify(err.message, 'error');
        }
      },
    });
  }

  async function withdraw() {
    try {
      await api.remove('requests', myRequest._id);
      notify('Request withdrawn');
      reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  function askDelete() {
    confirm({
      title: `Delete ${club.name}?`,
      message: 'This also removes its members, events, registrations, notices and join requests. It cannot be undone.',
      confirmLabel: 'Delete club',
      danger: true,
      onConfirm: async () => {
        try {
          await api.remove('clubs', id);
          notify(`${club.name} deleted`);
          navigate('/clubs', { replace: true });
        } catch (err) {
          notify(err.message, 'error');
        }
      },
    });
  }

  if (error) {
    return (
      <EmptyState title={error}>
        <Link to="/clubs" className="btn btn-quiet">Back to clubs</Link>
      </EmptyState>
    );
  }
  if (!club) return <Loading />;

  return (
    <>
      <Link to="/clubs" className="backlink"><Icon name="back" size={15} /> Clubs</Link>
      <header className="clubhero" style={{ '--c': categoryColor(club.category) }}>
        <Monogram name={club.name} category={club.category} size="lg" />
        <div className="clubhero-text">
          <div className="clubhero-tags">
            <CategoryTag category={club.category} />
            {!club.isActive && <span className="pill pill-cancelled">On a break</span>}
          </div>
          <h1>{club.name}</h1>
          <p className="clubhero-meta">
            <span>Coordinator: {club.coordinator}</span>
            {club.email && <a href={`mailto:${club.email}`}><Icon name="mail" size={14} /> {club.email}</a>}
            {club.foundedYear && <span>Since {club.foundedYear}</span>}
          </p>
        </div>
        <div className="clubhero-actions">
          {membership ? (
            <>
              <span className="pill pill-approved">Member · {membership.role}</span>
              {!manager && <button type="button" className="textbtn" onClick={askLeave}>Leave</button>}
            </>
          ) : myRequest ? (
            <>
              <span className="pill pill-pending">Request pending</span>
              <button type="button" className="textbtn" onClick={withdraw}>Withdraw</button>
            </>
          ) : (club.isActive && user.usn && !manager && (
            <Link to={`/clubs/${id}/join`} className="btn btn-primary">Ask to join</Link>
          ))}
          {manager && <Link to={`/clubs/${id}/edit`} className="btn btn-quiet"><Icon name="edit" size={15} /> Edit</Link>}
          {isAdmin(user) && <button type="button" className="iconbtn iconbtn-danger" title="Delete club" onClick={askDelete}><Icon name="trash" size={17} /></button>}
        </div>
      </header>

      <nav className="tabs">
        <NavLink to="" end className="tab">Overview</NavLink>
        <NavLink to="events" className="tab">Events</NavLink>
        <NavLink to="notices" className="tab">Notices</NavLink>
        {manager && (
          <>
            <NavLink to="members" className="tab">Members <span className="tab-count">{club.memberCount}</span></NavLink>
            <NavLink to="requests" className="tab">
              Requests {club.pendingRequests > 0 && <span className="tab-count tab-count-hot">{club.pendingRequests}</span>}
            </NavLink>
          </>
        )}
      </nav>

      <Outlet context={{ club, notify, reload, user, manager }} />
      {dialog}
    </>
  );
}

// ---- tabs ----

export function ClubOverview() {
  const { club, manager } = useOutletContext();
  const [events, setEvents] = useState([]);
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    api.list('events', { club: club._id, when: 'upcoming', status: 'Upcoming' }).then((e) => setEvents(e.slice(0, 3))).catch(() => {});
    api.list('announcements', { club: club._id, limit: 2 }).then(setNotices).catch(() => {});
  }, [club._id]);

  return (
    <div className="split">
      <section>
        <h2 className="section-title">About</h2>
        <p className="prose">{club.description || 'No description yet.'}</p>
        <dl className="facts">
          <div><dt>Members</dt><dd>{club.memberCount}</dd></div>
          <div><dt>Coming up</dt><dd>{club.upcomingEvents}</dd></div>
          {manager && <div><dt>Waiting to join</dt><dd>{club.pendingRequests}</dd></div>}
        </dl>
        <div className="section-head">
          <h2>Next events</h2>
          <Link to="events" className="textlink">All events <Icon name="arrow" size={14} /></Link>
        </div>
        {events.length === 0 ? <p className="muted">Nothing scheduled.</p> : (
          <div className="eventlist">{events.map((ev) => <EventRow key={ev._id} event={ev} compact />)}</div>
        )}
      </section>
      <section>
        <div className="section-head">
          <h2>Latest notices</h2>
          <Link to="notices" className="textlink">All <Icon name="arrow" size={14} /></Link>
        </div>
        {notices.length === 0 ? <p className="muted">No notices yet.</p> : (
          <div className="noticestack">{notices.map((n) => <NoticeCard key={n._id} notice={n} />)}</div>
        )}
      </section>
    </div>
  );
}

export function ClubMembers() {
  const { club, notify, reload, manager } = useOutletContext();
  const [members, setMembers] = useState(null);
  const [error, setError] = useState('');
  const [confirm, dialog] = useConfirm();

  useEffect(() => {
    if (manager) api.list('members', { club: club._id }).then(setMembers).catch((err) => setError(err.message));
  }, [club._id, manager]);

  async function handleRoleChange(member, role) {
    try {
      const updated = await api.update('members', member._id, { role });
      setMembers(members.map((m) => (m._id === updated._id ? updated : m)));
      notify(`${member.name} is now ${role}`);
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  function handleDelete(member) {
    confirm({
      title: `Remove ${member.name}?`,
      message: `They will no longer be listed as a member of ${club.name}.`,
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: async () => {
        try {
          await api.remove('members', member._id);
          setMembers((list) => list.filter((m) => m._id !== member._id));
          notify(`${member.name} removed`);
          reload();
        } catch (err) {
          notify(err.message, 'error');
        }
      },
    });
  }

  if (!manager) return <Forbidden />;
  return (
    <section>
      <div className="section-head">
        <h2>{members ? plural(members.length, 'member') : 'Members'}</h2>
        <Link to={`/members/new?club=${club._id}`} className="btn btn-quiet"><Icon name="plus" size={15} /> Add member</Link>
      </div>
      <ErrorNote message={error} />
      {!members ? <Loading /> : members.length === 0 ? <EmptyState title="No members yet" /> : (
        <MemberTable members={members} onRoleChange={handleRoleChange} onDelete={handleDelete} />
      )}
      {dialog}
    </section>
  );
}

export function ClubEvents() {
  const { club, manager } = useOutletContext();
  const [events, setEvents] = useState(null);

  useEffect(() => {
    api.list('events', { club: club._id }).then(setEvents).catch(() => setEvents([]));
  }, [club._id]);

  if (!events) return <Loading />;
  const upcoming = events.filter((e) => e.status === 'Upcoming');
  const past = events.filter((e) => e.status !== 'Upcoming').reverse();

  return (
    <section>
      <div className="section-head">
        <h2>Upcoming</h2>
        {manager && <Link to={`/events/new?club=${club._id}`} className="btn btn-quiet"><Icon name="plus" size={15} /> Schedule event</Link>}
      </div>
      {upcoming.length === 0 ? <p className="muted">Nothing scheduled.</p> : (
        <div className="eventlist">{upcoming.map((ev) => <EventRow key={ev._id} event={ev} />)}</div>
      )}
      {past.length > 0 && (
        <>
          <h2 className="section-title spaced">Past</h2>
          <div className="eventlist">{past.map((ev) => <EventRow key={ev._id} event={ev} />)}</div>
        </>
      )}
    </section>
  );
}

export function ClubNotices() {
  const { club, notify, manager } = useOutletContext();
  const [notices, setNotices] = useState(null);
  const [confirm, dialog] = useConfirm();

  useEffect(() => {
    api.list('announcements', { club: club._id }).then(setNotices).catch(() => setNotices([]));
  }, [club._id]);

  function handleDelete(notice) {
    confirm({
      title: 'Delete this notice?',
      message: `"${notice.title}" will be taken off the board.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        await api.remove('announcements', notice._id);
        setNotices((list) => list.filter((n) => n._id !== notice._id));
        notify('Notice deleted');
      },
    });
  }

  return (
    <section>
      <div className="section-head">
        <h2>Notices</h2>
        {manager && <Link to={`/notices/new?club=${club._id}`} className="btn btn-quiet"><Icon name="plus" size={15} /> Post notice</Link>}
      </div>
      {!notices ? <Loading /> : notices.length === 0 ? <EmptyState title="Nothing posted yet" /> : (
        <div className="noticegrid">{notices.map((n) => <NoticeCard key={n._id} notice={n} onDelete={manager ? handleDelete : undefined} />)}</div>
      )}
      {dialog}
    </section>
  );
}

export function ClubRequests() {
  const { club, notify, reload, manager } = useOutletContext();
  const [requests, setRequests] = useState(null);

  useEffect(() => {
    if (manager) api.list('requests', { club: club._id }).then(setRequests).catch(() => setRequests([]));
  }, [club._id, manager]);

  async function handleDecide(request, status) {
    try {
      const updated = await api.update('requests', request._id, { status });
      setRequests(requests.map((r) => (r._id === updated._id ? updated : r)));
      notify(status === 'Approved' ? `${request.name} added to ${club.name}` : `Request from ${request.name} declined`);
      reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function handleDelete(request) {
    await api.remove('requests', request._id);
    setRequests(requests.filter((r) => r._id !== request._id));
  }

  if (!manager) return <Forbidden />;
  if (!requests) return <Loading />;
  const pending = requests.filter((r) => r.status === 'Pending');
  const decided = requests.filter((r) => r.status !== 'Pending');

  return (
    <section>
      <h2 className="section-title">Waiting for a decision</h2>
      {pending.length === 0 ? <p className="muted">No pending requests.</p> : (
        <div className="requestlist">
          {pending.map((r) => <RequestCard key={r._id} request={r} onDecide={handleDecide} onDelete={handleDelete} />)}
        </div>
      )}
      {decided.length > 0 && (
        <>
          <h2 className="section-title spaced">Decided</h2>
          <div className="requestlist">
            {decided.map((r) => <RequestCard key={r._id} request={r} onDecide={handleDecide} onDelete={handleDelete} />)}
          </div>
        </>
      )}
    </section>
  );
}
