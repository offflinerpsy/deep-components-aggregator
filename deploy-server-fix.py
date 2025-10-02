import paramiko

print("🚀 Deploying server.js + clearing cache...")

KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect("5.129.228.88", username="root", pkey=key)

sftp = client.open_sftp()

# Upload server.js
print("\n📤 Uploading server.js...")
sftp.put("server.js", "/opt/deep-agg/server.js")
print("✅ server.js uploaded!")

sftp.close()

# Clear cache database
print("\n🗑️  Clearing product cache...")
stdin, stdout, stderr = client.exec_command("cd /opt/deep-agg && rm -f cache.db")
print(stdout.read().decode())

# Restart server
print("\n🔄 Restarting server...")
stdin, stdout, stderr = client.exec_command("cd /opt/deep-agg && pkill -f 'node.*server.js' && nohup node server.js > server.log 2>&1 & sleep 2 && echo 'Server restarted!'")
output = stdout.read().decode()
print(output)

# Test new API response
print("\n🧪 Testing product API...")
stdin, stdout, stderr = client.exec_command("sleep 3 && curl -s 'http://localhost:9201/api/product?src=mouser&id=M83513/19-E01NW' | head -100")
output = stdout.read().decode()
print(output[:2000])

client.close()

print("\n\n✅ Done! Check: http://5.129.228.88:9201/product.html?mpn=M83513/19-E01NW")
print("Press Ctrl+F5 to refresh!")
