'use strict';

const { query } = require('../config/database');

const SELECT_SQL = `
  SELECT rj.*,
         COALESCE(s.name, '') AS service_name
  FROM recent_jobs rj
  LEFT JOIN services s ON s.id = rj.service_id
`;

function toCamel(row) {
  return {
    id: row.id,
    title: row.title,
    location: row.location,
    serviceId: row.service_id,
    serviceName: row.service_name || null,
    description: row.description,
    jobDate: row.job_date,
    coverImageUrl: row.cover_image_url,
    published: row.published,
    createdAt: row.created_at
  };
}

async function list({ page = 1, limit = 12, publishedOnly = false } = {}) {
  const offset = (page - 1) * limit;
  const where = publishedOnly ? 'WHERE rj.published = TRUE' : '';
  const params = publishedOnly ? [] : [];

  const { rows } = await query(
    `${SELECT_SQL} ${where} ORDER BY rj.job_date DESC NULLS LAST, rj.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS n FROM recent_jobs rj ${where}`, params);
  return { data: rows.map(toCamel), total: countRows[0].n, page, limit };
}

async function findById(id) {
  const { rows } = await query(`${SELECT_SQL} WHERE rj.id = $1`, [id]);
  return rows[0] ? toCamel(rows[0]) : null;
}

async function create(data) {
  const { rows } = await query(
    `INSERT INTO recent_jobs (title, location, service_id, description, job_date, cover_image_url, published)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [data.title, data.location || null, data.serviceId || null, data.description || null,
      data.jobDate || null, data.coverImageUrl || null, data.published === true]
  );
  return rows[0];
}

async function update(id, data) {
  const { rows } = await query(
    `UPDATE recent_jobs SET
       title = COALESCE($2, title),
       location = COALESCE($3, location),
       service_id = COALESCE($4, service_id),
       description = COALESCE($5, description),
       job_date = COALESCE($6, job_date),
       cover_image_url = COALESCE($7, cover_image_url),
       published = COALESCE($8, published),
       updated_at = NOW()
     WHERE id = $1 RETURNING id`,
    [id, data.title || null, data.location || null, data.serviceId ?? null,
      data.description || null, data.jobDate || null, data.coverImageUrl || null,
      data.published === undefined ? null : data.published]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM recent_jobs WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { list, findById, create, update, remove, toCamel };
