'use strict';

const Client = require('../models/Client');
const { clampInt } = require('../middleware/validation');

async function listClients(req, res) {
  const page = clampInt(req.query.page, 1, 100000, 1);
  const limit = clampInt(req.query.limit, 1, 100, 20);
  const result = await Client.list({ page, limit, search: req.query.search || undefined });
  res.json({ success: true, ...result });
}

async function getClient(req, res) {
  const id = parseInt(req.params.id, 10);
  const client = await Client.findById(id);
  if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });
  const history = await Client.getBookingHistory(id);
  res.json({ success: true, client, bookingHistory: history });
}

async function updateClient(req, res) {
  const id = parseInt(req.params.id, 10);
  const { name, email, phone, address } = req.body || {};
  const updated = await Client.update(id, { name, email, phone, address });
  if (!updated) return res.status(404).json({ success: false, message: 'Client not found.' });
  res.json({ success: true, message: 'Client updated.', client: updated });
}

async function deleteClient(req, res) {
  const ok = await Client.remove(parseInt(req.params.id, 10));
  if (!ok) return res.status(404).json({ success: false, message: 'Client not found.' });
  res.json({ success: true, message: 'Client deleted.' });
}

module.exports = { listClients, getClient, updateClient, deleteClient };
