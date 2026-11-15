// Slows down password guessing: after 5 failed logins for the same email from the
// same IP, block further attempts for 15 minutes. Kept in memory (resets on restart).
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const attempts = new Map();

function keyFor(req, email) {
  return `${req.ip}|${String(email || '').toLowerCase()}`;
}

// minutes left on a block, or 0 if allowed
function blockedFor(req, email) {
  const entry = attempts.get(keyFor(req, email));
  if (!entry) return 0;
  if (Date.now() - entry.first > WINDOW_MS) {
    attempts.delete(keyFor(req, email));
    return 0;
  }
  return entry.count >= MAX_FAILURES ? Math.ceil((entry.first + WINDOW_MS - Date.now()) / 60000) : 0;
}

function recordFailure(req, email) {
  const key = keyFor(req, email);
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) attempts.set(key, { count: 1, first: Date.now() });
  else entry.count += 1;
}

function recordSuccess(req, email) {
  attempts.delete(keyFor(req, email));
}

// drop stale entries now and then
setInterval(() => {
  const now = Date.now();
  attempts.forEach((entry, key) => { if (now - entry.first > WINDOW_MS) attempts.delete(key); });
}, WINDOW_MS).unref();

function reset() {
  attempts.clear();
}

module.exports = { blockedFor, recordFailure, recordSuccess, reset };
