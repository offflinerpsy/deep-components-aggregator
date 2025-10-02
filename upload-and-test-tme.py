import paramiko

print("Uploading fixed TME client + test...")

KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect("5.129.228.88", username="root", pkey=key)

sftp = client.open_sftp()
sftp.put("src/integrations/tme/client.mjs", "/opt/deep-agg/src/integrations/tme/client.mjs")
sftp.put("test-tme-api.mjs", "/opt/deep-agg/test-tme-api.mjs")
sftp.close()

print("✅ Uploaded!\n")

stdin, stdout, stderr = client.exec_command("cd /opt/deep-agg && node test-tme-api.mjs 2>&1")
output = stdout.read().decode()

print(output)

client.close()
