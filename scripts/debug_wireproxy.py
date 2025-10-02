#!/usr/bin/env python3
"""Debug wireproxy/WARP on remote server.

Actions:
- Show /dev/net/tun availability
- Show wireproxy service logs
- Validate wireproxy config (-n)
- Try running wireproxy in foreground briefly
- Check DNS for engage.cloudflareclient.com
- Show wgcf trace
- Re-run Digi-Key self-tests
"""

import json
import sys
import time
import paramiko

CONFIG_PATH = '.secrets-for-deploy/target.json'
REMOTE_ROOT = '/opt/deep-agg'


def load_target():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        cfg = json.load(f)
    return cfg['host'], cfg.get('user', 'root'), cfg.get('password'), cfg.get('key_file')


def run(ssh, cmd, timeout=60):
    print(f"$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='ignore')
    err = stderr.read().decode(errors='ignore')
    if out.strip():
        print(out.strip())
    if err.strip():
        print('[stderr]' + err.strip())
    return out, err


def main():
    host, user, password, key_file = load_target()
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    try:
        run(ssh, "test -c /dev/net/tun && echo 'TUN: yes' || echo 'TUN: no'")
        run(ssh, "systemctl status --no-pager wireproxy | sed -n '1,40p' || true")
        run(ssh, "journalctl -u wireproxy -n 100 --no-pager || true", timeout=120)
        run(ssh, "/usr/local/bin/wireproxy -n -c /etc/wireproxy/wireproxy.conf || true")
        # Foreground run for 5s
        run(ssh, "timeout 6 /usr/local/bin/wireproxy -c /etc/wireproxy/wireproxy.conf -i 127.0.0.1:9080 || true", timeout=15)
        run(ssh, "ss -ltnp | grep 25344 || true")
        run(ssh, "getent hosts engage.cloudflareclient.com || true")
        run(ssh, "/usr/local/bin/wgcf trace | tail -n 6 || true")
        base = 'http://localhost:9201'
        run(ssh, f"echo SELFTEST && curl -sS --max-time 20 -o /dev/null -w '%{{http_code}}\\n' {base}/api/digikey/selftest && curl -sS --max-time 20 {base}/api/digikey/selftest | head -c 400")
        run(ssh, f"echo KEYWORD && curl -sS --max-time 20 -o /dev/null -w '%{{http_code}}\\n' '{base}/api/digikey/keyword?q=M83513/19-E01NW' && curl -sS --max-time 20 '{base}/api/digikey/keyword?q=M83513/19-E01NW' | head -c 400")
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERR: {exc}")
        sys.exit(1)
