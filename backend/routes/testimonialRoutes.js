'use strict';

const router = require('express').Router();
const controller = require('../controllers/testimonialController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const audit = require('../middleware/audit');

// Public
router.get('/', controller.listTestimonials);

// Admin
router.post('/', requireAuth, requireRole('admin', 'manager'), upload.single('photo'), audit('testimonial.create'), controller.createTestimonial);
router.patch('/:id', requireAuth, requireRole('admin', 'manager'), upload.single('photo'), audit('testimonial.update'), controller.updateTestimonial);
router.delete('/:id', requireAuth, requireRole('admin'), audit('testimonial.delete'), controller.deleteTestimonial);

module.exports = router;
