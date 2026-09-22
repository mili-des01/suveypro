'use strict';

const Booking = require('../models/Booking');
const Client = require('../models/Client');
const Service = require('../models/Service');
const validation = require('../middleware/validation');
const { storeFile } = require('../services/storageService');
const emailService = require('../services/emailService');
const environment = require('../config/environment');
const notifications = require('../services/notificationService');
const { withTransaction } = require('../config/database');
const { clampInt } = require('../middleware/validation');

/** Public: create a booking request (with optional attachments). */
async function createBooking(req, res) {
  const { valid, errors, data } = validation.validateBooking(req.body);
  if (!valid) {
    return res.status(400).json({ success: false, message: 'Please complete the required fields.', errors });
  }

  // Resolve service by id or slug
  let serviceId = data.serviceId || null;
  if (!serviceId && data.serviceSlug) {
    const svc = await Service.findBySlug(data.serviceSlug);
    serviceId = svc ? svc.id : null;
  }
  if (!serviceId) {
    return res.status(400).json({ success: false, message: 'Please choose a survey service.', errors: { serviceId: 'Please choose a survey service.' } });
  }

  const files = req.files || [];

  try {
    const created = await withTransaction(async (tx) => {
      const clientId = await Client.findOrCreate(
        { name: data.fullName, email: data.email, phone: data.phone, address: `${data.propertyAddress}, ${data.city}` },
        tx
      );
      const row = await Booking.create({ ...data, serviceId, clientId }, tx);

      for (const file of files) {
        const meta = await storeFile(file, `bookings/${row.id}`);
        await Booking.addAttachment(row.id, meta, tx);
      }
      return row;
    });

    // Read the committed row (with service/attachment details) after commit
    const booking = await Booking.findById(created.id);

    // Post-commit side effects (never block the response on failure)
    if (booking) {
      notifications.notifyNewBooking(booking).catch(() => {});
      emailService.sendTemplate('bookingReceivedClient', { ...booking, email: booking.email })
        .then((r) => { if (!r.sent) console.log(`[booking] client email not sent: ${r.error}`); })
        .catch(() => {});
      emailService.sendTemplate('bookingReceivedAdmin', booking, environment.email.adminNotify || undefined)
        .catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: 'Booking request received.',
      booking: {
        id: created.id,
        bookingReference: created.bookingReference,
        fullName: created.fullName,
        status: created.status,
        createdAt: created.createdAt
      }
    });
  } catch (err) {
    console.error('[bookingController] create failed:', err);
    res.status(500).json({ success: false, message: 'Something went wrong while submitting your request. Please try again.' });
  }
}

/** Admin: list bookings with filters + pagination. */
async function listBookings(req, res) {
  const page = clampInt(req.query.page, 1, 100000, 1);
  const limit = clampInt(req.query.limit, 1, 100, 20);
  const result = await Booking.list({
    page,
    limit,
    status: req.query.status || undefined,
    serviceId: req.query.serviceId ? clampInt(req.query.serviceId, 1, 1e9, undefined) : undefined,
    surveyorId: req.query.surveyorId ? clampInt(req.query.surveyorId, 1, 1e9, undefined) : undefined,
    search: req.query.search || undefined,
    dateFrom: req.query.dateFrom || undefined,
    dateTo: req.query.dateTo || undefined
  });
  res.json({ success: true, ...result });
}

/** Admin: get booking details. */
async function getBooking(req, res) {
  const booking = await Booking.findById(parseInt(req.params.id, 10));
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  res.json({ success: true, booking });
}

/** Admin: update status / notes / assignment. */
async function updateBooking(req, res) {
  const id = parseInt(req.params.id, 10);
  const booking = await Booking.findById(id);
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

  const { status, adminNotes, assignedSurveyor } = req.body || {};
  if (status && !Booking.STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }
  if (assignedSurveyor !== undefined && assignedSurveyor !== null) {
    const n = parseInt(assignedSurveyor, 10);
    if (Number.isNaN(n)) return res.status(400).json({ success: false, message: 'Invalid surveyor.' });
  }

  const updated = await Booking.updateStatus(id, {
    status: status || null,
    adminNotes: adminNotes !== undefined ? adminNotes : null,
    assignedSurveyor
  });

  const labels = { confirmed: 'confirmed', rescheduled: 'rescheduled', completed: 'completed', cancelled: 'cancelled', rejected: 'rejected' };
  if (status && labels[status]) {
    emailService.sendTemplate(`booking${status.charAt(0).toUpperCase()}${status.slice(1)}`, {
      bookingReference: updated.booking_reference,
      fullName: updated.full_name,
      email: updated.email,
      serviceName: booking.serviceName,
      preferredDate: booking.preferredDate
    }).catch(() => {});
  }

  res.json({ success: true, message: 'Booking updated.', booking: await Booking.findById(id) });
}

/** Admin: delete booking. */
async function deleteBooking(req, res) {
  const ok = await Booking.remove(parseInt(req.params.id, 10));
  if (!ok) return res.status(404).json({ success: false, message: 'Booking not found.' });
  res.json({ success: true, message: 'Booking deleted.' });
}

module.exports = { createBooking, listBookings, getBooking, updateBooking, deleteBooking };
