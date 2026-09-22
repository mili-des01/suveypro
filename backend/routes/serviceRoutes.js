'use strict';

const router = require('express').Router();
const controller = require('../controllers/serviceController');
const { requireAuth, requireRole } = require('../middleware/auth');
const audit = require('../middleware/audit');

// Public
router.get('/', controller.listServices);
router.get('/:slug', controller.getService);

// Admin
router.post('/', requireAuth, requireRole('admin', 'manager'), audit('service.create'), controller.createService);
router.patch('/:id', requireAuth, requireRole('admin', 'manager'), audit('service.update'), controller.updateService);
router.delete('/:id', requireAuth, requireRole('admin'), audit('service.delete'), controller.deleteService);

module.exports = router;
