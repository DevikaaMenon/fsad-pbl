function createError(status, message, details) {
  const err = new Error(message);
  err.status = status;
  if (details) err.details = details;
  return err;
}

// only copy fields we allow clients to set
function pick(source, keys) {
  const out = {};
  keys.forEach((key) => {
    if (source[key] !== undefined) out[key] = source[key];
  });
  return out;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// { key: count } from a list, e.g. countBy(members, (m) => m.role)
function countBy(list, keyFn) {
  const out = {};
  list.forEach((item) => {
    const key = String(keyFn(item));
    out[key] = (out[key] || 0) + 1;
  });
  return out;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

module.exports = { createError, pick, escapeRegex, countBy, startOfToday };
