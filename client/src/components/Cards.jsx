import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { CategoryTag, DateTile, Monogram, SeatBar, StatusPill } from './Bits.jsx';
import { formatTime, plural, timeAgo, whenLabel } from '../lib/format.js';

export function StatCard({ label, value, to, highlight }) {
  return (
    <Link to={to} className={`stat${highlight ? ' stat-highlight' : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </Link>
  );
}
StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  to: PropTypes.string.isRequired,
  highlight: PropTypes.bool,
};

export function ClubCard({ club }) {
  return (
    <Link to={`/clubs/${club._id}`} className={`clubcard${club.isActive ? '' : ' clubcard-off'}`}>
      <div className="clubcard-head">
        <Monogram name={club.name} category={club.category} />
        <div>
          <h3>{club.name}</h3>
          <CategoryTag category={club.category} />
        </div>
      </div>
      <p className="clubcard-desc">{club.description || 'No description yet.'}</p>
      <div className="clubcard-foot">
        <span><Icon name="users" size={15} /> {plural(club.memberCount ?? 0, 'member')}</span>
        {club.isActive ? (
          <span><Icon name="calendar" size={15} /> {club.upcomingEvents ? `${club.upcomingEvents} coming up` : 'Nothing scheduled'}</span>
        ) : (
          <span className="muted">On a break</span>
        )}
      </div>
    </Link>
  );
}
ClubCard.propTypes = {
  club: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    description: PropTypes.string,
    isActive: PropTypes.bool,
    memberCount: PropTypes.number,
    upcomingEvents: PropTypes.number,
  }).isRequired,
};

export function EventRow({ event, club, compact }) {
  return (
    <Link to={`/events/${event._id}`} className={`eventrow${event.status === 'Cancelled' ? ' eventrow-cancelled' : ''}`}>
      <DateTile date={event.date} />
      <div className="eventrow-main">
        <span className="eventrow-title">{event.title}</span>
        <span className="eventrow-meta">
          {club && (
            <span className="eventrow-club">
              <Monogram name={club.name} category={club.category} size="sm" /> {club.name}
            </span>
          )}
          <span><Icon name="clock" size={14} /> {compact ? whenLabel(event.date) + ', ' : ''}{formatTime(event.time)}</span>
          {!compact && <span><Icon name="place" size={14} /> {event.venue}</span>}
        </span>
      </div>
      <div className="eventrow-side">
        {event.isRegistered && event.status === 'Upcoming' && <span className="pill pill-approved">Registered</span>}
        {event.status === 'Upcoming'
          ? <SeatBar registered={event.registered || 0} capacity={event.capacity} />
          : <StatusPill status={event.status} />}
      </div>
    </Link>
  );
}
EventRow.propTypes = {
  event: PropTypes.object.isRequired,
  club: PropTypes.shape({ name: PropTypes.string, category: PropTypes.string }),
  compact: PropTypes.bool,
};

export function NoticeCard({ notice, club, onDelete }) {
  return (
    <article className={`notice${notice.pinned ? ' notice-pinned' : ''}`}>
      <header className="notice-head">
        {club && (
          <Link to={`/clubs/${club._id}/notices`} className="notice-club">
            <Monogram name={club.name} category={club.category} size="sm" />
            {club.name}
          </Link>
        )}
        <span className="notice-time">{timeAgo(notice.createdAt)}</span>
      </header>
      {notice.pinned && <span className="notice-pin"><Icon name="pin" size={14} /> Pinned</span>}
      <h3>{notice.title}</h3>
      <p className="notice-body">{notice.body}</p>
      {onDelete && (
        <footer className="notice-actions">
          <Link to={`/notices/${notice._id}/edit`} className="textbtn">Edit</Link>
          <button type="button" className="textbtn textbtn-danger" onClick={() => onDelete(notice)}>Delete</button>
        </footer>
      )}
    </article>
  );
}
NoticeCard.propTypes = {
  notice: PropTypes.object.isRequired,
  club: PropTypes.object,
  onDelete: PropTypes.func,
};

export function RequestCard({ request, club, onDecide, onDelete, own }) {
  const pending = request.status === 'Pending';
  return (
    <article className="request">
      <div className="request-who">
        <h3>{request.name}</h3>
        <span className="mono">{request.usn}</span>
        {request.email && <span className="muted">{request.email}</span>}
      </div>
      <div className="request-what">
        {club && (
          <span className="request-club">
            {own ? 'to join' : 'wants to join'} <Link to={`/clubs/${club._id}`}><Monogram name={club.name} category={club.category} size="sm" /> {club.name}</Link>
          </span>
        )}
        {request.message && <blockquote>{request.message}</blockquote>}
        <span className="request-time">
          Sent {timeAgo(request.createdAt)}
          {request.decidedAt && ` · ${request.status.toLowerCase()} ${timeAgo(request.decidedAt)}`}
        </span>
      </div>
      <div className="request-actions">
        {own ? (
          <>
            <StatusPill status={request.status} />
            {pending && <button type="button" className="textbtn" onClick={() => onDelete(request)}>Withdraw</button>}
          </>
        ) : pending ? (
          <>
            <button type="button" className="btn btn-primary" onClick={() => onDecide(request, 'Approved')}>
              <Icon name="check" size={16} /> Approve
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => onDecide(request, 'Rejected')}>Decline</button>
          </>
        ) : (
          <>
            <StatusPill status={request.status} />
            <button type="button" className="iconbtn" title="Remove from list" onClick={() => onDelete(request)}>
              <Icon name="trash" size={16} />
            </button>
          </>
        )}
      </div>
    </article>
  );
}
RequestCard.propTypes = {
  request: PropTypes.object.isRequired,
  club: PropTypes.object,
  onDecide: PropTypes.func,
  onDelete: PropTypes.func.isRequired,
  own: PropTypes.bool,
};
