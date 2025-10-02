#!/usr/bin/env python3
"""
Direct test of Digi-Key OAuth + keyword search from server using current credentials.
Tests multiple auth methods to find the working one.
"""

import json
import sys
import paramiko
import base64

CONFIG_PATH = ".secrets-for-deploy/target.json"


def load_target():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        cfg = json.load(f)
    return cfg['host'], cfg.get('user', 'root'), cfg.get('password'), cfg.get('key_file')


def run(ssh, cmd, timeout=60):
    print(f"\n$ {cmd[:200]}...")
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode(errors='ignore')
        err = stderr.read().decode(errors='ignore')
        if err.strip():
            print(f"[stderr] {err.strip()[:500]}")
        if out.strip():
            print(out.strip()[:1000])
        return out, err
    except Exception as e:
        print(f"CMD ERROR: {e}")
        return "", str(e)


def main():
    host, user, password, key_file = load_target()
    print(f"=== Direct Digi-Key test on {host} ===")
    
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
        print(f"Client Secret: {client_secret[:20]}...\n")
        
        # Test 1: Body parameters (current method)
        print("=" * 60)
        print("TEST 1: OAuth with body parameters (current)")
        print("=" * 60)
        cmd = f"""curl --proxy http://127.0.0.1:25345 --max-time 30 -X POST 'https://api.digikey.com/v1/oauth2/token' \
-H 'Content-Type: application/x-www-form-urlencoded' \
-H 'Accept: application/json' \
-H 'X-DIGIKEY-Client-Id: {client_id}' \
-d 'client_id={client_id}&client_secret={client_secret}&grant_type=client_credentials' 2>&1"""
        run(ssh, cmd, timeout=35)
        
        # Test 2: Basic Auth (alternative)
        print("\n" + "=" * 60)
        print("TEST 2: OAuth with Basic Auth header")
        print("=" * 60)
        # Encode in Python and pass to shell
        basic_cred = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
        cmd = f"""curl --proxy http://127.0.0.1:25345 --max-time 30 -X POST 'https://api.digikey.com/v1/oauth2/token' \
-H 'Content-Type: application/x-www-form-urlencoded' \
-H 'Accept: application/json' \
-H 'Authorization: Basic {basic_cred}' \
-d 'grant_type=client_credentials' 2>&1"""
        run(ssh, cmd, timeout=35)
        
        # Test 3: Sandbox API
        print("\n" + "=" * 60)
        print("TEST 3: Sandbox OAuth")
        print("=" * 60)
        cmd = f"""curl --proxy http://127.0.0.1:25345 --max-time 30 -X POST 'https://sandbox-api.digikey.com/v1/oauth2/token' \
-H 'Content-Type: application/x-www-form-urlencoded' \
-H 'Accept: application/json' \
-H 'X-DIGIKEY-Client-Id: {client_id}' \
-d 'client_id={client_id}&client_secret={client_secret}&grant_type=client_credentials' 2>&1"""
        run(ssh, cmd, timeout=35)
        
        print("\n=== Analysis ===")
        print("If all tests return 401, the Client ID is not valid for this API.")
        print("If sandbox works but production doesn't, need production approval.")
        print("If Basic Auth works, we'll update the client code.")
        
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERR: {exc}")
        sys.exit(1)
