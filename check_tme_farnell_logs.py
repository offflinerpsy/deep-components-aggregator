#!/usr/bin/env python3
"""Check TME and Farnell logs on server"""
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
    
    # Check last 150 lines for TME/Farnell mentions
    stdin, stdout, stderr = ssh.exec_command("tail -n 150 /opt/deep-agg/logs/out.log | grep -i 'tme\\|farnell\\|stm32' || echo 'No matches'")
    out = stdout.read().decode()
    err = stderr.read().decode()
    
    if out.strip():
        print("=== SERVER LOGS (TME/Farnell) ===")
        print(out)
    else:
        print("No TME/Farnell logs found")
    
    if err.strip():
        print("\n=== ERRORS ===")
        print(err)
    
    # Also check error log
    stdin2, stdout2, stderr2 = ssh.exec_command("tail -n 100 /opt/deep-agg/logs/err.log 2>/dev/null || echo 'No err.log'")
    err_log = stdout2.read().decode()
    if err_log.strip() and err_log.strip() != 'No err.log':
        print("\n=== ERROR LOG ===")
        print(err_log)
    
finally:
    ssh.close()
    print("\n✅ Done")
