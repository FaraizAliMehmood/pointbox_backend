const { pool } = require('../config/database');

// Maps a banners row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, isActive, createdAt, updatedAt).
const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    badge: row.badge,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    public_id: row.public_id,
    startDate: row.start_date,
    endDate: row.end_date,
    type: row.type,
    language: row.language,
    isActive: !!row.is_active,
    productUrl: row.product_url,
    createdBy: row.created_by,
    createdByModel: row.created_by_model,
    points: row.points,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM banners WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0]);
};

exports.findAll = async ({ isActive, createdBy } = {}) => {
  const conditions = [];
  const values = [];

  if (isActive !== undefined) { conditions.push('is_active = ?'); values.push(isActive ? 1 : 0); }
  if (createdBy !== undefined) { conditions.push('created_by = ?'); values.push(String(createdBy)); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM banners ${where} ORDER BY created_at DESC`, values);
  return rows.map(mapRow);
};

exports.findTopByPoints = async (limit = 3) => {
  const [rows] = await pool.query(
    'SELECT * FROM banners WHERE is_active = 1 ORDER BY points DESC LIMIT ?',
    [limit]
  );
  return rows.map(mapRow);
};

exports.create = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO banners
      (badge, title, description, image_url, public_id, start_date, end_date, type, language, is_active, product_url, created_by, created_by_model, points)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.badge ?? null,
      data.title,
      data.description ?? null,
      data.imageUrl,
      data.public_id ?? null,
      data.startDate ?? null,
      data.endDate ?? null,
      data.type || 'regular',
      data.language || 'en',
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
      data.productUrl ?? null,
      String(data.createdBy),
      data.createdByModel || 'SuperAdmin',
      data.points ?? 0,
    ]
  );
  return exports.findById(result.insertId);
};

exports.updateById = async (id, updates = {}) => {
  const columnMap = {
    badge: 'badge',
    title: 'title',
    description: 'description',
    imageUrl: 'image_url',
    public_id: 'public_id',
    startDate: 'start_date',
    endDate: 'end_date',
    type: 'type',
    language: 'language',
    isActive: 'is_active',
    productUrl: 'product_url',
    points: 'points',
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
  await pool.query(`UPDATE banners SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM banners WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
