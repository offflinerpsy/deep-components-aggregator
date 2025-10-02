#!/usr/bin/env python3
"""
Test DigiKey product card data - see what specs we get.
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
    print(f"\n$ {cmd[:120]}...")
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode(errors='ignore')
        err = stderr.read().decode(errors='ignore')
        if err.strip():
            print(f"[stderr] {err.strip()[:200]}")
        return out, err
    except Exception as e:
        print(f"CMD ERROR: {e}")
        return "", str(e)


def main():
    host, user, password, key_file = load_target()
    print(f"=== Test DigiKey Product Card on {host} ===\n")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    
    try:
        base = 'http://localhost:9201'
        
        # Test 1: LM317 (common voltage regulator)
        print("="*70)
        print("TEST 1: LM317 (voltage regulator)")
        print("="*70)
        out, _ = run(ssh, f"curl --max-time 60 -s '{base}/api/product?mpn=LM317' | jq '.product | {{mpn, manufacturer, title, sources, specs_count: (.technical_specs | length), technical_specs: (.technical_specs | to_entries | .[0:5] | from_entries)}}'")
        print(out[:2000])
        
        # Test 2: ATmega328P (microcontroller)
        print("\n" + "="*70)
        print("TEST 2: ATmega328P (microcontroller)")
        print("="*70)
        out, _ = run(ssh, f"curl --max-time 60 -s '{base}/api/product?mpn=ATMEGA328P-PU' | jq '.product | {{mpn, manufacturer, title, sources, specs_count: (.technical_specs | length), sample_specs: (.technical_specs | to_entries | .[0:8] | from_entries)}}'")
        print(out[:2000])
        
        # Test 3: Check DigiKey-specific data
        print("\n" + "="*70)
        print("TEST 3: Raw DigiKey response structure")
        print("="*70)
        out, _ = run(ssh, f"curl --max-time 40 -s '{base}/api/digikey/details?dkpn=296-6501-5-ND' | jq '.raw | {{ManufacturerPartNumber, Description, Parameters: (.Parameters | length), ParametersSample: (.Parameters | .[0:3])}}'")
        print(out[:2000])
        
        print("\n" + "="*70)
        print("SUMMARY")
        print("="*70)
        print("Check if:")
        print("1. DigiKey appears in 'sources' array")
        print("2. specs_count is high (should be 15+)")
        print("3. Parameters are being extracted correctly")
        
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)
