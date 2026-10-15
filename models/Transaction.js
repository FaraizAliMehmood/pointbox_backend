const { pool } = require('../config/database');

// Maps a transactions row to the camelCase shape the rest of the app
// expects (mirrors what a Mongoose document looked like: id, createdAt, updatedAt).
const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    transactionId: row.transaction_id,
    customer: row.customer_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    company: row.company_id,
    companyName: row.company_name,
    employee: row.employee_id,
    employeeName: row.employee_name,
    type: row.type,
    redeem_points: row.redeem_points,
    invoiceNumber: row.invoice_number,
    invoiceImage: row.invoice_image,
    status: row.status,
    date: row.date,
    time: row.time,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0]);
};

exports.findByTransactionId = async (transactionId) => {
  const [rows] = await pool.query('SELECT * FROM transactions WHERE transaction_id = ? LIMIT 1', [transactionId]);
  return mapRow(rows[0]);
};

exports.findAll = async ({ customerId, companyId, employeeId, transactionId } = {}) => {
  const conditions = [];
  const values = [];

  if (customerId !== undefined) { conditions.push('customer_id = ?'); values.push(customerId); }
  if (companyId !== undefined) { conditions.push('company_id = ?'); values.push(companyId); }
  if (employeeId !== undefined) { conditions.push('employee_id = ?'); values.push(employeeId); }
  if (transactionId !== undefined) { conditions.push('transaction_id = ?'); values.push(transactionId); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM transactions ${where} ORDER BY created_at DESC`, values);
  return rows.map(mapRow);
};

exports.create = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO transactions
      (transaction_id, customer_id, customer_name, customer_email, customer_phone, company_id, company_name, employee_id, employee_name, type, redeem_points, invoice_number, invoice_image, status, date, time, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.transactionId,
      data.customer,
      data.customerName,
      data.customerEmail,
      data.customerPhone,
      data.company,
      data.companyName,
      data.employee ?? null,
      data.employeeName ?? null,
      data.type,
      data.points ?? data.redeem_points,
      data.invoiceNumber ?? null,
      data.invoiceImage ?? null,
      data.status || 'completed',
      data.date ?? null,
      data.time ?? null,
      data.notes ?? null,
    ]
  );
  return exports.findById(result.insertId);
};

exports.updateById = async (id, updates = {}) => {
  const columnMap = {
    status: 'status',
    invoiceNumber: 'invoice_number',
    invoiceImage: 'invoice_image',
    notes: 'notes',
    date: 'date',
    time: 'time',
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
  await pool.query(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, values);
  return exports.findById(id);
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM transactions WHERE id = ?', [id]);
  return result.affectedRows > 0;
};
