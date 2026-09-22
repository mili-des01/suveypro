'use strict';

const Booking = require('../models/Booking');
const Message = require('../models/Message');
const Project = require('../models/Project');
const Service = require('../models/Service');
const Setting = require('../models/Setting');
const Notification = require('../models/Notification');
const environment = require('../config/environment');

async function overview(req, res) {
  const [
    bookingStats,
    unreadMessages,
    projectStats,
    monthly,
    popular,
    recentBookings,
    settings
  ] = await Promise.all([
    Booking.stats(),
    Message.unreadCount(),
    queryProjectCount(),
    Booking.monthlyCounts(6),
    Booking.popularServices(5),
    Booking.list({ page: 1, limit: 6 }),
    Setting.getAll()
  ]);

  res.json({
    success: true,
    stats: {
      totalBookings: bookingStats.total,
      pendingBookings: bookingStats.pending,
      confirmedBookings: bookingStats.confirmed,
      completedBookings: bookingStats.completed,
      cancelledBookings: bookingStats.cancelled,
      unreadMessages,
      totalProjects: projectStats.total,
      publishedProjects: projectStats.published
    },
    monthlyBookings: monthly,
    popularServices: popular,
    recentBookings: recentBookings.data,
    settings
  });
}

async function queryProjectCount() {
  const { query } = require('../config/database');
  const { rows } = await query(
    "SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE published)::int AS published FROM projects"
  );
  return rows[0];
}

/** Public: trust-strip statistics from settings. */
async function publicStats(req, res) {
  const settings = await Setting.getAll();
  res.json({
    success: true,
    stats: {
      years: settings.stats_years_experience || '10',
      projects: settings.stats_projects_completed || '500',
      clients: settings.stats_clients_served || '350',
      services: settings.stats_services_offered || '15'
    }
  });
}

async function getSettings(req, res) {
  const settings = await Setting.getAll();
  res.json({ success: true, settings });
}

async function updateSettings(req, res) {
  const body = req.body || {};
  const allowed = [
    'stats_years_experience', 'stats_projects_completed', 'stats_clients_served', 'stats_services_offered',
    'contact_address', 'contact_phone', 'contact_email', 'contact_hours'
  ];
  const entries = {};
  for (const key of allowed) {
    if (body[key] !== undefined) entries[key] = String(body[key]).slice(0, 500);
  }
  await Setting.setMany(entries);
  res.json({ success: true, message: 'Settings saved.', settings: await Setting.getAll() });
}

async function listNotifications(req, res) {
  const notifications = await Notification.list({ limit: 15 });
  const unread = await Notification.unreadCount();
  res.json({ success: true, notifications, unread });
}

async function markNotificationRead(req, res) {
  await Notification.markRead(parseInt(req.params.id, 10));
  res.json({ success: true });
}

/** Admin: send a test email to verify the Resend integration. */
async function testEmail(req, res) {
  const { to } = req.body || {};
  const emailService = require('../services/emailService');
  if (!emailService.isConfigured()) {
    return res.status(400).json({ success: false, message: 'EMAIL_API_KEY is not set — emails are being logged to the console instead.' });
  }
  const recipient = to || environment.email.adminNotify || req.user.email;
  const result = await emailService.sendEmail({
    to: recipient,
    subject: 'SurveyPro email test',
    html: emailService.wrapHtml('Email integration works', '<p>This is a test email from your SurveyPro admin dashboard.</p>')
  });
  if (result.sent) {
    res.json({ success: true, message: `Test email sent to ${recipient}. Check the Resend dashboard → Emails.` });
  } else {
    res.status(502).json({ success: false, message: `Send failed: ${result.error}` });
  }
}

module.exports = { overview, publicStats, getSettings, updateSettings, listNotifications, markNotificationRead, testEmail };
