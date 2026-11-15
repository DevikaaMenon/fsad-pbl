const express = require('express');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { createError, pick } = require('../utils/http');
const { hashPassword, verifyPassword, passwordProblem } = require('../utils/password');
const limiter = require('../utils/loginLimiter');
const { setAuthCookie, clearAuthCookie, requireAuth } = require('../middleware/auth');

const router = express.Router();

async function ensureUnique({ email, usn }, exceptId) {
  const details = {};
  if (email && (await User.exists({ email: String(email).trim().toLowerCase(), _id: { $ne: exceptId } }))) {
    details.email = 'An account with this email already exists';
  }
  if (usn && (await User.exists({ usn: String(usn).trim().toUpperCase(), _id: { $ne: exceptId } }))) {
    details.usn = 'This USN is already registered';
  }
  if (Object.keys(details).length) throw createError(409, Object.values(details)[0], details);
}

// POST /api/auth/register: students create their own account
router.post('/register', asyncHandler(async (req, res) => {
  const data = pick(req.body, ['name', 'email', 'usn', 'password']);
  const problem = passwordProblem(data.password);
  const user = new User({ ...data, role: 'student', passwordHash: 'pending' });

  // collect schema errors and the password rule together
  const err = user.validateSync();
  const details = {};
  if (err) Object.values(err.errors).forEach((e) => { details[e.path] = e.message; });
  if (problem) details.password = problem;
  if (Object.keys(details).length) throw createError(400, 'Validation failed', details);

  await ensureUnique(data);
  user.passwordHash = await hashPassword(data.password);
  user.lastLoginAt = new Date();
  await user.save();
  setAuthCookie(res, user);
  res.status(201).json({ user });
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw createError(400, 'Enter your email and password', {
      ...(email ? {} : { email: 'Required' }),
      ...(password ? {} : { password: 'Required' }),
    });
  }
  const wait = limiter.blockedFor(req, email);
  if (wait) throw createError(429, `Too many failed attempts. Try again in ${wait} minute${wait === 1 ? '' : 's'}.`);

  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+passwordHash');
  const ok = user && (await verifyPassword(password, user.passwordHash));
  if (!ok) {
    limiter.recordFailure(req, email);
    throw createError(401, 'Email or password is incorrect');
  }
  limiter.recordSuccess(req, email);
  user.lastLoginAt = new Date();
  await user.save();
  setAuthCookie(res, user);
  res.json({ user });
}));

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

// GET /api/auth/me: who is logged in (user is null when nobody is)
router.get('/me', (req, res) => {
  res.json({ user: req.user || null });
});

// PUT /api/auth/me: update your own profile
router.put('/me', requireAuth, asyncHandler(async (req, res) => {
  const data = pick(req.body, ['name', 'email', 'usn']);
  if (data.usn !== undefined && req.user.usn && data.usn.toUpperCase() !== req.user.usn) {
    throw createError(400, 'Your USN cannot be changed. Ask an admin if it is wrong.', { usn: 'Cannot be changed' });
  }
  await ensureUnique(data, req.user._id);
  Object.assign(req.user, data);
  await req.user.save();
  res.json({ user: req.user });
}));

// PUT /api/auth/password
router.put('/password', requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await verifyPassword(currentPassword || '', user.passwordHash))) {
    throw createError(400, 'Current password is incorrect', { currentPassword: 'Incorrect password' });
  }
  const problem = passwordProblem(newPassword);
  if (problem) throw createError(400, problem, { newPassword: problem });
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  setAuthCookie(res, user);
  res.json({ ok: true });
}));

module.exports = router;
