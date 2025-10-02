#!/usr/bin/env python3
"""
Simple deployment script for Deep Components Aggregator
Deploys to Debian server via SSH
"""
import subprocess
import sys
import os

# Configuration
SERVER = "89.104.69.77"
USER = "root"
PASSWORD = "DCIIcWfISxT3R4hT"
REMOTE_DIR = "/opt/deep-agg"

def run_ssh_command(command):
    """Execute command on remote server"""
    full_cmd = f'plink.exe -ssh {USER}@{SERVER} -pw {PASSWORD} "{command}"'
    print(f"Running: {command[:50]}...")
    result = subprocess.run(full_cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
    return result

def main():
    print("🚀 Starting deployment to Debian server...")
    
    # Step 1: Create archive
    print("\n📦 Creating archive...")
    subprocess.run([
        "tar", 
        "--exclude=node_modules",
        "--exclude=.git", 
        "--exclude=data/cache",
        "--exclude=var/db",
        "-czf", "deploy.tar.gz", 
        "."
    ], check=True)
    
    # Step 2: Copy archive to server using pscp
    print("\n📤 Uploading to server...")
    subprocess.run([
        "pscp.exe",
        "-pw", PASSWORD,
        "deploy.tar.gz",
        f"{USER}@{SERVER}:/tmp/deploy.tar.gz"
    ], check=True)
    
    # Step 3: Deploy on server
    print("\n🔧 Deploying on server...")
    
    commands = f"""
cd /opt
rm -rf deep-agg-old
mv deep-agg deep-agg-old || true
mkdir -p deep-agg
cd deep-agg
tar -xzf /tmp/deploy.tar.gz
rm /tmp/deploy.tar.gz

mkdir -p var/db data logs

cat > .env << 'EOF'
MOUSER_API_KEY=b1ade04e-2dd0-4bd9-b5b4-e51f252a0687
FARNELL_API_KEY=9bbb8z5zuutmrscx72fukhvr
FARNELL_REGION=uk.farnell.com
PORT=9201
DATA_DIR=./var
EOF

npm install --production

pkill -f 'node server.js' || true
sleep 2

nohup node server.js > logs/server.log 2>&1 &

sleep 3

if curl -s http://localhost:9201/api/health > /dev/null; then
    echo "✅ Server started successfully!"
    curl http://localhost:9201/api/health
else
    echo "❌ Server failed to start!"
    tail -n 50 logs/server.log
    exit 1
fi
"""
    
    run_ssh_command(commands)
    
    # Step 4: Cleanup
    print("\n🧹 Cleaning up...")
    os.remove("deploy.tar.gz")
    
    print("\n✅ Deployment complete!")
    print(f"🌐 URL: http://{SERVER}:9201")
    print(f"📡 API: http://{SERVER}:9201/api/health")
    print(f"🔍 Search: http://{SERVER}:9201/?q=LM317")

if __name__ == "__main__":
    main()
