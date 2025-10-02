#!/usr/bin/env python3
import json
import paramiko

CONFIG_PATH = ".secrets-for-deploy/target.json"

with open(CONFIG_PATH, 'r') as f:
    cfg = json.load(f)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(cfg['host'], username=cfg.get('user', 'root'), password=cfg.get('password'), look_for_keys=False)

stdin, stdout, stderr = ssh.exec_command('tail -n 150 /opt/deep-agg/logs/out.log | grep -A30 ATMEGA328P-PU')
print(stdout.read().decode('utf-8', errors='ignore'))

ssh.close()
