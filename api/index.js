// Vercel Serverless Function entry point
// This file wraps the Express app so it runs as a Vercel serverless function.
// The full Express router (api.js + neonApi.js) is reused without changes.

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from '../server/routes/api.js';
import neonRouter from '../server/routes/neonApi.js';
import { initDatabase } from '../server/db/database.js';
import { runMigrations } from '../server/db/neon-migrator.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '2mb' }));

// Structured request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// Routes
app.use('/api', apiRouter);
app.use('/api/v2', neonRouter);
app.use('/api/neon', neonRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'CineVerse API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unknown API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message, err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// One-time DB initialisation (cached across warm invocations on Vercel)
let isInitialised = false;
async function ensureInit() {
  if (isInitialised) return;
  try {
    await initDatabase();
    await runMigrations().catch(e => console.warn('Migration note:', e.message));
    isInitialised = true;
  } catch (e) {
    console.error('DB init error:', e.message);
  }
}

// Vercel expects a default export of the request handler
export default async function handler(req, res) {
  await ensureInit();
  return app(req, res);
}
