#!/usr/bin/env python3
"""Clear cache and test DigiKey on SERVER"""

import paramiko
import time

HOST = '5.129.228.88'
USER = 'root'
PASSWORD = 'hKsxPKR+2ayZ^c'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

print('🗑️  Clearing cache on server...\n')

# Stop server, clear cache, restart
stdin, stdout, stderr = client.exec_command('''
cd /opt/deep-agg
pkill -9 -f "node server.js"
rm -f cache.db
nohup node server.js > server.log 2>&1 &
sleep 4
ps aux | grep "node server.js" | grep -v grep
''')
stdout.channel.recv_exit_status()
print(stdout.read().decode())

print('\n🧪 Testing product API with all sources...\n')

# Test API
stdin, stdout, stderr = client.exec_command('''
sleep 2
curl -s http://localhost:9201/api/product?mpn=M83513/19-E01NW | python3 << 'EOF'
import sys, json
data = json.load(sys.stdin)
product = data.get("product", {})
sources = product.get("sources", [])
specs = product.get("technical_specs", {})

print(f"✅ Sources: {', '.join(sources)}")
print(f"✅ Total specs: {len(specs)}")

if len(specs) > 15:
    print(f"\\n📊 First 15 specs:")
    for i, (k, v) in enumerate(list(specs.items())[:15]):
        print(f"  {i+1}. {k}: {v}")
    print(f"  ... and {len(specs) - 15} more")
else:
    print(f"\\n📊 All specs:")
    for i, (k, v) in enumerate(specs.items()):
        print(f"  {i+1}. {k}: {v}")
EOF
''')
stdout.channel.recv_exit_status()
print(stdout.read().decode())

# Check logs
print('\n📋 Server logs (last request):\n')
stdin, stdout, stderr = client.exec_command('tail -40 /opt/deep-agg/server.log | grep -E "Product Request|Results:|specs extracted|DigiKey|Mouser|TME|Farnell"')
print(stdout.read().decode())

client.close()
