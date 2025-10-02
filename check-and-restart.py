import paramiko

KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect("5.129.228.88", username="root", pkey=key)

# Check server status
print("🔍 Checking server status...\n")
stdin, stdout, stderr = client.exec_command("ps aux | grep 'node.*server.js' | grep -v grep")
print("Running processes:")
print(stdout.read().decode() or "❌ No server running!")

# Check server log
print("\n📋 Last 30 lines of server.log:")
stdin, stdout, stderr = client.exec_command("cd /opt/deep-agg && tail -30 server.log")
print(stdout.read().decode())

# Restart properly
print("\n🔄 Restarting server...")
commands = """
cd /opt/deep-agg
pkill -9 -f 'node.*server.js'
sleep 1
nohup node server.js > server.log 2>&1 &
sleep 3
ps aux | grep 'node.*server.js' | grep -v grep
"""
stdin, stdout, stderr = client.exec_command(commands)
print(stdout.read().decode())

client.close()
