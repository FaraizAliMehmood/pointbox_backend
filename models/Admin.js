const { pool } = require('../config/database');

const DEFAULT_PERMISSIONS = {
  manageCompanies: false,
  manageEmployees: false,
  manageCustomers: false,
  manageTransactions: false,
  manageQueries: false,
  manageBanners: false,
  manageNotifications: false,
  manageFaqs: false,
  manageNewsletter: false,
  manageContactUs: false,
};

const parsePermissions = (value) => {
  if (!value) return { ...DEFAULT_PERMISSIONS };
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return { ...DEFAULT_PERMISSIONS, ...parsed };
};

// Maps an admins row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, isActive, createdAt, updatedAt).
const mapRow = (row, { includePassword = false } = {}) => {
  if (!row) return null;

  const mapped = {
    id: row.id,
    username: row.username,
    email: row.email,
    otp: row.otp,
    permissions: parsePermissions(row.permissions),
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includePassword) {
    mapped.password = row.password;
  }

  return mapped;
};

exports.findByEmail = async (email, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM admins WHERE email = ? LIMIT 1', [email]);
  return mapRow(rows[0], options);
};

exports.findById = async (id, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM admins WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0], options);
};

exports.findByOtp = async (otp, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM admins WHERE otp = ? LIMIT 1', [otp]);
  return mapRow(rows[0], options);
};

exports.findAll = async () => {
  const [rows] = await pool.query('SELECT * FROM admins ORDER BY created_at DESC');
  return rows.map((row) => mapRow(row));
};

exports.create = async ({ username, email, password, permissions }) => {
  const [result] = await pool.query(
    'INSERT INTO admins (username, email, password, permissions) VALUES (?, ?, ?, ?)',
    [username || null, email, password, JSON.stringify({ ...DEFAULT_PERMISSIONS, ...permissions })]
  );
  return exports.findById(result.insertId);
};

exports.updateById = async (id, updates = {}) => {
  const fields = [];
  const values = [];

  if (updates.username !== undefined) { fields.push('username = ?'); values.push(updates.username); }
  if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
  if (updates.password !== undefined) { fields.push('password = ?'); values.push(updates.password); }
  if (updates.otp !== undefined) { fields.push('otp = ?'); values.push(updates.otp); }
  if (updates.isActive !== undefined) { fields.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }
  if (updates.permissions !== undefined) {
    fields.push('permissions = ?');
    values.push(JSON.stringify({ ...DEFAULT_PERMISSIONS, ...updates.permissions }));
  }

  if (fields.length === 0) {
    return exports.findById(id);
  }

  values.push(id);
  await pool.query(`UPDATE admins SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM admins WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

exports.setOtpByEmail = async (email, otp) => {
  await pool.query('UPDATE admins SET otp = ? WHERE email = ?', [otp, email]);
};

exports.clearOtpById = async (id) => {
  await pool.query('UPDATE admins SET otp = 0 WHERE id = ?', [id]);
};

exports.updatePasswordByEmail = async (email, hashedPassword) => {
  await pool.query('UPDATE admins SET password = ? WHERE email = ?', [hashedPassword, email]);
};
