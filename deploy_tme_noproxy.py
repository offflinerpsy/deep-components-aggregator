#!/usr/bin/env python3
import json
import paramiko
import time

CONFIG_PATH = ".secrets-for-deploy/target.json"
REMOTE_ROOT = "/opt/deep-agg"

with open(CONFIG_PATH, 'r') as f:
    cfg = json.load(f)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(cfg['host'], username=cfg.get('user', 'root'), password=cfg.get('password'), look_for_keys=False)

print("=== Uploading TME client ===")
sftp = ssh.open_sftp()
sftp.put('src/integrations/tme/client.mjs', f'{REMOTE_ROOT}/src/integrations/tme/client.mjs')
sftp.close()

print("=== Setting DISABLE_TME_PROXY=1 ===")
ssh.exec_command(f"sed -i '/^DISABLE_TME_PROXY=/d' {REMOTE_ROOT}/.env || true")
ssh.exec_command(f"echo 'DISABLE_TME_PROXY=1' >> {REMOTE_ROOT}/.env")

print("=== Restarting server ===")
ssh.exec_command("pkill -f 'node server.js'")
time.sleep(1)
ssh.exec_command(f"cd {REMOTE_ROOT} && nohup env PORT=9201 NODE_ENV=production node server.js > logs/out.log 2> logs/err.log < /dev/null &")
time.sleep(2)

print("=== Testing health ===")
stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:9201/api/health")
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
print("\n✅ Done! TME proxy disabled, server restarted")
