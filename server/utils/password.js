// Password hashing with Node's built-in crypto.scrypt (no extra library).
// Stored format: "scrypt:<salt hex>:<key hex>"
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt:${salt}:${key.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const [scheme, salt, keyHex] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(String(password), salt, expected.length);
  // constant-time comparison so timing doesn't leak how much matched
  return crypto.timingSafeEqual(actual, expected);
}

// returns an error message, or null if the password is acceptable
function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < 8) return 'Use at least 8 characters';
  if (password.length > 128) return 'Keep it under 128 characters';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'Include at least one letter and one number';
  return null;
}

module.exports = { hashPassword, verifyPassword, passwordProblem };
