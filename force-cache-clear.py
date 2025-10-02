import paramiko
import time

print("🔥 Force cache clear and re-fetch\n")

KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect("5.129.228.88", username="root", pkey=key)

# Stop server
print("🛑 Stopping server...")
client.exec_command("pkill -9 -f 'node.*server.js'")
time.sleep(2)

# Delete ALL caches
print("🗑️  Deleting ALL caches...")
stdin, stdout, stderr = client.exec_command("cd /opt/deep-agg && rm -f cache.db cache.json *.db")
print(stdout.read().decode())
time.sleep(1)

# Start server
print("🚀 Starting server...")
client.exec_command("cd /opt/deep-agg && nohup node server.js > server.log 2>&1 &")
time.sleep(5)

# Check status
stdin, stdout, stderr = client.exec_command("ps aux | grep 'node.*server.js' | grep -v grep")
if stdout.read().decode():
    print("✅ Server running!\n")
else:
    print("❌ Server not running!\n")
    stdin, stdout, stderr = client.exec_command("tail -30 /opt/deep-agg/server.log")
    print(stdout.read().decode())
    client.close()
    exit(1)

# Wait for warmup
time.sleep(3)

# Force fresh API call
print("🧪 Fetching fresh data from Mouser API...")
stdin, stdout, stderr = client.exec_command("""
curl -s 'http://localhost:9201/api/product?src=mouser&id=M83513/19-E01NW' | python3 -c '
import sys, json
data = json.load(sys.stdin)
specs = data.get("product", {}).get("technical_specs", {})
print("\\n📋 Technical Specs Count:", len(specs))
print("\\n📋 Technical Specs:")
for k, v in specs.items():
    print(f"  • {k}: {v}")
'
""")
print(stdout.read().decode())

client.close()

print("\n✅ Done! Refresh page: http://5.129.228.88:9201/product.html?mpn=M83513/19-E01NW")
