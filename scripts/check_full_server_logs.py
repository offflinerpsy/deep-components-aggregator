#!/usr/bin/env python3
"""
Check full server logs for any errors.
"""

import json
import sys
import paramiko

CONFIG_PATH = ".secrets-for-deploy/target.json"

def load_target():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        cfg = json.load(f)
    return cfg['host'], cfg.get('user', 'root'), cfg.get('password'), cfg.get('key_file')


def run(ssh, cmd, timeout=60):
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode(errors='ignore')
        return out
    except Exception as e:
        return f"ERROR: {e}"


def main():
    host, user, password, key_file = load_target()
    print(f"=== Full DigiKey Product Request Analysis ===\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    
    try:
        base = 'http://localhost:9201'
        
        print("1. Trigger product request:")
        print("="*70)
        run(ssh, f"curl --max-time 60 -s '{base}/api/product?mpn=LM317' > /dev/null", timeout=70)
        
        print("\n2. Check FULL server logs (last 150 lines):")
        print("="*70)
        out = run(ssh, "tail -n 150 /opt/deep-agg/logs/out.log")
        print(out)
        
        print("\n3. Check error logs:")
        print("="*70)
        out = run(ssh, "tail -n 50 /opt/deep-agg/logs/err.log")
        if out.strip():
            print(out)
        else:
            print("(no errors)")
        
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)
