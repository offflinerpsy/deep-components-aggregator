#!/usr/bin/env python3
"""Debug Cloudflare WARP (wgcf) + wireproxy on the remote server.

Steps:
- Print systemd logs for wireproxy
- Validate wireproxy config (-n)
- Run wireproxy in foreground for 5s to capture immediate error
- Show wgcf trace and attempt a raw digikey token request via curl with SOCKS5 if proxy is up
"""

import json
import sys
import time
import paramiko

CONFIG_PATH = '.secrets-for-deploy/target.json'


def load_target():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        cfg = json.load(f)
    return cfg['host'], cfg.get('user', 'root'), cfg.get('password'), cfg.get('key_file')


def run(ssh, cmd, timeout=120):
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
    print(f"=== DEBUG WARP/WIREPROXY on {host} ===")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    try:
        run(ssh, "systemctl status --no-pager wireproxy | sed -n '1,50p' || true")
        run(ssh, "journalctl -u wireproxy -n 200 --no-pager || true")
        run(ssh, "/usr/local/bin/wireproxy -c /etc/wireproxy/wireproxy.conf -n || true")
        # foreground run with short timeout using timeout(1)
        run(ssh, "timeout 7 /usr/local/bin/wireproxy -c /etc/wireproxy/wireproxy.conf || true", timeout=20)
        # wgcf trace
        run(ssh, "/usr/local/bin/wgcf trace || true")
        # Check if SOCKS is listening
        run(ssh, "ss -ltnp | grep 25344 || true")
        # If listening, try curl via socks5 to token endpoint (just headers)
        run(ssh, "curl -sS -x socks5h://127.0.0.1:25344 -o /dev/null -w '%{http_code} %{remote_ip}\n' https://api.digikey.com/v1/oauth2/token || true")
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"ERR: {e}")
        sys.exit(1)
