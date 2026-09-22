'use strict';

const Project = require('../models/Project');
const validation = require('../middleware/validation');
const { storeFile, deleteFile } = require('../services/storageService');
const { clampInt } = require('../middleware/validation');

/** Public: list published projects. Admin: list all. */
async function listProjects(req, res) {
  const page = clampInt(req.query.page, 1, 100000, 1);
  const limit = clampInt(req.query.limit, 1, 50, 12);
  const isAdmin = !!req.user && ['admin', 'manager'].includes(req.user.role);

  const result = await Project.list({
    page,
    limit,
    category: req.query.category || undefined,
    location: req.query.location || undefined,
    search: req.query.search || undefined,
    featured: req.query.featured !== undefined ? req.query.featured : undefined,
    publishedOnly: !isAdmin
  });
  res.json({ success: true, ...result });
}

/** Public: project detail by slug. */
async function getProject(req, res) {
  const isAdmin = !!req.user && ['admin', 'manager'].includes(req.user.role);
  const project = await Project.findBySlug(req.params.slug, { publishedOnly: !isAdmin });
  if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
  res.json({ success: true, project });
}

/** Admin: create project (multipart for cover image). */
async function createProject(req, res) {
  const { valid, errors, data } = validation.validateProject(req.body || {});
  if (!valid) return res.status(400).json({ success: false, message: 'Please complete the required fields.', errors });

  try {
    if (req.file) {
      const meta = await storeFile(req.file, 'projects');
      data.coverImageUrl = meta.fileUrl;
      data.coverImageKey = meta.storageKey;
    }
    const created = await Project.create(data);
    res.status(201).json({ success: true, message: 'Project created.', project: created });
  } catch (err) {
    console.error('[projectController] create failed:', err);
    res.status(500).json({ success: false, message: 'Unable to save the project. Please try again.' });
  }
}

/** Admin: update project. */
async function updateProject(req, res) {
  const id = parseInt(req.params.id, 10);
  const { valid, errors, data } = validation.validateProject(req.body || {}, { partial: true });
  if (!valid) return res.status(400).json({ success: false, message: 'Please check the form.', errors });

  try {
    if (req.file) {
      const meta = await storeFile(req.file, 'projects');
      data.coverImageUrl = meta.fileUrl;
      data.coverImageKey = meta.storageKey;
    }
    const updated = await Project.update(id, data);
    if (!updated) return res.status(404).json({ success: false, message: 'Project not found.' });
    res.json({ success: true, message: 'Project updated.', project: updated });
  } catch (err) {
    console.error('[projectController] update failed:', err);
    res.status(500).json({ success: false, message: 'Unable to save the project. Please try again.' });
  }
}

/** Admin: upload a gallery image. */
async function uploadGalleryImage(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!req.file) return res.status(400).json({ success: false, message: 'No image provided.' });
  try {
    const meta = await storeFile(req.file, `projects/${id}/gallery`);
    const imageId = await Project.addGalleryImage(id, {
      url: meta.fileUrl,
      key: meta.storageKey,
      caption: req.body.caption || null
    });
    res.status(201).json({ success: true, message: 'Image added.', imageId });
  } catch (err) {
    console.error('[projectController] gallery upload failed:', err);
    res.status(500).json({ success: false, message: 'Image upload failed. Please try again.' });
  }
}

/** Admin: delete gallery image. */
async function deleteGalleryImage(req, res) {
  await Project.removeGalleryImage(parseInt(req.params.imageId, 10));
  res.json({ success: true, message: 'Image removed.' });
}

/** Admin: delete project. */
async function deleteProject(req, res) {
  const ok = await Project.remove(parseInt(req.params.id, 10));
  if (!ok) return res.status(404).json({ success: false, message: 'Project not found.' });
  res.json({ success: true, message: 'Project deleted.' });
}

module.exports = {
  listProjects, getProject, createProject, updateProject,
  uploadGalleryImage, deleteGalleryImage, deleteProject
};
