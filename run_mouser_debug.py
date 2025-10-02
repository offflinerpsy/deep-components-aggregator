import paramiko
import sys

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
HOST = '5.129.228.88'
USER = 'root'
KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect(HOST, username=USER, pkey=key)

# Upload debug script
print("📤 Uploading debug script...")
sftp = client.open_sftp()
sftp.put('debug-mouser-raw.mjs', '/opt/deep-agg/debug-mouser-raw.mjs')
sftp.close()
print("✅ Uploaded\n")

# Run it
print("🔍 Running Mouser API debug...\n")
stdin, stdout, stderr = client.exec_command('cd /opt/deep-agg && node debug-mouser-raw.mjs')
output = stdout.read().decode()
errors = stderr.read().decode()

print(output)
if errors:
    print("ERRORS:", errors)

client.close()
