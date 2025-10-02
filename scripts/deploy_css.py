#!/usr/bin/env python3
"""
Deploy only CSS changes.
"""

import json
import sys
import paramiko

CONFIG_PATH = ".secrets-for-deploy/target.json"
REMOTE_ROOT = "/opt/deep-agg"
FILES = [
    ("public/styles/product.css", f"{REMOTE_ROOT}/public/styles/product.css"),
]

def load_target():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        cfg = json.load(f)
    return cfg['host'], cfg.get('user', 'root'), cfg.get('password'), cfg.get('key_file')


def ensure_dirs(sftp, remote_path):
    parts = remote_path.strip('/').split('/')
    cur = ''
    for p in parts[:-1]:
        cur = cur + '/' + p if cur else '/' + p
        try:
            sftp.stat(cur)
        except FileNotFoundError:
            sftp.mkdir(cur)


def main():
    host, user, password, key_file = load_target()
    print(f"=== Deploy CSS to {host} ===")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, key_filename=key_file, look_for_keys=False)
    
    try:
        sftp = ssh.open_sftp()
        for local, remote in FILES:
            print(f"Upload {local} -> {remote}")
            ensure_dirs(sftp, remote)
            sftp.put(local, remote)
        sftp.close()
        
        print("\n✅ CSS deployed!")
        print("Refresh browser with Ctrl+Shift+R to see changes")
        
    finally:
        ssh.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}")
        sys.exit(1)
