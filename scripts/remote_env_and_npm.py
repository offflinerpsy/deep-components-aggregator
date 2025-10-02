#!/usr/bin/env python3
"""Ensure remote env is set for Digi-Key base/proxy, install npm deps, restart app, and run smoke tests."""
import json
import sys
import paramiko

CONFIG_PATH = '.secrets-for-deploy/target.json'
REMOTE_ROOT = '/opt/deep-agg'


def load_target():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        cfg = json.load(f)
    return cfg['host'], cfg.get('user', 'root'), cfg.get('password'), cfg.get('key_file')


def run(ssh, cmd, timeout=300):
    print(f"$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='ignore')
    err = stderr.read().decode(errors='ignore')
    if err.strip():
        print(err.strip())
    if out.strip():
        print(out.strip())
    return out, err


def main():
    host, user, password, key_file = load_target()
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    try:
        # Set env vars
        run(ssh, f"touch {REMOTE_ROOT}/.env && chmod 600 {REMOTE_ROOT}/.env")
        run(ssh, f"sed -i '/^DIGIKEY_API_BASE=.*/d' {REMOTE_ROOT}/.env || true")
        run(ssh, f"bash -lc 'echo DIGIKEY_API_BASE=https://api.digikey.com >> {REMOTE_ROOT}/.env'")
        # Keep existing SOCKS proxy set by setup_warp_proxy.py (DIGIKEY_OUTBOUND_PROXY)
        run(ssh, f"grep -E 'DIGIKEY_OUTBOUND_PROXY|DIGIKEY_API_BASE' {REMOTE_ROOT}/.env || true")

        # Ensure npm deps (including undici-proxy-agent)
        run(ssh, f"cd {REMOTE_ROOT} && npm --version || true")
        run(ssh, f"cd {REMOTE_ROOT} && npm install --omit=dev")

        # Restart app
        restarted = False
        for svc in ("deep-aggregator", "deep-agg"):
            run(ssh, f"systemctl stop {svc} || true")
        for svc in ("deep-aggregator", "deep-agg"):
            out, _ = run(ssh, f"systemctl status {svc} 2>/dev/null | head -n1 || true")
            if "Loaded:" in out:
                run(ssh, f"systemctl start {svc}")
                restarted = True
                break
        if not restarted:
            out, _ = run(ssh, "which pm2 || true")
            if out.strip():
                run(ssh, f"cd {REMOTE_ROOT} && pm2 startOrRestart ecosystem.config.cjs --only deep-agg || pm2 start ecosystem.config.cjs --only deep-agg")
                restarted = True
        if not restarted:
            run(ssh, f"mkdir -p {REMOTE_ROOT} {REMOTE_ROOT}/logs")
            run(ssh, f"pkill -f 'node server.js' || true")
            run(ssh, f"cd {REMOTE_ROOT} && [ -f run.pid ] && kill -9 $(cat run.pid) 2>/dev/null || true")
            run(ssh, "node -v || true")
            run(ssh, f"cd {REMOTE_ROOT} && nohup env PORT=9201 NODE_ENV=production node server.js > logs/out.log 2> logs/err.log < /dev/null & echo $! > run.pid")

        # Smoke: look for proxy log and run endpoints
        run(ssh, f"sleep 1 && tail -n 50 {REMOTE_ROOT}/logs/out.log 2>/dev/null | grep -i digikey || true")
        base = 'http://localhost:9201'
        run(ssh, f"echo HEALTH: && curl -s -o /dev/null -w '%{{http_code}}\\n' {base}/api/health && curl -s {base}/api/health | head -c 200")
        run(ssh, f"echo SELFTEST: && curl -s -o /dev/null -w '%{{http_code}}\\n' {base}/api/digikey/selftest && curl -s {base}/api/digikey/selftest | head -c 400")
        run(ssh, f"echo KEYWORD: && curl -s -o /dev/null -w '%{{http_code}}\\n' '{base}/api/digikey/keyword?q=M83513/19-E01NW' && curl -s '{base}/api/digikey/keyword?q=M83513/19-E01NW' | head -c 400")
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"ERR: {e}")
        sys.exit(1)
