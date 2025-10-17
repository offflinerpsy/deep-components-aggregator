// Session configuration (ESM) for the main Express app
// Provides createSessionMiddleware() used by server.js

import session from 'express-session'
import connectSqlite3 from 'connect-sqlite3'

const SQLiteStore = connectSqlite3(session)

export function createSessionMiddleware() {
  const secret = process.env.SESSION_SECRET || 'deep-agg-session-secret-change-in-production'
  return session({
    secret,
    resave: false,
    saveUninitialized: false,
    store: new SQLiteStore({
      dir: './data/sessions',
      db: 'sessions.sqlite',
      concurrentDB: true
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24h
    }
  })
}
