// JWT-in-cookie authentication and role checks.
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const { createError } = require('../utils/http');

const cookieOptions = {
  httpOnly: true, // not readable from JavaScript, so XSS can't steal it
  sameSite: 'lax', // not sent on cross-site POSTs (basic CSRF protection)
  secure: config.NODE_ENV === 'production',
  path: '/',
};

function setAuthCookie(res, user) {
  const token = jwt.sign({ sub: String(user._id), role: user.role }, config.JWT_SECRET, {
    expiresIn: `${config.TOKEN_DAYS}d`,
  });
  res.cookie(config.COOKIE_NAME, token, { ...cookieOptions, maxAge: config.TOKEN_DAYS * 86400000 });
}

function clearAuthCookie(res) {
  res.clearCookie(config.COOKIE_NAME, cookieOptions);
}

// Runs on every request: if a valid token cookie is present, req.user is the user.
async function loadUser(req, res, next) {
  req.user = null;
  const token = req.cookies && req.cookies[config.COOKIE_NAME];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (user) req.user = user;
    else clearAuthCookie(res); // account was deleted
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      clearAuthCookie(res);
    } else {
      return next(err);
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return next(createError(401, 'Please log in to continue'));
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(createError(401, 'Please log in to continue'));
    if (!roles.includes(req.user.role)) return next(createError(403, "You don't have permission to do that"));
    next();
  };
}

// admins manage every club; a lead manages only their own
function canManageClub(user, clubId) {
  if (!user || !clubId) return false;
  if (user.role === 'admin') return true;
  return user.role === 'lead' && Boolean(user.leadClub) && String(user.leadClub) === String(clubId);
}

function assertCanManage(user, clubId) {
  if (!canManageClub(user, clubId)) {
    throw createError(403, user.role === 'lead' ? 'Club leads can only manage their own club' : "You don't have permission to do that");
  }
}

module.exports = { setAuthCookie, clearAuthCookie, loadUser, requireAuth, requireRole, canManageClub, assertCanManage };
