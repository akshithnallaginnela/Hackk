import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const { Pool } = pg;

let pool = null;

const JWT_SECRET = process.env.JWT_SECRET || "zerovault-dev-secret-change-in-prod";
const JWT_EXPIRY = "7d";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

const SALT_ROUNDS = 10;

export async function hashPin(pin) {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function comparePin(pin, hash) {
  return bcrypt.compare(pin, hash);
}

export async function initDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Cannot connect to PostgreSQL.");
    process.exit(1);
  }

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    console.log("PostgreSQL connected to Neon successfully");
    client.release();
  } catch (err) {
    console.error("PostgreSQL connection failed:", err.message);
    process.exit(1);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallet_users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      mobile VARCHAR(20),
      pin_hash VARCHAR(255),
      face_template TEXT,
      alternative_email VARCHAR(255) DEFAULT '',
      alternative_mobile VARCHAR(20) DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS gov_employees (
      id SERIAL PRIMARY KEY,
      temp_id VARCHAR(20),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      department VARCHAR(255) DEFAULT 'General',
      pin_hash VARCHAR(255),
      is_temporary_pin BOOLEAN DEFAULT FALSE,
      face_template TEXT,
      status VARCHAR(50) DEFAULT 'pending_onboarding',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log("Database tables verified (wallet_users, gov_employees)");
}

function mapWalletRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mobile: row.mobile,
    pinHash: row.pin_hash,
    faceTemplate: row.face_template,
    alternativeEmail: row.alternative_email,
    alternativeMobile: row.alternative_mobile,
    createdAt: row.created_at,
  };
}

function mapEmployeeRow(row) {
  return {
    id: row.id,
    tempId: row.temp_id,
    name: row.name,
    email: row.email,
    department: row.department,
    pinHash: row.pin_hash,
    isTemporaryPin: row.is_temporary_pin,
    faceTemplate: row.face_template,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function getPool() {
  return pool;
}

export async function findWalletByEmail(email) {
  const result = await pool.query(
    "SELECT * FROM wallet_users WHERE LOWER(email) = LOWER($1) LIMIT 1",
    [email]
  );
  return result.rows.length === 0 ? null : mapWalletRow(result.rows[0]);
}

export async function createWallet({ name, email, mobile, pinHash }) {
  const result = await pool.query(
    `INSERT INTO wallet_users (name, email, mobile, pin_hash)
     VALUES ($1, LOWER($2), $3, $4)
     RETURNING *`,
    [name, email, mobile, pinHash]
  );
  return mapWalletRow(result.rows[0]);
}

export async function updateWallet(email, fields) {
  const setClauses = [];
  const values = [];
  let paramIndex = 1;
  const fieldMap = {
    name: "name",
    mobile: "mobile",
    pinHash: "pin_hash",
    faceTemplate: "face_template",
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
    `UPDATE wallet_users SET ${setClauses.join(", ")} WHERE LOWER(email) = LOWER($${paramIndex})`,
    values
  );
}

export async function findEmployeeByEmail(email) {
  const result = await pool.query(
    "SELECT * FROM gov_employees WHERE LOWER(email) = LOWER($1) LIMIT 1",
    [email]
  );
  return result.rows.length === 0 ? null : mapEmployeeRow(result.rows[0]);
}

export async function createEmployee({ tempId, name, email, department }) {
  const result = await pool.query(
    `INSERT INTO gov_employees (temp_id, name, email, department, status)
     VALUES ($1, $2, LOWER($3), $4, 'pending_onboarding')
     RETURNING *`,
    [tempId, name, email, department]
  );
  return mapEmployeeRow(result.rows[0]);
}

export async function updateEmployee(email, fields) {
  const setClauses = [];
  const values = [];
  let paramIndex = 1;
  const fieldMap = {
    tempId: "temp_id",
    name: "name",
    department: "department",
    pinHash: "pin_hash",
    isTemporaryPin: "is_temporary_pin",
    faceTemplate: "face_template",
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
    `UPDATE gov_employees SET ${setClauses.join(", ")} WHERE LOWER(email) = LOWER($${paramIndex})`,
    values
  );
}
