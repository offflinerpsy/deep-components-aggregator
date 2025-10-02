import paramiko
import time

KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect("5.129.228.88", username="root", pkey=key)

# Upload
sftp = client.open_sftp()
print("📤 Uploading server.js with debug logging...")
sftp.put("server.js", "/opt/deep-agg/server.js")
sftp.close()
print("✅ Uploaded!\n")

# Restart
print("🔄 Restarting server...")
client.exec_command("pkill -9 -f 'node.*server.js'")
time.sleep(1)
client.exec_command("rm -f /opt/deep-agg/cache.db")
time.sleep(1)
client.exec_command("cd /opt/deep-agg && nohup node server.js > server.log 2>&1 &")
time.sleep(5)

# Test and watch logs
print("🧪 Fetching product (this will trigger logs)...")
client.exec_command("curl -s 'http://localhost:9201/api/product?src=mouser&id=M83513/19-E01NW' > /dev/null")
time.sleep(2)

print("\n📋 Server logs (Mouser RAW data):\n")
stdin, stdout, stderr = client.exec_command("grep 'MOUSER RAW' /opt/deep-agg/server.log | tail -20")
print(stdout.read().decode())

client.close()
