// Same-origin "/api": Vite proxies it in dev, Express serves it in production.
// The login cookie is httpOnly, so it is sent automatically and never touched here.
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const CATEGORIES = ['Technical', 'Cultural', 'Sports', 'Literary', 'Entrepreneurship', 'Social Service'];
export const ROLES = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Member'];
export const STATUSES = ['Upcoming', 'Completed', 'Cancelled'];
export const REQUEST_STATUSES = ['Pending', 'Approved', 'Rejected'];
export const USER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'lead', label: 'Club lead' },
  { value: 'student', label: 'Student' },
];

// App.jsx listens for this and sends the user back to the login page
export const SESSION_EXPIRED = 'clubhub:session-expired';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(BASE_URL + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('Cannot reach the server. Check that the API is running.');
  }
  if (res.status === 204) return null;
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Unexpected response from server (HTTP ${res.status})`);
  }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event(SESSION_EXPIRED));
    const err = new Error(data.error || 'Request failed');
    err.details = data.details || {};
    err.status = res.status;
    throw err;
  }
  return data;
}

function toQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) qs.set(key, value);
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  list: (resource, params = {}) => request(`/${resource}${toQuery(params)}`),
  get: (resource, id) => request(`/${resource}/${id}`),
  create: (resource, body) => request(`/${resource}`, json('POST', body)),
  update: (resource, id, body) => request(`/${resource}/${id}`, json('PUT', body)),
  remove: (resource, id) => request(`/${resource}/${id}`, { method: 'DELETE' }),
  stats: () => request('/stats'),
  report: (params = {}) => request(`/reports${toQuery(params)}`),
};

export const auth = {
  me: () => request('/auth/me').then((d) => d.user),
  login: (email, password) => request('/auth/login', json('POST', { email, password })).then((d) => d.user),
  register: (body) => request('/auth/register', json('POST', body)).then((d) => d.user),
  logout: () => request('/auth/logout', { method: 'POST' }),
  updateProfile: (body) => request('/auth/me', json('PUT', body)).then((d) => d.user),
  changePassword: (currentPassword, newPassword) => request('/auth/password', json('PUT', { currentPassword, newPassword })),
};
