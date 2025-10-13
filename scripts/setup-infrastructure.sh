#!/bin/bash
# Infrastructure Setup Script — prosnab.tech
# Date: October 12, 2025
# Purpose: Automated setup for Nginx + SSL + Mailcow

set -e  # Exit on error
set -u  # Exit on undefined variable

###############################################################################
# CONFIGURATION
###############################################################################

DOMAIN="prosnab.tech"
MAIL_DOMAIN="mail.prosnab.tech"
ADMIN_EMAIL="admin@prosnab.tech"
TIMEZONE="Europe/Moscow"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

###############################################################################
# HELPER FUNCTIONS
###############################################################################

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

check_dns() {
    log_info "Checking DNS records..."

    RESOLVED_IP=$(dig +short "$DOMAIN" A | head -n1)
    CURRENT_IP=$(curl -s -4 ifconfig.me)

    if [[ "$RESOLVED_IP" != "$CURRENT_IP" ]]; then
        log_warn "DNS check: $DOMAIN resolves to $RESOLVED_IP, server IPv4 is $CURRENT_IP"
        log_info "Continuing anyway (IPv6 server with IPv4 DNS is OK)..."
    else
        log_info "DNS check passed: $DOMAIN → $CURRENT_IP"
    fi
}

###############################################################################
# STEP 1: INSTALL NGINX + CERTBOT
###############################################################################

install_nginx() {
    log_info "Installing Nginx and Certbot..."

    apt update
    apt install -y nginx certbot python3-certbot-nginx ufw fail2ban

    systemctl enable nginx
    systemctl start nginx

    log_info "Nginx installed successfully"
}

###############################################################################
# STEP 2: CONFIGURE NGINX FOR FRONTEND
###############################################################################

configure_nginx_frontend() {
    log_info "Configuring Nginx for $DOMAIN..."

    cat > /etc/nginx/sites-available/"$DOMAIN" <<'EOF'
# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name prosnab.tech www.prosnab.tech;

    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS main site
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name prosnab.tech www.prosnab.tech;

    # SSL certificates (will be created by certbot)
    ssl_certificate /etc/letsencrypt/live/prosnab.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/prosnab.tech/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Proxy to Next.js (PM2 deep-v0 on :3000)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
EOF

    # Enable site
    ln -sf /etc/nginx/sites-available/"$DOMAIN" /etc/nginx/sites-enabled/

    # Remove default site
    rm -f /etc/nginx/sites-enabled/default

    # Test configuration
    nginx -t

    log_info "Nginx configuration created"
}

###############################################################################
# STEP 3: OBTAIN SSL CERTIFICATE
###############################################################################

obtain_ssl() {
    log_info "Obtaining SSL certificate for $DOMAIN..."

    # Temporarily disable HTTPS redirect
    sed -i 's/return 301/# return 301/' /etc/nginx/sites-available/"$DOMAIN"
    systemctl reload nginx

    # Get certificate
    certbot certonly --webroot \
        -w /var/www/html \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email "$ADMIN_EMAIL"

    # Re-enable HTTPS redirect
    sed -i 's/# return 301/return 301/' /etc/nginx/sites-available/"$DOMAIN"
    systemctl reload nginx

    log_info "SSL certificate obtained successfully"
}

###############################################################################
# STEP 4: CONFIGURE FIREWALL
###############################################################################

configure_firewall() {
    log_info "Configuring firewall..."

    # Reset UFW
    ufw --force reset

    # Default policies
    ufw default deny incoming
    ufw default allow outgoing

    # SSH (CRITICAL!)
    ufw allow 22/tcp comment 'SSH'

    # Web server
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'

    # Mail server (будет нужно для Mailcow)
    ufw allow 25/tcp comment 'SMTP'
    ufw allow 587/tcp comment 'Submission'
    ufw allow 465/tcp comment 'SMTPS'
    ufw allow 993/tcp comment 'IMAPS'
    ufw allow 143/tcp comment 'IMAP'

    # Enable firewall
    ufw --force enable

    log_info "Firewall configured"
}

###############################################################################
# STEP 5: INSTALL DOCKER (for Mailcow)
###############################################################################

install_docker() {
    log_info "Installing Docker..."

    if command -v docker &> /dev/null; then
        log_info "Docker already installed, skipping"
        return
    fi

    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker

    # Install docker-compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose

    log_info "Docker installed successfully"
}

###############################################################################
# STEP 6: INSTALL MAILCOW
###############################################################################

install_mailcow() {
    log_info "Installing Mailcow..."

    cd /opt

    # Clone if not exists
    if [[ ! -d "mailcow-dockerized" ]]; then
        git clone https://github.com/mailcow/mailcow-dockerized
    fi

    cd mailcow-dockerized

    # Generate config
    if [[ ! -f "mailcow.conf" ]]; then
        log_info "Generating Mailcow configuration..."

        # Interactive config generation
        ./generate_config.sh

        # Update config
        sed -i "s/^MAILCOW_HOSTNAME=.*/MAILCOW_HOSTNAME=$MAIL_DOMAIN/" mailcow.conf
        sed -i "s/^HTTP_PORT=.*/HTTP_PORT=8080/" mailcow.conf
        sed -i "s/^HTTP_BIND=.*/HTTP_BIND=127.0.0.1/" mailcow.conf
        sed -i "s/^TZ=.*/TZ=$TIMEZONE/" mailcow.conf
    fi

    # Pull images
    docker-compose pull

    # Start Mailcow
    docker-compose up -d

    log_info "Mailcow installed and started"
    log_info "Web UI: https://$MAIL_DOMAIN (after SSL setup)"
    log_info "Default credentials: admin / moohoo (CHANGE IMMEDIATELY!)"
}

###############################################################################
# STEP 7: CONFIGURE NGINX FOR MAILCOW
###############################################################################

configure_nginx_mail() {
    log_info "Configuring Nginx for $MAIL_DOMAIN..."

    cat > /etc/nginx/sites-available/"$MAIL_DOMAIN" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $MAIL_DOMAIN autodiscover.$DOMAIN autoconfig.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $MAIL_DOMAIN autodiscover.$DOMAIN autoconfig.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$MAIL_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$MAIL_DOMAIN/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    ln -sf /etc/nginx/sites-available/"$MAIL_DOMAIN" /etc/nginx/sites-enabled/

    nginx -t

    log_info "Nginx configuration for mail created"
}

###############################################################################
# STEP 8: OBTAIN SSL FOR MAIL
###############################################################################

obtain_ssl_mail() {
    log_info "Obtaining SSL certificate for $MAIL_DOMAIN..."

    certbot certonly --webroot \
        -w /var/www/html \
        -d "$MAIL_DOMAIN" \
        -d "autodiscover.$DOMAIN" \
        -d "autoconfig.$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email "$ADMIN_EMAIL"

    systemctl reload nginx

    log_info "SSL certificate for mail obtained successfully"
}

###############################################################################
# MAIN EXECUTION
###############################################################################

main() {
    log_info "=== Infrastructure Setup Script ==="
    log_info "Domain: $DOMAIN"
    log_info "Mail: $MAIL_DOMAIN"
    log_info ""

    check_root
    check_dns

    # Frontend setup
    log_info "=== PART 1: FRONTEND (Nginx + SSL) ==="
    install_nginx
    configure_nginx_frontend
    obtain_ssl
    configure_firewall

    log_info ""
    log_info "✅ Frontend setup complete!"
    log_info "Your site is now available at: https://$DOMAIN"
    log_info ""

    # Mail setup
    read -p "Do you want to install Mailcow now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "=== PART 2: MAIL SERVER (Mailcow) ==="
        install_docker
        install_mailcow
        configure_nginx_mail
        obtain_ssl_mail

        log_info ""
        log_info "✅ Mail server setup complete!"
        log_info "Web UI: https://$MAIL_DOMAIN"
        log_info "Default credentials: admin / moohoo"
        log_info ""
        log_warn "IMPORTANT NEXT STEPS:"
        log_warn "1. Change admin password in Mailcow UI"
        log_warn "2. Add DNS records (MX, SPF, DKIM, DMARC)"
        log_warn "3. Request PTR record from hosting provider"
        log_warn "4. Create mailboxes in Mailcow UI"
    else
        log_info "Skipping mail server installation"
    fi

    log_info ""
    log_info "=== SETUP COMPLETE ==="
    log_info "Next steps:"
    log_info "1. Test website: curl -I https://$DOMAIN"
    log_info "2. Check SSL: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "3. Configure DNS for mail (see INFRASTRUCTURE-PLAN.md)"
        log_info "4. Change Mailcow admin password"
    fi
}

# Run main function
main "$@"
