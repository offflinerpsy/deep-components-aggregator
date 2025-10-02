#!/usr/bin/env python3
"""
Check Digi-Key credentials on server and retry selftest.
"""

import json
import sys
import paramiko

CONFIG_PATH = ".secrets-for-deploy/target.json"
REMOTE_ROOT = "/opt/deep-agg"


def load_target():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        cfg = json.load(f)
    return cfg['host'], cfg.get('user', 'root'), cfg.get('password'), cfg.get('key_file')


def run(ssh, cmd, timeout=60):
    print(f"\n$ {cmd}")
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode(errors='ignore')
        err = stderr.read().decode(errors='ignore')
        if err.strip():
            print(f"[stderr] {err.strip()}")
        if out.strip():
            print(out.strip())
        return out, err
    except Exception as e:
        print(f"CMD ERROR: {e}")
        return "", str(e)


def main():
    host, user, password, key_file = load_target()
    print(f"=== Check Digi-Key creds on {host} ===")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    
    try:
        # Show current Digi-Key creds (masked)
        run(ssh, f"grep DIGIKEY {REMOTE_ROOT}/.env | sed 's/CLIENT_SECRET=.*/CLIENT_SECRET=***MASKED***/'", timeout=10)
        
        # Check if app is running
        run(ssh, "ps aux | grep 'node server.js' | grep -v grep || echo 'App not running'", timeout=10)
        
        # Retry selftest
        base = 'http://localhost:9201'
        run(ssh, f"curl --max-time 35 -s {base}/api/digikey/selftest | jq . || cat")
        
        # Try keyword search
        run(ssh, f"curl --max-time 35 -s '{base}/api/digikey/keyword?q=LM317' | jq '.ok, .status, .count' || head -c 600")
        
        print("\n=== If still 401, need to verify production credentials ===")
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERR: {exc}")
        sys.exit(1)
