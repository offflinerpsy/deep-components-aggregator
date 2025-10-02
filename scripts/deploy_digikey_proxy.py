#!/usr/bin/env python3
"""
Deploy only updated Digi-Key client.mjs with built-in undici ProxyAgent,
restart app, and verify proxy usage via logs + smoke test.
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


def upload(ssh, local, remote):
    print(f"Upload {local} → {remote}")
    sftp = ssh.open_sftp()
    try:
        sftp.put(local, remote)
    finally:
        sftp.close()


def main():
    host, user, password, key_file = load_target()
    print(f"=== Deploy Digi-Key client with proxy on {host} ===")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    
    try:
        # Upload updated client
        upload(ssh, "src/integrations/digikey/client.mjs", f"{REMOTE_ROOT}/src/integrations/digikey/client.mjs")
        
        # Verify proxy env
        run(ssh, f"grep DIGIKEY_OUTBOUND_PROXY {REMOTE_ROOT}/.env", timeout=10)
        
        # Restart app
        run(ssh, f"pkill -f 'node server.js' || true")
        run(ssh, f"cd {REMOTE_ROOT} && nohup env PORT=9201 NODE_ENV=production node server.js > logs/out.log 2> logs/err.log < /dev/null & echo $! > run.pid")
        run(ssh, "sleep 3")
        
        # Check logs for proxy initialization
        run(ssh, f"tail -n 50 {REMOTE_ROOT}/logs/out.log | grep -E 'DigiKey|proxy|Proxy' || echo 'No proxy logs yet'", timeout=10)
        run(ssh, f"tail -n 30 {REMOTE_ROOT}/logs/err.log || true", timeout=10)
        
        # Smoke test
        base = 'http://localhost:9201'
        run(ssh, f"curl --max-time 20 -s -o /dev/null -w '%{{http_code}}\\n' {base}/api/health")
        run(ssh, f"curl --max-time 35 -s -o /dev/null -w '%{{http_code}}\\n' {base}/api/digikey/selftest")
        run(ssh, f"curl --max-time 35 -s {base}/api/digikey/selftest | head -c 600")
        
        # wgcf trace through proxy
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
