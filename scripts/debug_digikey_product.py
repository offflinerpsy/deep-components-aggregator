#!/usr/bin/env python3
"""
Check why DigiKey is not returning data in product card.
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
    print(f"=== Debugging DigiKey in Product Card ===\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    
    try:
        print("1. Check server logs for DigiKey errors:")
        print("="*70)
        out = run(ssh, "tail -n 100 /opt/deep-agg/logs/out.log | grep -A 5 -B 2 DigiKey")
        print(out[:2000])
        
        print("\n2. Test DigiKey keyword search directly:")
        print("="*70)
        out = run(ssh, "curl --max-time 40 -s 'http://localhost:9201/api/digikey/keyword?q=LM317&limit=1' | jq '{ok, status, count, first_product: .raw.Products[0].ManufacturerPartNumber}'")
        print(out[:1000])
        
        print("\n3. Test DigiKey product details by MPN:")
        print("="*70)
        out = run(ssh, "curl --max-time 40 -s 'http://localhost:9201/api/digikey/keyword?q=ATMEGA328P-PU&limit=1' | jq '{ok, status, count, products: [.raw.Products[].ManufacturerPartNumber]}'")
        print(out[:1000])
        
        print("\n4. Check if digikeyGetProduct is being called:")
        print("="*70)
        # Trigger a product request and immediately check logs
        run(ssh, "curl --max-time 60 -s 'http://localhost:9201/api/product?mpn=LM317' > /dev/null")
        out = run(ssh, "tail -n 50 /opt/deep-agg/logs/out.log | grep -E 'Product Request|DigiKey|Results:'")
        print(out[:1500])
        
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)
