import { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { api } from '../../api.js';
import Icon from '../../components/Icon.jsx';
import FilterForm, { cleanParams } from '../../components/FilterForm.jsx';
import { EmptyState, ErrorNote, Loading, PageHeader } from '../../components/Bits.jsx';
import { NoticeCard } from '../../components/Cards.jsx';
import useClubs from '../../hooks/useClubs.js';
import useConfirm from '../../hooks/useConfirm.jsx';
import { canManage, isManager } from '../../lib/permissions.js';

export default function NoticeBoard() {
  const { notify, user } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = { club: searchParams.get('club') || '', pinned: searchParams.get('pinned') || '' };
  const { clubsById, clubOptions } = useClubs();
  const [notices, setNotices] = useState(null);
  const [error, setError] = useState('');
  const [confirm, dialog] = useConfirm();

  useEffect(() => {
    api.list('announcements', filters)
      .then((data) => { setNotices(data); setError(''); })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fields = [
    { name: 'club', label: 'Club', options: clubOptions, allLabel: 'All clubs' },
    { name: 'pinned', label: 'Show', options: [{ value: 'true', label: 'Pinned only' }], allLabel: 'Everything' },
  ];

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
    <>
      <PageHeader eyebrow="Campus-wide" title="Notice board">
        {isManager(user) && <Link to={`/notices/new${filters.club ? `?club=${filters.club}` : ''}`} className="btn btn-primary"><Icon name="plus" size={16} /> Post a notice</Link>}
      </PageHeader>
      <FilterForm key={searchParams.toString() + clubOptions.length} fields={fields} initialValues={filters} onApply={(v) => setSearchParams(cleanParams(v))} />
      <ErrorNote message={error} />
      {!notices ? <Loading /> : notices.length === 0 ? <EmptyState title="The board is empty" /> : (
        <div className="noticegrid">
          {notices.map((n) => <NoticeCard key={n._id} notice={n} club={clubsById[n.club]} onDelete={canManage(user, n.club) ? handleDelete : undefined} />)}
        </div>
      )}
      {dialog}
    </>
  );
}
