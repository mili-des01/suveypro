'use strict';

const { query } = require('../config/database');

const SELECT_SQL = `
  SELECT s.*,
         COALESCE((SELECT COUNT(*)::int FROM bookings b WHERE b.service_id = s.id), 0) AS booking_count
  FROM services s
`;

function toCamel(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    imageUrl: row.image_url,
    status: row.status,
    displayOrder: row.display_order,
    bookingCount: row.booking_count
  };
}

async function list({ publishedOnly = false } = {}) {
  const where = publishedOnly ? 'WHERE s.status = $1' : '';
  const params = publishedOnly ? ['published'] : [];
  const { rows } = await query(`${SELECT_SQL} ${where} ORDER BY s.display_order ASC, s.name ASC`, params);
  return rows.map(toCamel);
}

async function findBySlug(slug) {
  const { rows } = await query(`${SELECT_SQL} WHERE s.slug = $1`, [slug]);
  return rows[0] ? toCamel(rows[0]) : null;
}

async function findById(id) {
  const { rows } = await query(`${SELECT_SQL} WHERE s.id = $1`, [id]);
  return rows[0] ? toCamel(rows[0]) : null;
}

function slugify(text) {
  return String(text).toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function create(data) {
  let slug = slugify(data.slug || data.name);
  const { rows: dup } = await query('SELECT id FROM services WHERE slug = $1', [slug]);
  if (dup.length) slug = `${slug}-${Date.now().toString(36)}`;

  const { rows } = await query(
    `INSERT INTO services (name, slug, description, icon, image_url, status, display_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, slug`,
    [data.name, slug, data.description || null, data.icon || 'ruler',
      data.imageUrl || null, data.status || 'published', data.displayOrder || 99]
  );
  return rows[0];
}

async function update(id, data) {
  const { rows } = await query(
    `UPDATE services SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       icon = COALESCE($4, icon),
       image_url = COALESCE($5, image_url),
       status = COALESCE($6, status),
       display_order = COALESCE($7, display_order),
       updated_at = NOW()
     WHERE id = $1 RETURNING id`,
    [id, data.name || null, data.description || null, data.icon || null,
      data.imageUrl || null, data.status || null, data.displayOrder ?? null]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM services WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { list, findBySlug, findById, create, update, remove, slugify, toCamel };
