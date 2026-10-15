const { pool } = require('../config/database');

// Maps a faqs row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, isActive, createdAt, updatedAt).
const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    category: row.category,
    isActive: !!row.is_active,
    createdBy: row.created_by,
    createdByModel: row.created_by_model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM faqs WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0]);
};

exports.findAll = async ({ isActive } = {}) => {
  const conditions = [];
  const values = [];

  if (isActive !== undefined) { conditions.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM faqs ${where} ORDER BY created_at DESC`, values);
  return rows.map(mapRow);
};

exports.create = async (data) => {
  const [result] = await pool.query(
    'INSERT INTO faqs (question, answer, category, is_active, created_by, created_by_model) VALUES (?, ?, ?, ?, ?, ?)',
    [
      data.question,
      data.answer,
      data.category || 'general',
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
      String(data.createdBy),
      data.createdByModel || 'SuperAdmin',
    ]
  );
  return exports.findById(result.insertId);
};

exports.updateById = async (id, updates = {}) => {
  const columnMap = {
    question: 'question',
    answer: 'answer',
    category: 'category',
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
  await pool.query(`UPDATE faqs SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM faqs WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
