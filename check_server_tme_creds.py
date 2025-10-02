#!/usr/bin/env python3
"""Check TME credentials on server"""
import json
import paramiko

CONFIG_PATH = ".secrets-for-deploy/target.json"

with open(CONFIG_PATH, 'r') as f:
    cfg = json.load(f)

host = cfg['host']
user = cfg.get('user', 'root')
password = cfg.get('password')
key_file = cfg.get('key_file')

print(f"Connecting to {host}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    if password:
        ssh.connect(host, username=user, password=password, look_for_keys=False)
    else:
        ssh.connect(host, username=user, key_filename=key_file)
    
    print("✅ Connected\n")
    
    # Check TME credentials
    stdin, stdout, stderr = ssh.exec_command("grep '^TME_' /opt/deep-agg/.env | head -c 100")
    out = stdout.read().decode()
    
    if out.strip():
        print("=== TME CREDENTIALS ON SERVER ===")
        print(out)
        print("\nNote: Only first 100 chars shown for security")
    else:
        print("NO TME CREDENTIALS FOUND IN .env")
    
finally:
    ssh.close()
    print("\n✅ Done")
