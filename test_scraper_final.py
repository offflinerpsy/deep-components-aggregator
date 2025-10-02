#!/usr/bin/env python3
"""Force clear cache and test with scraper"""

import paramiko
import time
import requests

HOST = '5.129.228.88'
PORT = 9201
USER = 'root'
KEY_FILE = 'deploy_key'
REMOTE_BASE = '/opt/deep-agg'

print('🔥 Force cache clear and test scraper\n')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect(HOST, username=USER, pkey=key)

# 1. Stop server
print('🛑 Stopping server...')
stdin, stdout, stderr = client.exec_command("pkill -f 'node server.js'")
stdout.channel.recv_exit_status()

# 2. Delete EVERYTHING in cache
print('🗑️  Deleting ALL caches...')
stdin, stdout, stderr = client.exec_command(f'rm -rf {REMOTE_BASE}/cache.db {REMOTE_BASE}/var/cache/*')
stdout.channel.recv_exit_status()

# 3. Start server
print('🚀 Starting server...')
stdin, stdout, stderr = client.exec_command(f'cd {REMOTE_BASE} && nohup node server.js > server.log 2>&1 &')
stdout.channel.recv_exit_status()

# 4. Wait
print('⏳ Waiting 3 seconds...')
time.sleep(3)

# 5. Check if running
stdin, stdout, stderr = client.exec_command('ps aux | grep "node server.js" | grep -v grep')
output = stdout.read().decode()
if not output.strip():
    print('❌ Server not running!')
    stdin, stdout, stderr = client.exec_command(f'tail -30 {REMOTE_BASE}/server.log')
    print(stdout.read().decode())
    client.close()
    exit(1)

print('✅ Server running!\n')

# 6. Test request
print('🧪 Fetching fresh data (with scraper)...\n')
response = requests.get(f'http://{HOST}:{PORT}/api/product?mpn=M83513/19-E01NW')
data = response.json()

if data.get('ok'):
    specs = data.get('product', {}).get('technical_specs', {})
    print(f'📋 Technical Specs Count: {len(specs)}\n')
    
    if len(specs) > 0:
        print('📋 Technical Specs:')
        for key, value in list(specs.items())[:15]:
            print(f'  • {key}: {value}')
        if len(specs) > 15:
            print(f'  ... and {len(specs) - 15} more')
else:
    print(f'❌ Error: {data.get("error")}')

# 7. Check logs for scraper activity
print('\n📋 Server logs (scraper activity):')
stdin, stdout, stderr = client.exec_command(f'tail -50 {REMOTE_BASE}/server.log | grep -E "M83513|Scraper|specs from API|Total after"')
print(stdout.read().decode())

client.close()

print(f'\n✅ Done! Open: http://{HOST}:{PORT}/product.html?mpn=M83513/19-E01NW')
