#!/usr/bin/env python3
"""
Switch to Digi-Key sandbox and verify it works end-to-end.
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
    print(f"\n$ {cmd[:150]}...")
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode(errors='ignore')
        err = stderr.read().decode(errors='ignore')
        if err.strip():
            print(f"[stderr] {err.strip()[:300]}")
        if out.strip():
            print(out.strip()[:800])
        return out, err
    except Exception as e:
        print(f"CMD ERROR: {e}")
        return "", str(e)


def main():
    host, user, password, key_file = load_target()
    print(f"=== Switch to Digi-Key sandbox on {host} ===")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    
    try:
        # Update .env to use sandbox
        run(ssh, f"sed -i 's|DIGIKEY_API_BASE=.*|DIGIKEY_API_BASE=https://sandbox-api.digikey.com|' {REMOTE_ROOT}/.env")
        run(ssh, f"grep DIGIKEY_API_BASE {REMOTE_ROOT}/.env")
        
        # Restart app
        run(ssh, f"pkill -f 'node server.js' || true")
        run(ssh, f"cd {REMOTE_ROOT} && nohup env PORT=9201 NODE_ENV=production node server.js > logs/out.log 2> logs/err.log < /dev/null & echo $! > run.pid")
        run(ssh, "sleep 3")
        
        # Check logs
        run(ssh, f"tail -n 40 {REMOTE_ROOT}/logs/out.log | grep -E 'DigiKey|sandbox|token|proxy'")
        
        # Smoke tests
        base = 'http://localhost:9201'
        print("\n" + "="*60)
        print("SMOKE TESTS")
        print("="*60)
        
        run(ssh, f"curl --max-time 20 -s {base}/api/health | jq '.sources.digikey'")
        
        print("\n--- SELFTEST ---")
        run(ssh, f"curl --max-time 40 -s {base}/api/digikey/selftest | jq .")
        
        print("\n--- KEYWORD SEARCH ---")
        run(ssh, f"curl --max-time 40 -s '{base}/api/digikey/keyword?q=LM317&limit=3' | jq '.ok, .status, .count, .raw.Products[0].ManufacturerPartNumber'")
        
        print("\n--- PRODUCT DETAILS ---")
        run(ssh, f"curl --max-time 40 -s '{base}/api/digikey/details?dkpn=296-6501-5-ND' | jq '.ok, .status'")
        
        print("\n" + "="*60)
        print("✅ If all above returned 200/true, Digi-Key sandbox is working!")
        print("📝 To get production access:")
        print("   1. Go to https://developer.digikey.com/")
        print("   2. Navigate to My Apps → your app")
        print("   3. Request 'Product Information API v4' access")
        print("   4. Usually approved within 1-2 business days")
        print("="*60)
        
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERR: {exc}")
        sys.exit(1)
