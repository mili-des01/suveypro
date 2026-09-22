'use strict';

const router = require('express').Router();
const controller = require('../controllers/bookingController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const audit = require('../middleware/audit');

// Public: submit a survey request (multipart for attachments)
router.post('/', upload.array('attachments', 5), controller.createBooking);

// Admin area
router.get('/', requireAuth, controller.listBookings);
router.get('/:id', requireAuth, controller.getBooking);
router.patch('/:id', requireAuth, requireRole('admin', 'manager'), audit('booking.update'), controller.updateBooking);
router.delete('/:id', requireAuth, requireRole('admin'), audit('booking.delete'), controller.deleteBooking);

module.exports = router;
