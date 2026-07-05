/**
 * PostgreSQL Database Module — Neon Serverless
 * Replaces the flat-file db.json with a real production database.
 */
import pg from "pg";
const { Pool } = pg;

let pool = null;

/**
 * Initialize the database connection pool and create tables if they don't exist.
 */
export async function initDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set. Cannot connect to PostgreSQL.");
    process.exit(1);
  }

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Test the connection
  try {
    const client = await pool.connect();
    console.log("✅ PostgreSQL connected to Neon successfully");
    client.release();
  } catch (err) {
    console.error("❌ PostgreSQL connection failed:", err.message);
    process.exit(1);
  }

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      temp_id VARCHAR(20),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      department VARCHAR(255) DEFAULT 'General',
      pin VARCHAR(10),
      is_temporary_pin BOOLEAN DEFAULT FALSE,
      face_id_photo TEXT,
      status VARCHAR(50) DEFAULT 'pending_onboarding',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallets (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      mobile VARCHAR(20),
      pin VARCHAR(10),
      face_id_photo TEXT,
      alternative_email VARCHAR(255) DEFAULT '',
      alternative_mobile VARCHAR(20) DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log("✅ Database tables verified (employees, wallets)");
}

// ─── Employee Queries ───────────────────────────────────────────────

export async function findEmployeeByEmail(email) {
  const result = await pool.query(
    "SELECT * FROM employees WHERE LOWER(email) = LOWER($1) LIMIT 1",
    [email]
  );
  if (result.rows.length === 0) return null;

  // Map snake_case columns to camelCase for compatibility
  const row = result.rows[0];
  return {
    id: row.id,
    tempId: row.temp_id,
    name: row.name,
    email: row.email,
    department: row.department,
    pin: row.pin,
    isTemporaryPin: row.is_temporary_pin,
    faceIdPhoto: row.face_id_photo,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function createEmployee({ tempId, name, email, department }) {
  const result = await pool.query(
    `INSERT INTO employees (temp_id, name, email, department, status)
     VALUES ($1, $2, LOWER($3), $4, 'pending_onboarding')
     RETURNING *`,
    [tempId, name, email, department]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    tempId: row.temp_id,
    name: row.name,
    email: row.email,
    department: row.department,
    pin: row.pin,
    isTemporaryPin: row.is_temporary_pin,
    faceIdPhoto: row.face_id_photo,
    status: row.status,
  };
}

export async function updateEmployee(email, fields) {
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  // Map camelCase fields to snake_case columns
  const fieldMap = {
    tempId: "temp_id",
    name: "name",
    department: "department",
    pin: "pin",
    isTemporaryPin: "is_temporary_pin",
    faceIdPhoto: "face_id_photo",
    status: "status",
  };

  for (const [key, value] of Object.entries(fields)) {
    const column = fieldMap[key] || key;
    setClauses.push(`${column} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  }

  if (setClauses.length === 0) return;

  values.push(email);
  await pool.query(
    `UPDATE employees SET ${setClauses.join(", ")} WHERE LOWER(email) = LOWER($${paramIndex})`,
    values
  );
}

// ─── Wallet Queries ─────────────────────────────────────────────────

export async function findWalletByEmail(email) {
  const result = await pool.query(
    "SELECT * FROM wallets WHERE LOWER(email) = LOWER($1) LIMIT 1",
    [email]
  );
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mobile: row.mobile,
    pin: row.pin,
    faceIdPhoto: row.face_id_photo,
    alternativeEmail: row.alternative_email,
    alternativeMobile: row.alternative_mobile,
    createdAt: row.created_at,
  };
}

export async function createWallet({ name, email, mobile, pin }) {
  const result = await pool.query(
    `INSERT INTO wallets (name, email, mobile, pin)
     VALUES ($1, LOWER($2), $3, $4)
     RETURNING *`,
    [name, email, mobile, pin]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mobile: row.mobile,
    pin: row.pin,
    faceIdPhoto: row.face_id_photo,
    alternativeEmail: row.alternative_email,
    alternativeMobile: row.alternative_mobile,
  };
}

export async function updateWallet(email, fields) {
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  const fieldMap = {
    name: "name",
    mobile: "mobile",
    pin: "pin",
    faceIdPhoto: "face_id_photo",
    alternativeEmail: "alternative_email",
    alternativeMobile: "alternative_mobile",
  };

  for (const [key, value] of Object.entries(fields)) {
    const column = fieldMap[key] || key;
    setClauses.push(`${column} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  }

  if (setClauses.length === 0) return;

  values.push(email);
  await pool.query(
    `UPDATE wallets SET ${setClauses.join(", ")} WHERE LOWER(email) = LOWER($${paramIndex})`,
    values
  );
}

/**
 * Upsert a wallet — create if not exists, update if exists.
 */
export async function upsertWallet({ name, email, mobile, pin }) {
  const existing = await findWalletByEmail(email);
  if (existing) {
    await updateWallet(email, { name, mobile, pin });
    return { ...existing, name, mobile, pin };
  }
  return await createWallet({ name, email, mobile, pin });
}
