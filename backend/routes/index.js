'use strict';

const router = require('express').Router();
const { attachUser } = require('../middleware/auth');

router.use(attachUser);

router.use('/auth', require('./authRoutes'));
router.use('/bookings', require('./bookingRoutes'));
router.use('/services', require('./serviceRoutes'));
router.use('/projects', require('./projectRoutes'));
router.use('/recent-jobs', require('./recentJobRoutes'));
router.use('/testimonials', require('./testimonialRoutes'));
router.use('/messages', require('./messageRoutes'));
router.use('/clients', require('./clientRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));

module.exports = router;
