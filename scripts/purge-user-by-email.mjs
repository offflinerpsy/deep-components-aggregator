import 'dotenv/config'
import Database from 'better-sqlite3'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const emailArg = process.argv[2]
if (!emailArg) {
  console.error('USAGE: node scripts/purge-user-by-email.mjs <email>')
  process.exit(1)
}

const email = String(emailArg).toLowerCase().trim()
const DATA_DIR = process.env.DATA_DIR || './var'
const DB_PATH = `${DATA_DIR}/db/deepagg.sqlite`

const artifactsDir = join(process.cwd(), 'docs/_artifacts', new Date().toISOString().slice(0,10), 'db-ops')
mkdirSync(artifactsDir, { recursive: true })

const db = new Database(DB_PATH)

// Guard: Check user exists
const user = db.prepare('SELECT id, email, email_verified FROM users WHERE lower(email)=?').get(email)
if (!user) {
  const out = { ok: false, error: 'not_found', email }
  const p = join(artifactsDir, `purge-${email.replace(/[^a-z0-9+_.-]/g,'_')}-notfound.json`)
  writeFileSync(p, JSON.stringify(out, null, 2))
  console.log('NOT_FOUND')
  console.log('ARTIFACT:' + p)
  process.exit(1)
}

// Perform purge in transaction
const tx = db.transaction((uid) => {
  const delTokens = db.prepare('DELETE FROM email_verification_tokens WHERE user_id=?')
  delTokens.run(uid)
  db.prepare('DELETE FROM users WHERE id=?').run(uid)
})

tx(user.id)

const out = { ok: true, email, userId: user.id }
const p = join(artifactsDir, `purge-${email.replace(/[^a-z0-9+_.-]/g,'_')}.json`)
writeFileSync(p, JSON.stringify(out, null, 2))
console.log('PURGE_OK')
console.log('ARTIFACT:' + p)
