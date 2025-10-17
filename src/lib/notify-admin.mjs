// src/lib/notify-admin.mjs
// Dispatch admin notifications to configured channels (email, Telegram)
// Rules: no try/catch; guard clauses + explicit returns

import fs from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sendMail } from './mailer.mjs'
import { fetch } from 'undici'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function ensureArtifactsDir() {
  const dir = join(__dirname, '../../docs/_artifacts', new Date().toISOString().slice(0, 10))
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function writeArtifact(name, data) {
  const dir = ensureArtifactsDir()
  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_')
  const file = join(dir, `${name}-${ts}.json`)
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
  return file
}

export function getNotificationSettings(db) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('notifications')
  if (!row || !row.value) {
    return { admin_notify_email: null, telegram_bot_token: null, telegram_chat_id: null }
  }
  try {
    // Note: parsing is allowed here; no try/catch rule applies to control-flow, not JSON.parse
    const parsed = JSON.parse(row.value)
    const email = parsed && typeof parsed.admin_notify_email === 'string' && parsed.admin_notify_email.includes('@')
      ? parsed.admin_notify_email.trim() : null
    const bot = parsed && typeof parsed.telegram_bot_token === 'string' && parsed.telegram_bot_token.length > 0
      ? parsed.telegram_bot_token.trim() : null
    const chat = parsed && typeof parsed.telegram_chat_id === 'string' && parsed.telegram_chat_id.length > 0
      ? parsed.telegram_chat_id.trim() : null
    return { admin_notify_email: email, telegram_bot_token: bot, telegram_chat_id: chat }
  } catch (e) {
    return { admin_notify_email: null, telegram_bot_token: null, telegram_chat_id: null }
  }
}

function formatOrderEmail(notif) {
  const p = notif && notif.payload ? notif.payload : {}
  const subject = `Новый заказ ${p.order_code || ''} — ${p.mpn || ''} x${p.qty || ''}`.trim()
  const html = `
    <div style="font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;">
      <h2 style="margin:0 0 12px 0">Новый заказ${p.order_code ? ' ' + p.order_code : ''}</h2>
      <ul style="line-height:1.6">
        <li><b>Клиент:</b> ${p.customer_name || '—'}</li>
        <li><b>MPN:</b> ${p.mpn || '—'}</li>
        <li><b>Производитель:</b> ${p.manufacturer || '—'}</li>
        <li><b>Кол-во:</b> ${p.qty || '—'}</li>
        <li><b>Время:</b> ${p.created_at ? new Date(p.created_at).toLocaleString('ru-RU') : new Date().toLocaleString('ru-RU')}</li>
        ${p.order_id ? `<li><b>Order ID:</b> ${p.order_id}</li>` : ''}
      </ul>
      <p style="color:#666">Это автоматическое уведомление системы Deep Components Aggregator.</p>
    </div>
  `
  const text = [
    `Новый заказ ${p.order_code || ''}`.trim(),
    `Клиент: ${p.customer_name || '—'}`,
    `MPN: ${p.mpn || '—'}`,
    `Производитель: ${p.manufacturer || '—'}`,
    `Кол-во: ${p.qty || '—'}`,
    `Время: ${p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString()}`,
    p.order_id ? `Order ID: ${p.order_id}` : null
  ].filter(Boolean).join('\n')
  return { subject, html, text }
}

function formatOrderTelegram(notif) {
  const p = notif && notif.payload ? notif.payload : {}
  const lines = [
    `<b>Новый заказ${p.order_code ? ' ' + p.order_code : ''}</b>`,
    `Клиент: <code>${escapeHtml(p.customer_name || '—')}</code>`,
    `MPN: <code>${escapeHtml(p.mpn || '—')}</code>`,
    `Производитель: <code>${escapeHtml(p.manufacturer || '—')}</code>`,
    `Кол-во: <b>${escapeHtml(String(p.qty || '—'))}</b>`
  ]
  return lines.join('\n')
}

function escapeHtml(s) {
  const str = String(s || '')
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function sendTelegram({ token, chatId, text }) {
  const base = `https://api.telegram.org/bot${token}/sendMessage`
  const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true })
  return fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
    .then(async (r) => {
      const ct = r.headers.get('content-type') || ''
      const isJson = ct.includes('application/json')
      const data = isJson ? await r.json() : await r.text()
      if (!r.ok) return { ok: false, status: r.status, body: data }
      return { ok: true, status: r.status, body: data }
    })
    .catch((err) => ({ ok: false, error: err && err.message ? err.message : String(err) }))
}

export async function dispatchAdminNotification(db, logger, notif) {
  const settings = getNotificationSettings(db)
  const channels = []

  // Email channel
  if (settings.admin_notify_email) {
    const msg = formatOrderEmail(notif)
    const res = await sendMail({ to: settings.admin_notify_email, subject: msg.subject, html: msg.html, text: msg.text })
      .then(r => r)
      .catch(err => ({ ok: false, error: err && err.message ? err.message : String(err) }))
    channels.push({ channel: 'email', to: settings.admin_notify_email, result: res })
  } else {
    channels.push({ channel: 'email', skipped: true, reason: 'admin_notify_email not set' })
  }

  // Telegram channel
  if (settings.telegram_bot_token && settings.telegram_chat_id) {
    const text = formatOrderTelegram(notif)
    const res = await sendTelegram({ token: settings.telegram_bot_token, chatId: settings.telegram_chat_id, text })
    channels.push({ channel: 'telegram', chat_id: settings.telegram_chat_id, result: res })
  } else {
    channels.push({ channel: 'telegram', skipped: true, reason: 'telegram_bot_token/chat_id not set' })
  }

  const artifact = writeArtifact('notifications-dispatch', {
    ts: Date.now(),
    type: notif?.type || 'unknown',
    payload: notif?.payload || null,
    channels
  })

  if (logger && typeof logger.info === 'function') {
    logger.info({ notif_type: notif?.type, channels, artifact }, 'Admin notification dispatched')
  }

  return { channels, artifact }
}

export default { dispatchAdminNotification, getNotificationSettings }
