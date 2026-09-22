'use strict';

const router = require('express').Router();
const controller = require('../controllers/recentJobController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const audit = require('../middleware/audit');

// Public
router.get('/', controller.listJobs);

// Admin
router.post('/', requireAuth, requireRole('admin', 'manager'), upload.single('coverImage'), audit('job.create'), controller.createJob);
router.get('/:id', requireAuth, controller.getJob);
router.patch('/:id', requireAuth, requireRole('admin', 'manager'), upload.single('coverImage'), audit('job.update'), controller.updateJob);
router.delete('/:id', requireAuth, requireRole('admin'), audit('job.delete'), controller.deleteJob);

module.exports = router;
