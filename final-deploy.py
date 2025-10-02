import paramiko
import time

print("🚀 Final deploy: server.js with full Mouser fields\n")

KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect("5.129.228.88", username="root", pkey=key)

sftp = client.open_sftp()

# Upload fixed server.js
print("📤 Uploading server.js...")
sftp.put("server.js", "/opt/deep-agg/server.js")
print("✅ Uploaded!\n")

# Upload fixed TME client too (for future)
print("📤 Uploading TME client fix...")
sftp.put("src/integrations/tme/client.mjs", "/opt/deep-agg/src/integrations/tme/client.mjs")
print("✅ Uploaded!\n")

sftp.close()

# Stop old server
print("🛑 Stopping old server...")
client.exec_command("pkill -9 -f 'node.*server.js'")
time.sleep(2)

# Delete cache
print("🗑️  Deleting cache...")
client.exec_command("rm -f /opt/deep-agg/cache.db")
time.sleep(1)

# Start new server
print("🚀 Starting server...")
client.exec_command("cd /opt/deep-agg && nohup node server.js > server.log 2>&1 &")
time.sleep(5)

# Check if started
print("\n📊 Checking server status...")
stdin, stdout, stderr = client.exec_command("ps aux | grep 'node.*server.js' | grep -v grep")
ps_output = stdout.read().decode()

if ps_output:
    print("✅ Server is running!")
    print(ps_output)
else:
    print("❌ Server not running! Checking logs...")
    stdin, stdout, stderr = client.exec_command("tail -50 /opt/deep-agg/server.log")
    print(stdout.read().decode())

# Test API
print("\n🧪 Testing product API...")
stdin, stdout, stderr = client.exec_command("curl -s 'http://localhost:9201/api/product?src=mouser&id=M83513/19-E01NW' | python3 -m json.tool | head -100")
api_output = stdout.read().decode()
print(api_output)

client.close()

print("\n\n✅ DONE!")
print("🌐 Check: http://5.129.228.88:9201/product.html?mpn=M83513/19-E01NW")
print("Press Ctrl+F5 to refresh with cleared cache!")
