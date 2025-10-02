#!/usr/bin/env python3
"""
Install Cloudflare WARP (wgcf) + wireproxy on the remote server and expose a local SOCKS5 at 127.0.0.1:25344.
Then set DIGIKEY_OUTBOUND_PROXY to socks5://127.0.0.1:25344 and restart our app.

Assumptions:
- Server is Debian/Ubuntu-like (apt available), root access from .secrets-for-deploy/target.json.
- No interactive prompts allowed.

What it does:
1) Installs deps: curl, wget, jq, wireguard-tools, iproute2, golang
2) Installs wgcf binary to /usr/local/bin (downloads a fixed release), registers account non-interactively
3) Generates WireGuard profile at ~/wgcf-profile.conf
4) Installs wireproxy via `go install` to /usr/local/bin
5) Creates /etc/wireproxy/wireproxy.conf with WGConfig and Socks5 BindAddress
6) Creates and enables systemd service `wireproxy`
7) Sets DIGIKEY_OUTBOUND_PROXY in /opt/deep-agg/.env and restarts our app
8) Runs Digi-Key smoke tests

Note: Using WARP/WireGuard to change egress IP must comply with upstream ToS. Use at your own risk.
"""

import json
import os
import sys
import time
import paramiko

CONFIG_PATH = ".secrets-for-deploy/target.json"
REMOTE_ROOT = "/opt/deep-agg"
SOCKS_ADDR = "127.0.0.1:25344"


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


def run(ssh: paramiko.SSHClient, cmd: str, timeout: int = 120):
    print(f"$ {cmd}")
    try:
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode(errors='ignore')
        err = stderr.read().decode(errors='ignore')
    except Exception as e:
        print(f"CMD ERROR: {e}")
        return "", str(e)
    if err.strip():
        print(err.strip())
    if out.strip():
        print(out.strip())
    return out, err


def main():
    host, user, password, key_file = load_target()
    print(f"=== Setup WARP+WireProxy on {host} ===")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)

    try:
        # 1) Deps
        run(ssh, "apt-get update -y || true")
        run(ssh, "DEBIAN_FRONTEND=noninteractive apt-get install -y curl wget jq wireguard-tools iproute2 golang || true")

        # 2) Install wgcf
        run(ssh, "mkdir -p /usr/local/bin && cd /usr/local/bin && rm -f wgcf && curl -L -o wgcf https://github.com/ViRb3/wgcf/releases/download/v2.2.29/wgcf_2.2.29_linux_amd64 && chmod +x wgcf")
        # 3) Register account + generate profile
        run(ssh, "cd ~ && rm -f wgcf-account.toml wgcf-profile.conf && yes | wgcf register")
        run(ssh, "cd ~ && wgcf generate")
        # Lower MTU to enhance reliability (already 1280 in wgcf)
        run(ssh, "sed -n '1,120p' ~/wgcf-profile.conf | head -n 30")

        # 4) Install wireproxy (maintained fork)
        out, _ = run(ssh, "GOBIN=/usr/local/bin go install github.com/whyvl/wireproxy/cmd/wireproxy@v1.0.9 || true")
        run(ssh, "/usr/local/bin/wireproxy -v || true")
        # Fallback: download prebuilt if not present
        out, _ = run(ssh, "[ -x /usr/local/bin/wireproxy ] && echo ok || echo missing")
        if 'missing' in out:
            run(ssh, "cd /usr/local/bin && curl -L -o wireproxy https://github.com/whyvl/wireproxy/releases/download/v1.0.9/wireproxy_linux_amd64 && chmod +x wireproxy")
            run(ssh, "/usr/local/bin/wireproxy -v || true")

        # 5) Config wireproxy: copy wgcf profile and append proxy sections
        run(ssh, "mkdir -p /etc/wireproxy && chmod 755 /etc/wireproxy")
        run(ssh, "cp -f ~/wgcf-profile.conf /etc/wireproxy/wireproxy.conf")
        run(ssh, 'bash -lc "printf \'\\n[Socks5]\\nBindAddress = 127.0.0.1:25344\\n\\n[http]\\nBindAddress = 127.0.0.1:25345\\n\' >> /etc/wireproxy/wireproxy.conf"')
        run(ssh, "sed -n '1,120p' /etc/wireproxy/wireproxy.conf")

        # 6) Systemd service
        svc = """
[Unit]
Description=WireProxy (WireGuard userspace SOCKS5)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/wireproxy -c /etc/wireproxy/wireproxy.conf
Restart=always
RestartSec=2
User=root

[Install]
WantedBy=multi-user.target
""".strip()
        run(ssh, f"bash -lc 'cat > /etc/systemd/system/wireproxy.service <<\"SVC\"\n{svc}\nSVC' ")
        # Validate config before enabling service
        out_cfg, _ = run(ssh, "/usr/local/bin/wireproxy -n -c /etc/wireproxy/wireproxy.conf", timeout=20)
        if 'error' in out_cfg.lower():
            print("Config test failed; not enabling wireproxy service.")
        else:
            run(ssh, "systemctl daemon-reload && systemctl enable --now wireproxy && sleep 1 && systemctl status --no-pager wireproxy | sed -n '1,20p'")
            # If service failed, dump last logs to understand why
            status, _ = run(ssh, "systemctl is-active wireproxy || true", timeout=10)
            if status.strip() != 'active':
                run(ssh, "journalctl -u wireproxy --no-pager -n 80 || true", timeout=20)

        # 7) Set env for our app
        run(ssh, f"touch {REMOTE_ROOT}/.env && chmod 600 {REMOTE_ROOT}/.env")
        run(ssh, f"sed -i '/^DIGIKEY_OUTBOUND_PROXY=.*/d' {REMOTE_ROOT}/.env || true")
        run(ssh, f"bash -lc 'echo DIGIKEY_OUTBOUND_PROXY=http://127.0.0.1:25345 >> {REMOTE_ROOT}/.env'")

        # 8) Restart our app (try systemd/pm2, fallback to nohup)
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
            # nohup path
            run(ssh, f"mkdir -p {REMOTE_ROOT} {REMOTE_ROOT}/logs")
            run(ssh, f"pkill -f 'node server.js' || true")
            run(ssh, f"cd {REMOTE_ROOT} && [ -f run.pid ] && kill -9 $(cat run.pid) 2>/dev/null || true")
            run(ssh, "node -v || true")
            run(ssh, f"cd {REMOTE_ROOT} && nohup env PORT=9201 NODE_ENV=production node server.js > logs/out.log 2> logs/err.log < /dev/null & echo $! > run.pid")
            run(ssh, "sleep 1")

        # 9) Smoke
        run(ssh, "echo '--- wireproxy listening ---' && ss -ltnp | grep 25344 || true", timeout=10)
        run(ssh, "echo '--- warp trace ---' && /usr/local/bin/wgcf trace | tail -n 5 || true", timeout=20)
        base = 'http://localhost:9201'
        run(ssh, f"echo HEALTH: && curl --max-time 15 -s -o /dev/null -w '%{{http_code}}\\n' {base}/api/health && curl --max-time 15 -s {base}/api/health | head -c 200")
        run(ssh, f"echo SELFTEST: && curl --max-time 30 -s -o /dev/null -w '%{{http_code}}\\n' {base}/api/digikey/selftest && curl --max-time 30 -s {base}/api/digikey/selftest | head -c 400")
        run(ssh, f"echo KEYWORD: && curl --max-time 30 -s -o /dev/null -w '%{{http_code}}\\n' '{base}/api/digikey/keyword?q=M83513/19-E01NW' && curl --max-time 30 -s '{base}/api/digikey/keyword?q=M83513/19-E01NW' | head -c 400")

        print("=== DONE (WARP + wireproxy) ===")
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERR: {exc}")
        sys.exit(1)
