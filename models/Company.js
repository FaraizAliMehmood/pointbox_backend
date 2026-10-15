const { pool } = require('../config/database');

// Maps a companies row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, isActive, createdAt, updatedAt).
const mapRow = (row, { includePassword = false } = {}) => {
  if (!row) return null;

  const mapped = {
    id: row.id,
    companyName: row.company_name,
    email: row.email,
    phone: row.phone,
    licenseNumber: row.license_number,
    vatNumber: row.vat_number,
    address: row.address,
    companyLogo: row.company_logo,
    publicId: row.public_id,
    country: row.country,
    role: row.role,
    employeeCount: row.employee_count,
    isActive: !!row.is_active,
    aiApiEnabled: !!row.ai_api_enabled,
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
  const [rows] = await pool.query('SELECT * FROM companies WHERE email = ? LIMIT 1', [email]);
  return mapRow(rows[0], options);
};

exports.findById = async (id, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM companies WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0], options);
};

exports.findByOtp = async (otp, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM companies WHERE otp = ? LIMIT 1', [otp]);
  return mapRow(rows[0], options);
};

exports.findByLicenseNumber = async (licenseNumber) => {
  const [rows] = await pool.query('SELECT * FROM companies WHERE license_number = ? LIMIT 1', [licenseNumber]);
  return mapRow(rows[0]);
};

exports.findByVatNumber = async (vatNumber) => {
  const [rows] = await pool.query('SELECT * FROM companies WHERE vat_number = ? LIMIT 1', [vatNumber]);
  return mapRow(rows[0]);
};

exports.findAll = async ({ isActive } = {}) => {
  const conditions = [];
  const values = [];

  if (isActive !== undefined) { conditions.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM companies ${where} ORDER BY created_at DESC`, values);
  return rows.map((row) => mapRow(row));
};

exports.create = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO companies
      (company_name, email, password, phone, license_number, vat_number, address, company_logo, public_id, country, role, employee_count, is_active, ai_api_enabled, otp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.companyName,
      data.email ?? null,
      data.password,
      data.phone ?? null,
      data.licenseNumber,
      data.vatNumber,
      data.address ?? null,
      data.companyLogo ?? null,
      data.publicId ?? null,
      data.country ?? null,
      data.role || 'company',
      data.employeeCount ?? null,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
      data.aiApiEnabled ? 1 : 0,
      data.otp ?? null,
    ]
  );
  return exports.findById(result.insertId);
};

exports.updateById = async (id, updates = {}) => {
  const columnMap = {
    companyName: 'company_name',
    email: 'email',
    password: 'password',
    phone: 'phone',
    licenseNumber: 'license_number',
    vatNumber: 'vat_number',
    address: 'address',
    companyLogo: 'company_logo',
    publicId: 'public_id',
    country: 'country',
    role: 'role',
    employeeCount: 'employee_count',
    isActive: 'is_active',
    aiApiEnabled: 'ai_api_enabled',
    otp: 'otp',
  };

  const booleanKeys = ['isActive', 'aiApiEnabled'];
  const fields = [];
  const values = [];

  for (const [key, column] of Object.entries(columnMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(booleanKeys.includes(key) ? (updates[key] ? 1 : 0) : updates[key]);
    }
  }

  if (fields.length === 0) {
    return exports.findById(id);
  }

  values.push(id);
  await pool.query(`UPDATE companies SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM companies WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

exports.setOtpByEmail = async (email, otp) => {
  await pool.query('UPDATE companies SET otp = ? WHERE email = ?', [otp, email]);
};

exports.clearOtpById = async (id) => {
  await pool.query('UPDATE companies SET otp = 0 WHERE id = ?', [id]);
};

exports.updatePasswordByEmail = async (email, hashedPassword) => {
  await pool.query('UPDATE companies SET password = ? WHERE email = ?', [hashedPassword, email]);
};
