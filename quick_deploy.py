#!/usr/bin/env python3
import subprocess
import sys
import time

SERVER = "95.217.134.12"
PASSWORD = "NDZzHCYzPRKWfKRd"

def run_cmd(cmd, timeout=10):
    try:
        result = subprocess.run(cmd, shell=True, timeout=timeout, 
                              capture_output=True, text=True)
        print(f"✅ {cmd[:50]}... -> {result.returncode}")
        if result.stdout:
            print(result.stdout[:200])
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print(f"⏰ Command timed out: {cmd[:50]}...")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("🚀 Quick Deploy Script")
    
    # 1. Test server HTTP
    print("\n📡 Testing server...")
    run_cmd(f"curl -m 5 http://{SERVER}/", 5)
    
    # 2. Copy files with sshpass simulation
    print("\n📦 Copying files...")
    files_to_copy = ["server.js", "package.json"]
    
    for file in files_to_copy:
        cmd = f'echo "{PASSWORD}" | timeout 15 scp -o ConnectTimeout=5 -o StrictHostKeyChecking=no {file} root@{SERVER}:/opt/deep-agg/'
        run_cmd(cmd, 15)
    
    # 3. Run commands via SSH
    print("\n🔧 Running deployment commands...")
    commands = [
        "mkdir -p /opt/deep-agg",
        "cd /opt/deep-agg && pkill -f 'node server.js' || true",
        "cd /opt/deep-agg && npm install --production",
        "cd /opt/deep-agg && nohup node server.js > server.log 2>&1 &",
        "sleep 3",
        "curl -s http://127.0.0.1:9201/api/search?q=LM317"
    ]
    
    for cmd in commands:
        ssh_cmd = f'echo "{PASSWORD}" | timeout 10 ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@{SERVER} "{cmd}"'
        run_cmd(ssh_cmd, 10)
    
    print("\n🎉 Deploy completed!")

if __name__ == "__main__":
    main()
