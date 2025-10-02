#!/usr/bin/env python3
"""
Get raw DigiKey response to see actual data structure.
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
    print(f"=== DigiKey Raw Response Analysis ===\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    
    try:
        print("1. DigiKey keyword search for LM317:")
        print("="*70)
        out = run(ssh, "curl --max-time 40 -s 'http://localhost:9201/api/digikey/keyword?q=LM317&limit=1' | jq '.raw' | head -n 100")
        print(out)
        
        print("\n2. Check actual Products structure:")
        print("="*70)
        out = run(ssh, "curl --max-time 40 -s 'http://localhost:9201/api/digikey/keyword?q=LM317&limit=1' | jq '.raw.Products[0] | keys'")
        print(out)
        
        print("\n3. Get first product sample data:")
        print("="*70)
        out = run(ssh, "curl --max-time 40 -s 'http://localhost:9201/api/digikey/keyword?q=LM317&limit=1' | jq '.raw.Products[0] | {DigiKeyPartNumber, ManufacturerPartNumber, ProductDescription, ParametersCount: (.Parameters | length)}'")
        print(out)
        
        print("\n4. Get Parameters sample:")
        print("="*70)
        out = run(ssh, "curl --max-time 40 -s 'http://localhost:9201/api/digikey/keyword?q=LM317&limit=1' | jq '.raw.Products[0].Parameters[0:3]'")
        print(out)
        
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)
