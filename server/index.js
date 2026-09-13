import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';
import apiRouter from './routes/api.js';
import neonRouter from './routes/neonApi.js';
import { runMigrations } from './db/neon-migrator.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// SQLite & Neon API Routes
app.use('/api', apiRouter);
app.use('/api/v2', neonRouter);
app.use('/api/neon', neonRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'CineVerse Backend & Database Engine API',
    database: 'Neon PostgreSQL & SQLite Dual Engine',
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
  try {
    // 1. Initialize SQLite engine
    await initDatabase();
    console.log('✅ SQLite Database initialized and seeded successfully.');

    // 2. Initialize Neon PostgreSQL schema migrations
    try {
      await runMigrations();
    } catch (migErr) {
      console.warn('⚠️ Neon PostgreSQL migrations note:', migErr.message);
    }

    app.listen(PORT, () => {
      console.log(`🎬 CineVerse Full API Server running at http://localhost:${PORT}`);
      console.log(`⚡ Neon PostgreSQL Engine API routes active at http://localhost:${PORT}/api/v2`);
    });
  } catch (err) {
    console.error('❌ Failed to initialize database server:', err);
    process.exit(1);
  }
}

startServer();
