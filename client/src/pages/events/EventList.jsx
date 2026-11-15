import { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { api, STATUSES } from '../../api.js';
import Icon from '../../components/Icon.jsx';
import FilterForm, { cleanParams, toOptions } from '../../components/FilterForm.jsx';
import { EmptyState, ErrorNote, Loading, PageHeader } from '../../components/Bits.jsx';
import { EventRow } from '../../components/Cards.jsx';
import useClubs from '../../hooks/useClubs.js';
import { monthLabel } from '../../lib/format.js';
import { isManager } from '../../lib/permissions.js';

const WHEN = [{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }, { value: 'all', label: 'Any time' }];

export default function EventList() {
  const { user } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = {
    when: searchParams.get('when') || 'upcoming',
    club: searchParams.get('club') || '',
    status: searchParams.get('status') || '',
  };
  const { clubsById, clubOptions } = useClubs();
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setEvents(null);
    api.list('events', { ...filters, when: filters.when === 'all' ? '' : filters.when })
      .then((data) => { setEvents(data); setError(''); })
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fields = [
    { name: 'when', label: 'When', options: WHEN, noAll: true, clearTo: 'upcoming' },
    { name: 'club', label: 'Club', options: clubOptions, allLabel: 'All clubs' },
    { name: 'status', label: 'Status', options: toOptions(STATUSES), allLabel: 'Any status' },
  ];

  function handleApply(values) {
    const next = cleanParams(values);
    if (next.when === 'upcoming') delete next.when;
    setSearchParams(next);
  }

  // group rows under month headings
  const groups = [];
  (events || []).forEach((ev) => {
    const label = monthLabel(ev.date);
    if (!groups.length || groups[groups.length - 1].label !== label) groups.push({ label, items: [] });
    groups[groups.length - 1].items.push(ev);
  });

  return (
    <>
      <PageHeader eyebrow="Calendar" title="Events">
        {isManager(user) && <Link to={`/events/new${filters.club ? `?club=${filters.club}` : ''}`} className="btn btn-primary">
          <Icon name="plus" size={16} /> Schedule event
        </Link>}
      </PageHeader>
      <FilterForm key={searchParams.toString() + clubOptions.length} fields={fields} initialValues={filters} onApply={handleApply} />
      <ErrorNote message={error} />
      {!events ? <Loading /> : events.length === 0 ? (
        <EmptyState title={filters.when === 'past' ? 'No past events match' : 'Nothing scheduled that matches'} />
      ) : (
        groups.map((g) => (
          <section key={g.label} className="monthgroup">
            <h2 className="monthlabel">{g.label}</h2>
            <div className="eventlist">
              {g.items.map((ev) => <EventRow key={ev._id} event={ev} club={clubsById[ev.club]} />)}
            </div>
          </section>
        ))
      )}
    </>
  );
}
