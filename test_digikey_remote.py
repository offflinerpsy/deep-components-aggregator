#!/usr/bin/env python3
"""Test DigiKey integration on server"""

import paramiko
import json

HOST = '5.129.228.88'
USER = 'root'
PASSWORD = 'hKsxPKR+2ayZ^c'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD)

print('🧪 Testing DigiKey integration on server...\n')

# Test API call
stdin, stdout, stderr = client.exec_command('''
curl -s http://localhost:9201/api/product?mpn=M83513/19-E01NW | python3 -c "
import sys, json
data = json.load(sys.stdin)
product = data.get('product', {})
sources = product.get('sources', [])
specs = product.get('technical_specs', {})
print(f'Sources: {sources}')
print(f'Total specs: {len(specs)}')
print(f'\\nFirst 10 specs:')
for i, (k, v) in enumerate(list(specs.items())[:10]):
    print(f'  {k}: {v}')
"
''')

output = stdout.read().decode()
error = stderr.read().decode()

print(output)
if error:
    print('ERROR:', error)

# Check server logs for DigiKey
print('\n📋 Server logs (DigiKey):')
stdin, stdout, stderr = client.exec_command('tail -50 /opt/deep-agg/server.log | grep -i digikey')
print(stdout.read().decode())

client.close()
