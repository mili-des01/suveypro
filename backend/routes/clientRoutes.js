'use strict';

const router = require('express').Router();
const controller = require('../controllers/clientController');
const { requireAuth, requireRole } = require('../middleware/auth');
const audit = require('../middleware/audit');

router.get('/', requireAuth, controller.listClients);
router.get('/:id', requireAuth, controller.getClient);
router.patch('/:id', requireAuth, requireRole('admin', 'manager'), audit('client.update'), controller.updateClient);
router.delete('/:id', requireAuth, requireRole('admin'), audit('client.delete'), controller.deleteClient);

module.exports = router;
