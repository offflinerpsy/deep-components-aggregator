# Environment Variables

This document describes the environment variables used in the Deep Components Aggregator project.

## Core Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `9201` | No |
| `NODE_ENV` | Node environment | `development` | No |
| `BASE_URL` | Base URL for the application | `http://localhost:9201` | No |
| `DATA_DIR` | Directory for database files | `./data/db` | No |

## Session and Security

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SESSION_SECRET` | Secret for Express session | `dev-secret-change-in-production` | **Yes** in production |
| `BEHIND_PROXY` | Whether the app is behind a proxy | `1` | No |

## Admin Panel

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ADMIN_COOKIE_SECRET` | Secret for AdminJS cookies | `deep-agg-cookie-secret-change-in-production` | **Yes** in production |
| `ADMIN_SESSION_SECRET` | Secret for AdminJS session | `deep-agg-admin-secret-change-in-production` | **Yes** in production |

## Authentication

### Google OAuth

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | - | No |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback URL | - | No |

### Yandex OAuth

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `YANDEX_CLIENT_ID` | Yandex OAuth client ID | - | No |
| `YANDEX_CLIENT_SECRET` | Yandex OAuth client secret | - | No |
| `YANDEX_CALLBACK_URL` | Yandex OAuth callback URL | - | No |

## API Keys

### Mouser

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MOUSER_API_KEY` | Mouser API key | - | No |

### Farnell

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `FARNELL_API_KEY` | Farnell API key | - | No |
| `FARNELL_REGION` | Farnell region | `uk.farnell.com` | No |

### TME

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `TME_TOKEN` | TME API token | - | No |
| `TME_SECRET` | TME API secret | - | No |

### DigiKey

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DIGIKEY_CLIENT_ID` | DigiKey client ID | - | No |
| `DIGIKEY_CLIENT_SECRET` | DigiKey client secret | - | No |
| `DIGIKEY_API_BASE` | DigiKey API base URL | `https://api.digikey.com` | No |

## Email Notifications

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SMTP_HOST` | SMTP host | - | No |
| `SMTP_PORT` | SMTP port | `587` | No |
| `SMTP_USER` | SMTP username | - | No |
| `SMTP_PASS` | SMTP password | - | No |
| `SMTP_FROM` | SMTP from address | `noreply@prosnab.tech` | No |

## Telegram Notifications

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | - | No |
| `TELEGRAM_CHAT_ID` | Telegram chat ID | - | No |

## Setting Up Admin Secrets

For production environments, it's important to set secure, random secrets for the admin panel:

```bash
# Generate random secrets
ADMIN_COOKIE_SECRET=$(openssl rand -hex 32)
ADMIN_SESSION_SECRET=$(openssl rand -hex 32)

# Add to environment
echo "ADMIN_COOKIE_SECRET=$ADMIN_COOKIE_SECRET" >> .env
echo "ADMIN_SESSION_SECRET=$ADMIN_SESSION_SECRET" >> .env
```

These secrets should be at least 32 characters long and randomly generated. They are used to secure the admin panel cookies and session data.
