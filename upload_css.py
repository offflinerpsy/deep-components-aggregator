import paramiko
import os

host = "5.129.228.88"
user = "root"
key_file = "deploy_key"

# Create SSH client
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    # Connect
    key = paramiko.RSAKey.from_private_key_file(key_file)
    client.connect(host, username=user, pkey=key)
    
    # Upload product.css
    sftp = client.open_sftp()
    local_file = "public/styles/product.css"
    remote_file = "/opt/deep-agg/public/styles/product.css"
    
    print(f"Uploading {local_file}...")
    sftp.put(local_file, remote_file)
    print("✅ product.css uploaded!")
    
    sftp.close()
    client.close()
    
    print("\n🎉 Done! Refresh page with Ctrl+F5")
    
except Exception as e:
    print(f"❌ Error: {e}")
