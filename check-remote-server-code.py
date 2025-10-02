import paramiko

KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect("5.129.228.88", username="root", pkey=key)

print("Checking server.js on remote server...\n")

stdin, stdout, stderr = client.exec_command("grep -A 50 'if (src === .mouser' /opt/deep-agg/server.js | head -80")
print(stdout.read().decode())

client.close()
