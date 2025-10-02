#!/usr/bin/env python3
"""
Test Digi-Key OAuth directly from server via proxy with user's credentials.
This will show exact error from Digi-Key token endpoint.
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
    print(f"=== Direct Digi-Key OAuth test on {host} ===")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    
    try:
        # Get credentials from .env
        out, _ = run(ssh, "grep DIGIKEY_CLIENT_ID /opt/deep-agg/.env | cut -d= -f2", timeout=10)
        client_id = out.strip()
        out, _ = run(ssh, "grep DIGIKEY_CLIENT_SECRET /opt/deep-agg/.env | cut -d= -f2", timeout=10)
        client_secret = out.strip()
        
        print(f"\nClient ID: {client_id[:20]}...")
        print(f"Client Secret: {client_secret[:20]}...")
        
        # Test 1: Token via proxy (production)
        print("\n=== Test 1: Production OAuth token via proxy ===")
        run(ssh, f"""
curl --proxy http://127.0.0.1:25345 --max-time 30 -v \\
  -X POST 'https://api.digikey.com/v1/oauth2/token' \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -H 'Accept: application/json' \\
  -H 'X-DIGIKEY-Client-Id: {client_id}' \\
  -d 'client_id={client_id}&client_secret={client_secret}&grant_type=client_credentials' \\
  2>&1 | head -n 100
""", timeout=40)
        
        # Test 2: Sandbox token via proxy
        print("\n=== Test 2: Sandbox OAuth token via proxy ===")
        run(ssh, f"""
curl --proxy http://127.0.0.1:25345 --max-time 30 -v \\
  -X POST 'https://sandbox-api.digikey.com/v1/oauth2/token' \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -H 'Accept: application/json' \\
  -H 'X-DIGIKEY-Client-Id: {client_id}' \\
  -d 'client_id={client_id}&client_secret={client_secret}&grant_type=client_credentials' \\
  2>&1 | head -n 100
""", timeout=40)
        
        print("\n=== END ===")
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERR: {exc}")
        sys.exit(1)
