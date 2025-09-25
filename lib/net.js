// lib/net.js  — единый сетевой слой (timeout, proxy, троттлинг), без try/catch
import { ProxyAgent } from "undici";

// --- Proxy hook (работает только если задан env) ---
export function buildDispatcherFromEnv() {
  const p =
    process.env.HTTPS_PROXY || process.env.https_proxy ||
    process.env.HTTP_PROXY  || process.env.http_proxy  || "";
  if (!p || typeof p !== "string" || p.length < 5) return null;
  return new ProxyAgent(p); // можно будет передать fetch'у через { dispatcher }
}

// --- Вежливый троттлинг (с джиттером) ---
const BASE_DELAY_MS = Number(process.env.DEEP_MIN_DELAY_MS || 600); // базовая пауза
let nextTs = 0;
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
export async function politeDelay() {
  const now = Date.now();
  const wait = now < nextTs ? (nextTs - now) : 0;
  const jitter = 200 + Math.floor(Math.random() * 400); // 200..600
  nextTs = Math.max(now, nextTs) + BASE_DELAY_MS + jitter;
  if (wait > 0) await sleep(wait);
}

// --- GET с timeout и опциональным proxy dispatcher ---
export async function httpGet(url, headers = {}, timeoutMs = 12000) {
  const dispatcher = buildDispatcherFromEnv(); // null, если прокси не задан
  let signal;
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    signal = AbortSignal.timeout(timeoutMs); // стандартный способ таймаута
  } else {
    const c = new AbortController();
    setTimeout(() => c.abort(), timeoutMs);
    signal = c.signal;
  }

  // Создаем опции для fetch
  const fetchOptions = { headers, signal };
  // Добавляем dispatcher только если он есть
  if (dispatcher) {
    fetchOptions.dispatcher = dispatcher;
  }

  return fetch(url, fetchOptions)
    .then(r => r.ok
      ? r.text().then(txt => ({ ok: true, status: r.status, text: txt }))
      : ({ ok: false, status: r.status })
    )
    .catch(() => ({ ok: false, status: 0 }));
}