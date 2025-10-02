#!/usr/bin/env python3
"""Check full server logs"""

import paramiko

HOST = '5.129.228.88'
USER = 'root'
KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect(HOST, username=USER, pkey=key)

# Full log for last request
stdin, stdout, stderr = client.exec_command('tail -200 /opt/deep-agg/server.log')
log = stdout.read().decode()
print(log)

client.close()
