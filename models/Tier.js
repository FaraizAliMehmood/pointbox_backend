const { pool } = require('../config/database');

const parseBenefits = (value) => {
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return value;
};

// Maps a tiers row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, isActive, createdAt, updatedAt).
const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    color: row.color,
    bgColor: row.bg_color,
    borderColor: row.border_color,
    minPoints: row.min_points,
    maxPoints: row.max_points,
    featured: !!row.featured,
    benefits: parseBenefits(row.benefits),
    expiryMonths: row.expiry_months,
    order: row.order,
    isActive: !!row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM tiers WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0]);
};

exports.findAll = async ({ createdBy, isActive } = {}) => {
  const conditions = [];
  const values = [];

  if (createdBy !== undefined) { conditions.push('created_by = ?'); values.push(createdBy); }
  if (isActive !== undefined) { conditions.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM tiers ${where} ORDER BY min_points ASC`, values);
  return rows.map(mapRow);
};

exports.findByCompanies = async (companyIds = [], { isActive } = {}) => {
  if (companyIds.length === 0) return [];

  const conditions = ['created_by IN (?)'];
  const values = [companyIds];

  if (isActive !== undefined) { conditions.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  const [rows] = await pool.query(
    `SELECT * FROM tiers WHERE ${conditions.join(' AND ')} ORDER BY min_points ASC`,
    values
  );
  return rows.map(mapRow);
};

exports.create = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO tiers
      (name, color, bg_color, border_color, min_points, max_points, featured, benefits, expiry_months, \`order\`, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.color || 'from-gray-400 to-gray-500',
      data.bgColor || 'bg-gray-50',
      data.borderColor || 'border-gray-200',
      data.minPoints ?? 0,
      data.maxPoints ?? null,
      data.featured ? 1 : 0,
      JSON.stringify(data.benefits ?? []),
      data.expiryMonths ?? null,
      data.order ?? 0,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
      data.createdBy,
    ]
  );
  return exports.findById(result.insertId);
};

exports.updateById = async (id, updates = {}) => {
  const columnMap = {
    name: 'name',
    color: 'color',
    bgColor: 'bg_color',
    borderColor: 'border_color',
    minPoints: 'min_points',
    maxPoints: 'max_points',
    featured: 'featured',
    expiryMonths: 'expiry_months',
    order: '`order`',
    isActive: 'is_active',
  };
  const booleanKeys = ['featured', 'isActive'];

  const fields = [];
  const values = [];

  for (const [key, column] of Object.entries(columnMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(booleanKeys.includes(key) ? (updates[key] ? 1 : 0) : updates[key]);
    }
  }

  if (updates.benefits !== undefined) {
    fields.push('benefits = ?');
    values.push(JSON.stringify(updates.benefits));
  }

  if (fields.length === 0) {
    return exports.findById(id);
  }

  values.push(id);
  await pool.query(`UPDATE tiers SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM tiers WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
