import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

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

  const secure = secureEnv === '1' || port === 465
  const tls = tlsRejectEnv === '0' ? { rejectUnauthorized: false } : undefined

  if (!host || !user || !pass) {
    return null
  }

  const nodemailer = await _nodemailerPromise
  if (!nodemailer) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    socketTimeout: 30000,
    connectionTimeout: 30000,
    greetingTimeout: 30000
  })
}

export async function sendMail({ to, subject, html, text }) {
  const from = process.env.SMTP_FROM || 'no-reply@deepagg.local'
  const transporter = await getTransport()
  if (!transporter) {
    // Save as artifact for debugging/dev
    try {
      const dir = join(__dirname, '../../docs/_artifacts', new Date().toISOString().slice(0,10))
      const fs = await import('node:fs')
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      const ts = new Date().toISOString().replace(/[:.]/g,'-')
      const file = join(dir, `email-${ts}.txt`)
      const content = `FROM: ${from}\nTO: ${to}\nSUBJECT: ${subject}\n\n${text}\n\n---- HTML ----\n${html}`
      fs.writeFileSync(file, content, 'utf8')
      return { ok: false, error: 'smtp_not_configured', artifactPath: file }
    } catch (_) {
      return { ok: false, error: 'smtp_not_configured' }
    }
  }
  const info = await transporter.sendMail({ from, to, subject, html, text })
  return { ok: true, messageId: info.messageId }
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
