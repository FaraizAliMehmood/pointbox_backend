const { pool } = require('../config/database');

// Maps a contacts row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, createdAt, updatedAt).
const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    status: row.status,
    readAt: row.read_at,
    repliedAt: row.replied_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM contacts WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0]);
};

exports.findAll = async ({ status } = {}) => {
  const conditions = [];
  const values = [];

  if (status !== undefined) { conditions.push('status = ?'); values.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM contacts ${where} ORDER BY created_at DESC`, values);
  return rows.map(mapRow);
};

exports.create = async (data) => {
  const [result] = await pool.query(
    'INSERT INTO contacts (name, email, phone, subject, message, status) VALUES (?, ?, ?, ?, ?, ?)',
    [data.name, data.email, data.phone ?? null, data.subject, data.message, data.status || 'new']
  );
  return exports.findById(result.insertId);
};

exports.updateById = async (id, updates = {}) => {
  const columnMap = {
    status: 'status',
    readAt: 'read_at',
    repliedAt: 'replied_at',
  };

  const fields = [];
  const values = [];

  for (const [key, column] of Object.entries(columnMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) {
    return exports.findById(id);
  }

  values.push(id);
  await pool.query(`UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.markReplied = async (id) => {
  return exports.updateById(id, { status: 'replied', repliedAt: new Date() });
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM contacts WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
