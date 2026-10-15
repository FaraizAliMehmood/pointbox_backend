const { pool } = require('../config/database');

// Maps an ai_api_keys row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, isActive, createdAt, updatedAt).
const mapRow = (row, { includeApiKey = false } = {}) => {
  if (!row) return null;

  const mapped = {
    id: row.id,
    provider: row.provider,
    label: row.label,
    isActive: !!row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includeApiKey) {
    mapped.apiKey = row.api_key;
  }

  return mapped;
};

exports.findById = async (id, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM ai_api_keys WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0], options);
};

exports.findAll = async (options = {}) => {
  const [rows] = await pool.query('SELECT * FROM ai_api_keys ORDER BY created_at DESC');
  return rows.map((row) => mapRow(row, options));
};

exports.create = async ({ provider, label, apiKey, isActive = true, createdBy }) => {
  const [result] = await pool.query(
    'INSERT INTO ai_api_keys (provider, label, api_key, is_active, created_by) VALUES (?, ?, ?, ?, ?)',
    [provider, label, apiKey, isActive ? 1 : 0, createdBy != null ? String(createdBy) : null]
  );
  return exports.findById(result.insertId);
};

exports.updateById = async (id, updates = {}) => {
  const fields = [];
  const values = [];

  if (updates.provider !== undefined) { fields.push('provider = ?'); values.push(updates.provider); }
  if (updates.label !== undefined) { fields.push('label = ?'); values.push(updates.label); }
  if (updates.apiKey !== undefined) { fields.push('api_key = ?'); values.push(updates.apiKey); }
  if (updates.isActive !== undefined) { fields.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }

  if (fields.length === 0) {
    return exports.findById(id);
  }

  values.push(id);
  await pool.query(`UPDATE ai_api_keys SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM ai_api_keys WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
