import { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { api, ROLES } from '../../api.js';
import Icon from '../../components/Icon.jsx';
import FilterForm, { cleanParams, toOptions } from '../../components/FilterForm.jsx';
import { EmptyState, ErrorNote, Loading, PageHeader } from '../../components/Bits.jsx';
import MemberTable from '../../components/MemberTable.jsx';
import useClubs from '../../hooks/useClubs.js';
import useConfirm from '../../hooks/useConfirm.jsx';
import { plural } from '../../lib/format.js';

export default function MemberList() {
  const { notify, user } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = {
    q: searchParams.get('q') || '',
    club: searchParams.get('club') || '',
    role: searchParams.get('role') || '',
  };
  const { clubsById, clubOptions } = useClubs();
  const [members, setMembers] = useState(null);
  const [error, setError] = useState('');
  const [confirm, dialog] = useConfirm();

  useEffect(() => {
    api.list('members', filters)
      .then((data) => { setMembers(data); setError(''); })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fields = [
    { name: 'q', label: 'Name or USN', placeholder: 'Search', wide: true },
    ...(user.role === 'admin' ? [{ name: 'club', label: 'Club', options: clubOptions, allLabel: 'All clubs' }] : []),
    { name: 'role', label: 'Role', options: toOptions(ROLES), allLabel: 'Any role' },
  ];

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
    const clubName = clubsById[member.club]?.name || 'the club';
    confirm({
      title: `Remove ${member.name} from ${clubName}?`,
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: async () => {
        try {
          await api.remove('members', member._id);
          setMembers((list) => list.filter((m) => m._id !== member._id));
          notify(`${member.name} removed`);
        } catch (err) {
          notify(err.message, 'error');
        }
      },
    });
  }

  return (
    <>
      <PageHeader eyebrow={user.role === 'lead' ? clubsById[user.leadClub]?.name || 'Your club' : 'People'} title="Members">
        <Link to={`/members/new${filters.club ? `?club=${filters.club}` : ''}`} className="btn btn-primary"><Icon name="plus" size={16} /> Add member</Link>
      </PageHeader>
      <FilterForm key={searchParams.toString() + clubOptions.length} fields={fields} initialValues={filters} onApply={(v) => setSearchParams(cleanParams(v))} />
      <ErrorNote message={error} />
      {!members ? <Loading /> : members.length === 0 ? <EmptyState title="No members match these filters" /> : (
        <>
          <p className="countline">{plural(members.length, 'membership')}</p>
          <MemberTable members={members} clubsById={user.role === 'admin' ? clubsById : undefined} onRoleChange={handleRoleChange} onDelete={handleDelete} />
        </>
      )}
      {dialog}
    </>
  );
}
