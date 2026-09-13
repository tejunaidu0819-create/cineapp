import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, transaction } from './neon-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, '../migrations');

export async function runMigrations() {
  console.log('🚀 Starting Neon PostgreSQL Migration Runner...');

  // 1. Ensure schema_migrations table exists
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
    );
  `);

  // 2. Read migration files
  if (!fs.existsSync(migrationsDir)) {
    console.error('Migrations directory not found:', migrationsDir);
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration file(s).`);

  const executedResult = await query('SELECT name FROM schema_migrations');
  const executedNames = new Set((executedResult.rows || []).map(r => r.name));

  for (const file of files) {
    if (executedNames.has(file)) {
      console.log(`⏩ Skipping ${file} (already executed)`);
      continue;
    }

    console.log(`⚡ Executing migration: ${file}...`);
    const filePath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf-8');

    try {
      await transaction(async (client) => {
        // Execute the migration SQL
        await client.query(sqlContent);
        // Record in schema_migrations
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      });
      console.log(`✅ Successfully applied: ${file}`);
    } catch (err) {
      console.error(`❌ Migration failed on ${file}:`, err.message);
      throw err;
    }
  }

  console.log('🎉 All Neon PostgreSQL migrations completed successfully!');
}

// Allow direct CLI execution: node server/db/neon-migrator.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
