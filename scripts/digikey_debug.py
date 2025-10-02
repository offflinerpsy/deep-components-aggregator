#!/usr/bin/env python3
"""Simple diagnostics to test Digi-Key OAuth/Product API from deployment server."""

import json
import sys
from pathlib import Path

import paramiko

CONFIG_PATH = Path('.secrets-for-deploy/target.json')
PYTHON_SNIPPET = """
import os, json
import requests

client_id = os.environ['DIGIKEY_CLIENT_ID']
client_secret = os.environ['DIGIKEY_CLIENT_SECRET']

print('TOKEN REQUEST...')
resp = requests.post(
    'https://api.digikey.com/v1/oauth2/token',
    data={
        'client_id': client_id,
        'client_secret': client_secret,
        'grant_type': 'client_credentials'
    },
    headers={
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'deep-agg-debug/1.0'
    },
    timeout=20
)
print('Status:', resp.status_code)
print('Headers:', json.dumps(dict(resp.headers), indent=2)[:400])
if not resp.ok:
    print('Body snippet:', resp.text[:800])
    raise SystemExit(1)

token = resp.json().get('access_token')
print('Token length:', len(token) if token else 'missing')

print('\nKEYWORD REQUEST...')
resp2 = requests.post(
    'https://api.digikey.com/products/v4/search/keyword',
    json={'Keywords': 'M83513/19-E01NW', 'RecordCount': 5},
    headers={
        'Authorization': f'Bearer {token}',
        'X-DIGIKEY-Client-Id': client_id,
        'X-DIGIKEY-Locale-Site': 'US',
        'X-DIGIKEY-Locale-Language': 'en',
        'X-DIGIKEY-Locale-Currency': 'USD',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'deep-agg-debug/1.0'
    },
    timeout=20
)
print('Status:', resp2.status_code)
print('Headers:', json.dumps(dict(resp2.headers), indent=2)[:400])
print('Body snippet:', resp2.text[:800])
"""


def load_target():
    if not CONFIG_PATH.exists():
        raise SystemExit("target config missing")
    with CONFIG_PATH.open('r', encoding='utf-8') as fh:
        cfg = json.load(fh)
    return cfg['host'], cfg.get('user', 'root'), cfg.get('password'), cfg.get('key_file')


def main():
    host, user, password, key_file = load_target()
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)

    try:
        cmds = [
            "cat /opt/deep-agg/.env | grep DIGIKEY",
            "curl -sS -I https://api.digikey.com/",
            "curl -sS -I https://api.digikey.com/v1/oauth2/token",
            "curl -sS -I -H 'User-Agent: Mozilla/5.0' https://api.digikey.com/v1/oauth2/token",
        ]
        for raw in cmds:
            cmd = raw
            print(f"\n$ {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
            out = stdout.read().decode(errors='ignore')
            err = stderr.read().decode(errors='ignore')
            if out:
                print(out.strip())
            if err:
                print("[stderr]" + err.strip())

        cmd = f"source /opt/deep-agg/.env >/dev/null 2>&1 && python3 - <<'PY'\n{PYTHON_SNIPPET}\nPY"
        print(f"\n$ {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
        out = stdout.read().decode(errors='ignore')
        err = stderr.read().decode(errors='ignore')
        if out:
            print(out.strip())
        if err:
            print("[stderr]" + err.strip())
    finally:
        client.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERR: {exc}")
        sys.exit(1)
