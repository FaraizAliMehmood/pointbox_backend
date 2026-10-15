const { pool } = require('../config/database');

// Maps a newsletter_emails row to the camelCase shape the rest of the app
// expects (mirrors what a Mongoose document looked like: id, isActive, createdAt, updatedAt).
const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    source: row.source,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM newsletter_emails WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0]);
};

exports.findByEmail = async (email) => {
  const [rows] = await pool.query('SELECT * FROM newsletter_emails WHERE email = ? LIMIT 1', [email]);
  return mapRow(rows[0]);
};

exports.findAll = async ({ search, source, isActive } = {}) => {
  const conditions = [];
  const values = [];

  if (source !== undefined) { conditions.push('source = ?'); values.push(source); }
  if (isActive !== undefined) { conditions.push('is_active = ?'); values.push(isActive ? 1 : 0); }
  if (search) {
    conditions.push('(email LIKE ? OR source LIKE ?)');
    values.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM newsletter_emails ${where} ORDER BY created_at DESC`, values);
  return rows.map(mapRow);
};

exports.create = async (data) => {
  const [result] = await pool.query(
    'INSERT INTO newsletter_emails (email, source, is_active) VALUES (?, ?, ?)',
    [data.email, data.source || 'footer', data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1]
  );
  return exports.findById(result.insertId);
};

exports.updateById = async (id, updates = {}) => {
  const columnMap = {
    source: 'source',
    isActive: 'is_active',
  };

  const fields = [];
  const values = [];

  for (const [key, column] of Object.entries(columnMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(key === 'isActive' ? (updates[key] ? 1 : 0) : updates[key]);
    }
  }

  if (fields.length === 0) {
    return exports.findById(id);
  }

  values.push(id);
  await pool.query(`UPDATE newsletter_emails SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM newsletter_emails WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
