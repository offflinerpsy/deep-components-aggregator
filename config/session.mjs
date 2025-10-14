// config/session.mjs
// Express session configuration with SQLite store

import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create SQLite session store
const SQLiteStore = connectSqlite3(session);

/**
 * Session configuration
 * Cookie settings follow security best practices
 */
function buildSessionConfig() {
  const isProd = process.env.NODE_ENV === 'production';
  const behindProxy = String(process.env.BEHIND_PROXY || '1') === '1';
  const secret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
  return {
    store: new SQLiteStore({
      db: 'sessions.sqlite',
      dir: process.env.DATA_DIR || path.join(__dirname, '..', 'var', 'db'),
      table: 'sessions',
      concurrentDB: true
    }),
    secret,
    cookie: {
      httpOnly: true,
      secure: behindProxy ? true : isProd,
      sameSite: behindProxy ? 'none' : 'lax',
      maxAge: parseInt(process.env.SESSION_TTL_MS) || 7 * 24 * 60 * 60 * 1000
    },
    name: 'deep_agg_sid',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: behindProxy
  };
}

/**
 * Create session middleware
 * @returns {Function} Express session middleware
 */
export function createSessionMiddleware() {
  const cfg = buildSessionConfig();
  if (process.env.NODE_ENV === 'production' && cfg.secret === 'dev-secret-change-in-production') {
    throw new Error('SESSION_SECRET environment variable must be set in production');
  }
  return session(cfg);
}

/**
 * Session health check
 * Verifies session store is accessible
 * 
 * @returns {Promise<Object>} Session store status
 */
export async function checkSessionHealth() {
  return new Promise((resolve) => {
    const cfg = buildSessionConfig();
    cfg.store.length((err, length) => {
      if (err) {
        resolve({
          healthy: false,
          message: `Store error: ${err.message}`
        });
      } else {
        resolve({
          healthy: true,
          activeSessions: length,
          message: 'Session store accessible'
        });
      }
    });
  });
}

export default {
  createSessionMiddleware,
  checkSessionHealth,
  buildSessionConfig
};
