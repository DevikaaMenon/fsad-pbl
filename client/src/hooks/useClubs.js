import { useEffect, useState } from 'react';
import { api } from '../api.js';

// All clubs, for dropdowns and for showing a club's name/colour next to records.
export default function useClubs() {
  const [clubs, setClubs] = useState([]);

  useEffect(() => {
    api.list('clubs').then(setClubs).catch(() => setClubs([]));
  }, []);

  const clubsById = {};
  clubs.forEach((c) => { clubsById[c._id] = c; });
  const clubOptions = clubs.map((c) => ({ value: c._id, label: c.name }));

  return { clubs, clubsById, clubOptions };
}
