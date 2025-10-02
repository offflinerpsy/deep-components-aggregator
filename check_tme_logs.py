import paramiko

KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect('5.129.228.88', username='root', pkey=key)

stdin, stdout, stderr = client.exec_command('tail -200 /opt/deep-agg/server.log | grep -A5 -B5 TME')
print(stdout.read().decode())
client.close()
