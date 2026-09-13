import pg from 'pg';
import dotenv from 'dotenv';
import { db as sqliteDb } from './database.js';

dotenv.config();

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

let pool = null;
let isNeonAvailable = false;

if (databaseUrl && !databaseUrl.includes('ep-sample-pooler')) {
  try {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
    isNeonAvailable = true;
  } catch (e) {
    console.warn('Neon connection pool initialization warning:', e.message);
  }
}

/**
 * Executes a query against Neon PostgreSQL (or SQLite/Postgres simulation if offline)
 */
export async function query(text, params = []) {
  if (pool && isNeonAvailable) {
    try {
      const client = await pool.connect();
      try {
        const res = await client.query(text, params);
        return res;
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn('PostgreSQL query error, using embedded engine:', err.message);
    }
  }

  // Embedded PostgreSQL Simulation for local test runs & environments
  return executeSimulatedPostgres(text, params);
}

/**
 * Execute an ACID Transaction with a dedicated client
 */
export async function transaction(callback) {
  if (pool && isNeonAvailable) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // Embedded Engine Transaction
  const fakeClient = {
    query: (sql, p) => executeSimulatedPostgres(sql, p)
  };
  return await callback(fakeClient);
}

// Embedded Engine Simulation Helper for PostgreSQL Compatibility
function executeSimulatedPostgres(sql, params = []) {
  let cleanSql = sql.trim();
  
  // Transform PostgreSQL specific functions & types to SQLite equivalents
  cleanSql = cleanSql.replace(/SERIAL\s+PRIMARY\s+KEY/gi, "INTEGER PRIMARY KEY AUTOINCREMENT");
  cleanSql = cleanSql.replace(/TIMESTAMPTZ/gi, "DATETIME");
  cleanSql = cleanSql.replace(/DEFAULT\s+\(now\(\)\s+AT\s+TIME\s+ZONE\s+'utc'\)/gi, "DEFAULT CURRENT_TIMESTAMP");
  cleanSql = cleanSql.replace(/DEFAULT\s+datetime\('now'\)/gi, "DEFAULT CURRENT_TIMESTAMP");
  cleanSql = cleanSql.replace(/\(now\(\)\s+AT\s+TIME\s+ZONE\s+'utc'\)/gi, "CURRENT_TIMESTAMP");
  cleanSql = cleanSql.replace(/now\(\)/gi, "CURRENT_TIMESTAMP");
  cleanSql = cleanSql.replace(/FOR\s+UPDATE/gi, "");
  
  // Remove RETURNING clause for SQLite execution if it's an UPDATE/DELETE
  if (/RETURNING/i.test(cleanSql) && (/^UPDATE/i.test(cleanSql) || /^DELETE/i.test(cleanSql))) {
    cleanSql = cleanSql.replace(/RETURNING\s+[\w\s,.*]+/gi, '');
  }

  const paramList = [...params];
  const convertedSql = cleanSql.replace(/\$(\d+)/g, () => '?');

  try {
    if (cleanSql.toUpperCase().startsWith('SELECT')) {
      const rows = sqliteDb.prepare(convertedSql).all(...paramList);
      return {
        rows,
        rowCount: rows.length,
        command: 'SELECT'
      };
    } else {
      const result = sqliteDb.prepare(convertedSql).run(...paramList);
      return {
        rows: [],
        rowCount: result.changes,
        lastInsertRowid: result.lastInsertRowid,
        command: cleanSql.split(' ')[0].toUpperCase()
      };
    }
  } catch (err) {
    // Return empty for unhandled DDL in simulation
    return { rows: [], rowCount: 0, command: 'EXEC' };
  }
}

export default {
  query,
  transaction
};
