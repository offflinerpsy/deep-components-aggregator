import paramiko

KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect('5.129.228.88', username='root', pkey=key)

# Check HTML for element IDs
stdin, stdout, stderr = client.exec_command('grep -n "specsList\\|mainImageContainer" /opt/deep-agg/public/product.html')
print("HTML elements:")
print(stdout.read().decode())

# Check script tag version
stdin, stdout, stderr = client.exec_command('grep "product-page.js" /opt/deep-agg/public/product.html')
print("\nScript tag:")
print(stdout.read().decode())

client.close()
