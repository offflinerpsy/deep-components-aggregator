#!/usr/bin/env python3
import json
import paramiko

CONFIG_PATH = '.secrets-for-deploy/target.json'
REMOTE_ROOT = '/opt/deep-agg'


def load_target():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        cfg = json.load(f)
    return cfg['host'], cfg.get('user', 'root'), cfg.get('password'), cfg.get('key_file')


def run(ssh, cmd):
    print(f"$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
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
        # Reinstall wireproxy via go (pufferffish version known working)
        run(ssh, "systemctl stop wireproxy || true")
        run(ssh, "GOBIN=/usr/local/bin go install github.com/pufferffish/wireproxy/cmd/wireproxy@v1.0.9")
        run(ssh, "/usr/local/bin/wireproxy -v || true")
        run(ssh, "systemctl start wireproxy && sleep 1 && systemctl status --no-pager wireproxy | sed -n '1,25p'")
        run(ssh, "ss -ltnp | egrep '25344|25345' || true")

        # Fix env: use socks5, clear API_BASE overrides
        run(ssh, f"touch {REMOTE_ROOT}/.env && chmod 600 {REMOTE_ROOT}/.env")
        run(ssh, f"sed -i '/^DIGIKEY_OUTBOUND_PROXY=.*/d' {REMOTE_ROOT}/.env || true")
        run(ssh, f"bash -lc 'echo DIGIKEY_OUTBOUND_PROXY=socks5://127.0.0.1:25344 >> {REMOTE_ROOT}/.env'")
        run(ssh, f"sed -i '/^DIGIKEY_API_BASE=.*/d' {REMOTE_ROOT}/.env || true")
        run(ssh, f"grep -E 'DIGIKEY_(OUTBOUND_PROXY|API_BASE)' {REMOTE_ROOT}/.env || true")

        # Restart our app
        run(ssh, "pkill -f 'node server.js' || true")
        run(ssh, f"cd {REMOTE_ROOT} && nohup env PORT=9201 NODE_ENV=production node server.js > logs/out.log 2> logs/err.log < /dev/null & echo $! > run.pid")
        run(ssh, "sleep 1")

        # Verify proxy egress and Digi-Key self-tests
        run(ssh, "echo '--- CF trace via SOCKS5 ---' && curl -sS --socks5 127.0.0.1:25344 https://www.cloudflare.com/cdn-cgi/trace | egrep 'warp=|ip=' || true")
        base = 'http://localhost:9201'
        run(ssh, f"echo SELFTEST && curl -sS --max-time 25 -o /dev/null -w '%{{http_code}}\\n' {base}/api/digikey/selftest && curl -sS --max-time 25 {base}/api/digikey/selftest | head -c 400")
        run(ssh, f"echo KEYWORD && curl -sS --max-time 25 -o /dev/null -w '%{{http_code}}\\n' '{base}/api/digikey/keyword?q=M83513/19-E01NW' && curl -sS --max-time 25 '{base}/api/digikey/keyword?q=M83513/19-E01NW' | head -c 400")
    finally:
        ssh.close()


if __name__ == '__main__':
    main()
