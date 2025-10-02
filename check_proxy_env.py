#!/usr/bin/env python3
import json
import paramiko

CONFIG_PATH = ".secrets-for-deploy/target.json"

with open(CONFIG_PATH, 'r') as f:
    cfg = json.load(f)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(cfg['host'], username=cfg.get('user', 'root'), password=cfg.get('password'), look_for_keys=False)

print("=== Checking PROXY env on server ===")
stdin, stdout, stderr = ssh.exec_command('cat /opt/deep-agg/.env | grep -i proxy || echo "NO PROXY"')
print(stdout.read().decode('utf-8'))

ssh.close()
