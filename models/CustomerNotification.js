const { pool } = require('../config/database');

// Maps a customer_notifications row to the camelCase shape the rest of the
// app expects (mirrors what a Mongoose document looked like: id, createdAt, updatedAt).
const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    customer: row.customer_id,
    notification: row.notification_id,
    isRead: !!row.is_read,
    readAt: row.read_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM customer_notifications WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0]);
};

exports.findByCustomer = async (customerId, { isRead } = {}) => {
  const conditions = ['customer_id = ?'];
  const values = [customerId];

  if (isRead !== undefined) { conditions.push('is_read = ?'); values.push(isRead ? 1 : 0); }

  const [rows] = await pool.query(
    `SELECT * FROM customer_notifications WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    values
  );
  return rows.map(mapRow);
};

exports.countUnreadForCustomer = async (customerId) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM customer_notifications WHERE customer_id = ? AND is_read = 0',
    [customerId]
  );
  return rows[0].count;
};

exports.findByCustomerAndNotification = async (customerId, notificationId) => {
  const [rows] = await pool.query(
    'SELECT * FROM customer_notifications WHERE customer_id = ? AND notification_id = ? LIMIT 1',
    [customerId, notificationId]
  );
  return mapRow(rows[0]);
};

exports.create = async ({ customer, notification }) => {
  const [result] = await pool.query(
    'INSERT INTO customer_notifications (customer_id, notification_id) VALUES (?, ?)',
    [customer, notification]
  );
  return exports.findById(result.insertId);
};

exports.markRead = async (id) => {
  await pool.query(
    'UPDATE customer_notifications SET is_read = 1, read_at = NOW() WHERE id = ?',
    [id]
  );
  return exports.findById(id);
};

// Upserts the read flag for a customer/notification pair (no unique constraint
// backs this at the DB level, so find-then-write instead of ON DUPLICATE KEY).
exports.markReadFor = async (customerId, notificationId) => {
  const existing = await exports.findByCustomerAndNotification(customerId, notificationId);
  if (existing) {
    return exports.markRead(existing.id);
  }
  const created = await exports.create({ customer: customerId, notification: notificationId });
  return exports.markRead(created.id);
};

exports.markAllReadForCustomer = async (customerId) => {
  await pool.query(
    'UPDATE customer_notifications SET is_read = 1, read_at = NOW() WHERE customer_id = ? AND is_read = 0',
    [customerId]
  );
};

exports.deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM customer_notifications WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

exports.deleteByCustomerAndNotification = async (customerId, notificationId) => {
  const [result] = await pool.query(
    'DELETE FROM customer_notifications WHERE customer_id = ? AND notification_id = ?',
    [customerId, notificationId]
  );
  return result.affectedRows > 0;
};

exports.deleteAllForCustomer = async (customerId) => {
  await pool.query('DELETE FROM customer_notifications WHERE customer_id = ?', [customerId]);
};
