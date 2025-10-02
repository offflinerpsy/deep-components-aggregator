#!/usr/bin/env python3
import json
import paramiko
import time

CONFIG_PATH = ".secrets-for-deploy/target.json"

with open(CONFIG_PATH, 'r') as f:
    cfg = json.load(f)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(cfg['host'], username=cfg.get('user', 'root'), password=cfg.get('password'), look_for_keys=False)

print("=== Restarting server ===")
ssh.exec_command("pkill -f 'node server.js'")
time.sleep(1)
ssh.exec_command("cd /opt/deep-agg && nohup env PORT=9201 NODE_ENV=production node server.js > logs/out.log 2> logs/err.log < /dev/null &")
time.sleep(2)

print("=== Checking server ===")
stdin, stdout, stderr = ssh.exec_command("ps aux | grep 'node server.js' | grep -v grep")
print(stdout.read().decode('utf-8', errors='ignore'))

print("=== Testing health ===")
stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:9201/api/health")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
print("\n✅ Done! Server restarted")
