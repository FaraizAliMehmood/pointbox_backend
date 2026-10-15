const { pool } = require('../config/database');

// Maps a seo_settings row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, createdAt, updatedAt).
const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    metaKeywords: row.meta_keywords,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

exports.findOne = async () => {
  const [rows] = await pool.query('SELECT * FROM seo_settings ORDER BY id ASC LIMIT 1');
  return mapRow(rows[0]);
};

exports.create = async (data = {}) => {
  const [result] = await pool.query(
    'INSERT INTO seo_settings (meta_title, meta_description, meta_keywords) VALUES (?, ?, ?)',
    [data.metaTitle ?? null, data.metaDescription ?? null, data.metaKeywords ?? null]
  );
  const [rows] = await pool.query('SELECT * FROM seo_settings WHERE id = ? LIMIT 1', [result.insertId]);
  return mapRow(rows[0]);
};

exports.updateById = async (id, updates = {}) => {
  const columnMap = {
    metaTitle: 'meta_title',
    metaDescription: 'meta_description',
    metaKeywords: 'meta_keywords',
  };

  const fields = [];
  const values = [];

  for (const [key, column] of Object.entries(columnMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) {
    const [rows] = await pool.query('SELECT * FROM seo_settings WHERE id = ? LIMIT 1', [id]);
    return mapRow(rows[0]);
  }

  values.push(id);
  await pool.query(`UPDATE seo_settings SET ${fields.join(', ')} WHERE id = ?`, values);
  const [rows] = await pool.query('SELECT * FROM seo_settings WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0]);
};

// Ensures only one SEO row exists, mirroring the old Mongoose static.
exports.getSEO = async () => {
  const seo = await exports.findOne();
  if (seo) return seo;
  return exports.create({});
};
