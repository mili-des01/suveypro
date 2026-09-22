'use strict';

const router = require('express').Router();
const dashboard = require('../controllers/dashboardController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/public-stats', dashboard.publicStats);
router.get('/overview', requireAuth, dashboard.overview);
router.get('/settings', requireAuth, dashboard.getSettings);
router.put('/settings', requireAuth, requireRole('admin', 'manager'), dashboard.updateSettings);
router.get('/notifications', requireAuth, dashboard.listNotifications);
router.patch('/notifications/:id/read', requireAuth, dashboard.markNotificationRead);
router.post('/test-email', requireAuth, requireRole('admin', 'manager'), dashboard.testEmail);

module.exports = router;
