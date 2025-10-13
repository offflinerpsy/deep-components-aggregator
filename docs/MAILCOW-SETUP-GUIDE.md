# Mailcow Configuration & Access Guide

## Overview
**Service**: Mailcow Docker setup for `prosnab.tech` domain  
**Admin Interface**: https://mail.prosnab.tech/admin/  
**Webmail**: https://mail.prosnab.tech/ (Roundcube)  
**Status**: Active, 3 email accounts configured  

## Email Accounts
| Account | Password | Purpose | Status |
|---------|----------|---------|--------|
| alex@prosnab.tech | 123asd | Personal/Primary | Active |
| adp@prosnab.tech | 123asd | Business/ADP | Active |
| zapros@prosnab.tech | 123asd | Requests/Support | Active |

> **Security Note**: Change default passwords immediately after first login. Recommended: 16+ characters with mixed case, numbers, and symbols.

## Domain Configuration
- **Domain**: prosnab.tech
- **MX Record**: mail.prosnab.tech
- **SPF**: Configured for mail.prosnab.tech
- **DKIM**: Enabled with valid keys
- **DMARC**: Policy configured

## Client Configuration

### IMAP (Incoming Mail)
- **Server**: mail.prosnab.tech
- **Port**: 993
- **Security**: SSL/TLS
- **Authentication**: Normal password
- **Username**: Full email address (e.g., alex@prosnab.tech)

### SMTP (Outgoing Mail)
- **Server**: mail.prosnab.tech
- **Port**: 587 (preferred) or 465
- **Security**: STARTTLS (587) or SSL/TLS (465)
- **Authentication**: Required
- **Username**: Full email address
- **Password**: Same as IMAP

### Mobile/Desktop Setup Steps
1. Choose IMAP account type (not POP3)
2. Enter full email address and password
3. Set incoming server: mail.prosnab.tech:993 (SSL/TLS)
4. Set outgoing server: mail.prosnab.tech:587 (STARTTLS)
5. Enable authentication for SMTP
6. Test send/receive functionality

## Administrative Access

### Mailcow Admin Panel
- **URL**: https://mail.prosnab.tech/admin/
- **Purpose**: User management, domain settings, quotas, aliases
- **Features**: 
  - Password resets
  - Quota management
  - Alias creation
  - Log viewing
  - System health monitoring

### Common Admin Tasks
```bash
# Check user list
mailcowctl user list

# Reset password
mailcowctl user pwreset alex@prosnab.tech

# Check system health
mailcowctl health

# View mail logs
mailcowctl log mail
```

## Security & Monitoring

### Anti-Loop Protection
- Connection rate limiting enabled
- Queue management configured
- Resource monitoring active
- Fail2ban protection in place

### Backup & Maintenance
- Regular database backups
- Configuration versioning
- Log rotation configured
- Update notifications enabled

## Testing & Verification

### Send Test Email
```bash
# Using swaks (if available)
swaks --to offflinerpsy@gmail.com \
      --from alex@prosnab.tech \
      --server mail.prosnab.tech \
      --port 587 \
      --tls \
      --auth LOGIN

# Using openssl for SMTP test
openssl s_client -crlf -connect mail.prosnab.tech:587
```

### Webmail Test
1. Navigate to https://mail.prosnab.tech/
2. Click "Webmail" (Roundcube)
3. Login with full email and password
4. Send test email to external address
5. Verify delivery and reply functionality

## Troubleshooting

### Common Issues
- **Authentication failed**: Verify full email address as username
- **Connection timeout**: Check firewall rules and DNS resolution
- **SSL errors**: Ensure proper certificate installation
- **Mail not sending**: Verify SMTP authentication enabled

### Log Locations
- Mail logs: `/var/log/mail/` in Mailcow container
- System logs: `docker logs mailcowdockerized_postfix-mailcow_1`
- Web logs: `docker logs mailcowdockerized_nginx-mailcow_1`

### Performance Monitoring
```bash
# Check container resources
docker stats

# Monitor mail queue
docker exec -it mailcowdockerized_postfix-mailcow_1 postqueue -p

# Check active connections
docker exec -it mailcowdockerized_postfix-mailcow_1 netstat -tulpn
```

## Quick Reference Card

### For End Users (Telegram Format)
```
📧 Prosnab.tech Mail Setup

Webmail: https://mail.prosnab.tech/
Your accounts: alex@, adp@, zapros@ + prosnab.tech
Default password: 123asd (CHANGE THIS!)

📱 Phone/Tablet Setup:
- IMAP: mail.prosnab.tech:993 (SSL/TLS)  
- SMTP: mail.prosnab.tech:587 (STARTTLS)
- Username: full email address
- Auth required for both

💻 Desktop clients: Same settings
🔧 Admin panel: https://mail.prosnab.tech/admin/
```

---
**Last Updated**: October 14, 2025  
**Version**: 1.0  
**Maintainer**: System Administrator