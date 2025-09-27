#!/bin/bash
# PROD-HOTFIX :80 / NGINX / SSE (V3) - Deploy Script

set -e

echo "🚀 Deploying PROD-HOTFIX :80 / NGINX / SSE (V3)..."

# 1) Upload NGINX config
echo "📝 Uploading NGINX configuration..."
scp nginx-deep-agg-prod.conf root@89.104.69.77:/etc/nginx/sites-available/deep-agg.conf

# 2) Activate NGINX config
echo "🔧 Activating NGINX configuration..."
ssh root@89.104.69.77 << 'EOF'
ln -sf /etc/nginx/sites-available/deep-agg.conf /etc/nginx/sites-enabled/deep-agg.conf
[ -f /etc/nginx/sites-enabled/default ] && rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
EOF

# 3) Deploy code changes
echo "📦 Deploying code changes..."
git push prod HEAD:main

# 4) Restart services
echo "🔄 Restarting services..."
ssh root@89.104.69.77 << 'EOF'
cd /opt/deep-agg
pm2 restart deep-aggregator || pm2 start ecosystem.config.cjs
pm2 save
EOF

# 5) Health checks
echo "🏥 Running health checks..."
ssh root@89.104.69.77 << 'EOF'
curl -fsS http://127.0.0.1/health
curl -fsS 'http://127.0.0.1/api/search/health' | head -c 300
curl -fsS -X POST 'http://127.0.0.1/api/live-search' -H 'Content-Type: application/json' -d '{"q":"LM317"}' | jq .
EOF

echo "✅ PROD-HOTFIX :80 / NGINX / SSE (V3) deployed successfully!"
echo "🌐 Test in browser: http://89.104.69.77/ui/search.html?q=1N4148"
