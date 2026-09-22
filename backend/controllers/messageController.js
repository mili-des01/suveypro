'use strict';

const Message = require('../models/Message');
const Client = require('../models/Client');
const validation = require('../middleware/validation');
const notifications = require('../services/notificationService');
const { clampInt } = require('../middleware/validation');

/** Public: submit a contact message. */
async function createMessage(req, res) {
  const { valid, errors, data } = validation.validateMessage(req.body || {});
  if (!valid) {
    return res.status(400).json({ success: false, message: 'Please complete the required fields.', errors });
  }
  try {
    const created = await Message.create(data);
    // Track as client lead
    await Client.findOrCreate({ name: data.name, email: data.email, phone: data.phone }).catch(() => {});
    notifications.notifyNewMessage({ ...data, id: created.id }).catch(() => {});
    res.status(201).json({ success: true, message: 'Your message has been sent. We will get back to you shortly.' });
  } catch (err) {
    console.error('[messageController] create failed:', err);
    res.status(500).json({ success: false, message: 'Something went wrong while sending your message. Please try again.' });
  }
}

/** Admin: list messages. */
async function listMessages(req, res) {
  const page = clampInt(req.query.page, 1, 100000, 1);
  const limit = clampInt(req.query.limit, 1, 100, 20);
  const result = await Message.list({ page, limit, status: req.query.status || undefined });
  res.json({ success: true, ...result });
}

/** Admin: update status. */
async function updateMessage(req, res) {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body || {};
  if (!Message.STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }
  const updated = await Message.updateStatus(id, status);
  if (!updated) return res.status(404).json({ success: false, message: 'Message not found.' });
  res.json({ success: true, message: 'Message updated.' });
}

/** Admin: delete message. */
async function deleteMessage(req, res) {
  const ok = await Message.remove(parseInt(req.params.id, 10));
  if (!ok) return res.status(404).json({ success: false, message: 'Message not found.' });
  res.json({ success: true, message: 'Message deleted.' });
}

module.exports = { createMessage, listMessages, updateMessage, deleteMessage };
