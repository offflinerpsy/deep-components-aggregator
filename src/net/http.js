import { setTimeout as delay } from 'node:timers/promises';
import fetch from 'node-fetch';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122 Safari/537.36';

export async function getHtml(url, { timeoutMs = 12000, lang = 'ru-RU,ru;q=0.9,en;q=0.8' } = {}) {
  if (!url) return { ok: false, status: 0, error: 'no_url' };
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': lang }, signal: controller.signal }).catch(() => null);
  clearTimeout(t);
  if (!res) return { ok: false, status: 0, error: 'net_fail' };
  if (res.status === 429 || res.status >= 500) { const jitter = 600 + Math.floor(Math.random() * 600); await delay(jitter); }
  const text = await res.text();
  return res.ok && text ? { ok: true, status: res.status, text } : { ok: false, status: res.status, error: 'bad_status' };
}
