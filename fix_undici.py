#!/usr/bin/env python3
"""Reinstall undici completely"""

import paramiko
import time

HOST = '5.129.228.88'
USER = 'root'
KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect(HOST, username=USER, pkey=key)

print('📦 Reinstalling undici...')
stdin, stdout, stderr = client.exec_command('cd /opt/deep-agg && rm -rf node_modules/undici && npm install undici')
stdout.channel.recv_exit_status()
print(stdout.read().decode())
print('✅ Done')

print('🗑️  Delete cache.db...')
stdin, stdout, stderr = client.exec_command('rm -f /opt/deep-agg/cache.db')
stdout.channel.recv_exit_status()

print('🚀 Starting server...')
stdin, stdout, stderr = client.exec_command('cd /opt/deep-agg && nohup node server.js > server.log 2>&1 &')
stdout.channel.recv_exit_status()
time.sleep(3)

stdin, stdout, stderr = client.exec_command('ps aux | grep "node server.js" | grep -v grep')
output = stdout.read().decode()
if output.strip():
    print('✅ Server running')
else:
    print('❌ Not running')
    stdin, stdout, stderr = client.exec_command('tail -30 /opt/deep-agg/server.log')
    print(stdout.read().decode())

client.close()
