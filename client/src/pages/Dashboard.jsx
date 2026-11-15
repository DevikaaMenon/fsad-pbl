import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import PropTypes from 'prop-types';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';
import { DateTile, EmptyState, ErrorNote, Loading, Monogram } from '../components/Bits.jsx';
import { EventRow, NoticeCard, StatCard } from '../components/Cards.jsx';
import useClubs from '../hooks/useClubs.js';
import { formatTime, whenLabel } from '../lib/format.js';

function greeting(name) {
  const h = new Date().getHours();
  const first = name.split(' ')[0];
  if (h < 12) return `Good morning, ${first}`;
  if (h < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

function useHomeData() {
  const [events, setEvents] = useState(null);
  const [notices, setNotices] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([
      api.list('events', { status: 'Upcoming', when: 'upcoming' }),
      api.list('announcements', { limit: 4 }),
    ])
      .then(([ev, no]) => { setEvents(ev); setNotices(no); })
      .catch((err) => setError(err.message));
  }, []);
  return { events, notices, error };
}

function NoticeColumn({ notices, clubsById }) {
  return (
    <section>
      <div className="section-head">
        <h2>Notice board</h2>
        <Link to="/notices" className="textlink">All notices <Icon name="arrow" size={14} /></Link>
      </div>
      {notices.length === 0 ? <EmptyState title="No notices yet" /> : (
        <div className="noticestack">
          {notices.map((n) => <NoticeCard key={n._id} notice={n} club={clubsById[n.club]} />)}
        </div>
      )}
    </section>
  );
}

function StudentHome({ user, stats }) {
  const { clubsById } = useClubs();
  const { events, notices, error } = useHomeData();
  const [myRegs, setMyRegs] = useState([]);
  const [myClubs, setMyClubs] = useState([]);

  useEffect(() => {
    api.list('registrations', { mine: 'true' }).then(setMyRegs).catch(() => {});
    api.list('members', { mine: 'true' }).then(setMyClubs).catch(() => {});
  }, []);

  const upcomingMine = myRegs
    .filter((r) => r.eventInfo.status === 'Upcoming' && new Date(`${r.eventInfo.date}T23:59:59`) >= new Date())
    .sort((a, b) => a.eventInfo.date.localeCompare(b.eventInfo.date));
  const open = (events || []).filter((e) => !e.isRegistered && e.registered < e.capacity).slice(0, 4);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>{greeting(user.name)}</h1>
          <p className="lede">
            {upcomingMine.length
              ? `You have ${upcomingMine.length} event${upcomingMine.length === 1 ? '' : 's'} coming up.`
              : 'Nothing on your calendar yet. Have a look at what clubs are running.'}
          </p>
        </div>
      </header>

      {stats && (
        <div className="stats">
          <StatCard label="your clubs" value={stats.myClubs} to="/clubs" />
          <StatCard label="your upcoming events" value={stats.myUpcoming} to="/events" />
          <StatCard label="requests awaiting reply" value={stats.pendingRequests} to="/requests" highlight={stats.pendingRequests > 0} />
          <StatCard label="events on campus" value={stats.upcomingEvents} to="/events" />
        </div>
      )}
      <ErrorNote message={error} />

      <div className="split">
        <div>
          <section>
            <div className="section-head"><h2>Your calendar</h2></div>
            {upcomingMine.length === 0 ? <p className="muted">You haven&apos;t registered for anything upcoming.</p> : (
              <div className="eventlist">
                {upcomingMine.map((r) => (
                  <Link key={r._id} to={`/events/${r.event}`} className="eventrow">
                    <DateTile date={r.eventInfo.date} />
                    <div className="eventrow-main">
                      <span className="eventrow-title">{r.eventInfo.title}</span>
                      <span className="eventrow-meta">
                        {clubsById[r.eventInfo.club] && <span className="eventrow-club"><Monogram name={clubsById[r.eventInfo.club].name} category={clubsById[r.eventInfo.club].category} size="sm" /> {clubsById[r.eventInfo.club].name}</span>}
                        <span><Icon name="clock" size={14} /> {whenLabel(r.eventInfo.date)}, {formatTime(r.eventInfo.time)}</span>
                      </span>
                    </div>
                    <span className="pill pill-approved">Registered</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="section-head">
              <h2>Open for registration</h2>
              <Link to="/events" className="textlink">All events <Icon name="arrow" size={14} /></Link>
            </div>
            {!events ? <Loading /> : open.length === 0 ? <p className="muted">Nothing new right now.</p> : (
              <div className="eventlist">{open.map((ev) => <EventRow key={ev._id} event={ev} club={clubsById[ev.club]} compact />)}</div>
            )}
          </section>

          <section>
            <div className="section-head">
              <h2>Your clubs</h2>
              <Link to="/clubs" className="textlink">Find more clubs <Icon name="arrow" size={14} /></Link>
            </div>
            {myClubs.length === 0 ? <p className="muted">You haven&apos;t joined a club yet.</p> : (
              <div className="minicards">
                {myClubs.map((m) => {
                  const club = clubsById[m.club];
                  return club ? (
                    <Link key={m._id} to={`/clubs/${club._id}`} className="minicard">
                      <Monogram name={club.name} category={club.category} />
                      <span><strong>{club.name}</strong><span className="muted">{m.role}</span></span>
                    </Link>
                  ) : null;
                })}
              </div>
            )}
          </section>
        </div>
        <NoticeColumn notices={notices} clubsById={clubsById} />
      </div>
    </>
  );
}

function ManagerHome({ user, stats }) {
  const { clubsById } = useClubs();
  const { events, notices, error } = useHomeData();
  const myClub = user.role === 'lead' ? clubsById[user.leadClub] : null;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>{greeting(user.name)}</h1>
          {stats && (
            <p className="lede">
              {myClub
                ? <>You&apos;re running <Link to={`/clubs/${myClub._id}`} className="textlink">{myClub.name}</Link>. {stats.pendingRequests ? `${stats.pendingRequests} student${stats.pendingRequests === 1 ? ' is' : 's are'} waiting to join.` : 'No one is waiting to join.'}</>
                : `${stats.activeClubs} clubs are running this semester, with ${stats.members} memberships between them.`}
            </p>
          )}
        </div>
        {myClub && (
          <div className="page-actions">
            <Link to={`/events/new?club=${myClub._id}`} className="btn btn-primary"><Icon name="plus" size={16} /> Schedule event</Link>
            <Link to={`/notices/new?club=${myClub._id}`} className="btn btn-quiet">Post notice</Link>
          </div>
        )}
      </header>

      {stats && (
        <div className="stats">
          <StatCard label="events coming up" value={stats.upcomingEvents} to="/events" />
          <StatCard label={myClub ? 'members in your club' : 'memberships'} value={myClub ? myClub.memberCount : stats.members} to="/members" />
          <StatCard label="requests to review" value={stats.pendingRequests} to="/requests" highlight={stats.pendingRequests > 0} />
          <StatCard label="notices posted" value={stats.notices} to="/notices" />
        </div>
      )}
      <ErrorNote message={error} />

      <div className="split">
        <section>
          <div className="section-head">
            <h2>Coming up</h2>
            <Link to="/events" className="textlink">Full calendar <Icon name="arrow" size={14} /></Link>
          </div>
          {!events ? <Loading /> : events.length === 0 ? (
            <EmptyState title="Nothing scheduled yet" />
          ) : (
            <div className="eventlist">
              {events.slice(0, 6).map((ev) => <EventRow key={ev._id} event={ev} club={clubsById[ev.club]} compact />)}
            </div>
          )}
        </section>
        <NoticeColumn notices={notices} clubsById={clubsById} />
      </div>
    </>
  );
}

NoticeColumn.propTypes = { notices: PropTypes.array.isRequired, clubsById: PropTypes.object.isRequired };
StudentHome.propTypes = { user: PropTypes.object.isRequired, stats: PropTypes.object };
ManagerHome.propTypes = { user: PropTypes.object.isRequired, stats: PropTypes.object };

export default function Dashboard() {
  const { user, stats } = useOutletContext();
  return user.role === 'student' ? <StudentHome user={user} stats={stats} /> : <ManagerHome user={user} stats={stats} />;
}
