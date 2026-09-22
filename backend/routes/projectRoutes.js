'use strict';

const router = require('express').Router();
const controller = require('../controllers/projectController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const audit = require('../middleware/audit');

// Public
router.get('/', controller.listProjects);
router.get('/:slug', controller.getProject);

// Admin
router.post('/', requireAuth, requireRole('admin', 'manager'), upload.single('coverImage'), audit('project.create'), controller.createProject);
router.patch('/:id', requireAuth, requireRole('admin', 'manager'), upload.single('coverImage'), audit('project.update'), controller.updateProject);
router.delete('/:id', requireAuth, requireRole('admin'), audit('project.delete'), controller.deleteProject);
router.post('/:id/gallery', requireAuth, requireRole('admin', 'manager'), upload.single('image'), audit('project.gallery'), controller.uploadGalleryImage);
router.delete('/:id/gallery/:imageId', requireAuth, requireRole('admin', 'manager'), audit('project.gallery.delete'), controller.deleteGalleryImage);

module.exports = router;
