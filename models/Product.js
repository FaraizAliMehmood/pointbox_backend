const { pool } = require('../config/database');

// Maps a products row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, isActive, createdAt, updatedAt).
const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    image: row.image,
    redeem_points: row.redeem_points,
    couponCode: row.coupon_code,
    company: row.company,
    createdByModel: row.created_by_model,
    companyName: row.company_name,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0]);
};

exports.findAll = async ({ company, companyIds, isActive } = {}) => {
  const conditions = [];
  const values = [];

  if (company !== undefined) { conditions.push('company = ?'); values.push(String(company)); }
  if (companyIds !== undefined) {
    conditions.push('company IN (?)');
    values.push(companyIds.map(String));
  }
  if (isActive !== undefined) { conditions.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM products ${where} ORDER BY created_at DESC`, values);
  return rows.map(mapRow);
};

exports.create = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO products (name, description, image, redeem_points, coupon_code, company, created_by_model, company_name, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name ?? null,
      data.description ?? null,
      data.image,
      data.redeem_points,
      data.couponCode ?? null,
      String(data.company),
      data.createdByModel || 'Company',
      data.companyName,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
    ]
  );
  return exports.findById(result.insertId);
};

exports.updateById = async (id, updates = {}) => {
  const columnMap = {
    name: 'name',
    description: 'description',
    image: 'image',
    redeem_points: 'redeem_points',
    couponCode: 'coupon_code',
    companyName: 'company_name',
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
  await pool.query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
