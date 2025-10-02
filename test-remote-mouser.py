import paramiko

print("Uploading test-mouser-api.mjs...")

KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect("5.129.228.88", username="root", pkey=key)

# Upload file
sftp = client.open_sftp()
sftp.put("test-mouser-api.mjs", "/opt/deep-agg/test-mouser-api.mjs")
sftp.close()

print("✅ Uploaded!")

# Run test
print("\nRunning test on server...")
stdin, stdout, stderr = client.exec_command("cd /opt/deep-agg && node test-mouser-api.mjs")
output = stdout.read().decode()
error = stderr.read().decode()

print(output)
if error:
    print("STDERR:", error)

client.close()
