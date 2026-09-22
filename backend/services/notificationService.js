'use strict';

const Notification = require('../models/Notification');

/** Notify all admins of a new booking (global notification, user_id NULL). */
async function notifyNewBooking(booking) {
  return Notification.create({
    title: `New booking ${booking.bookingReference}`,
    message: `${booking.fullName} requested a survey at ${booking.propertyAddress}, ${booking.city}.`,
    type: 'booking'
  });
}

async function notifyBookingStatus(booking, statusLabel) {
  return Notification.create({
    title: `Booking ${booking.bookingReference} ${statusLabel}`,
    message: `${booking.full_name || booking.fullName || 'Client'} — status changed to ${statusLabel}.`,
    type: 'status'
  });
}

async function notifyNewMessage(message) {
  return Notification.create({
    title: 'New contact message',
    message: `${message.name}: ${message.subject || '(no subject)'}`,
    type: 'message'
  });
}

module.exports = { notifyNewBooking, notifyBookingStatus, notifyNewMessage };
