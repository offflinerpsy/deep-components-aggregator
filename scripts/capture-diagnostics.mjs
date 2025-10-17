#!/usr/bin/env node

// Capture server diagnostics into docs/_artifacts/<date>/diag-
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const host = process.env.DIAG_HOST || 'http://127.0.0.1:9201';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const baseDir = path.join('docs', '_artifacts', ts);

fs.mkdirSync(baseDir, { recursive: true });

function save(name, content) {
  const p = path.join(baseDir, name);
  fs.writeFileSync(p, content);
  return p;
}

const fetchText = (url) => fetch(url)
  .then((r) => r.text())
  .then((text) => ({ ok: true, text }))
  .catch((e) => ({ ok: false, error: e.message }));

const fetchJson = (url) => fetch(url)
  .then((r) => r.json())
  .then((json) => ({ ok: true, json }))
  .catch((e) => ({ ok: false, error: e.message }));

async function main() {
  const plan = [
    { url: `${host}/api/health`, type: 'json', out: 'health.json' },
    { url: `${host}/api/health?probe=true`, type: 'json', out: 'health-probe.json' },
    { url: `${host}/api/diag/net`, type: 'json', out: 'diag-net.json' },
    { url: `${host}/api/diag/runtime`, type: 'json', out: 'diag-runtime.json' },
    { url: `${host}/api/metrics`, type: 'text', out: 'metrics.prom' }
  ];

  const results = [];
  for (const step of plan) {
    const resp = step.type === 'text' ? await fetchText(step.url) : await fetchJson(step.url);
    if (resp.ok) {
      const content = step.type === 'text' ? resp.text : JSON.stringify(resp.json, null, 2);
      const file = save(step.out, content);
      results.push({ url: step.url, out: file, ok: true });
    } else {
      results.push({ url: step.url, out: step.out, ok: false, error: resp.error });
    }
    await delay(100);
  }

  const summary = { ts, host, results };
  save('summary.json', JSON.stringify(summary, null, 2));
  console.log(`Diagnostics captured to ${baseDir}`);
}

Promise.resolve(main());
