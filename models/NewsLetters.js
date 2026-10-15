const { pool } = require('../config/database');

// Maps a newsletters row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, isActive, createdAt, updatedAt).
const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    publicId: row.public_id,
    isActive: !!row.is_active,
    createdBy: row.created_by,
    createdByModel: row.created_by_model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM newsletters WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0]);
};

exports.findAll = async () => {
  const [rows] = await pool.query('SELECT * FROM newsletters ORDER BY created_at DESC');
  return rows.map(mapRow);
};

exports.create = async (data) => {
  const [result] = await pool.query(
    'INSERT INTO newsletters (title, description, image_url, public_id, is_active, created_by, created_by_model) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      data.title,
      data.description ?? null,
      data.imageUrl,
      data.publicId ?? null,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
      String(data.createdBy),
      data.createdByModel || 'SuperAdmin',
    ]
  );
  return exports.findById(result.insertId);
};

exports.updateById = async (id, updates = {}) => {
  const columnMap = {
    title: 'title',
    description: 'description',
    imageUrl: 'image_url',
    publicId: 'public_id',
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
  await pool.query(`UPDATE newsletters SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM newsletters WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
