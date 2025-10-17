import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { fetch, FormData } from 'undici'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Lazy dynamic import to avoid hard dependency at boot time
const _nodemailerPromise = import('nodemailer').then(m => m.default || m).catch(() => null)

export async function getTransport() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const secureEnv = process.env.SMTP_SECURE
  const tlsRejectEnv = process.env.SMTP_TLS_REJECT_UNAUTH
  const selector = process.env.DKIM_SELECTOR || 'dkim'
  const fromRaw = process.env.SMTP_FROM || ''
  const fromDomainMatch = /<[^@]+@([^>]+)>/.exec(fromRaw) || /[^\s<]+@([^>\s]+)/.exec(fromRaw)
  const domainName = fromDomainMatch && fromDomainMatch[1] ? fromDomainMatch[1].trim() : null

  const secure = secureEnv === '1' || port === 465
  const tls = tlsRejectEnv === '0' ? { rejectUnauthorized: false } : undefined

  if (!host || !user || !pass) {
    return null
  }

  const nodemailer = await _nodemailerPromise
  if (!nodemailer) {
    return null
  }

  // Optional DKIM from local private key (client-side signing)
  let dkim = undefined
  if (domainName) {
    const fs = await import('node:fs')
    const { join } = await import('node:path')
    const keyPath = process.env.DKIM_PRIVATE_KEY_PATH || join(__dirname, '../../var/secrets/mail/dkim', domainName, `${selector}.private.pem`)
    if (fs.existsSync(keyPath)) {
      const privateKey = fs.readFileSync(keyPath, 'utf8')
      if (privateKey && privateKey.includes('BEGIN')) {
        dkim = { domainName, keySelector: selector, privateKey }
      }
    }
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls,
    dkim,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    socketTimeout: 30000,
    connectionTimeout: 30000,
    greetingTimeout: 30000
  })
}

function parseFrom(raw) {
  const str = raw || ''
  const m = /^(.*?)\s*<([^>]+)>$/.exec(str)
  if (m) {
    const name = m[1].trim()
    const email = m[2].trim()
    return { email, name: name || undefined }
  }
  return { email: str.trim() || 'no-reply@deepagg.local', name: undefined }
}

// Send via Mailgun HTTP API (EU by default)
async function sendViaMailgun({ from, to, subject, html, text }) {
  const apiKey = process.env.MG_API_KEY
  const domain = process.env.MG_DOMAIN
  const base = process.env.MG_BASE_URL || 'https://api.eu.mailgun.net'
  if (!apiKey || !domain) {
    return { ok: false, error: 'mailgun_env_missing' }
  }
  const endpoint = `${base}/v3/${domain}/messages`
  const form = new FormData()
  form.set('from', from)
  form.set('to', to)
  form.set('subject', subject)
  if (text && text.length > 0) form.set('text', text)
  if (html && html.length > 0) form.set('html', html)
  form.set('h:List-Unsubscribe', '<mailto:unsubscribe@prosnab.tech>')
  form.set('h:List-Unsubscribe-Post', 'List-Unsubscribe=One-Click')
  form.set('h:Feedback-ID', 'verify:deep-agg:prosnab.tech')

  const auth = 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64')
  const res = await fetch(endpoint, { method: 'POST', headers: { Authorization: auth }, body: form })
  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await res.json() : await res.text()
  if (!res.ok) {
    return {
      ok: false,
      error: 'mailgun_send_failed',
      status: res.status,
      body
    }
  }
  const id = body && typeof body === 'object' && body.id ? body.id : null
  const message = body && typeof body === 'object' && body.message ? body.message : null
  return {
    ok: true,
    provider: 'mailgun',
    messageId: id,
    response: message
  }
}

// Send via Brevo (Sendinblue) HTTP API
async function sendViaBrevo({ from, to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY
  const base = process.env.BREVO_BASE_URL || 'https://api.brevo.com'
  if (!apiKey) {
    return { ok: false, error: 'brevo_env_missing' }
  }
  const url = `${base}/v3/smtp/email`
  const fromParsed = parseFrom(from)
  const payload = {
    sender: { email: fromParsed.email },
    to: [{ email: to }],
    subject,
    htmlContent: html || undefined,
    textContent: text || undefined,
    headers: {
      'List-Unsubscribe': '<mailto:unsubscribe@prosnab.tech>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'Feedback-ID': 'verify:deep-agg:prosnab.tech'
    }
  }
  if (fromParsed.name) payload.sender.name = fromParsed.name
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await res.json() : await res.text()
  if (!res.ok) {
    return { ok: false, error: 'brevo_send_failed', status: res.status, body }
  }
  const messageId = body && typeof body === 'object' ? (body['messageId'] || body['message-id'] || null) : null
  return { ok: true, provider: 'brevo', messageId, response: 'accepted' }
}

// Send via Mailjet HTTP API
async function sendViaMailjet({ from, to, subject, html, text }) {
  const apiKey = process.env.MJ_API_KEY
  const apiSecret = process.env.MJ_API_SECRET
  const base = process.env.MJ_BASE_URL || 'https://api.mailjet.com'
  if (!apiKey || !apiSecret) {
    return { ok: false, error: 'mailjet_env_missing' }
  }
  const url = `${base}/v3.1/send`
  const fromParsed = parseFrom(from)
  const payload = {
    Messages: [
      {
        From: { Email: fromParsed.email, Name: fromParsed.name || undefined },
        To: [{ Email: to }],
        Subject: subject,
        TextPart: text || undefined,
        HTMLPart: html || undefined,
        Headers: {
          'List-Unsubscribe': '<mailto:unsubscribe@prosnab.tech>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'Feedback-ID': 'verify:deep-agg:prosnab.tech'
        }
      }
    ]
  }
  const auth = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  const res = await fetch(url, { method: 'POST', headers: { Authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify(payload) })
  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await res.json() : await res.text()
  if (!res.ok) {
    return { ok: false, error: 'mailjet_send_failed', status: res.status, body }
  }
  let ok = false
  let messageId = null
  if (body && typeof body === 'object' && Array.isArray(body.Messages) && body.Messages.length > 0) {
    const m = body.Messages[0]
    ok = m.Status === 'success' || (Array.isArray(m.To) && m.To.length > 0 && (m.To[0].MessageID || m.To[0].MessageUuid))
    messageId = m.To && m.To[0] && (m.To[0].MessageID || m.To[0].MessageUuid) ? (m.To[0].MessageID || m.To[0].MessageUuid) : null
  }
  if (!ok) {
    return { ok: false, error: 'mailjet_unexpected_response', body }
  }
  return { ok: true, provider: 'mailjet', messageId, response: 'accepted' }
}

// Send via Elastic Email HTTP API (v4)
async function sendViaElasticEmail({ from, to, subject, html, text }) {
  const apiKey = process.env.EE_API_KEY || process.env.ELASTICEMAIL_API_KEY
  const base = process.env.EE_BASE_URL || 'https://api.elasticemail.com'
  if (!apiKey) {
    return { ok: false, error: 'elastic_env_missing' }
  }
  const url = `${base}/v4/emails/transactional`
  const fromParsed = parseFrom(from)
  const payload = {
    Recipients: { To: [to] },
    Content: {
      From: fromParsed.email,
      Subject: subject,
      Body: [
        html && { ContentType: 'HTML', Charset: 'utf-8', Content: html },
        text && { ContentType: 'PlainText', Charset: 'utf-8', Content: text }
      ].filter(Boolean),
      Headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@prosnab.tech>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'Feedback-ID': 'verify:deep-agg:prosnab.tech'
      }
    }
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-ElasticEmail-ApiKey': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await res.json() : await res.text()
  if (!res.ok) {
    return { ok: false, error: 'elastic_send_failed', status: res.status, body }
  }
  const messageId = body && typeof body === 'object' ? (body['TransactionID'] || body['MessageID'] || null) : null
  return { ok: true, provider: 'elasticemail', messageId, response: 'accepted' }
}
export async function sendMail({ to, subject, html, text }) {
  const from = process.env.MAIL_FROM || process.env.SMTP_FROM || 'no-reply@deepagg.local'
  const provider = (process.env.MAIL_PROVIDER || '').toLowerCase()

  if (provider === 'mailgun_api') {
    return sendViaMailgun({ from, to, subject, html, text })
  }
  if (provider === 'brevo_api') {
    return sendViaBrevo({ from, to, subject, html, text })
  }
  if (provider === 'mailjet_api') {
    return sendViaMailjet({ from, to, subject, html, text })
  }
  if (provider === 'elasticemail_api') {
    return sendViaElasticEmail({ from, to, subject, html, text })
  }

  const transporter = await getTransport()
  if (!transporter) {
    // Save as artifact for debugging/dev
    const dir = join(__dirname, '../../docs/_artifacts', new Date().toISOString().slice(0,10))
    const fs = await import('node:fs')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g,'-')
    const file = join(dir, `email-${ts}.txt`)
    const content = `FROM: ${from}\nTO: ${to}\nSUBJECT: ${subject}\n\n${text}\n\n---- HTML ----\n${html}`
    fs.writeFileSync(file, content, 'utf8')
    return { ok: false, error: 'smtp_not_configured', artifactPath: file }
  }
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
    headers: {
      'List-Unsubscribe': '<mailto:unsubscribe@prosnab.tech>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'Feedback-ID': 'verify:deep-agg:prosnab.tech'
    }
  })
  return {
    ok: true,
    messageId: info.messageId,
    accepted: Array.isArray(info.accepted) ? info.accepted : [],
    rejected: Array.isArray(info.rejected) ? info.rejected : [],
    response: typeof info.response === 'string' ? info.response : null,
    envelope: info.envelope || null
  }
}

// Simple template renderer - replaces {{variable}} with data values
function renderTemplate(template, data) {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim()
    
    // Handle conditionals like {{#if variable}}
    if (trimmedKey.startsWith('#if ')) {
      const varName = trimmedKey.substring(4).trim()
      return data[varName] ? '' : '<!--IF_FALSE-->'
    }
    
    // Handle closing conditionals {{/if}}
    if (trimmedKey === '/if') {
      return '<!--/IF-->'
    }
    
    // Handle equality checks {{#if (eq var 'value')}}
    if (trimmedKey.startsWith('#if (eq ')) {
      const match = trimmedKey.match(/^#if \(eq (\w+) '([^']+)'\)$/)
      if (match) {
        const [, varName, value] = match
        return data[varName] === value ? '' : '<!--IF_FALSE-->'
      }
    }
    
    // Regular variable substitution
    return data[trimmedKey] !== undefined ? data[trimmedKey] : match
  })
}

// Post-process to remove conditional blocks that evaluated to false
function processConditionals(rendered) {
  // Remove blocks between <!--IF_FALSE--> and <!--/IF-->
  return rendered.replace(/<!--IF_FALSE-->[\s\S]*?<!--\/IF-->/g, '')
}

export function loadTemplate(templateName) {
  const templatePath = join(__dirname, '../../templates', `${templateName}.html`)
  return readFileSync(templatePath, 'utf8')
}

export async function sendTemplatedMail({ to, subject, templateName, data }) {
  const template = loadTemplate(templateName)
  const rendered = renderTemplate(template, data)
  const html = processConditionals(rendered)
  
  // Generate plain text version by stripping HTML
  const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  
  return sendMail({ to, subject, html, text })
}

// Helper to render email template without sending (for previews and tests)
export function renderEmailTemplate(templateName, data) {
  const template = loadTemplate(templateName)
  const rendered = renderTemplate(template, data)
  const html = processConditionals(rendered)
  const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  return { html, text }
}
