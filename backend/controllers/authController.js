'use strict';

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { setSessionCookie, clearSessionCookie } = require('../middleware/session');
const { query } = require('../config/database');

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const user = await User.findByEmail(String(email).trim());
  const ok = user && await bcrypt.compare(String(password), user.password_hash);
  if (!ok || user.status !== 'active') {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  setSessionCookie(res, { id: user.id, role: user.role, name: user.name });

  // Audit log
  query('INSERT INTO audit_log (user_id, action, entity, ip_address) VALUES ($1,$2,$3,$4)',
    [user.id, 'auth.login', 'user', req.ip]).catch(() => {});

  res.json({ success: true, user: User.sanitize(user) });
}

async function logout(req, res) {
  clearSessionCookie(res);
  res.json({ success: true, message: 'Logged out.' });
}

async function me(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  res.json({ success: true, user: req.user });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
  }
  const user = await User.findById(req.user.id);
  const ok = user && await bcrypt.compare(String(currentPassword), user.password_hash);
  if (!ok) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await User.updatePassword(user.id, hash);
  res.json({ success: true, message: 'Password updated.' });
}

module.exports = { login, logout, me, changePassword };
