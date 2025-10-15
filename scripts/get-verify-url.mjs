import 'dotenv/config'
import Database from 'better-sqlite3'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const emailArg = process.argv[2]
if (!emailArg) {
  console.error('USAGE: node scripts/get-verify-url.mjs <email>')
  process.exit(1)
}

const email = String(emailArg).toLowerCase().trim()
const DATA_DIR = process.env.DATA_DIR || './var'
const DB_PATH = `${DATA_DIR}/db/deepagg.sqlite`
const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 9201}`

const artifactsDir = join(process.cwd(), 'docs/_artifacts', new Date().toISOString().slice(0,10), 'registration')
mkdirSync(artifactsDir, { recursive: true })

const db = new Database(DB_PATH)

const user = db.prepare('SELECT id, email FROM users WHERE lower(email)=?').get(email)
if (!user) {
  const art = { ok: false, error: 'user_not_found', email }
  const p = join(artifactsDir, `verify-url-${email.replace(/[^a-z0-9+_.-]/g,'_')}-notfound.json`)
  writeFileSync(p, JSON.stringify(art, null, 2))
  console.log('NOT_FOUND')
  console.log('ARTIFACT:' + p)
  process.exit(1)
}

const row = db.prepare('SELECT token, expires_at, used_at FROM email_verification_tokens WHERE user_id=? ORDER BY expires_at DESC LIMIT 1').get(user.id)
if (!row) {
  const art = { ok: false, error: 'token_not_found', email }
  const p = join(artifactsDir, `verify-url-${email.replace(/[^a-z0-9+_.-]/g,'_')}-notoken.json`)
  writeFileSync(p, JSON.stringify(art, null, 2))
  console.log('NO_TOKEN')
  console.log('ARTIFACT:' + p)
  process.exit(2)
}

const now = Date.now()
if (row.used_at || row.expires_at < now) {
  const art = { ok: false, error: row.used_at ? 'token_used' : 'token_expired', email, expires_at: row.expires_at, used_at: row.used_at || null }
  const p = join(artifactsDir, `verify-url-${email.replace(/[^a-z0-9+_.-]/g,'_')}-invalid.json`)
  writeFileSync(p, JSON.stringify(art, null, 2))
  console.log('TOKEN_INVALID')
  console.log('ARTIFACT:' + p)
  process.exit(3)
}

const verifyUrl = `${baseUrl}/auth/verify?token=${row.token}`
const art = { ok: true, email, verifyUrl, expires_at: row.expires_at }
const p = join(artifactsDir, `verify-url-${email.replace(/[^a-z0-9+_.-]/g,'_')}.json`)
writeFileSync(p, JSON.stringify(art, null, 2))
console.log('VERIFY_URL:' + verifyUrl)
console.log('ARTIFACT:' + p)
