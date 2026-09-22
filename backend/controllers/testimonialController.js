'use strict';

const Testimonial = require('../models/Testimonial');
const { storeFile } = require('../services/storageService');
const { clampInt, isRating } = require('../middleware/validation');

async function listTestimonials(req, res) {
  const page = clampInt(req.query.page, 1, 100000, 1);
  const limit = clampInt(req.query.limit, 1, 100, 24);
  const isAdmin = !!req.user && ['admin', 'manager'].includes(req.user.role);
  const result = await Testimonial.list({ page, limit, publishedOnly: !isAdmin });
  res.json({ success: true, ...result });
}

async function createTestimonial(req, res) {
  const { clientName, message } = req.body || {};
  const errors = {};
  if (!clientName || typeof clientName !== 'string' || !clientName.trim()) errors.clientName = 'Client name is required.';
  if (!message || typeof message !== 'string' || !message.trim()) errors.message = 'Testimonial message is required.';
  if (req.body.rating !== undefined && req.body.rating !== '' && !isRating(parseInt(req.body.rating, 10))) {
    errors.rating = 'Rating must be 1–5.';
  }
  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, message: 'Please complete the required fields.', errors });
  }

  let photoUrl = req.body.photoUrl || null;
  if (req.file) {
    const meta = await storeFile(req.file, 'testimonials');
    photoUrl = meta.fileUrl;
  }

  const created = await Testimonial.create({
    clientName: clientName.trim(),
    company: req.body.company,
    message: message.trim(),
    rating: req.body.rating ? parseInt(req.body.rating, 10) : null,
    photoUrl,
    published: req.body.published === true || req.body.published === 'true'
  });
  res.status(201).json({ success: true, message: 'Testimonial added.', testimonial: created });
}

async function updateTestimonial(req, res) {
  const id = parseInt(req.params.id, 10);
  const data = {};
  if (req.body.clientName !== undefined) data.clientName = String(req.body.clientName).trim();
  if (req.body.company !== undefined) data.company = req.body.company;
  if (req.body.message !== undefined) data.message = String(req.body.message).trim();
  if (req.body.rating !== undefined) data.rating = req.body.rating ? parseInt(req.body.rating, 10) : null;
  if (req.body.published !== undefined) data.published = req.body.published === true || req.body.published === 'true';
  if (req.file) {
    const meta = await storeFile(req.file, 'testimonials');
    data.photoUrl = meta.fileUrl;
  }

  const updated = await Testimonial.update(id, data);
  if (!updated) return res.status(404).json({ success: false, message: 'Testimonial not found.' });
  res.json({ success: true, message: 'Testimonial updated.' });
}

async function deleteTestimonial(req, res) {
  const ok = await Testimonial.remove(parseInt(req.params.id, 10));
  if (!ok) return res.status(404).json({ success: false, message: 'Testimonial not found.' });
  res.json({ success: true, message: 'Testimonial deleted.' });
}

module.exports = { listTestimonials, createTestimonial, updateTestimonial, deleteTestimonial };
