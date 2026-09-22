'use strict';

const { query } = require('../config/database');

function toCamel(row) {
  return {
    id: row.id,
    clientName: row.client_name,
    company: row.company,
    message: row.message,
    rating: row.rating,
    photoUrl: row.photo_url,
    published: row.published,
    createdAt: row.created_at
  };
}

async function list({ page = 1, limit = 20, publishedOnly = false } = {}) {
  const offset = (page - 1) * limit;
  const where = publishedOnly ? 'WHERE published = TRUE' : '';
  const params = [];

  const { rows } = await query(
    `SELECT * FROM testimonials ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS n FROM testimonials ${where}`, params);
  return { data: rows.map(toCamel), total: countRows[0].n, page, limit };
}

async function findById(id) {
  const { rows } = await query('SELECT * FROM testimonials WHERE id = $1', [id]);
  return rows[0] ? toCamel(rows[0]) : null;
}

async function create(data) {
  const { rows } = await query(
    `INSERT INTO testimonials (client_name, company, message, rating, photo_url, published)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [data.clientName, data.company || null, data.message,
      data.rating || null, data.photoUrl || null, data.published === true]
  );
  return rows[0];
}

async function update(id, data) {
  const { rows } = await query(
    `UPDATE testimonials SET
       client_name = COALESCE($2, client_name),
       company = COALESCE($3, company),
       message = COALESCE($4, message),
       rating = COALESCE($5, rating),
       photo_url = COALESCE($6, photo_url),
       published = COALESCE($7, published)
     WHERE id = $1 RETURNING id`,
    [id, data.clientName || null, data.company ?? null, data.message || null,
      data.rating ?? null, data.photoUrl || null,
      data.published === undefined ? null : data.published]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM testimonials WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { list, findById, create, update, remove, toCamel };
