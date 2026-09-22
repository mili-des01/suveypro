'use strict';

/**
 * Audit logging for sensitive admin actions.
 * Usage: router.patch('/:id', requireAuth, audit('booking.update'), handler)
 */

const { query } = require('../config/database');

function audit(action, entity) {
  return (req, res, next) => {
    // Log after the response finishes so we can record the outcome without delaying it
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        query(
          `INSERT INTO audit_log (user_id, action, entity, entity_id, details, ip_address)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            req.user ? req.user.id : null,
            action,
            entity || (req.baseUrl ? req.baseUrl.replace('/api/', '') : null),
            req.params.id ? parseInt(req.params.id, 10) || null : null,
            req.method === 'DELETE' ? null : JSON.stringify(req.body || {}).slice(0, 2000),
            req.ip
          ]
        ).catch((err) => console.error('[audit] log failed:', err.message));
      }
    });
    next();
  };
}

module.exports = audit;
