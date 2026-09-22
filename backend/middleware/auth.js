'use strict';

const { verifyToken, COOKIE_NAME } = require('./session');
const User = require('../models/User');

function getSessionPayload(req) {
  const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
  return token ? verifyToken(token) : null;
}

/** Attaches req.user (or null) from the session cookie. */
async function attachUser(req, res, next) {
  const payload = getSessionPayload(req);
  if (payload && payload.id) {
    const user = await User.findById(payload.id);
    if (user && user.status === 'active') {
      req.user = User.sanitize(user);
    }
  }
  next();
}

/** Requires an authenticated, active user. */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  next();
}

/** Requires one of the given roles (default: admin only). */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { attachUser, requireAuth, requireRole, getSessionPayload };
