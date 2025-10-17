import 'dotenv/config'
import Database from 'better-sqlite3'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { sendTemplatedMail } from '../src/lib/mailer.mjs'

const emailArg = process.argv[2]
if (!emailArg) {
  console.error('USAGE: node scripts/send-verify-email.mjs <email>')
  process.exit(1)
}

const email = String(emailArg).toLowerCase().trim()
const DATA_DIR = process.env.DATA_DIR || './var'
const DB_PATH = `${DATA_DIR}/db/deepagg.sqlite`
const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 9201}`

const artifactsDir = join(process.cwd(), 'docs/_artifacts', new Date().toISOString().slice(0,10), 'emails')
mkdirSync(artifactsDir, { recursive: true })

const db = new Database(DB_PATH)
const user = db.prepare('SELECT id, name, email_verified FROM users WHERE lower(email)=?').get(email)
if (!user) {
  console.log('USER_NOT_FOUND')
  process.exit(1)
}
const tokenRow = db.prepare('SELECT token, expires_at, used_at FROM email_verification_tokens WHERE user_id=? ORDER BY expires_at DESC LIMIT 1').get(user.id)
if (!tokenRow) {
  console.log('TOKEN_NOT_FOUND')
  process.exit(2)
}
const verifyUrl = `${baseUrl}/auth/verify?token=${tokenRow.token}`
const subject = 'Подтвердите email — Deep Components'

const result = await sendTemplatedMail({
  to: email,
  subject,
  templateName: 'email-verification',
  data: { userName: user.name || '', verifyUrl }
})

const ts = new Date().toISOString().replace(/[:.]/g,'-')
const artifactPath = join(artifactsDir, `verify-send-${email.replace(/[^a-z0-9+_.-]/g,'_')}-${ts}.json`)
writeFileSync(artifactPath, JSON.stringify(result, null, 2))

if (result.ok) {
  console.log('SMTP_SEND_OK:' + result.messageId)
  console.log('ACCEPTED:' + JSON.stringify(result.accepted || []))
  console.log('REJECTED:' + JSON.stringify(result.rejected || []))
  if (result.response) console.log('RESPONSE:' + result.response)
  console.log('ARTIFACT:' + artifactPath)
  process.exit(0)
}

console.log('SMTP_SEND_FAIL:' + (result.error || 'unknown'))
if (result.artifactPath) console.log('FALLBACK_ARTIFACT:' + result.artifactPath)
console.log('ARTIFACT:' + artifactPath)
process.exit(2)
