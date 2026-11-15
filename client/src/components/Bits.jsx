// Small presentational components used across pages. All stateless.
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { categoryColor, dayParts, initials } from '../lib/format.js';

export function Monogram({ name, category, size = 'md' }) {
  return (
    <span className={`monogram monogram-${size}`} style={{ '--c': categoryColor(category) }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
Monogram.propTypes = {
  name: PropTypes.string.isRequired,
  category: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

export function CategoryTag({ category }) {
  return (
    <span className="category" style={{ '--c': categoryColor(category) }}>
      {category}
    </span>
  );
}
CategoryTag.propTypes = { category: PropTypes.string.isRequired };

export function DateTile({ date, size = 'md' }) {
  const { month, day, weekday } = dayParts(date);
  return (
    <span className={`datetile datetile-${size}`}>
      <span className="datetile-month">{month}</span>
      <span className="datetile-day">{day}</span>
      {size === 'lg' && <span className="datetile-weekday">{weekday}</span>}
    </span>
  );
}
DateTile.propTypes = { date: PropTypes.string.isRequired, size: PropTypes.oneOf(['md', 'lg']) };

export function SeatBar({ registered, capacity }) {
  const ratio = capacity ? Math.min(registered / capacity, 1) : 0;
  const left = capacity - registered;
  let label = `${registered} / ${capacity} seats`;
  if (left <= 0) label = 'Full';
  else if (left <= 3) label = `${left} seat${left === 1 ? '' : 's'} left`;
  return (
    <span className={`seatbar${ratio >= 0.9 ? ' seatbar-hot' : ''}`} title={`${registered} of ${capacity} registered`}>
      <span className="seatbar-track"><span className="seatbar-fill" style={{ width: `${ratio * 100}%` }} /></span>
      <span className="seatbar-label">{label}</span>
    </span>
  );
}
SeatBar.propTypes = { registered: PropTypes.number.isRequired, capacity: PropTypes.number.isRequired };

export function StatusPill({ status }) {
  return <span className={`pill pill-${status.toLowerCase()}`}>{status}</span>;
}
StatusPill.propTypes = { status: PropTypes.string.isRequired };

export function PageHeader({ eyebrow, title, back, children }) {
  return (
    <header className="page-header">
      <div>
        {back && (
          <Link to={back.to} className="backlink">
            <Icon name="back" size={15} /> {back.label}
          </Link>
        )}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}
PageHeader.propTypes = {
  eyebrow: PropTypes.node,
  title: PropTypes.node.isRequired,
  back: PropTypes.shape({ to: PropTypes.string, label: PropTypes.string }),
  children: PropTypes.node,
};

export function EmptyState({ title, children }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <div className="empty-body">{children}</div>}
    </div>
  );
}
EmptyState.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node };

export function Loading({ label = 'Loading' }) {
  return <p className="loading">{label}…</p>;
}
Loading.propTypes = { label: PropTypes.string };

export function ErrorNote({ message }) {
  if (!message) return null;
  return <p className="alert" role="alert">{message}</p>;
}
ErrorNote.propTypes = { message: PropTypes.string };
