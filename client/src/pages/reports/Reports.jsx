import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { api, CATEGORIES, ROLES } from '../../api.js';
import Icon from '../../components/Icon.jsx';
import FilterForm, { cleanParams, toOptions } from '../../components/FilterForm.jsx';
import { EmptyState, ErrorNote, Loading, Monogram, PageHeader } from '../../components/Bits.jsx';
import { formatDate, formatRupees } from '../../lib/format.js';

const ROLE_SHADES = ['#1c1a17', '#4b463f', '#807769', '#b3a994', '#ddd5c4'];
const ROLE_TEXT = ['#fff', '#fff', '#fff', '#1c1a17', '#1c1a17'];

function Figure({ label, value }) {
  return (
    <div className="figure">
      <span className="figure-value">{value}</span>
      <span className="figure-label">{label}</span>
    </div>
  );
}
Figure.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.node.isRequired };

function semesterStart() {
  const now = new Date();
  const start = now.getMonth() >= 6 ? new Date(now.getFullYear(), 7, 1) : new Date(now.getFullYear(), 0, 1);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = {
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    category: searchParams.get('category') || '',
  };
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setReport(null);
    api.report(filters)
      .then((r) => { setReport(r); setError(''); })
      .catch((err) => { setError(err.message); setReport({ clubs: [], totals: null }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fields = [
    { name: 'from', label: 'From', type: 'date' },
    { name: 'to', label: 'To', type: 'date' },
    { name: 'category', label: 'Category', options: toOptions(CATEGORIES), allLabel: 'All categories' },
  ];

  const range = filters.from || filters.to
    ? `${filters.from ? formatDate(filters.from, { day: 'numeric', month: 'short', year: 'numeric' }) : 'the start'} to ${filters.to ? formatDate(filters.to, { day: 'numeric', month: 'short', year: 'numeric' }) : 'today'}`
    : 'all time';
  const maxBudget = Math.max(1, ...(report?.clubs || []).map((r) => r.budget));
  const t = report?.totals;

  return (
    <>
      <PageHeader eyebrow={`Activity report · ${range}`} title="Reports">
        <button type="button" className="btn btn-quiet" onClick={() => setSearchParams(cleanParams({ ...filters, from: semesterStart(), to: '' }))}>This semester</button>
        <button type="button" className="btn btn-quiet" onClick={() => window.print()}><Icon name="print" size={16} /> Print</button>
      </PageHeader>
      <FilterForm key={searchParams.toString()} fields={fields} initialValues={filters} onApply={(v) => setSearchParams(cleanParams(v))} />
      <ErrorNote message={error} />

      {!report ? <Loading /> : !t ? null : report.clubs.length === 0 ? <EmptyState title="No clubs in this category" /> : (
        <>
          <div className="figures">
            <Figure label="clubs" value={t.clubs} />
            <Figure label="members" value={t.members} />
            <Figure label="events held" value={`${t.completedEvents}/${t.events}`} />
            <Figure label="registrations" value={t.registrations} />
            <Figure label="attendance" value={t.attendanceRate === null ? '—' : `${t.attendanceRate}%`} />
            <Figure label="budget planned" value={formatRupees(t.budget)} />
          </div>

          <div className="tablewrap">
            <table className="table report-table">
              <thead>
                <tr>
                  <th>Club</th>
                  <th className="num">Members</th>
                  <th className="num">Events held</th>
                  <th className="num">Registrations</th>
                  <th>Attendance</th>
                  <th>Budget</th>
                </tr>
              </thead>
              <tbody>
                {report.clubs.map((row) => (
                  <tr key={row.club._id}>
                    <td>
                      <Link to={`/clubs/${row.club._id}`} className="cell-club">
                        <Monogram name={row.club.name} category={row.club.category} size="sm" /> {row.club.name}
                      </Link>
                    </td>
                    <td className="num">{row.members}</td>
                    <td className="num">{row.completedEvents} <span className="muted">/ {row.events}</span></td>
                    <td className="num">{row.registrations}</td>
                    <td>
                      {row.attendanceRate === null ? <span className="muted">no events held</span> : (
                        <span className="meter">
                          <span className="meter-track"><span className="meter-fill" style={{ width: `${row.attendanceRate}%` }} /></span>
                          <span className="meter-label">{row.attendanceRate}%</span>
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="meter meter-budget">
                        <span className="meter-track"><span className="meter-fill" style={{ width: `${(row.budget / maxBudget) * 100}%` }} /></span>
                        <span className="meter-label">{formatRupees(row.budget)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="rolechart">
            <div className="section-head">
              <h2>Who runs what</h2>
              <ul className="legend">
                {ROLES.map((r, i) => <li key={r}><span style={{ background: ROLE_SHADES[i] }} /> {r}</li>)}
              </ul>
            </div>
            {report.clubs.filter((r) => r.members > 0).map((row) => (
              <div key={row.club._id} className="rolerow">
                <span className="rolerow-name">{row.club.name}</span>
                <span className="stack">
                  {ROLES.map((role, i) => {
                    const n = row.membersByRole[role] || 0;
                    return n ? (
                      <span key={role} className="stack-seg" style={{ flex: n, background: ROLE_SHADES[i], color: ROLE_TEXT[i] }} title={`${role}: ${n}`}>
                        {n}
                      </span>
                    ) : null;
                  })}
                </span>
              </div>
            ))}
          </section>
          <p className="footnote">Attendance counts only completed events. Budget excludes cancelled events. Members are counted as of today.</p>
        </>
      )}
    </>
  );
}
