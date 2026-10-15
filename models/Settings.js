const { pool } = require('../config/database');

// Maps a settings row to the camelCase shape the rest of the app expects
// (mirrors what a Mongoose document looked like: id, createdAt, updatedAt).
const mapRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    termsCondition: row.terms_condition,
    address: row.address,
    phone: row.phone,
    email: row.email,
    location: row.location,
    logoUrl: row.logo_url,
    publicId: row.public_id,
    instagram: row.instagram,
    facebook: row.facebook,
    x: row.x,
    youtube: row.youtube,
    tiktok: row.tiktok,
    linkedin: row.linkedin,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// Settings is a singleton: the app only ever keeps/reads the first row.
exports.findOne = async () => {
  const [rows] = await pool.query('SELECT * FROM settings ORDER BY id ASC LIMIT 1');
  return mapRow(rows[0]);
};

exports.create = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO settings
      (terms_condition, address, phone, email, location, logo_url, public_id, instagram, facebook, x, youtube, tiktok, linkedin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.termsCondition ?? null,
      data.address,
      data.phone ?? null,
      data.email ?? null,
      data.location ?? null,
      data.logoUrl,
      data.publicId ?? null,
      data.instagram ?? null,
      data.facebook ?? null,
      data.x ?? null,
      data.youtube ?? null,
      data.tiktok ?? null,
      data.linkedin ?? null,
    ]
  );
  const [rows] = await pool.query('SELECT * FROM settings WHERE id = ? LIMIT 1', [result.insertId]);
  return mapRow(rows[0]);
};

exports.updateById = async (id, updates = {}) => {
  const columnMap = {
    termsCondition: 'terms_condition',
    address: 'address',
    phone: 'phone',
    email: 'email',
    location: 'location',
    logoUrl: 'logo_url',
    publicId: 'public_id',
    instagram: 'instagram',
    facebook: 'facebook',
    x: 'x',
    youtube: 'youtube',
    tiktok: 'tiktok',
    linkedin: 'linkedin',
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
    const [rows] = await pool.query('SELECT * FROM settings WHERE id = ? LIMIT 1', [id]);
    return mapRow(rows[0]);
  }

  values.push(id);
  await pool.query(`UPDATE settings SET ${fields.join(', ')} WHERE id = ?`, values);
  const [rows] = await pool.query('SELECT * FROM settings WHERE id = ? LIMIT 1', [id]);
  return mapRow(rows[0]);
};
