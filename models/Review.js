const { pool } = require('../config/database');

// Maps a reviews row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, isActive, createdAt, updatedAt).
const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    ratings: row.ratings,
    review: row.review,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM reviews WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0]);
};

exports.findAll = async ({ isActive } = {}, { limit, offset } = {}) => {
  const conditions = [];
  const values = [];

  if (isActive !== undefined) { conditions.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  let sql = `SELECT * FROM reviews ${where} ORDER BY created_at DESC`;
  if (limit !== undefined) {
    sql += ' LIMIT ? OFFSET ?';
    values.push(limit, offset ?? 0);
  }

  const [rows] = await pool.query(sql, values);
  return rows.map(mapRow);
};

exports.findByUserId = async (userId, { isActive } = {}, { limit, offset } = {}) => {
  const conditions = ['user_id = ?'];
  const values = [userId];

  if (isActive !== undefined) { conditions.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  let sql = `SELECT * FROM reviews WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`;
  if (limit !== undefined) {
    sql += ' LIMIT ? OFFSET ?';
    values.push(limit, offset ?? 0);
  }

  const [rows] = await pool.query(sql, values);
  return rows.map(mapRow);
};

exports.count = async ({ userId, isActive } = {}) => {
  const conditions = [];
  const values = [];

  if (userId !== undefined) { conditions.push('user_id = ?'); values.push(userId); }
  if (isActive !== undefined) { conditions.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM reviews ${where}`, values);
  return rows[0].count;
};

exports.create = async (data) => {
  const [result] = await pool.query(
    'INSERT INTO reviews (user_id, ratings, review, is_active) VALUES (?, ?, ?, ?)',
    [data.userId, data.ratings, data.review, data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1]
  );
  return exports.findById(result.insertId);
};

exports.updateById = async (id, updates = {}) => {
  const columnMap = {
    ratings: 'ratings',
    review: 'review',
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
  await pool.query(`UPDATE reviews SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM reviews WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
