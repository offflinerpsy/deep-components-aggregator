import 'dotenv/config'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { sendTemplatedMail, renderEmailTemplate } from '../src/lib/mailer.mjs'

const to = process.argv[2] || process.env.TEST_EMAIL_TO
if (!to) {
  console.log('USAGE: node scripts/send-test-email.mjs <email>')
  process.exit(1)
}

const subject = 'DeepAgg: Тестовое письмо (SMTP)'
const templateName = 'email-verification'

// Reuse verify template with dummy token/url for smoke test
const data = {
  userName: to,
  verifyUrl: 'https://example.com/verify?token=TESTTOKEN',
}

const preview = renderEmailTemplate(templateName, data)

const result = await sendTemplatedMail({ to, subject, templateName, data })

// Save artifact with result
const dir = join(process.cwd(), 'docs/_artifacts', new Date().toISOString().slice(0,10), 'emails')
mkdirSync(dir, { recursive: true })
const ts = new Date().toISOString().replace(/[:.]/g, '-')
const artifactPath = join(dir, `smtp-send-${ts}.json`)
const artifact = { to, subject, templateName, ok: !!result.ok, messageId: result.messageId || null, error: result.error || null }
writeFileSync(artifactPath, JSON.stringify(artifact, null, 2))

if (result.ok) {
  console.log('SMTP_SEND_OK:' + result.messageId)
  console.log('ARTIFACT:' + artifactPath)
  process.exit(0)
}

if (result.artifactPath) {
  console.log('SMTP_SEND_FALLBACK_ARTIFACT:' + result.artifactPath)
}
console.log('SMTP_SEND_FAIL:' + (result.error || 'unknown'))
console.log('ARTIFACT:' + artifactPath)
process.exit(2)
