import { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { api, CATEGORIES } from '../../api.js';
import Icon from '../../components/Icon.jsx';
import { EmptyState, ErrorNote, Loading, PageHeader } from '../../components/Bits.jsx';
import { ClubCard } from '../../components/Cards.jsx';
import { categoryColor } from '../../lib/format.js';

export default function ClubList() {
  const { user } = useOutletContext();
  // filters live in the URL: /clubs?category=Technical&q=code&active=true
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || '';
  const q = searchParams.get('q') || '';
  const active = searchParams.get('active') || '';

  const [search, setSearch] = useState(q);
  const [clubs, setClubs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { setSearch(q); }, [q]);

  useEffect(() => {
    setClubs(null);
    api.list('clubs', { category, q, active })
      .then((data) => { setClubs(data); setError(''); })
      .catch((err) => setError(err.message));
  }, [category, q, active]);

  function update(changes) {
    const next = { category, q, active, ...changes };
    Object.keys(next).forEach((k) => { if (!next[k]) delete next[k]; });
    setSearchParams(next);
  }

  function handleSearch(e) {
    e.preventDefault();
    update({ q: search.trim() });
  }

  return (
    <>
      <PageHeader eyebrow="Directory" title="Clubs">
        {user.role === 'admin' && <Link to="/clubs/new" className="btn btn-primary"><Icon name="plus" size={16} /> New club</Link>}
      </PageHeader>

      <div className="clubfilters">
        <form className="searchbox" onSubmit={handleSearch} role="search">
          <Icon name="search" size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" aria-label="Search clubs" />
        </form>
        <div className="chips" role="group" aria-label="Category">
          <button type="button" className={`chip${!category ? ' chip-on' : ''}`} onClick={() => update({ category: '' })}>All</button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip${category === c ? ' chip-on' : ''}`}
              style={{ '--c': categoryColor(c) }}
              onClick={() => update({ category: category === c ? '' : c })}
            >
              <span className="chip-dot" /> {c}
            </button>
          ))}
        </div>
        <select className="compact-select" value={active} onChange={(e) => update({ active: e.target.value })} aria-label="Status">
          <option value="">Active and on break</option>
          <option value="true">Active only</option>
          <option value="false">On a break</option>
        </select>
      </div>

      <ErrorNote message={error} />
      {!clubs ? <Loading /> : clubs.length === 0 ? (
        <EmptyState title="No clubs match">
          <button type="button" className="btn btn-quiet" onClick={() => setSearchParams({})}>Clear filters</button>
        </EmptyState>
      ) : (
        <div className="clubgrid">
          {clubs.map((club) => <ClubCard key={club._id} club={club} />)}
        </div>
      )}
    </>
  );
}
