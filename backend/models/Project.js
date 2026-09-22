'use strict';

const { query } = require('../config/database');

const CATEGORIES = ['residential', 'commercial', 'construction', 'land_development', 'topographical', 'boundary'];

function toCamel(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    location: row.location,
    description: row.description,
    challenge: row.challenge,
    approach: row.approach,
    result: row.result,
    services: row.services || [],
    completionDate: row.completion_date,
    coverImageUrl: row.cover_image_url,
    featured: row.featured,
    published: row.published,
    gallery: row.gallery || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const SELECT_SQL = `
  SELECT p.*,
         COALESCE(
           (SELECT json_agg(json_build_object(
              'id', pi.id, 'imageUrl', pi.image_url, 'caption', pi.caption,
              'displayOrder', pi.display_order
            ) ORDER BY pi.display_order, pi.id)
            FROM project_images pi WHERE pi.project_id = p.id),
           '[]'::json
         ) AS gallery
  FROM projects p
`;

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
}

async function list({ page = 1, limit = 12, category, location, search, featured, publishedOnly = false } = {}) {
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (publishedOnly) where.push('p.published = TRUE');
  if (featured !== undefined && featured !== null && featured !== '') {
    params.push(featured === true || featured === 'true');
    where.push(`p.featured = $${params.length}`);
  }
  if (category) { params.push(category); where.push(`p.category = $${params.length}`); }
  if (location) { params.push(`%${location}%`); where.push(`p.location ILIKE $${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    where.push(`(p.title ILIKE $${params.length} OR p.location ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await query(
    `${SELECT_SQL} ${whereSql}
     ORDER BY p.featured DESC, p.completion_date DESC NULLS LAST, p.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS n FROM projects p ${whereSql}`, params);
  return { data: rows.map(toCamel), total: countRows[0].n, page, limit };
}

async function findBySlug(slug, { publishedOnly = false } = {}) {
  const sql = publishedOnly ? `${SELECT_SQL} WHERE p.slug = $1 AND p.published = TRUE` : `${SELECT_SQL} WHERE p.slug = $1`;
  const { rows } = await query(sql, [slug]);
  return rows[0] ? toCamel(rows[0]) : null;
}

async function create(data) {
  let slug = slugify(data.slug || data.title);
  const { rows: dup } = await query('SELECT id FROM projects WHERE slug = $1', [slug]);
  if (dup.length) slug = `${slug}-${Date.now().toString(36)}`;

  const { rows } = await query(
    `INSERT INTO projects (title, slug, category, location, description, challenge, approach, result, services, completion_date, cover_image_url, cover_image_key, featured, published)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id, slug`,
    [data.title, slug, data.category, data.location || null, data.description || null,
      data.challenge || null, data.approach || null, data.result || null,
      data.services || null, data.completionDate || null,
      data.coverImageUrl || null, data.coverImageKey || null,
      data.featured === true, data.published === true]
  );
  return rows[0];
}

async function update(id, data) {
  const { rows } = await query(
    `UPDATE projects SET
       title = COALESCE($2, title),
       category = COALESCE($3, category),
       location = COALESCE($4, location),
       description = COALESCE($5, description),
       challenge = COALESCE($6, challenge),
       approach = COALESCE($7, approach),
       result = COALESCE($8, result),
       services = COALESCE($9, services),
       completion_date = COALESCE($10, completion_date),
       cover_image_url = COALESCE($11, cover_image_url),
       cover_image_key = COALESCE($12, cover_image_key),
       featured = COALESCE($13, featured),
       published = COALESCE($14, published),
       updated_at = NOW()
     WHERE id = $1 RETURNING id, slug`,
    [id, data.title || null, data.category || null, data.location || null,
      data.description || null, data.challenge || null, data.approach || null,
      data.result || null, data.services || null, data.completionDate || null,
      data.coverImageUrl || null, data.coverImageKey || null,
      data.featured === undefined ? null : data.featured,
      data.published === undefined ? null : data.published]
  );
  return rows[0] || null;
}

async function setCoverImage(id, { url, key }) {
  await query('UPDATE projects SET cover_image_url = $2, cover_image_key = $3, updated_at = NOW() WHERE id = $1',
    [id, url, key || null]);
}

async function addGalleryImage(projectId, { url, key, caption, displayOrder = 0 }) {
  const { rows } = await query(
    `INSERT INTO project_images (project_id, image_url, storage_key, caption, display_order)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [projectId, url, key || null, caption || null, displayOrder]
  );
  return rows[0].id;
}

async function removeGalleryImage(imageId) {
  await query('DELETE FROM project_images WHERE id = $1', [imageId]);
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM projects WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = {
  CATEGORIES,
  slugify,
  toCamel,
  list,
  findBySlug,
  create,
  update,
  setCoverImage,
  addGalleryImage,
  removeGalleryImage,
  remove
};
