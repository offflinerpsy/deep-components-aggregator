import paramiko
c=paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('5.129.228.88',username='root',password='hKsxPKR+2ayZ^c')
stdin,stdout,stderr=c.exec_command('tail -200 /opt/deep-agg/server.log | grep -B5 -A10 "DigiKey.*Error"')
print(stdout.read().decode())
c.close()
