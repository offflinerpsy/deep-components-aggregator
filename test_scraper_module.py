#!/usr/bin/env python3
"""Test if scraper works on server"""

import paramiko

HOST = '5.129.228.88'
USER = 'root'
KEY_FILE = 'deploy_key'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
client.connect(HOST, username=USER, pkey=key)

# Test scraper module directly
test_code = '''
cd /opt/deep-agg
node -e "
import('./src/scrapers/mouser-simple.mjs').then(m => {
  return m.scrapeMouserProduct('STM32F407VGT6');
}).then(result => {
  console.log('Result:', JSON.stringify(result, null, 2));
}).catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
});
"
'''

print('🧪 Testing scraper module...\n')
stdin, stdout, stderr = client.exec_command(test_code)
output = stdout.read().decode()
errors = stderr.read().decode()

print('STDOUT:')
print(output)

if errors:
    print('\nSTDERR:')
    print(errors)

client.close()
