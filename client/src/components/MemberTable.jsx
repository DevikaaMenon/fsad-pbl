import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { Monogram } from './Bits.jsx';
import { ROLES } from '../api.js';
import { formatDate } from '../lib/format.js';

// Role changes and deletes are reported to the parent through onRoleChange / onDelete.
export default function MemberTable({ members, clubsById, onRoleChange, onDelete }) {
  return (
    <div className="tablewrap">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>USN</th>
            {clubsById && <th>Club</th>}
            <th>Role</th>
            <th>Joined</th>
            <th><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const club = clubsById?.[m.club];
            return (
              <tr key={m._id}>
                <td>
                  <span className="cell-strong">{m.name}</span>
                  {m.email && <span className="cell-sub">{m.email}</span>}
                </td>
                <td className="mono">{m.usn}</td>
                {clubsById && (
                  <td>
                    {club ? (
                      <Link to={`/clubs/${club._id}/members`} className="cell-club">
                        <Monogram name={club.name} category={club.category} size="sm" /> {club.name}
                      </Link>
                    ) : '—'}
                  </td>
                )}
                <td>
                  <select
                    className={`roleselect${m.role !== 'Member' ? ' roleselect-lead' : ''}`}
                    value={m.role}
                    onChange={(e) => onRoleChange(m, e.target.value)}
                    aria-label={`Role of ${m.name}`}
                  >
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td className="nowrap">{formatDate(m.joinedOn, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className="cell-actions">
                  <Link to={`/members/${m._id}/edit`} className="iconbtn" title="Edit"><Icon name="edit" size={16} /></Link>
                  <button type="button" className="iconbtn iconbtn-danger" title="Remove" onClick={() => onDelete(m)}>
                    <Icon name="trash" size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

MemberTable.propTypes = {
  members: PropTypes.arrayOf(PropTypes.object).isRequired,
  clubsById: PropTypes.object,
  onRoleChange: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
