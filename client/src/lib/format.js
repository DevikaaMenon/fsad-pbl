export const CATEGORY_COLORS = {
  Technical: '#1f6f78',
  Cultural: '#9c3d6e',
  Sports: '#c25e1c',
  Literary: '#3f4f9c',
  Entrepreneurship: '#3d7a3a',
  'Social Service': '#8a6a1f',
};

export function categoryColor(category) {
  return CATEGORY_COLORS[category] || '#6b6257';
}

// "E-Cell" -> "EC", "Debate Society" -> "DS", "NSS Unit" -> "NU"
export function initials(name = '') {
  const words = name.split(/[\s-]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// dates from the API are "YYYY-MM-DD"; parse them as local dates
function parseDay(iso) {
  return new Date(`${iso}T00:00:00`);
}

export function formatDate(iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!iso) return '';
  return parseDay(iso).toLocaleDateString('en-IN', opts);
}

export function dayParts(iso) {
  const d = parseDay(iso);
  return {
    month: d.toLocaleDateString('en-IN', { month: 'short' }),
    day: d.getDate(),
    weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
  };
}

export function monthLabel(iso) {
  return parseDay(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function formatTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`;
}

export function daysFromToday(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseDay(iso) - today) / 86400000);
}

export function whenLabel(iso) {
  const n = daysFromToday(iso);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n > 1 && n < 7) return `In ${n} days`;
  if (n < 0 && n > -7) return n === -1 ? 'Yesterday' : `${-n} days ago`;
  return formatDate(iso);
}

// for timestamps like createdAt
export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatRupees(amount) {
  const value = Number(amount || 0);
  const decimals = Number.isInteger(value) ? 0 : 2;
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: 2 })}`;
}

export function plural(n, word, many = `${word}s`) {
  return `${n} ${n === 1 ? word : many}`;
}
