#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE || 'http://localhost:9201'
const INTERVAL_SEC = Number(process.env.INTERVAL || process.argv.includes('--interval') ? (process.argv[process.argv.indexOf('--interval')+1]||5) : 5)
const DURATION_SEC = Number(process.env.DURATION || process.argv.includes('--duration') ? (process.argv[process.argv.indexOf('--duration')+1]||300) : 300)
const OUT_DIR = path.join('docs', '_artifacts', new Date().toISOString().slice(0,10), 'runtime-stability')

fs.mkdirSync(OUT_DIR, { recursive: true })

const samples = []
const start = Date.now()
const endAt = start + DURATION_SEC*1000

async function tick() {
  const ts = Date.now()
  try {
    const t0 = Date.now()
    const res = await fetch(BASE + '/api/health')
    const latency = Date.now() - t0
    const ok = res.ok
    let data
    try { data = await res.json() } catch { data = null }
    samples.push({ ts, ok, status: res.status, latency_ms: latency })
    fs.writeFileSync(path.join(OUT_DIR, 'health-last.json'), JSON.stringify(data || { status: res.status }, null, 2))
  } catch (e) {
    samples.push({ ts, ok: false, error: e.message })
  }
}

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)) }

(async () => {
  while (Date.now() < endAt) {
    await tick()
    await sleep(INTERVAL_SEC*1000)
  }
  const okCount = samples.filter(s=>s.ok).length
  const failCount = samples.length - okCount
  const avgLatency = Math.round(samples.filter(s=>typeof s.latency_ms==='number').reduce((a,b)=>a+b.latency_ms,0) / Math.max(1, okCount))
  const summary = { base: BASE, duration_sec: DURATION_SEC, interval_sec: INTERVAL_SEC, samples: samples.length, ok: okCount, fail: failCount, avg_latency_ms: avgLatency, started_at: start, ended_at: Date.now() }
  fs.writeFileSync(path.join(OUT_DIR, 'health-monitor-summary.json'), JSON.stringify(summary, null, 2))
  fs.writeFileSync(path.join(OUT_DIR, 'health-monitor-samples.json'), JSON.stringify(samples, null, 2))
  const md = [
    '# Health Monitor Summary',
    '',
    `Base: ${BASE}`,
    `Duration: ${DURATION_SEC}s, interval: ${INTERVAL_SEC}s`,
    `Samples: ${samples.length}, OK: ${okCount}, FAIL: ${failCount}`,
    `Avg latency: ${isFinite(avgLatency)?avgLatency:'n/a'} ms`,
    '',
    '- Files:',
    '  - health-monitor-summary.json',
    '  - health-monitor-samples.json',
    '  - health-last.json'
  ].join('\n')
  fs.writeFileSync(path.join(OUT_DIR, 'health-monitor-summary.md'), md)
  console.log(JSON.stringify(summary))
})()
