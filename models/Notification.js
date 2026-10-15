const { pool } = require('../config/database');

const parseJsonValue = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
};

// Maps a notifications row to the camelCase shape the rest of the app
// expects (mirrors what a Mongoose document looked like: id, isActive, createdAt, updatedAt).
const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    target: row.target,
    targetIds: parseJsonValue(row.target_ids, []),
    targetModel: row.target_model,
    company: row.company_id,
    createdBy: row.created_by,
    createdByModel: row.created_by_model,
    isActive: !!row.is_active,
    sentAt: row.sent_at,
    data: parseJsonValue(row.data, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM notifications WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0]);
};

exports.findAll = async ({ isActive } = {}) => {
  const conditions = [];
  const values = [];

  if (isActive !== undefined) { conditions.push('is_active = ?'); values.push(isActive ? 1 : 0); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM notifications ${where} ORDER BY created_at DESC`, values);
  return rows.map(mapRow);
};

// Mirrors the $or query customerController built: notifications targeted at
// everyone, all customers, this specific customer, or a company they're linked to.
exports.findForCustomer = async (customerId, companyIds = [], { limit = 20, offset = 0, types } = {}) => {
  const conditions = [
    `target = 'all'`,
    `target = 'customers'`,
    `(target = 'specific' AND JSON_CONTAINS(target_ids, JSON_QUOTE(CAST(? AS CHAR))))`,
  ];
  const values = [String(customerId)];

  if (companyIds.length > 0) {
    conditions.push(`(target = 'company' AND company_id IN (?))`);
    values.push(companyIds);
  }

  let sql = `SELECT * FROM notifications WHERE is_active = 1 AND (${conditions.join(' OR ')})`;
  if (types && types.length > 0) {
    sql += ' AND type IN (?)';
    values.push(types);
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

  const [rows] = await pool.query(sql, [...values, limit, offset]);
  return rows.map(mapRow);
};

exports.countForCustomer = async (customerId, companyIds = [], { types } = {}) => {
  const conditions = [
    `target = 'all'`,
    `target = 'customers'`,
    `(target = 'specific' AND JSON_CONTAINS(target_ids, JSON_QUOTE(CAST(? AS CHAR))))`,
  ];
  const values = [String(customerId)];

  if (companyIds.length > 0) {
    conditions.push(`(target = 'company' AND company_id IN (?))`);
    values.push(companyIds);
  }

  let sql = `SELECT COUNT(*) AS count FROM notifications WHERE is_active = 1 AND (${conditions.join(' OR ')})`;
  if (types && types.length > 0) {
    sql += ' AND type IN (?)';
    values.push(types);
  }

  const [rows] = await pool.query(sql, values);
  return rows[0].count;
};

exports.findByCompany = async (companyId) => {
  const [rows] = await pool.query(
    'SELECT * FROM notifications WHERE company_id = ? ORDER BY created_at DESC',
    [companyId]
  );
  return rows.map(mapRow);
};

exports.create = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO notifications
      (title, message, type, target, target_ids, target_model, company_id, created_by, created_by_model, is_active, sent_at, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.message,
      data.type || 'both',
      data.target || 'all',
      data.targetIds ? JSON.stringify(data.targetIds) : null,
      data.targetModel ?? null,
      data.company ?? null,
      String(data.createdBy),
      data.createdByModel ?? null,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
      data.sentAt ?? null,
      data.data !== undefined ? JSON.stringify(data.data) : null,
    ]
  );
  return exports.findById(result.insertId);
};

exports.updateById = async (id, updates = {}) => {
  const columnMap = {
    title: 'title',
    message: 'message',
    type: 'type',
    target: 'target',
    targetModel: 'target_model',
    company: 'company_id',
    isActive: 'is_active',
    sentAt: 'sent_at',
  };

  const fields = [];
  const values = [];

  for (const [key, column] of Object.entries(columnMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(key === 'isActive' ? (updates[key] ? 1 : 0) : updates[key]);
    }
  }

  if (updates.targetIds !== undefined) {
    fields.push('target_ids = ?');
    values.push(JSON.stringify(updates.targetIds));
  }
  if (updates.data !== undefined) {
    fields.push('data = ?');
    values.push(JSON.stringify(updates.data));
  }

  if (fields.length === 0) {
    return exports.findById(id);
  }

  values.push(id);
  await pool.query(`UPDATE notifications SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM notifications WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
