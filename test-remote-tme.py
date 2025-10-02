import paramiko

print("Testing TME API on server...")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
HOST = '5.129.228.88'
USER = 'root'
KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect(HOST, username=USER, pkey=key)

sftp = client.open_sftp()
sftp.put("test-tme-api.mjs", "/opt/deep-agg/test-tme-api.mjs")
sftp.close()

print("✅ Uploaded test-tme-api.mjs\n")

stdin, stdout, stderr = client.exec_command("cd /opt/deep-agg && node test-tme-api.mjs")
output = stdout.read().decode()
error = stderr.read().decode()

print(output)
if error:
    print("STDERR:", error)

client.close()
