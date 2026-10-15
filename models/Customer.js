const { pool } = require('../config/database');

const parseJsonMap = (value) => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
};

// Maps a customers row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, isActive, createdAt, updatedAt).
const mapRow = (row, { includePassword = false } = {}) => {
  if (!row) return null;

  const mapped = {
    id: row.id,
    username: row.username,
    email: row.email,
    phone: row.phone,
    address: row.address,
    country: row.country,
    googleId: row.google_id,
    isGoogleSignup: !!row.is_google_signup,
    unlinkedBrandsRedeemPoints: parseJsonMap(row.unlinked_brands_redeem_points),
    unlinkedBrandsTierPoints: parseJsonMap(row.unlinked_brands_tier_points),
    totalPoints: row.total_points,
    isActive: !!row.is_active,
    role: row.role,
    createdBy: row.created_by,
    createdById: row.created_by_id,
    createdByModel: row.created_by_model,
    otp: row.otp,
    deviceToken: row.device_token,
    emailVerified: !!row.email_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includePassword) {
    mapped.password = row.password;
  }

  return mapped;
};

// Maps a customer_companies row to the shape a linkedCompanies array entry used to have.
const mapLinkRow = (row) => {
  if (!row) return null;

  return {
    company: row.company_id,
    companyName: row.company_name,
    linkedAt: row.linked_at,
    redeem_points: row.redeem_points,
    tier_points: row.tier_points,
  };
};

exports.findByEmail = async (email, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM customers WHERE email = ? LIMIT 1', [email]);
  return mapRow(rows[0], options);
};

exports.findByPhone = async (phone, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM customers WHERE phone = ? LIMIT 1', [phone]);
  return mapRow(rows[0], options);
};

exports.findByUsername = async (username, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM customers WHERE username = ? LIMIT 1', [username]);
  return mapRow(rows[0], options);
};

exports.findById = async (id, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM customers WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0], options);
};

exports.findByOtp = async (otp, options = {}) => {
  const [rows] = await pool.query('SELECT * FROM customers WHERE otp = ? LIMIT 1', [otp]);
  return mapRow(rows[0], options);
};

exports.findByIds = async (ids = [], options = {}) => {
  if (ids.length === 0) return [];
  const [rows] = await pool.query('SELECT * FROM customers WHERE id IN (?)', [ids]);
  return rows.map((row) => mapRow(row, options));
};

exports.findAll = async ({ isActive } = {}) => {
  const conditions = [];
  const values = [];

  if (isActive !== undefined) { conditions.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM customers ${where} ORDER BY created_at DESC`, values);
  return rows.map((row) => mapRow(row));
};

// Customers linked to a company, replacing the old `linkedCompanies.company` query filter.
exports.findActiveLinkedToCompany = async (companyId) => {
  const [rows] = await pool.query(
    `SELECT c.* FROM customers c
     INNER JOIN customer_companies cc ON cc.customer_id = c.id
     WHERE cc.company_id = ? AND c.is_active = 1`,
    [companyId]
  );
  return rows.map((row) => mapRow(row));
};

// All customers linked to a company (regardless of isActive), with optional email/phone search,
// for the company dashboard's customer list/export.
exports.findLinkedToCompany = async (companyId, { email, phone } = {}) => {
  const conditions = ['cc.company_id = ?'];
  const values = [companyId];

  if (email) { conditions.push('c.email LIKE ?'); values.push(`%${email}%`); }
  if (phone) { conditions.push('c.phone LIKE ?'); values.push(`%${phone}%`); }

  const [rows] = await pool.query(
    `SELECT c.* FROM customers c
     INNER JOIN customer_companies cc ON cc.customer_id = c.id
     WHERE ${conditions.join(' AND ')}`,
    values
  );
  return rows.map((row) => mapRow(row));
};

// Linked companies joined with the companies table, replacing the old
// `.populate('linkedCompanies.company', ...)` calls.
exports.getLinkedCompaniesWithDetails = async (customerId) => {
  const [rows] = await pool.query(
    `SELECT cc.*, c.company_name AS co_company_name, c.email AS co_email, c.address AS co_address,
            c.country AS co_country, c.company_logo AS co_company_logo, c.is_active AS co_is_active
     FROM customer_companies cc
     INNER JOIN companies c ON c.id = cc.company_id
     WHERE cc.customer_id = ?
     ORDER BY cc.linked_at ASC`,
    [customerId]
  );
  return rows.map((row) => ({
    company: row.company_id,
    companyName: row.company_name || row.co_company_name,
    companyEmail: row.co_email,
    companyAddress: row.co_address,
    companyCountry: row.co_country,
    companyLogo: row.co_company_logo,
    companyIsActive: !!row.co_is_active,
    linkedAt: row.linked_at,
    redeem_points: row.redeem_points,
    tier_points: row.tier_points,
  }));
};

exports.create = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO customers
      (username, email, password, phone, address, country, google_id, is_google_signup, total_points, is_active, role, created_by, created_by_id, created_by_model, otp, device_token, email_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.username ?? null,
      data.email,
      data.password ?? null,
      data.phone ?? null,
      data.address ?? null,
      data.country ?? null,
      data.googleId ?? null,
      data.isGoogleSignup ? 1 : 0,
      data.totalPoints ?? 0,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
      data.role || 'customer',
      data.createdBy || 'company',
      data.createdById != null ? String(data.createdById) : null,
      data.createdByModel ?? null,
      data.otp ?? null,
      data.deviceToken ?? null,
      data.emailVerified ? 1 : 0,
    ]
  );
  return exports.findById(result.insertId);
};

exports.updateById = async (id, updates = {}) => {
  const columnMap = {
    username: 'username',
    email: 'email',
    password: 'password',
    phone: 'phone',
    address: 'address',
    country: 'country',
    googleId: 'google_id',
    isGoogleSignup: 'is_google_signup',
    totalPoints: 'total_points',
    isActive: 'is_active',
    role: 'role',
    otp: 'otp',
    deviceToken: 'device_token',
    emailVerified: 'email_verified',
  };
  const booleanKeys = ['isGoogleSignup', 'isActive', 'emailVerified'];
  const jsonColumnMap = {
    unlinkedBrandsRedeemPoints: 'unlinked_brands_redeem_points',
    unlinkedBrandsTierPoints: 'unlinked_brands_tier_points',
  };

  const fields = [];
  const values = [];

  for (const [key, column] of Object.entries(columnMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(booleanKeys.includes(key) ? (updates[key] ? 1 : 0) : updates[key]);
    }
  }

  for (const [key, column] of Object.entries(jsonColumnMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(JSON.stringify(updates[key]));
    }
  }

  if (fields.length === 0) {
    return exports.findById(id);
  }

  values.push(id);
  await pool.query(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM customers WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

exports.setOtpByEmail = async (email, otp) => {
  await pool.query('UPDATE customers SET otp = ? WHERE email = ?', [otp, email]);
};

exports.clearOtpById = async (id) => {
  await pool.query('UPDATE customers SET otp = 0 WHERE id = ?', [id]);
};

exports.updatePasswordByEmail = async (email, hashedPassword) => {
  await pool.query('UPDATE customers SET password = ? WHERE email = ?', [hashedPassword, email]);
};

// --- Linked companies: replaces the embedded `linkedCompanies` array ---

exports.getLinkedCompanies = async (customerId) => {
  const [rows] = await pool.query(
    'SELECT * FROM customer_companies WHERE customer_id = ? ORDER BY linked_at ASC',
    [customerId]
  );
  return rows.map(mapLinkRow);
};

exports.isLinkedToCompany = async (customerId, companyId) => {
  const [rows] = await pool.query(
    'SELECT id FROM customer_companies WHERE customer_id = ? AND company_id = ? LIMIT 1',
    [customerId, companyId]
  );
  return rows.length > 0;
};

exports.linkCompany = async (customerId, companyId, companyName) => {
  await pool.query(
    `INSERT INTO customer_companies (customer_id, company_id, company_name, redeem_points, tier_points)
     VALUES (?, ?, ?, 0, 0)
     ON DUPLICATE KEY UPDATE company_name = VALUES(company_name)`,
    [customerId, companyId, companyName ?? null]
  );
  return exports.getLinkedCompanies(customerId);
};

exports.unlinkCompany = async (customerId, companyId) => {
  const [result] = await pool.query(
    'DELETE FROM customer_companies WHERE customer_id = ? AND company_id = ?',
    [customerId, companyId]
  );
  return result.affectedRows > 0;
};

exports.updateLinkedCompanyPoints = async (customerId, companyId, { redeemPoints, tierPoints } = {}) => {
  const fields = [];
  const values = [];

  if (redeemPoints !== undefined) { fields.push('redeem_points = ?'); values.push(redeemPoints); }
  if (tierPoints !== undefined) { fields.push('tier_points = ?'); values.push(tierPoints); }

  if (fields.length === 0) return;

  values.push(customerId, companyId);
  await pool.query(
    `UPDATE customer_companies SET ${fields.join(', ')} WHERE customer_id = ? AND company_id = ?`,
    values
  );
};
