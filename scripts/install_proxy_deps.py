#!/usr/bin/env python3
"""
Install undici-proxy-agent on server, restart app, and verify proxy is used.
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
    print(f"=== Install proxy deps on {host} ===")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    
    try:
        # 1) Install undici-proxy-agent (correct version 6.x already in package.json)
        run(ssh, f"cd {REMOTE_ROOT} && npm install --save undici-proxy-agent@6.0.2", timeout=120)
        
        # 2) Verify .env has proxy
        run(ssh, f"grep DIGIKEY_OUTBOUND_PROXY {REMOTE_ROOT}/.env || echo 'MISSING'", timeout=10)
        
        # 3) Restart app
        run(ssh, f"pkill -f 'node server.js' || true")
        run(ssh, f"cd {REMOTE_ROOT} && nohup env PORT=9201 NODE_ENV=production node server.js > logs/out.log 2> logs/err.log < /dev/null & echo $! > run.pid")
        run(ssh, "sleep 2")
        
        # 4) Check app logs for proxy
        run(ssh, f"tail -n 30 {REMOTE_ROOT}/logs/out.log | grep -i 'proxy\\|digikey' || true", timeout=10)
        
        # 5) Smoke test
        base = 'http://localhost:9201'
        run(ssh, f"curl --max-time 20 -s -o /dev/null -w '%{{http_code}}\\n' {base}/api/health")
        run(ssh, f"curl --max-time 30 -s -o /dev/null -w '%{{http_code}}\\n' {base}/api/digikey/selftest && curl --max-time 30 -s {base}/api/digikey/selftest | head -c 500")
        
        # 6) Direct proxy test via curl
        run(ssh, "curl --proxy http://127.0.0.1:25345 --max-time 20 -I https://api.digikey.com/v1/oauth2/token 2>&1 | head -n 15", timeout=25)
        
        # 7) wgcf trace through proxy
        run(ssh, "https_proxy=http://127.0.0.1:25345 /usr/local/bin/wgcf trace | tail -n 6", timeout=20)
        
        print("\n=== DONE ===")
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERR: {exc}")
        sys.exit(1)
