#!/usr/bin/env python3
import paramiko
import time

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('5.129.228.88', username='root', password='hKsxPKR+2ayZ^c')

print('🛑 Stopping server...')
c.exec_command('pkill -9 node')
time.sleep(2)

print('🗑️  Deleting cache...')
c.exec_command('cd /opt/deep-agg && rm -f cache.db')
time.sleep(1)

print('🚀 Starting server...')
c.exec_command('cd /opt/deep-agg && nohup node server.js > server.log 2>&1 &')
time.sleep(6)

print('🧪 Testing API...\n')
stdin, stdout, stderr = c.exec_command('curl -s http://localhost:9201/api/product?mpn=M83513/19-E01NW')
result = stdout.read().decode()

# Save to file
with open('test_result.json', 'w', encoding='utf-8') as f:
    f.write(result)

import json
data = json.loads(result)
product = data.get('product', {})
sources = product.get('sources', [])
specs = product.get('technical_specs', {})

print(f"✅ Sources: {sources}")
print(f"✅ Total specs: {len(specs)}\n")

# Show server logs
print('📋 Server logs:\n')
stdin, stdout, stderr = c.exec_command('tail -60 /opt/deep-agg/server.log')
print(stdout.read().decode())

c.close()
