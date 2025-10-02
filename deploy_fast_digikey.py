#!/usr/bin/env python3
"""
Fast deploy only Digi-Key related changes without full install.
- Uploads changed files (server.js, src/integrations/digikey/**/*)
- Restarts app via systemd/PM2, or falls back to nohup
- Runs quick smoke tests for Digi-Key endpoints

Reads connection settings from .secrets-for-deploy/target.json
Supports password or key_file auth.
"""

import os
import json
import sys
import paramiko
import time

CONFIG_PATH = ".secrets-for-deploy/target.json"
REMOTE_ROOT = "/opt/deep-agg"
FILES = [
    ("server.js", f"{REMOTE_ROOT}/server.js"),
    ("src/integrations/digikey/client.mjs", f"{REMOTE_ROOT}/src/integrations/digikey/client.mjs"),
    ("src/integrations/digikey/normalize.mjs", f"{REMOTE_ROOT}/src/integrations/digikey/normalize.mjs"),
    ("src/integrations/tme/client.mjs", f"{REMOTE_ROOT}/src/integrations/tme/client.mjs"),
    ("src/integrations/farnell/client.mjs", f"{REMOTE_ROOT}/src/integrations/farnell/client.mjs"),
    ("src/utils/mergeProductData.mjs", f"{REMOTE_ROOT}/src/utils/mergeProductData.mjs"),
]

# Optional Cloudflare Worker proxy to bypass Digi-Key geo/IP blocks
WORKER_FALLBACK = os.environ.get('DIGIKEY_WORKER_BASE', 'https://deep-agg.offflinerpsy.workers.dev/digikey')


def load_target():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        cfg = json.load(f)
    host = cfg.get('host')
    user = cfg.get('user', 'root')
    password = cfg.get('password')
    key_file = cfg.get('key_file')
    if not host:
        raise RuntimeError("target.json: host is required")
    return host, user, password, key_file


def ensure_dirs(sftp, remote_path):
    parts = remote_path.strip('/').split('/')
    cur = ''
    for p in parts[:-1]:
        cur = cur + '/' + p if cur else '/' + p
        try:
            sftp.stat(cur)
        except FileNotFoundError:
            sftp.mkdir(cur)


def upload_files(ssh):
    sftp = ssh.open_sftp()
    try:
        for local, remote in FILES:
            if not os.path.exists(local):
                print(f"WARN: local not found: {local}")
                continue
            print(f"Upload {local} -> {remote}")
            ensure_dirs(sftp, remote)
            sftp.put(local, remote)
    finally:
        sftp.close()


def run(ssh, cmd, timeout=60):
    print(f"$ {cmd}")
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd)
        channel = stdout.channel
        end_time = time.time() + timeout
        out_chunks = []
        err_chunks = []

        while True:
            if channel.recv_ready():
                out_chunks.append(channel.recv(4096))
            if channel.recv_stderr_ready():
                err_chunks.append(channel.recv_stderr(4096))
            if channel.exit_status_ready():
                break
            if time.time() > end_time:
                channel.close()
                raise TimeoutError(f"command timeout after {timeout}s")
            time.sleep(0.2)

        while channel.recv_ready():
            out_chunks.append(channel.recv(4096))
        while channel.recv_stderr_ready():
            err_chunks.append(channel.recv_stderr(4096))

        out = b"".join(out_chunks).decode(errors='ignore')
        err = b"".join(err_chunks).decode(errors='ignore')
    except TimeoutError as exc:
        print(f"CMD TIMEOUT: {exc}")
        return "", str(exc)
    except Exception as exc:
        print(f"CMD ERROR: {exc}")
        return "", str(exc)

    if err.strip():
        print(err.strip())
    if out.strip():
        print(out.strip())
    return out, err


def try_systemd(ssh):
    for svc in ("deep-aggregator", "deep-agg"):
        run(ssh, f"systemctl stop {svc} || true")
    # Start the first existing
    for svc in ("deep-aggregator", "deep-agg"):
        out, _ = run(ssh, f"systemctl status {svc} 2>/dev/null | head -n1 || true")
        if "Loaded:" in out:
            run(ssh, f"systemctl start {svc}")
            out2, _ = run(ssh, f"sleep 1 && systemctl is-active {svc}")
            return "active" in out2
    return False


def try_pm2(ssh):
    out, _ = run(ssh, "which pm2 || true")
    if not out.strip():
        return False
    run(ssh, f"cd {REMOTE_ROOT} && pm2 startOrRestart ecosystem.config.cjs --only deep-agg || pm2 start ecosystem.config.cjs --only deep-agg")
    out2, _ = run(ssh, "sleep 1 && pm2 status deep-agg || true")
    return "online" in out2 or "up" in out2


def start_with_nohup(ssh):
    run(ssh, f"mkdir -p {REMOTE_ROOT} {REMOTE_ROOT}/logs")
    # Kill any existing node server.js in app dir
    run(ssh, f"pkill -f 'node server.js' || true")
    run(ssh, f"cd {REMOTE_ROOT} && [ -f run.pid ] && kill -9 $(cat run.pid) 2>/dev/null || true")
    out, _ = run(ssh, "node -v || true")
    if not out.strip():
        print("ERR: node is not installed on server or not in PATH")
        return False
    run(ssh, f"cd {REMOTE_ROOT} && nohup env PORT=9201 NODE_ENV=production node server.js > logs/out.log 2> logs/err.log < /dev/null & echo $! > run.pid")
    run(ssh, "sleep 1")
    return True

def set_remote_env(ssh, key, value):
    # Ensure .env exists
    run(ssh, f"touch {REMOTE_ROOT}/.env && chmod 600 {REMOTE_ROOT}/.env")
    # Remove existing line and append new one
    run(ssh, f"sed -i '/^{key}=.*/d' {REMOTE_ROOT}/.env || true")
    run(ssh, f"bash -lc 'echo {key}={value} >> {REMOTE_ROOT}/.env'")

def read_remote_file(ssh, path, max_bytes=2000):
    sftp = ssh.open_sftp()
    try:
        with sftp.open(path, 'r') as f:
            return f.read(max_bytes).decode(errors='ignore')
    except Exception:
        return ''
    finally:
        sftp.close()

def main():
    try:
        host, user, password, key_file = load_target()
    except Exception as e:
        print(f"ERR: cannot read {CONFIG_PATH}: {e}")
        sys.exit(1)

    print(f"=== FAST DEPLOY to {host} ===")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        if password:
            ssh.connect(host, username=user, password=password, look_for_keys=False)
        else:
            ssh.connect(host, username=user, key_filename=key_file)
    except Exception as e:
        print(f"ERR: SSH connect failed: {e}")
        sys.exit(1)

    try:
        # Upload only Digi-Key related files (and server.js)
        upload_files(ssh)
        # Verify remote has Digi-Key routes
        print("=== Verify remote server.js ===")
        run(ssh, f"sed -n '1,80p' {REMOTE_ROOT}/server.js | head -n 5")
        run(ssh, f"grep -n \"/api/digikey\" {REMOTE_ROOT}/server.js || true")
        run(ssh, f"grep -h '^DIGIKEY_API_BASE' {REMOTE_ROOT}/.env 2>/dev/null || echo 'DIGIKEY_API_BASE not set'")

        # Start app
        started = try_systemd(ssh) or try_pm2(ssh)
        if not started:
            print("Systemd/PM2 not available, using nohup...")
            if not start_with_nohup(ssh):
                sys.exit(2)

        # Smoke tests
        print("=== Smoke tests ===")
        # Show running node processes and listeners
        run(ssh, "echo '--- ps node ---' && ps aux | grep node | grep -v grep || true")
        run(ssh, "echo '--- listen 9201 ---' && ss -ltnp | grep 9201 || true")
        out80, _ = run(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost/api/health || true")
        base = 'http://localhost' if out80.strip() == '200' else 'http://localhost:9201'
        print(f"BASE: {base}")
        run(ssh, f"echo HEALTH: && curl --max-time 15 -s -o /dev/null -w '%{{http_code}}\\n' {base}/api/health && curl --max-time 15 -s {base}/api/health | head -c 300")
        code1, _ = run(ssh, f"curl --max-time 15 -s -o /dev/null -w '%{{http_code}}' {base}/api/digikey/selftest || true")
        run(ssh, f"echo SELFTEST body: && curl --max-time 15 -s {base}/api/digikey/selftest | head -c 400")
        code2, _ = run(ssh, f"curl --max-time 15 -s -o /dev/null -w '%{{http_code}}' '{base}/api/digikey/keyword?q=M83513/19-E01NW' || true")
        run(ssh, f"echo KEYWORD body: && curl --max-time 15 -s '{base}/api/digikey/keyword?q=M83513/19-E01NW' | head -c 400")

        # If Digi-Key fails, first try SANDBOX API base, then Cloudflare Worker
        blocked = (code1.strip() != '200' and code2.strip() != '200')
        if blocked:
            print("=== Detected Digi-Key failure; trying SANDBOX base ===")
            current_env = read_remote_file(ssh, f"{REMOTE_ROOT}/.env")
            print(".env before:\n" + (current_env or '(empty)'))
            sandbox_base = 'https://sandbox-api.digikey.com'
            set_remote_env(ssh, 'DIGIKEY_API_BASE', sandbox_base)
            print(f"Set DIGIKEY_API_BASE={sandbox_base}")

            # Restart app
            if not try_systemd(ssh) and not try_pm2(ssh):
                print("Restart via nohup...")
                start_with_nohup(ssh)
            run(ssh, "sleep 1")

            # Retry smoke once
            code1b, _ = run(ssh, f"curl --max-time 20 -s -o /dev/null -w '%{{http_code}}' {base}/api/digikey/selftest || true")
            run(ssh, f"echo RETRY_SELFTEST_SANDBOX && curl --max-time 20 -s {base}/api/digikey/selftest | head -c 400")
            code2b, _ = run(ssh, f"curl --max-time 20 -s -o /dev/null -w '%{{http_code}}' '{base}/api/digikey/keyword?q=M83513/19-E01NW' || true")
            run(ssh, f"echo RETRY_KEYWORD_SANDBOX && curl --max-time 20 -s '{base}/api/digikey/keyword?q=M83513/19-E01NW' | head -c 400")

            # If still failing, apply Cloudflare Worker fallback
            if code1b.strip() != '200' and code2b.strip() != '200':
                print("=== SANDBOX also failing; applying Cloudflare Worker fallback ===")
                set_remote_env(ssh, 'DIGIKEY_API_BASE', WORKER_FALLBACK)
                print(f"Set DIGIKEY_API_BASE={WORKER_FALLBACK}")
                if not try_systemd(ssh) and not try_pm2(ssh):
                    print("Restart via nohup...")
                    start_with_nohup(ssh)
                run(ssh, "sleep 1")
                run(ssh, f"echo RETRY_SELFTEST_WORKER && curl --max-time 20 -s -o /dev/null -w '%{{http_code}}\\n' {base}/api/digikey/selftest && curl --max-time 20 -s {base}/api/digikey/selftest | head -c 400")
                run(ssh, f"echo RETRY_KEYWORD_WORKER && curl --max-time 20 -s -o /dev/null -w '%{{http_code}}\\n' '{base}/api/digikey/keyword?q=M83513/19-E01NW' && curl --max-time 20 -s '{base}/api/digikey/keyword?q=M83513/19-E01NW' | head -c 400")
        # Show exact Digi-Key route definitions for sanity
        print("=== Remote Digi-Key routes snippet ===")
        run(ssh, f"sed -n '90,170p' {REMOTE_ROOT}/server.js | sed -n '1,80p'")
        print("=== Last server logs ===")
        run(ssh, f"tail -n 80 {REMOTE_ROOT}/logs/out.log 2>/dev/null || true")
        run(ssh, f"tail -n 80 {REMOTE_ROOT}/logs/err.log 2>/dev/null || true")
    finally:
        ssh.close()

    print("=== DONE ===")


if __name__ == '__main__':
    main()

