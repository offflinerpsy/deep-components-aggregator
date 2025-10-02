#!/usr/bin/env python3
"""Restart server after deploy"""
import json
import paramiko

CONFIG_PATH = ".secrets-for-deploy/target.json"
REMOTE_ROOT = "/opt/deep-agg"

with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
    cfg = json.load(f)

host = cfg['host']
user = cfg.get('user', 'root')
password = cfg.get('password')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, look_for_keys=False)

def run(cmd):
    print(f'$ {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out.strip():
        print(out.strip())
    if err.strip():
        print('ERR:', err.strip())
    return out

# Kill existing server
run(f"pkill -f 'node server.js' || true")
run(f"cd {REMOTE_ROOT} && [ -f run.pid ] && kill -9 $(cat run.pid) 2>/dev/null || true")

# Start new server
run(f"cd {REMOTE_ROOT} && nohup env PORT=9201 NODE_ENV=production node server.js > logs/out.log 2> logs/err.log < /dev/null & echo $! > run.pid")

print('\n=== Waiting 2 seconds... ===')
import time
time.sleep(2)

# Check status
run("ps aux | grep 'node server.js' | grep -v grep || true")
run("ss -ltnp | grep 9201 || true")

# Test health
run("curl -s http://localhost:9201/api/health | head -c 500")

print('\n=== Server restarted! ===')

ssh.close()
