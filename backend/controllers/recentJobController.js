'use strict';

const RecentJob = require('../models/RecentJob');
const validation = require('../middleware/validation');
const { storeFile } = require('../services/storageService');
const { clampInt } = require('../middleware/validation');

async function listJobs(req, res) {
  const page = clampInt(req.query.page, 1, 100000, 1);
  const limit = clampInt(req.query.limit, 1, 50, 12);
  const isAdmin = !!req.user && ['admin', 'manager'].includes(req.user.role);
  const result = await RecentJob.list({ page, limit, publishedOnly: !isAdmin });
  res.json({ success: true, ...result });
}

async function getJob(req, res) {
  const job = await RecentJob.findById(parseInt(req.params.id, 10));
  if (!job || (!job.published && !(req.user && ['admin', 'manager'].includes(req.user.role)))) {
    return res.status(404).json({ success: false, message: 'Job not found.' });
  }
  res.json({ success: true, job });
}

async function createJob(req, res) {
  const { title } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Job title is required.' });
  }
  let coverImageUrl = req.body.coverImageUrl || null;
  if (req.file) {
    const meta = await storeFile(req.file, 'recent-jobs');
    coverImageUrl = meta.fileUrl;
  }
  const created = await RecentJob.create({
    title: title.trim(),
    location: req.body.location,
    serviceId: req.body.serviceId ? parseInt(req.body.serviceId, 10) || null : null,
    description: req.body.description,
    jobDate: req.body.jobDate,
    coverImageUrl,
    published: req.body.published === true || req.body.published === 'true'
  });
  res.status(201).json({ success: true, message: 'Recent job created.', job: created });
}

async function updateJob(req, res) {
  const id = parseInt(req.params.id, 10);
  const data = {};
  if (req.body.title !== undefined) data.title = String(req.body.title).trim();
  if (req.body.location !== undefined) data.location = req.body.location;
  if (req.body.serviceId !== undefined) data.serviceId = req.body.serviceId ? parseInt(req.body.serviceId, 10) || null : null;
  if (req.body.description !== undefined) data.description = req.body.description;
  if (req.body.jobDate !== undefined) {
    if (req.body.jobDate && !validation.isDate(req.body.jobDate)) {
      return res.status(400).json({ success: false, message: 'Invalid date.' });
    }
    data.jobDate = req.body.jobDate || null;
  }
  if (req.body.published !== undefined) data.published = req.body.published === true || req.body.published === 'true';
  if (req.file) {
    const meta = await storeFile(req.file, 'recent-jobs');
    data.coverImageUrl = meta.fileUrl;
  }

  const updated = await RecentJob.update(id, data);
  if (!updated) return res.status(404).json({ success: false, message: 'Job not found.' });
  res.json({ success: true, message: 'Job updated.' });
}

async function deleteJob(req, res) {
  const ok = await RecentJob.remove(parseInt(req.params.id, 10));
  if (!ok) return res.status(404).json({ success: false, message: 'Job not found.' });
  res.json({ success: true, message: 'Job deleted.' });
}

module.exports = { listJobs, getJob, createJob, updateJob, deleteJob };
