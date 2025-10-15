import 'dotenv/config'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const email = process.argv[2] || process.env.TEST_EMAIL_TO
const name = process.argv[3] || 'Smoke User'
if (!email) {
  console.error('USAGE: node scripts/run-registration.mjs <email> [name]')
  process.exit(1)
}

const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 9201}`
const artifactsDir = join(process.cwd(), 'docs/_artifacts', new Date().toISOString().slice(0,10), 'registration')
mkdirSync(artifactsDir, { recursive: true })

const payload = {
  email,
  password: 'Qwerty!234',
  confirmPassword: 'Qwerty!234',
  name
}

async function main() {
  const reqTs = new Date().toISOString()
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}

  const regArtifact = join(artifactsDir, `register-${reqTs.replace(/[:.]/g,'-')}.json`)
  writeFileSync(regArtifact, JSON.stringify({ status: res.status, headers: Object.fromEntries(res.headers.entries()), body: json || text }, null, 2))

  if (res.status === 202) {
    console.log('REGISTER_OK 202 Accepted')
    console.log('ARTIFACT:' + regArtifact)
    process.exit(0)
  }

  if (res.status === 409) {
    // email exists -> resend verification
    const resendTs = new Date().toISOString()
    const rr = await fetch(`${baseUrl}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    const rrt = await rr.text()
    let rrj = null
    try { rrj = JSON.parse(rrt) } catch {}
    const resendArtifact = join(artifactsDir, `resend-${resendTs.replace(/[:.]/g,'-')}.json`)
    writeFileSync(resendArtifact, JSON.stringify({ status: rr.status, headers: Object.fromEntries(rr.headers.entries()), body: rrj || rrt }, null, 2))
    if (rr.status === 202) {
      console.log('RESEND_OK 202 Accepted')
      console.log('ARTIFACT:' + resendArtifact)
      process.exit(0)
    }
    console.log('RESEND_FAIL status=' + rr.status)
    console.log('ARTIFACT:' + resendArtifact)
    process.exit(2)
  }

  console.log('REGISTER_FAIL status=' + res.status)
  console.log('ARTIFACT:' + regArtifact)
  process.exit(2)
}

main()
