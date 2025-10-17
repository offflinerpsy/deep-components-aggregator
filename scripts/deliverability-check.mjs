import 'dotenv/config'
import dns from 'node:dns/promises'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

function extractDomain(fromStr) {
  const s = String(fromStr || '')
  // Try to extract email inside angle brackets first
  const m1 = s.match(/<[^@]+@([^>]+)>/)
  if (m1 && m1[1]) return m1[1].trim().replace(/[>\s]/g, '')
  // Fallback: find any user@domain pattern
  const m2 = s.match(/[^\s<]+@([^>\s]+)/)
  if (m2 && m2[1]) return m2[1].trim().replace(/[>\s]/g, '')
  return 'prosnab.tech'
}

const inferredDomain = extractDomain(process.env.SMTP_FROM)
const domain = (process.argv[2] || inferredDomain).trim()
const smtpHost = process.env.SMTP_HOST || ('mail.' + domain)

const dateDir = new Date().toISOString().slice(0,10)
const artifactsDir = join(process.cwd(), 'docs/_artifacts', dateDir, 'deliverability')
mkdirSync(artifactsDir, { recursive: true })

async function getTxt(name) {
  try { return await dns.resolveTxt(name) } catch { return [] }
}
async function getMx(name) {
  try { return await dns.resolveMx(name) } catch { return [] }
}
async function getA(name) {
  try { return await dns.resolve4(name) } catch { return [] }
}
async function getPtr(ip) {
  try { return await dns.reverse(ip) } catch { return [] }
}

async function main() {
  const spf = await getTxt(domain)
  const dmarc = await getTxt(`_dmarc.${domain}`)
  const selectors = ['dkim','default','mail']
  const dkim = {}
  for (const sel of selectors) {
    dkim[sel] = await getTxt(`${sel}._domainkey.${domain}`)
  }
  const mx = await getMx(domain)
  const aRecords = await getA(domain)
  const smtpA = await getA(smtpHost)
  const ptr = []
  for (const ip of smtpA) {
    const rev = await getPtr(ip)
    ptr.push({ ip, ptr: rev })
  }

  const summary = {
    domain,
    smtpHost,
    spf,
    dmarc,
    dkim,
    mx,
    aRecords,
    smtpA,
    ptr
  }

  const path = join(artifactsDir, `dns-${domain}.json`)
  writeFileSync(path, JSON.stringify(summary, null, 2))
  console.log('ARTIFACT:' + path)
}

main()
