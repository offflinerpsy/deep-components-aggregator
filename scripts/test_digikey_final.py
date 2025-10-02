#!/usr/bin/env python3
"""
Clear cache and test fresh DigiKey data.
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
    print(f"$ {cmd[:100]}")
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode(errors='ignore')
        err = stderr.read().decode(errors='ignore')
        if err.strip():
            print(f"[stderr] {err.strip()[:200]}")
        return out
    except Exception as e:
        return f"ERROR: {e}"


def main():
    host, user, password, key_file = load_target()
    print(f"=== Clear Cache & Test DigiKey ===\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    
    try:
        base = 'http://localhost:9201'
        
        print("1. Clear cache database:")
        print("="*70)
        run(ssh, "rm -f /opt/deep-agg/var/db/deepagg.sqlite*")
        run(ssh, "ls -lh /opt/deep-agg/var/db/ 2>/dev/null || echo 'cache cleared'")
        
        print("\n2. Test LM317 (FRESH):")
        print("="*70)
        out = run(ssh, f"curl --max-time 70 -s '{base}/api/product?mpn=LM317'", timeout=80)
        # Parse response
        try:
            import json as pyjson
            data = pyjson.loads(out)
            product = data.get('product', {})
            print(f"MPN: {product.get('mpn')}")
            print(f"Manufacturer: {product.get('manufacturer')}")
            print(f"Sources: {product.get('sources')}")
            print(f"Specs count: {len(product.get('technical_specs', {}))}")
            print(f"Cached: {data.get('meta', {}).get('cached')}")
        except:
            print(out[:1000])
        
        print("\n3. Check logs for DigiKey:")
        print("="*70)
        out = run(ssh, "tail -n 80 /opt/deep-agg/logs/out.log | grep -A 2 -B 2 DigiKey")
        print(out[:2000])
        
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)
