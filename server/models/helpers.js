// Custom setter: tidy spaces and capitalise the first letter of each word.
// "  debate   society " -> "Debate Society" (keeps acronyms like "IEEE" as typed).
function titleCase(value) {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/\s+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Custom getter: return a Date as "YYYY-MM-DD" (also what <input type="date"> expects).
function toDateString(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

module.exports = { titleCase, toDateString, EMAIL_REGEX };
