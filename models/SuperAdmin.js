const { pool } = require('../config/database');

// Maps a super_admins row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, isActive, createdAt, updatedAt).
const mapRow = (row, { includePassword = false } = {}) => {
  if (!row) return null;

  const mapped = {
    id: row.id,
    username: row.username,
    email: row.email,
    isActive: !!row.is_active,
    otp: row.otp,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includePassword) {
    mapped.password = row.password;
  }

  return mapped;
};

exports.findByEmail = async (email, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM super_admins WHERE email = ? LIMIT 1', [email]);
  return mapRow(rows[0], options);
};

exports.findByUsername = async (username, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM super_admins WHERE username = ? LIMIT 1', [username]);
  return mapRow(rows[0], options);
};

exports.findById = async (id, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM super_admins WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0], options);
};

exports.findByOtp = async (otp, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM super_admins WHERE otp = ? LIMIT 1', [otp]);
  return mapRow(rows[0], options);
};

exports.create = async ({ username, email, password }) => {
  const [result] = await pool.query(
    'INSERT INTO super_admins (username, email, password) VALUES (?, ?, ?)',
    [username, email, password]
  );
  return exports.findById(result.insertId);
};

exports.updatePasswordByEmail = async (email, hashedPassword) => {
  await pool.query('UPDATE super_admins SET password = ? WHERE email = ?', [hashedPassword, email]);
};

exports.setOtpByEmail = async (email, otp) => {
  await pool.query('UPDATE super_admins SET otp = ? WHERE email = ?', [otp, email]);
};

exports.clearOtpById = async (id) => {
  await pool.query('UPDATE super_admins SET otp = 0 WHERE id = ?', [id]);
};

exports.findAll = async () => {
  const [rows] = await pool.query('SELECT * FROM super_admins ORDER BY created_at DESC');
  return rows.map((row) => mapRow(row));
};
