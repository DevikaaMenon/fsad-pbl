import { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { api, REQUEST_STATUSES } from '../../api.js';
import FilterForm, { cleanParams } from '../../components/FilterForm.jsx';
import { EmptyState, ErrorNote, Loading, PageHeader } from '../../components/Bits.jsx';
import { RequestCard } from '../../components/Cards.jsx';
import useClubs from '../../hooks/useClubs.js';

export default function RequestList() {
  const { notify, user } = useOutletContext();
  const student = user.role === 'student';
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || (student ? 'All' : 'Pending');
  const club = searchParams.get('club') || '';
  const { clubsById, clubOptions } = useClubs();
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setRequests(null);
    api.list('requests', { status: status === 'All' ? '' : status, club })
      .then((data) => { setRequests(data); setError(''); })
      .catch((err) => setError(err.message));
  }, [status, club]);

  function setStatus(next) {
    setSearchParams(cleanParams({ status: next === (student ? 'All' : 'Pending') ? '' : next, club }));
  }

  async function handleDecide(request, decision) {
    try {
      const updated = await api.update('requests', request._id, { status: decision });
      // on the "All" tab keep the card and show its new status; otherwise it leaves this tab
      setRequests((list) => (status === 'All'
        ? list.map((r) => (r._id === updated._id ? updated : r))
        : list.filter((r) => r._id !== updated._id)));
      const clubName = clubsById[request.club]?.name || 'the club';
      notify(decision === 'Approved' ? `${request.name} added to ${clubName}` : `Request from ${request.name} declined`);
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function handleDelete(request) {
    try {
      await api.remove('requests', request._id);
      setRequests(requests.filter((r) => r._id !== request._id));
      if (student) notify('Request withdrawn');
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  return (
    <>
      <PageHeader eyebrow={student ? 'Clubs' : user.role === 'lead' ? 'Your club' : 'Inbox'} title={student ? 'My requests' : 'Join requests'}>
        {student && <Link to="/clubs" className="btn btn-quiet">Browse clubs</Link>}
      </PageHeader>
      <div className="segmented" role="tablist">
        {[...REQUEST_STATUSES, 'All'].map((s) => (
          <button key={s} type="button" role="tab" aria-selected={status === s} className={`segment${status === s ? ' segment-on' : ''}`} onClick={() => setStatus(s)}>
            {s}
          </button>
        ))}
      </div>
      {user.role === 'admin' && <FilterForm
        key={club + clubOptions.length}
        fields={[{ name: 'club', label: 'Club', options: clubOptions, allLabel: 'All clubs' }]}
        initialValues={{ club }}
        onApply={(v) => setSearchParams(cleanParams({ status: status === 'Pending' ? '' : status, club: v.club }))}
      />}
      <ErrorNote message={error} />
      {!requests ? <Loading /> : requests.length === 0 ? (
        <EmptyState title={student ? 'No requests yet' : status === 'Pending' ? 'All caught up' : 'Nothing here'}>
          {student ? <p>Open a club page and choose &ldquo;Ask to join&rdquo;.</p> : status === 'Pending' && <p>No one is waiting for a decision.</p>}
        </EmptyState>
      ) : (
        <div className="requestlist">
          {requests.map((r) => (
            <RequestCard key={r._id} request={r} club={clubsById[r.club]} onDecide={handleDecide} onDelete={handleDelete} own={student} />
          ))}
        </div>
      )}
    </>
  );
}
