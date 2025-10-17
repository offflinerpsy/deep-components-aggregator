import 'dotenv/config'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { renderEmailTemplate } from '../src/lib/mailer.mjs'

const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 9201}`
const verifyUrl = `${baseUrl}/auth/verify?token=TEST_TOKEN_PREVIEW`

const { html, text } = renderEmailTemplate('email-verification', {
  userName: process.env.PREVIEW_USER || 'Тестовый Пользователь',
  verifyUrl
})

const dir = join(process.cwd(), 'docs/_artifacts', new Date().toISOString().slice(0,10), 'emails')
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'email-verification.html'), html)
writeFileSync(join(dir, 'email-verification.txt'), text)

console.log('PREVIEW_WRITTEN', dir)
