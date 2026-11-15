import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import Field from '../../components/Field.jsx';
import Icon from '../../components/Icon.jsx';
import { EmptyState, ErrorNote, Loading, Monogram } from '../../components/Bits.jsx';

// /clubs/:id/join: a student asks to join. Name, USN and email come from their account.
export default function JoinClub() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify, user } = useOutletContext();
  const [club, setClub] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('clubs', id).then(setClub).catch((err) => setError(err.message));
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.create('requests', { club: id, message });
      notify(`Request sent to ${club.name}`);
      navigate(`/clubs/${id}`);
    } catch (err) {
      setError(err.details?.message || err.message);
      setSaving(false);
    }
  }

  if (!club) return error ? <EmptyState title={error} /> : <Loading />;
  if (!user.usn) {
    return (
      <EmptyState title="Add your USN first">
        <p>Clubs need your USN to add you as a member.</p>
        <Link to="/account" className="btn btn-primary">Go to your account</Link>
      </EmptyState>
    );
  }
  if (!club.isActive) {
    return (
      <EmptyState title={`${club.name} is on a break`}>
        <p>It isn&apos;t taking new members this semester.</p>
        <Link to={`/clubs/${id}`} className="btn btn-quiet">Back to club</Link>
      </EmptyState>
    );
  }

  return (
    <div className="joinpage">
      <Link to={`/clubs/${id}`} className="backlink"><Icon name="back" size={15} /> {club.name}</Link>
      <form className="formcard joincard" onSubmit={handleSubmit} noValidate>
        <div className="joincard-head">
          <Monogram name={club.name} category={club.category} size="lg" />
          <div>
            <p className="eyebrow">Membership request</p>
            <h1>Join {club.name}</h1>
          </div>
        </div>
        <p className="muted">The club lead will review your request. Once approved you&apos;ll show up on the member list.</p>
        <ErrorNote message={error} />
        <dl className="applicant">
          <div><dt>Name</dt><dd>{user.name}</dd></div>
          <div><dt>USN</dt><dd className="mono">{user.usn}</dd></div>
          <div><dt>Email</dt><dd>{user.email}</dd></div>
        </dl>
        <Field label="Why do you want to join?" hint="Optional, a line or two is enough">
          <textarea rows="3" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} autoFocus />
        </Field>
        <div className="formactions">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Sending…' : 'Send request'}</button>
          <Link to={`/clubs/${id}`} className="btn btn-quiet">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
