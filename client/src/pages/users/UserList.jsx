import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { api, USER_ROLES } from '../../api.js';
import Icon from '../../components/Icon.jsx';
import FilterForm, { cleanParams } from '../../components/FilterForm.jsx';
import { EmptyState, ErrorNote, Loading, Monogram, PageHeader } from '../../components/Bits.jsx';
import useClubs from '../../hooks/useClubs.js';
import useConfirm from '../../hooks/useConfirm.jsx';
import { initials, plural, timeAgo } from '../../lib/format.js';

export default function UserList() {
  const { user: me, notify } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = { q: searchParams.get('q') || '', role: searchParams.get('role') || '' };
  const { clubs, clubsById } = useClubs();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  // a user switched to "lead" waits here until a club is picked
  const [pendingLead, setPendingLead] = useState(null);
  const [confirm, dialog] = useConfirm();

  useEffect(() => {
    api.list('users', filters)
      .then((data) => { setUsers(data); setError(''); })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function save(user, changes, message) {
    try {
      const updated = await api.update('users', user._id, changes);
      setUsers((list) => list.map((u) => (u._id === updated._id ? updated : u)));
      setPendingLead(null);
      notify(message);
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  function handleRole(user, role) {
    if (role === 'lead') {
      setPendingLead(user._id); // ask for the club first
      return;
    }
    save(user, { role }, `${user.name} is now ${USER_ROLES.find((r) => r.value === role).label.toLowerCase()}`);
  }

  function handleClub(user, clubId) {
    if (!clubId) return;
    save(user, { role: 'lead', leadClub: clubId }, `${user.name} now leads ${clubsById[clubId]?.name}`);
  }

  function handleDelete(user) {
    confirm({
      title: `Delete ${user.name}'s account?`,
      message: 'They will no longer be able to log in. Their club memberships and registrations stay.',
      confirmLabel: 'Delete account',
      danger: true,
      onConfirm: async () => {
        try {
          await api.remove('users', user._id);
          setUsers((list) => list.filter((u) => u._id !== user._id));
          notify('Account deleted');
        } catch (err) {
          notify(err.message, 'error');
        }
      },
    });
  }

  const fields = [
    { name: 'q', label: 'Name, email or USN', placeholder: 'Search', wide: true },
    { name: 'role', label: 'Role', options: USER_ROLES, allLabel: 'Any role' },
  ];

  return (
    <>
      <PageHeader eyebrow="Access" title="Users" />
      <FilterForm key={searchParams.toString()} fields={fields} initialValues={filters} onApply={(v) => setSearchParams(cleanParams(v))} />
      <ErrorNote message={error} />
      {!users ? <Loading /> : users.length === 0 ? <EmptyState title="No accounts match" /> : (
        <>
          <p className="countline">{plural(users.length, 'account')}</p>
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr><th>Person</th><th>USN</th><th>Role</th><th>Leads</th><th>Last login</th><th><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMe = u._id === me._id;
                  const choosingClub = pendingLead === u._id;
                  const club = clubsById[u.leadClub];
                  return (
                    <tr key={u._id}>
                      <td>
                        <span className="person">
                          <span className={`avatar avatar-${u.role}`}>{initials(u.name)}</span>
                          <span>
                            <span className="cell-strong">{u.name}{isMe && <span className="muted"> (you)</span>}</span>
                            <span className="cell-sub">{u.email}</span>
                          </span>
                        </span>
                      </td>
                      <td className="mono">{u.usn || '—'}</td>
                      <td>
                        <select
                          className="roleselect roleselect-lead"
                          value={choosingClub ? 'lead' : u.role}
                          onChange={(e) => handleRole(u, e.target.value)}
                          disabled={isMe}
                          aria-label={`Role of ${u.name}`}
                        >
                          {USER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </td>
                      <td>
                        {choosingClub || u.role === 'lead' ? (
                          <select
                            className={`roleselect${choosingClub && !u.leadClub ? ' roleselect-attention' : ''}`}
                            value={choosingClub && u.role !== 'lead' ? '' : u.leadClub || ''}
                            onChange={(e) => handleClub(u, e.target.value)}
                            aria-label={`Club led by ${u.name}`}
                          >
                            <option value="">Pick a club…</option>
                            {clubs.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                          </select>
                        ) : club ? <span className="cell-club"><Monogram name={club.name} category={club.category} size="sm" /> {club.name}</span> : <span className="muted">—</span>}
                      </td>
                      <td className="nowrap muted">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'never'}</td>
                      <td className="cell-actions">
                        {choosingClub ? (
                          <button type="button" className="textbtn" onClick={() => setPendingLead(null)}>Cancel</button>
                        ) : !isMe && (
                          <button type="button" className="iconbtn iconbtn-danger" title="Delete account" onClick={() => handleDelete(u)}>
                            <Icon name="trash" size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {dialog}
    </>
  );
}
