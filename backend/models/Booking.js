'use strict';

const { query, withTransaction } = require('../config/database');

const STATUSES = ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'rescheduled', 'cancelled', 'rejected'];

function toCamel(row) {
  return {
    id: row.id,
    bookingReference: row.booking_reference,
    clientId: row.client_id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    propertyAddress: row.property_address,
    city: row.city,
    propertyType: row.property_type,
    propertySize: row.property_size,
    preferredDate: row.preferred_date,
    preferredTime: row.preferred_time,
    alternativeDate: row.alternative_date,
    description: row.description,
    status: row.status,
    assignedSurveyor: row.assigned_surveyor,
    surveyorName: row.surveyor_name,
    adminNotes: row.admin_notes,
    attachments: row.attachments || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const SELECT_SQL = `
  SELECT b.*,
         s.name AS service_name,
         u.name AS surveyor_name,
         COALESCE(
           (SELECT json_agg(json_build_object(
              'id', a.id,
              'originalFilename', a.original_filename,
              'storageProvider', a.storage_provider,
              'fileUrl', a.file_url,
              'mimeType', a.mime_type,
              'fileSize', a.file_size
            ) ORDER BY a.id)
            FROM booking_attachments a WHERE a.booking_id = b.id),
           '[]'::json
         ) AS attachments
  FROM bookings b
  LEFT JOIN services s ON s.id = b.service_id
  LEFT JOIN users u ON u.id = b.assigned_surveyor
`;

async function nextReference() {
  const year = new Date().getFullYear();
  const { rows } = await query(
    `SELECT booking_reference FROM bookings
     WHERE booking_reference LIKE $1
     ORDER BY id DESC LIMIT 1`,
    [`SRV-${year}-%`]
  );
  let next = 1;
  if (rows[0]) {
    const last = parseInt(rows[0].booking_reference.split('-')[2], 10);
    if (!Number.isNaN(last)) next = last + 1;
  }
  return `SRV-${year}-${String(next).padStart(5, '0')}`;
}

async function create(data, client = null) {
  const q = client ? client.query.bind(client) : query;
  const reference = await nextReference();

  const { rows } = await q(
    `INSERT INTO bookings
       (booking_reference, client_id, service_id, full_name, email, phone,
        property_address, city, property_type, property_size,
        preferred_date, preferred_time, alternative_date, description, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending')
     RETURNING *`,
    [reference, data.clientId || null, data.serviceId || null, data.fullName, data.email,
      data.phone, data.propertyAddress, data.city, data.propertyType || null,
      data.propertySize || null, data.preferredDate || null, data.preferredTime || null,
      data.alternativeDate || null, data.description || null]
  );
  return toCamel(rows[0]);
}

async function list({ page = 1, limit = 20, status, serviceId, surveyorId, search, dateFrom, dateTo } = {}) {
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (status) { params.push(status); where.push(`b.status = $${params.length}`); }
  if (serviceId) { params.push(serviceId); where.push(`b.service_id = $${params.length}`); }
  if (surveyorId) { params.push(surveyorId); where.push(`b.assigned_surveyor = $${params.length}`); }
  if (dateFrom) { params.push(dateFrom); where.push(`b.preferred_date >= $${params.length}`); }
  if (dateTo) { params.push(dateTo); where.push(`b.preferred_date <= $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(b.booking_reference ILIKE $${params.length} OR b.full_name ILIKE $${params.length}
                 OR b.email ILIKE $${params.length} OR b.phone ILIKE $${params.length}
                 OR b.property_address ILIKE $${params.length} OR b.city ILIKE $${params.length})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await query(
    `${SELECT_SQL} ${whereSql} ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS n FROM bookings b ${whereSql}`, params);
  return { data: rows.map(toCamel), total: countRows[0].n, page, limit };
}

async function findById(id) {
  const { rows } = await query(`${SELECT_SQL} WHERE b.id = $1`, [id]);
  return rows[0] ? toCamel(rows[0]) : null;
}

async function findByReference(reference) {
  const { rows } = await query(`${SELECT_SQL} WHERE b.booking_reference = $1`, [reference]);
  return rows[0] ? toCamel(rows[0]) : null;
}

async function updateStatus(id, { status, adminNotes, assignedSurveyor }, client = null) {
  const q = client ? client.query.bind(client) : query;
  const { rows } = await q(
    `UPDATE bookings SET
       status = COALESCE($2, status),
       admin_notes = COALESCE($3, admin_notes),
       assigned_surveyor = CASE WHEN $4::boolean THEN $5 ELSE assigned_surveyor END,
       updated_at = NOW()
     WHERE id = $1
     RETURNING booking_reference, status, email, full_name`,
    [id, status || null, adminNotes || null,
      assignedSurveyor !== undefined, assignedSurveyor ?? null]
  );
  return rows[0] || null;
}

async function addAttachment(bookingId, meta, client = null) {
  const q = client ? client.query.bind(client) : query;
  const { rows } = await q(
    `INSERT INTO booking_attachments
       (booking_id, original_filename, storage_provider, storage_key, file_url, mime_type, file_size)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [bookingId, meta.originalFilename, meta.storageProvider, meta.storageKey, meta.fileUrl,
      meta.mimeType, meta.fileSize]
  );
  return rows[0].id;
}

async function attachToClient(bookingId, clientId, client = null) {
  const q = client ? client.query.bind(client) : query;
  await q('UPDATE bookings SET client_id = $2, updated_at = NOW() WHERE id = $1', [bookingId, clientId]);
}

async function stats() {
  const { rows } = await query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
      COUNT(*) FILTER (WHERE status = 'assigned')::int AS assigned,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
      COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS last_30_days
    FROM bookings
  `);
  return rows[0];
}

async function monthlyCounts(months = 6) {
  const { rows } = await query(`
    WITH months AS (
      SELECT date_trunc('month', NOW()) - (INTERVAL '1 month' * gs) AS m
      FROM generate_series(0, $1 - 1) AS gs
    )
    SELECT to_char(m, 'Mon YYYY') AS label,
           COALESCE((SELECT COUNT(*)::int FROM bookings b
                     WHERE date_trunc('month', b.created_at) = m), 0) AS count
    FROM months ORDER BY m ASC
  `, [months]);
  return rows;
}

async function popularServices(limit = 5) {
  const { rows } = await query(`
    SELECT s.name, COUNT(b.id)::int AS booking_count
    FROM services s
    LEFT JOIN bookings b ON b.service_id = s.id
    GROUP BY s.id, s.name
    ORDER BY booking_count DESC, s.display_order ASC
    LIMIT $1
  `, [limit]);
  return rows;
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM bookings WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = {
  STATUSES,
  toCamel,
  nextReference,
  create,
  list,
  findById,
  findByReference,
  updateStatus,
  addAttachment,
  attachToClient,
  stats,
  monthlyCounts,
  popularServices,
  remove,
  withTransaction
};
