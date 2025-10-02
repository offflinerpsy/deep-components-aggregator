#!/usr/bin/env python3
import json
import paramiko

CONFIG_PATH = '.secrets-for-deploy/target.json'


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
        run(ssh, "systemctl stop wireproxy || true")
        run(ssh, "cd /usr/local/bin && curl -L -o wireproxy https://github.com/whyvl/wireproxy/releases/download/v1.0.9/wireproxy_linux_amd64 && chmod +x wireproxy")
        run(ssh, "/usr/local/bin/wireproxy -v || true")
        run(ssh, "systemctl start wireproxy && sleep 1 && systemctl status --no-pager wireproxy | sed -n '1,20p'")
        run(ssh, "ss -ltnp | egrep '25344|25345' || true")
        # Verify proxy egress to Cloudflare trace
        run(ssh, "curl -sS -x http://127.0.0.1:25345 https://www.cloudflare.com/cdn-cgi/trace | egrep 'warp=|ip=' || true")
    finally:
        ssh.close()


if __name__ == '__main__':
    main()
