import paramiko
import time

print("📚 Downloading full API documentation from remote server...\n")

KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect("5.129.228.88", username="root", pkey=key)

# Upload script
sftp = client.open_sftp()
print("📤 Uploading download script...")
sftp.put("download-api-docs.sh", "/tmp/download-api-docs.sh")
sftp.close()
print("✅ Uploaded!\n")

# Make executable and run
print("🚀 Running documentation download...\n")
stdin, stdout, stderr = client.exec_command("chmod +x /tmp/download-api-docs.sh && bash /tmp/download-api-docs.sh")

# Read output in real-time
while True:
    line = stdout.readline()
    if not line:
        break
    print(line, end='')

error = stderr.read().decode()
if error:
    print("\n⚠️  Errors:", error)

print("\n\n📥 Downloading docs to local machine...")

# Download all docs
sftp = client.open_sftp()
try:
    files = sftp.listdir("/tmp/api-docs")
    print(f"\nFound {len(files)} files:")
    
    import os
    os.makedirs("api-docs", exist_ok=True)
    
    for filename in files:
        remote_path = f"/tmp/api-docs/{filename}"
        local_path = f"api-docs/{filename}"
        print(f"  📥 {filename}...", end='')
        try:
            sftp.get(remote_path, local_path)
            size = os.path.getsize(local_path)
            print(f" ✅ ({size} bytes)")
        except Exception as e:
            print(f" ❌ {e}")
    
    sftp.close()
except Exception as e:
    print(f"❌ Error listing files: {e}")

client.close()

print("\n\n✅ DONE!")
print("📂 All documentation saved to: ./api-docs/")
print("\nNext: Read the .txt files to understand API structure!")
