import net from 'node:net'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const targets = [
  { host: 'gmail-smtp-in.l.google.com', port: 25 },
  { host: 'alt1.gmail-smtp-in.l.google.com', port: 25 },
  { host: 'mx.yandex.net', port: 25 }
]

const dateDir = new Date().toISOString().slice(0,10)
const artifactsDir = join(process.cwd(), 'docs/_artifacts', dateDir, 'deliverability')
mkdirSync(artifactsDir, { recursive: true })

async function probe(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const start = Date.now()
    const socket = net.createConnection({ host, port })
    let result = { host, port, ok: false, banner: null, error: null, elapsed_ms: 0 }
    const t = setTimeout(() => {
      result.error = 'timeout'
      socket.destroy()
      result.elapsed_ms = Date.now() - start
      resolve(result)
    }, timeoutMs)
    socket.once('error', (err) => {
      clearTimeout(t)
      result.error = err.message
      result.elapsed_ms = Date.now() - start
      resolve(result)
    })
    socket.once('data', (buf) => {
      clearTimeout(t)
      result.ok = true
      result.banner = buf.toString().trim().slice(0, 200)
      result.elapsed_ms = Date.now() - start
      socket.destroy()
      resolve(result)
    })
  })
}

async function main() {
  const results = []
  for (const t of targets) {
    // eslint-disable-next-line no-await-in-loop
    const r = await probe(t.host, t.port)
    results.push(r)
    console.log(`${t.host}:${t.port} => ${r.ok ? 'OK' : 'FAIL'} ${r.error ? '(' + r.error + ')' : ''}`)
  }
  const path = join(artifactsDir, 'smtp-outbound-probe.json')
  writeFileSync(path, JSON.stringify({ ts: new Date().toISOString(), results }, null, 2))
  console.log('ARTIFACT:' + path)
}

main()
