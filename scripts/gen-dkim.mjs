import { generateKeyPairSync } from 'node:crypto'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const domain = (process.argv[2] || '').trim()
const selector = (process.argv[3] || 'dkim').trim()
if (!domain) {
  console.error('USAGE: node scripts/gen-dkim.mjs <domain> [selector]')
  process.exit(1)
}

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
})

// Extract base64 body from PEM PUBLIC KEY for DKIM p=
const p = publicKey
  .replace(/-----BEGIN PUBLIC KEY-----/g, '')
  .replace(/-----END PUBLIC KEY-----/g, '')
  .replace(/\s+/g, '')
  .trim()

const txt = `v=DKIM1; k=rsa; p=${p}`

// Save keys under var/ (not committed)
const keyDir = join(process.cwd(), 'var', 'secrets', 'mail', 'dkim', domain)
mkdirSync(keyDir, { recursive: true })
const privPath = join(keyDir, `${selector}.private.pem`)
const pubPath = join(keyDir, `${selector}.public.pem`)
writeFileSync(privPath, privateKey, { mode: 0o600 })
writeFileSync(pubPath, publicKey, { mode: 0o644 })

// Save artifact with TXT
const dateDir = new Date().toISOString().slice(0,10)
const artDir = join(process.cwd(), 'docs', '_artifacts', dateDir, 'deliverability')
mkdirSync(artDir, { recursive: true })
const artPath = join(artDir, `dkim-${domain}-${selector}.json`)
writeFileSync(artPath, JSON.stringify({ domain, selector, txt, dns: {
  host: `${selector}._domainkey.${domain}.`, type: 'TXT', value: txt
} }, null, 2))

console.log('DKIM_DNS_HOST:' + `${selector}._domainkey.${domain}.`)
console.log('DKIM_DNS_TXT:' + txt)
console.log('PRIVATE_KEY:' + privPath)
console.log('PUBLIC_KEY:' + pubPath)
console.log('ARTIFACT:' + artPath)
