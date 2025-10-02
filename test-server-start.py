import paramiko

KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect("5.129.228.88", username="root", pkey=key)

# Try to start and see errors immediately
print("🚀 Starting server and checking for errors...\n")
stdin, stdout, stderr = client.exec_command("cd /opt/deep-agg && node server.js 2>&1 | head -50")
output = stdout.read().decode()
error = stderr.read().decode()

print("STDOUT:")
print(output)
print("\nSTDERR:")
print(error)

client.close()
