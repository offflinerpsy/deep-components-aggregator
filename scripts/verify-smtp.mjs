import 'dotenv/config'
import { getTransport } from '../src/lib/mailer.mjs'

const t = await getTransport()
if (!t) {
  console.log('SMTP_NOT_CONFIGURED')
  process.exit(1)
}

try {
  await t.verify()
  console.log('SMTP_OK')
  process.exit(0)
} catch (e) {
  console.log('SMTP_FAIL:' + (e?.message || 'unknown'))
  process.exit(2)
}
