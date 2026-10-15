const { pool } = require('../config/database');

const DEFAULT_PERMISSIONS = {
  manageCustomers: false,
  manageTransactions: false,
  manageQueries: false,
  manageNotifications: false,
  manageProducts: false,
  manageBanners: false,
};

const parsePermissions = (value) => {
  if (!value) return { ...DEFAULT_PERMISSIONS };
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return { ...DEFAULT_PERMISSIONS, ...parsed };
};

// Maps an employees row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, isActive, createdAt, updatedAt).
const mapRow = (row, { includePassword = false } = {}) => {
  if (!row) return null;

  const mapped = {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    username: row.username,
    dutyAddress: row.duty_address,
    company: row.company_id,
    companyName: row.company_name,
    isActive: !!row.is_active,
    activatedBy: row.activated_by,
    role: row.role,
    permissions: parsePermissions(row.permissions),
    otp: row.otp,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includePassword) {
    mapped.password = row.password;
  }

  return mapped;
};

const mapFcmTokenRow = (row) => {
  if (!row) return null;
  return {
    token: row.token,
    deviceType: row.device_type,
    updatedAt: row.updated_at,
  };
};

exports.findByEmail = async (email, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM employees WHERE email = ? LIMIT 1', [email]);
  return mapRow(rows[0], options);
};

exports.findById = async (id, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM employees WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0], options);
};

exports.findByOtp = async (otp, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM employees WHERE otp = ? LIMIT 1', [otp]);
  return mapRow(rows[0], options);
};

exports.findByPhone = async (phone, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM employees WHERE phone = ? LIMIT 1', [phone]);
  return mapRow(rows[0], options);
};

exports.findAll = async ({ companyId } = {}) => {
  const conditions = [];
  const values = [];

  if (companyId !== undefined) { conditions.push('company_id = ?'); values.push(companyId); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM employees ${where} ORDER BY created_at DESC`, values);
  return rows.map((row) => mapRow(row));
};

exports.create = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO employees
      (name, email, phone, username, password, duty_address, company_id, company_name, is_active, activated_by, role, permissions, otp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name ?? null,
      data.email,
      data.phone ?? null,
      data.username ?? null,
      data.password ?? null,
      data.dutyAddress,
      data.company,
      data.companyName,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
      data.activatedBy != null ? String(data.activatedBy) : null,
      data.role || 'employee',
      JSON.stringify({ ...DEFAULT_PERMISSIONS, ...data.permissions }),
      data.otp ?? null,
    ]
  );
  return exports.findById(result.insertId);
};

exports.updateById = async (id, updates = {}) => {
  const columnMap = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    username: 'username',
    password: 'password',
    dutyAddress: 'duty_address',
    company: 'company_id',
    companyName: 'company_name',
    isActive: 'is_active',
    activatedBy: 'activated_by',
    role: 'role',
    otp: 'otp',
  };
  const booleanKeys = ['isActive'];

  const fields = [];
  const values = [];

  for (const [key, column] of Object.entries(columnMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(booleanKeys.includes(key) ? (updates[key] ? 1 : 0) : updates[key]);
    }
  }

  if (updates.permissions !== undefined) {
    fields.push('permissions = ?');
    values.push(JSON.stringify({ ...DEFAULT_PERMISSIONS, ...updates.permissions }));
  }

  if (fields.length === 0) {
    return exports.findById(id);
  }

  values.push(id);
  await pool.query(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM employees WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

exports.setOtpByEmail = async (email, otp) => {
  await pool.query('UPDATE employees SET otp = ? WHERE email = ?', [otp, email]);
};

exports.clearOtpById = async (id) => {
  await pool.query('UPDATE employees SET otp = 0 WHERE id = ?', [id]);
};

exports.updatePasswordByEmail = async (email, hashedPassword) => {
  await pool.query('UPDATE employees SET password = ? WHERE email = ?', [hashedPassword, email]);
};

// --- FCM tokens: replaces the embedded `fcmTokens` array ---

exports.getFcmTokens = async (employeeId) => {
  const [rows] = await pool.query('SELECT * FROM employee_fcm_tokens WHERE employee_id = ?', [employeeId]);
  return rows.map(mapFcmTokenRow);
};

exports.upsertFcmToken = async (employeeId, token, deviceType = 'mobile') => {
  await pool.query(
    `INSERT INTO employee_fcm_tokens (employee_id, token, device_type)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE device_type = VALUES(device_type), updated_at = CURRENT_TIMESTAMP`,
    [employeeId, token, deviceType]
  );
  return exports.getFcmTokens(employeeId);
};

exports.removeFcmToken = async (employeeId, token) => {
  const [result] = await pool.query(
    'DELETE FROM employee_fcm_tokens WHERE employee_id = ? AND token = ?',
    [employeeId, token]
  );
  return result.affectedRows > 0;
};
