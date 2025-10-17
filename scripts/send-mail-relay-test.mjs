import { sendTemplatedMail, renderEmailTemplate } from '../src/lib/mailer.mjs'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function artifactDir() {
  const d = join(__dirname, '../docs/_artifacts', new Date().toISOString().slice(0,10))
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

function writeArtifact(name, data) {
  const dir = artifactDir()
  const ts = new Date().toISOString().replace(/[:.]/g,'-')
  const path = join(dir, `${name}-${ts}.json`)
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8')
  return path
}

const to = process.argv[2] || ''
if (!to) {
  const a = writeArtifact('mail-relay-test-error', { ok: false, error: 'missing_to_argument' })
  console.log('NO_TO_ARG', a)
  process.exit(1)
}

const verifyUrl = 'https://prosnab.tech/verify?token=dummy'
const { html, text } = renderEmailTemplate('email-verification', { verify_url: verifyUrl, email: to })

const r = await sendTemplatedMail({
  to,
  subject: 'DeepAgg — тест доставки (relay) / delivery test',
  templateName: 'email-verification',
  data: { verify_url: verifyUrl, email: to }
})

const res = { provider: process.env.MAIL_PROVIDER || 'smtp', target: to, result: r, from: process.env.MAIL_FROM || process.env.SMTP_FROM }
const file = writeArtifact('mail-relay-test', res)
console.log('MAIL_RELAY_TEST', file)
