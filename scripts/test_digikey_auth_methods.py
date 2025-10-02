#!/usr/bin/env python3
"""
Test Digi-Key OAuth with different auth methods:
1. client_credentials in body (current)
2. client_credentials with Basic Auth only
3. Try sandbox API
"""

import json
import sys
import paramiko
import base64

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
    print(f"=== Test Digi-Key OAuth variants on {host} ===")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    
    try:
        # Get creds from env
        out, _ = run(ssh, f"grep DIGIKEY_CLIENT_ID {REMOTE_ROOT}/.env | cut -d= -f2", timeout=10)
        client_id = out.strip()
        out, _ = run(ssh, f"grep DIGIKEY_CLIENT_SECRET {REMOTE_ROOT}/.env | cut -d= -f2", timeout=10)
        client_secret = out.strip()
        
        if not client_id or not client_secret:
            print("ERROR: Could not read credentials from .env")
            return
        
        print(f"\nClient ID: {client_id[:20]}...")
        
        # Test 1: Body params only (current method)
        print("\n=== TEST 1: Body params only ===")
        run(ssh, f"""curl --proxy http://127.0.0.1:25345 --max-time 25 -X POST https://api.digikey.com/v1/oauth2/token \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -H 'Accept: application/json' \\
  -H 'X-DIGIKEY-Client-Id: {client_id}' \\
  -d 'client_id={client_id}&client_secret={client_secret}&grant_type=client_credentials' | jq . || cat""", timeout=30)
        
        # Test 2: Basic Auth only (no body params)
        print("\n=== TEST 2: Basic Auth only ===")
        run(ssh, f"""curl --proxy http://127.0.0.1:25345 --max-time 25 -X POST https://api.digikey.com/v1/oauth2/token \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -H 'Accept: application/json' \\
  -u '{client_id}:{client_secret}' \\
  -d 'grant_type=client_credentials' | jq . || cat""", timeout=30)
        
        # Test 3: Sandbox API
        print("\n=== TEST 3: Sandbox API ===")
        run(ssh, f"""curl --proxy http://127.0.0.1:25345 --max-time 25 -X POST https://sandbox-api.digikey.com/v1/oauth2/token \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -H 'Accept: application/json' \\
  -H 'X-DIGIKEY-Client-Id: {client_id}' \\
  -d 'client_id={client_id}&client_secret={client_secret}&grant_type=client_credentials' | jq . || cat""", timeout=30)
        
        # Test 4: Check if token endpoint needs trailing slash
        print("\n=== TEST 4: Token endpoint with trailing slash ===")
        run(ssh, f"""curl --proxy http://127.0.0.1:25345 --max-time 25 -X POST https://api.digikey.com/v1/oauth2/token/ \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -H 'Accept: application/json' \\
  -u '{client_id}:{client_secret}' \\
  -d 'grant_type=client_credentials' | jq . || cat""", timeout=30)
        
        print("\n=== Tests complete ===")
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERR: {exc}")
        sys.exit(1)
