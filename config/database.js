const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`MySQL connected: ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    connection.release();
  } catch (error) {
    console.error(`MySQL connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { pool, connectDB };
