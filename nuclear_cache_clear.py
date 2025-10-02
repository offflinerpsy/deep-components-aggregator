#!/usr/bin/env python3
"""Nuclear option - delete ALL cache and test DigiKey"""

import paramiko
import time
import json

HOST = '5.129.228.88'
USER = 'root'
PASSWORD = 'hKsxPKR+2ayZ^c'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

# 1. Stop
print('🛑 Kill server...')
stdin, stdout, stderr = client.exec_command("pkill -9 node")
stdout.channel.recv_exit_status()
time.sleep(2)

# 2. Delete ALL cache files including var/db
print('🗑️  Delete ALL caches...')
stdin, stdout, stderr = client.exec_command('rm -rf /opt/deep-agg/var/db/*')
stdout.channel.recv_exit_status()
time.sleep(1)

# 3. Start
print('🚀 Start server...')
stdin, stdout, stderr = client.exec_command('cd /opt/deep-agg && nohup node server.js > server.log 2>&1 &')
stdout.channel.recv_exit_status()
time.sleep(7)

# 4. Check
stdin, stdout, stderr = client.exec_command('ps aux | grep "node server.js" | grep -v grep')
output = stdout.read().decode()
if output.strip():
    print('✅ Server running\n')
else:
    print('❌ Not running')
    stdin, stdout, stderr = client.exec_command('tail -20 /opt/deep-agg/server.log')
    print(stdout.read().decode())
    client.close()
    exit(1)

# 5. Test API from SERVER
print('🧪 Testing from localhost:9201...\n')
stdin, stdout, stderr = client.exec_command('curl -s http://localhost:9201/api/product?mpn=M83513/19-E01NW')
result = stdout.read().decode()

data = json.loads(result)
product = data.get('product', {})
sources = product.get('sources', [])
specs = product.get('technical_specs', {})

print(f"✅ Sources: {sources}")
print(f"✅ Total specs: {len(specs)}\n")

if len(specs) > 0:
    print(f"📊 First 20 specs:")
    for i, (k, v) in enumerate(list(specs.items())[:20]):
        print(f"  {i+1}. {k}: {v}")

print('\n📋 Server logs:\n')
stdin, stdout, stderr = client.exec_command('tail -60 /opt/deep-agg/server.log | grep -E "Product Request|Fetching|Results:|Found|Error|specs extracted"')
print(stdout.read().decode())

client.close()
