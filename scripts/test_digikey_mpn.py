#!/usr/bin/env python3
"""
Test if DigiKey finds products by exact MPNs.
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
        return out
    except Exception as e:
        return f"ERROR: {e}"


def main():
    host, user, password, key_file = load_target()
    print(f"=== Test DigiKey Product Lookup ===\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    
    try:
        base = 'http://localhost:9201'
        
        # Test exact MPNs that Mouser returned
        print("="*70)
        print("1. Search DigiKey for LM317MBSTT3G (exact Mouser MPN)")
        print("="*70)
        out = run(ssh, f"curl --max-time 40 -s '{base}/api/digikey/keyword?q=LM317MBSTT3G&limit=1' | jq '{{ok, status, count, product: .raw.Products[0].ManufacturerProductNumber}}'")
        print(out[:800])
        
        print("\n" + "="*70)
        print("2. Search DigiKey for ATMEGA328P-PU")
        print("="*70)
        out = run(ssh, f"curl --max-time 40 -s '{base}/api/digikey/keyword?q=ATMEGA328P-PU&limit=1' | jq '{{ok, status, count, product: .raw.Products[0].ManufacturerProductNumber}}'")
        print(out[:800])
        
        print("\n" + "="*70)
        print("3. Try generic LM317 search")
        print("="*70)
        out = run(ssh, f"curl --max-time 40 -s '{base}/api/digikey/keyword?q=LM317&limit=3' | jq '{{ok, count, products: [.raw.Products[].ManufacturerProductNumber]}}'")
        print(out[:1000])
        
        print("\n" + "="*70)
        print("4. Check if DigiKey returns ManufacturerProductNumber correctly")
        print("="*70)
        out = run(ssh, f"curl --max-time 40 -s '{base}/api/digikey/keyword?q=LM317&limit=1' | jq '.raw.Products[0] | {{mpn: .ManufacturerProductNumber, desc: .Description.ProductDescription, params: (.Parameters | length)}}'")
        print(out[:1000])
        
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)
