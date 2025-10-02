import paramiko
c=paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('5.129.228.88',username='root',password='hKsxPKR+2ayZ^c')
stdin,stdout,stderr=c.exec_command('find /opt/deep-agg/var -name "*.db" -o -name "*.sqlite*" 2>&1')
print(stdout.read().decode())
c.close()
