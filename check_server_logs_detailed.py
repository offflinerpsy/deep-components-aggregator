#!/usr/bin/env python3
import json
import paramiko

CONFIG_PATH = ".secrets-for-deploy/target.json"

with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
    cfg = json.load(f)

host = cfg['host']
user = cfg.get('user', 'root')
password = cfg.get('password')
key_file = cfg.get('key_file')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

if password:
    ssh.connect(host, username=user, password=password, look_for_keys=False)
else:
    ssh.connect(host, username=user, key_filename=key_file)

# Read last 200 lines and grep for TME/Farnell
stdin, stdout, stderr = ssh.exec_command("tail -n 200 /opt/deep-agg/logs/out.log | grep -E 'TME|Farnell|LM317'")
out = stdout.read().decode('utf-8', errors='ignore')

print("=== SERVER LOGS (TME/Farnell) ===")
print(out)

ssh.close()
