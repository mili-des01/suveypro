'use strict';

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { storeFile } = require('../services/storageService');
const { clampInt } = require('../middleware/validation');

async function listUsers(req, res) {
  const page = clampInt(req.query.page, 1, 100000, 1);
  const limit = clampInt(req.query.limit, 1, 100, 20);
  const result = await User.list({
    page,
    limit,
    role: req.query.role || undefined,
    status: req.query.status || undefined,
    search: req.query.search || undefined
  });
  res.json({ success: true, ...result });
}

async function createUser(req, res) {
  const { name, email, password, role } = req.body || {};
  const errors = {};
  if (!name || typeof name !== 'string' || !name.trim()) errors.name = 'Name is required.';
  if (!email || !validation_isEmail(email)) errors.email = 'A valid email is required.';
  if (!password || typeof password !== 'string' || password.length < 8) errors.password = 'Password must be at least 8 characters.';
  if (role && !User.ALLOWED_ROLES.includes(role)) errors.role = 'Invalid role.';
  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, message: 'Please complete the required fields.', errors });
  }

  const existing = await User.findByEmail(email);
  if (existing) {
    return res.status(409).json({ success: false, message: 'A user with this email already exists.', errors: { email: 'Email already in use.' } });
  }

  const hash = await bcrypt.hash(password, 12);
  const created = await User.create({ name: name.trim(), email: email.trim().toLowerCase(), password_hash: hash, role: role || 'staff' });
  res.status(201).json({ success: true, message: 'User created.', user: created });
}

function validation_isEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

async function updateUser(req, res) {
  const id = parseInt(req.params.id, 10);
  const { name, email, role, status, password } = req.body || {};

  if (role !== undefined && !User.ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role.' });
  }
  if (status !== undefined && !['active', 'suspended'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  let updated = null;
  if (password !== undefined && password !== '') {
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }
    const hash = await bcrypt.hash(password, 12);
    await User.updatePassword(id, hash);
  }
  updated = await User.updateRoleStatus(id, { role, status });
  if (name !== undefined || email !== undefined) {
    updated = await User.updateProfile(id, { name, email });
  }
  if (!updated) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true, message: 'User updated.', user: updated });
}

async function deleteUser(req, res) {
  const id = parseInt(req.params.id, 10);
  if (req.user.id === id) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
  }
  const ok = await User.remove(id);
  if (!ok) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true, message: 'User deleted.' });
}

module.exports = { listUsers, createUser, updateUser, deleteUser };
