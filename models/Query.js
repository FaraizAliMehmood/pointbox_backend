const { pool } = require('../config/database');

// Maps a queries row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, createdAt, updatedAt).
const mapRow = (row, responses = []) => {
  if (!row) return null;

  return {
    id: row.id,
    customer: row.customer_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    subject: row.subject,
    message: row.message,
    brandId: row.brand_id,
    transactionId: row.transaction_id,
    status: row.status,
    responses: responses.map(mapResponseRow),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const mapResponseRow = (row) => ({
  id: row.id,
  respondedBy: row.responded_by,
  responseModel: row.response_model,
  response: row.response,
  respondedAt: row.responded_at,
});

const getResponses = async (queryId) => {
  const [rows] = await pool.query(
    'SELECT * FROM query_responses WHERE query_id = ? ORDER BY responded_at ASC',
    [queryId]
  );
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM queries WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) return null;
  const responses = await getResponses(id);
  return mapRow(rows[0], responses);
};

exports.findAll = async ({ status } = {}) => {
  const conditions = [];
  const values = [];

  if (status !== undefined) { conditions.push('status = ?'); values.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM queries ${where} ORDER BY created_at DESC`, values);

  const results = [];
  for (const row of rows) {
    const responses = await getResponses(row.id);
    results.push(mapRow(row, responses));
  }
  return results;
};

exports.findByBrand = async (brandId) => {
  const [rows] = await pool.query(
    'SELECT * FROM queries WHERE brand_id = ? ORDER BY created_at DESC',
    [brandId]
  );

  const results = [];
  for (const row of rows) {
    const responses = await getResponses(row.id);
    results.push(mapRow(row, responses));
  }
  return results;
};

exports.findByCustomer = async (customerId) => {
  const [rows] = await pool.query(
    'SELECT * FROM queries WHERE customer_id = ? ORDER BY created_at DESC',
    [customerId]
  );

  const results = [];
  for (const row of rows) {
    const responses = await getResponses(row.id);
    results.push(mapRow(row, responses));
  }
  return results;
};

exports.create = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO queries (customer_id, customer_email, customer_name, subject, message, brand_id, transaction_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.customer ?? null,
      data.customerEmail,
      data.customerName ?? null,
      data.subject,
      data.message,
      data.brandId ?? null,
      data.transactionId ?? null,
      data.status || 'pending',
    ]
  );
  return exports.findById(result.insertId);
};

exports.updateById = async (id, updates = {}) => {
  const columnMap = {
    status: 'status',
    transactionId: 'transaction_id',
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
  await pool.query(`UPDATE queries SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.addResponse = async (queryId, { respondedBy, responseModel = 'SuperAdmin', response }) => {
  await pool.query(
    'INSERT INTO query_responses (query_id, responded_by, response_model, response) VALUES (?, ?, ?, ?)',
    [queryId, respondedBy != null ? String(respondedBy) : null, responseModel, response]
  );
  await pool.query("UPDATE queries SET status = 'resolved' WHERE id = ?", [queryId]);
  return exports.findById(queryId);
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM queries WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
