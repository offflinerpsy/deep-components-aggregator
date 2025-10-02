#!/usr/bin/env python3
"""
Clear product cache and test DigiKey integration in product card.
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
    print(f"\n$ {cmd[:100]}...")
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode(errors='ignore')
        err = stderr.read().decode(errors='ignore')
        if err.strip():
            print(f"[stderr] {err.strip()[:200]}")
        return out
    except Exception as e:
        print(f"CMD ERROR: {e}")
        return f"ERROR: {e}"


def main():
    host, user, password, key_file = load_target()
    print(f"=== Clear Cache & Test DigiKey Product Card ===\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    
    try:
        base = 'http://localhost:9201'
        
        print("="*70)
        print("1. Clear cache database")
        print("="*70)
        run(ssh, "rm -f /opt/deep-agg/cache.db")
        run(ssh, "ls -lh /opt/deep-agg/ | grep cache")
        
        print("\n" + "="*70)
        print("2. Test LM317 (fresh fetch from all sources)")
        print("="*70)
        out = run(ssh, f"curl --max-time 60 -s '{base}/api/product?mpn=LM317' | jq '.product | {{mpn, manufacturer, title, sources, specs_count: (.technical_specs | length)}}'", timeout=70)
        print(out[:1500])
        
        print("\n" + "="*70)
        print("3. Test ATMEGA328P-PU (fresh)")
        print("="*70)
        out = run(ssh, f"curl --max-time 60 -s '{base}/api/product?mpn=ATMEGA328P-PU' | jq '.product | {{mpn, manufacturer, sources, specs_count: (.technical_specs | length)}}'", timeout=70)
        print(out[:1500])
        
        print("\n" + "="*70)
        print("4. Check server logs for DigiKey activity")
        print("="*70)
        out = run(ssh, "tail -n 100 /opt/deep-agg/logs/out.log | grep -E 'DigiKey|Results:|specs extracted'")
        print(out[:2000])
        
        print("\n" + "="*70)
        print("SUMMARY")
        print("="*70)
        print("Check if DigiKey appears in 'sources' and adds specs!")
        
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)
