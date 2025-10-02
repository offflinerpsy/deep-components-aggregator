#!/usr/bin/env python3
"""
Simple deploy using scp/ssh commands (no paramiko bullshit)
"""

import subprocess
import sys

SERVER = "root@37.60.243.19"
KEY = "deploy_key"

print("🚀 Deploying to Amsterdam server...")
print("")

# 1. Upload fixed files
files_to_upload = [
    ("src/integrations/digikey/client.mjs", "/root/aggregator/src/integrations/digikey/"),
    ("src/integrations/tme/client.mjs", "/root/aggregator/src/integrations/tme/"),
    ("src/integrations/farnell/client.mjs", "/root/aggregator/src/integrations/farnell/"),
    (".env", "/root/aggregator/")
]

for local, remote_dir in files_to_upload:
    print(f"📤 Uploading {local}...")
    subprocess.run([
        "scp", "-i", KEY, "-o", "StrictHostKeyChecking=no",
        local, f"{SERVER}:{remote_dir}"
    ], check=True)

print("")
print("✅ Files uploaded")
print("")
print("🔄 Restarting server...")
print("")

# 2. Restart server
subprocess.run([
    "ssh", "-i", KEY, "-o", "StrictHostKeyChecking=no",
    SERVER,
    "cd /root/aggregator && pm2 restart server"
], check=True)

print("")
print("✅ Server restarted")
print("")
print("🧪 Testing APIs...")
print("")

# 3. Test APIs
test_cmd = """
curl -s 'http://localhost:9201/api/search?q=M83513/19-E01NW' | head -c 500
"""

subprocess.run([
    "ssh", "-i", KEY, "-o", "StrictHostKeyChecking=no",
    SERVER,
    test_cmd
])

print("")
print("")
print("🎉 DONE!")
