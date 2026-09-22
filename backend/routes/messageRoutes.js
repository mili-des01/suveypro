'use strict';

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/messageController');
const { requireAuth, requireRole } = require('../middleware/auth');
const audit = require('../middleware/audit');

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many messages sent. Please try again later.' }
});

// Public
router.post('/', contactLimiter, controller.createMessage);

// Admin
router.get('/', requireAuth, controller.listMessages);
router.patch('/:id', requireAuth, requireRole('admin', 'manager'), audit('message.update'), controller.updateMessage);
router.delete('/:id', requireAuth, requireRole('admin'), audit('message.delete'), controller.deleteMessage);

module.exports = router;
