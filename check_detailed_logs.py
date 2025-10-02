#!/usr/bin/env python3
"""Check detailed TME and Farnell logs"""
import json
import paramiko
import time

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
    
    # Make test request
    print("Making test request...")
    stdin, stdout, stderr = ssh.exec_command("curl -s 'http://localhost:9201/api/product?mpn=STM32F407VGT6' > /dev/null")
    stdout.read()
    
    # Wait a bit for logs to flush
    time.sleep(2)
    
    # Check last 200 lines with more context
    stdin, stdout, stderr = ssh.exec_command("tail -n 200 /opt/deep-agg/logs/out.log")
    out = stdout.read().decode()
    
    print("=== FULL SERVER LOG (last 200 lines) ===\n")
    print(out)
    
finally:
    ssh.close()
    print("\n✅ Done")
