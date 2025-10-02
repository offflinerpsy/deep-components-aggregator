#!/usr/bin/env python3
"""
Deploy DigiKey PRODUCTION credentials and verify everything works.
"""

import json
import sys
import paramiko

CONFIG_PATH = ".secrets-for-deploy/target.json"
REMOTE_ROOT = "/opt/deep-agg"

# NEW PRODUCTION CREDENTIALS
PROD_CLIENT_ID = "JaGDn87OXtjKuGJvIA6FOO75MYqj1z6UtAwLdlAeWc91m412"
PROD_CLIENT_SECRET = "5vlwGIui6h6HV4kkKptCqby2dLdbmUKX0jE2cWNaSmvN1C0QWyip5Ah5jhpbBBbe"


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
            print(out.strip()[:1000])
        return out, err
    except Exception as e:
        print(f"CMD ERROR: {e}")
        return "", str(e)


def main():
    host, user, password, key_file = load_target()
    print(f"=== Deploy DigiKey PRODUCTION credentials to {host} ===")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    
    try:
        # Backup old .env
        run(ssh, f"cp {REMOTE_ROOT}/.env {REMOTE_ROOT}/.env.backup-$(date +%s)")
        
        # Update credentials
        print("\n" + "="*60)
        print("UPDATING CREDENTIALS")
        print("="*60)
        
        run(ssh, f"sed -i 's|DIGIKEY_CLIENT_ID=.*|DIGIKEY_CLIENT_ID={PROD_CLIENT_ID}|' {REMOTE_ROOT}/.env")
        run(ssh, f"sed -i 's|DIGIKEY_CLIENT_SECRET=.*|DIGIKEY_CLIENT_SECRET={PROD_CLIENT_SECRET}|' {REMOTE_ROOT}/.env")
        run(ssh, f"sed -i 's|DIGIKEY_API_BASE=.*|DIGIKEY_API_BASE=https://api.digikey.com|' {REMOTE_ROOT}/.env")
        
        # Verify
        run(ssh, f"grep -E 'DIGIKEY_(CLIENT_ID|CLIENT_SECRET|API_BASE)' {REMOTE_ROOT}/.env")
        
        # Restart app
        print("\n" + "="*60)
        print("RESTARTING APP")
        print("="*60)
        run(ssh, f"pkill -f 'node server.js' || true")
        run(ssh, f"cd {REMOTE_ROOT} && nohup env PORT=9201 NODE_ENV=production node server.js > logs/out.log 2> logs/err.log < /dev/null & echo $! > run.pid")
        run(ssh, "sleep 4")
        
        # Check logs
        run(ssh, f"tail -n 50 {REMOTE_ROOT}/logs/out.log | grep -E 'DigiKey|listen|ready|error' || tail -n 50 {REMOTE_ROOT}/logs/out.log")
        
        # SMOKE TESTS
        base = 'http://localhost:9201'
        print("\n" + "="*60)
        print("🔥 PRODUCTION SMOKE TESTS")
        print("="*60)
        
        print("\n--- HEALTH CHECK ---")
        run(ssh, f"curl --max-time 20 -s {base}/api/health | jq '.sources.digikey'")
        
        print("\n--- SELFTEST (M83513/19-E01NW) ---")
        out, _ = run(ssh, f"curl --max-time 40 -s {base}/api/digikey/selftest | jq '.'")
        if '"ok": true' in out or '"status": 200' in out:
            print("✅ SELFTEST PASSED")
        else:
            print("⚠️ SELFTEST FAILED - check output above")
        
        print("\n--- KEYWORD SEARCH (LM317) ---")
        out, _ = run(ssh, f"curl --max-time 40 -s '{base}/api/digikey/keyword?q=LM317&limit=3' | jq '.ok, .status, .count, .raw.Products[0].ManufacturerPartNumber'")
        if 'true' in out and '200' in out:
            print("✅ KEYWORD SEARCH WORKING")
        else:
            print("⚠️ KEYWORD SEARCH FAILED")
        
        print("\n--- PRODUCT DETAILS (296-6501-5-ND) ---")
        out, _ = run(ssh, f"curl --max-time 40 -s '{base}/api/digikey/details?dkpn=296-6501-5-ND' | jq '.ok, .status, .raw.ProductDescription'")
        if 'true' in out and '200' in out:
            print("✅ PRODUCT DETAILS WORKING")
        else:
            print("⚠️ PRODUCT DETAILS FAILED")
        
        print("\n" + "="*60)
        print("🎉 DEPLOYMENT COMPLETE")
        print("="*60)
        print("\nProduction credentials deployed:")
        print(f"  Client ID: {PROD_CLIENT_ID}")
        print(f"  API Base: https://api.digikey.com")
        print(f"  Proxy: WARP (127.0.0.1:25345)")
        print("\nNext steps:")
        print("  1. Check if all tests passed above")
        print("  2. Test from browser: http://5.129.228.88:9201/api/digikey/selftest")
        print("  3. DigiKey is now integrated into /api/search pipeline")
        
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)
