const { pool } = require('../config/database');

// Maps a whats_new row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, isActive, createdAt, updatedAt).
const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    public_id: row.public_id,
    productUrl: row.product_url,
    language: row.language,
    order: row.order,
    isActive: !!row.is_active,
    createdBy: row.created_by,
    createdByModel: row.created_by_model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM whats_new WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0]);
};

exports.findAll = async ({ isActive } = {}) => {
  const conditions = [];
  const values = [];

  if (isActive !== undefined) { conditions.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT * FROM whats_new ${where} ORDER BY \`order\` ASC, created_at DESC`,
    values
  );
  return rows.map(mapRow);
};

exports.create = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO whats_new (title, description, image_url, public_id, product_url, language, \`order\`, is_active, created_by, created_by_model)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title ?? null,
      data.description,
      data.imageUrl,
      data.public_id ?? null,
      data.productUrl ?? null,
      data.language || 'en',
      data.order ?? 0,
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
    public_id: 'public_id',
    productUrl: 'product_url',
    language: 'language',
    order: '`order`',
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
  await pool.query(`UPDATE whats_new SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM whats_new WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
