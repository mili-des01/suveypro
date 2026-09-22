'use strict';

const Service = require('../models/Service');

/** Public + admin: list services. */
async function listServices(req, res) {
  const isAdmin = !!req.user && ['admin', 'manager'].includes(req.user.role);
  const services = await Service.list({ publishedOnly: !isAdmin });
  res.json({ success: true, data: services });
}

/** Public: service by slug. */
async function getService(req, res) {
  const svc = await Service.findBySlug(req.params.slug);
  if (!svc || (svc.status !== 'published' && !(req.user && ['admin', 'manager'].includes(req.user.role)))) {
    return res.status(404).json({ success: false, message: 'Service not found.' });
  }
  res.json({ success: true, service: svc });
}

/** Admin: create service. */
async function createService(req, res) {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Service name is required.' });
  }
  const created = await Service.create({
    name: name.trim(),
    slug: req.body.slug,
    description: req.body.description,
    icon: req.body.icon,
    imageUrl: req.body.imageUrl,
    status: req.body.status,
    displayOrder: req.body.displayOrder !== undefined ? parseInt(req.body.displayOrder, 10) || 99 : undefined
  });
  res.status(201).json({ success: true, message: 'Service created.', service: created });
}

/** Admin: update service. */
async function updateService(req, res) {
  const id = parseInt(req.params.id, 10);
  const data = {};
  if (req.body.name !== undefined) data.name = String(req.body.name).trim();
  if (req.body.description !== undefined) data.description = req.body.description;
  if (req.body.icon !== undefined) data.icon = req.body.icon;
  if (req.body.imageUrl !== undefined) data.imageUrl = req.body.imageUrl;
  if (req.body.status !== undefined) data.status = req.body.status === 'published' ? 'published' : 'draft';
  if (req.body.displayOrder !== undefined) data.displayOrder = parseInt(req.body.displayOrder, 10) || 0;

  const updated = await Service.update(id, data);
  if (!updated) return res.status(404).json({ success: false, message: 'Service not found.' });
  res.json({ success: true, message: 'Service updated.' });
}

/** Admin: delete service. */
async function deleteService(req, res) {
  const ok = await Service.remove(parseInt(req.params.id, 10));
  if (!ok) return res.status(404).json({ success: false, message: 'Service not found.' });
  res.json({ success: true, message: 'Service deleted.' });
}

module.exports = { listServices, getService, createService, updateService, deleteService };
