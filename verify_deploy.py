import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
HOST = '5.129.228.88'
USER = 'root'
KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect(HOST, username=USER, pkey=key)

# Check file modification time
stdin, stdout, stderr = client.exec_command('ls -la /opt/deep-agg/public/scripts/product-page.js')
print("File info:")
print(stdout.read().decode())

# Check first 20 lines of the file to see if it has new code
stdin, stdout, stderr = client.exec_command('head -30 /opt/deep-agg/public/scripts/product-page.js')
print("\nFirst 30 lines:")
print(stdout.read().decode())

# Check for the new URL pattern
stdin, stdout, stderr = client.exec_command('grep "mpn=" /opt/deep-agg/public/scripts/product-page.js')
print("\nGrep 'mpn=':")
print(stdout.read().decode())

client.close()
