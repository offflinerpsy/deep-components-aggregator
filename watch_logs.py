#!/usr/bin/env python3
"""Watch server logs in real-time while making request"""

import paramiko
import requests
import time
import threading

HOST = '5.129.228.88'
PORT = 9201
USER = 'root'
KEY_FILE = 'deploy_key'

def watch_logs(client):
    """Tail logs in real-time"""
    stdin, stdout, stderr = client.exec_command('tail -f /opt/deep-agg/server.log')
    for line in stdout:
        print(line.strip())

# SSH client
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect(HOST, username=USER, pkey=key)

# Clear cache first
print('🗑️  Clearing cache...')
stdin, stdout, stderr = client.exec_command('cd /opt/deep-agg && pkill -f "node server.js" && rm -f cache.db && nohup node server.js > server.log 2>&1 & sleep 2')
stdout.channel.recv_exit_status()

# Start log watcher in background thread
print('\n📋 Starting log watch (Ctrl+C to stop)...\n')
print('=' * 60)

log_thread = threading.Thread(target=watch_logs, args=(client,), daemon=True)
log_thread.start()

# Give logs a moment to start
time.sleep(1)

# Make request
print(f'\n🌐 Making request to /api/product?mpn=M83513/19-E01NW...\n')
try:
    response = requests.get(f'http://{HOST}:{PORT}/api/product?mpn=M83513/19-E01NW', timeout=30)
    print(f'\n✅ Response: {response.status_code}\n')
except Exception as e:
    print(f'\n❌ Request error: {e}\n')

# Wait for logs to appear
time.sleep(5)

client.close()
