'use strict';

const router = require('express').Router();
const controller = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');
const audit = require('../middleware/audit');

// Admin-only user management
router.get('/', requireAuth, requireRole('admin'), controller.listUsers);
router.post('/', requireAuth, requireRole('admin'), audit('user.create'), controller.createUser);
router.patch('/:id', requireAuth, requireRole('admin'), audit('user.update'), controller.updateUser);
router.delete('/:id', requireAuth, requireRole('admin'), audit('user.delete'), controller.deleteUser);

module.exports = router;
