import paramiko
import sys

HOST = '5.129.228.88'
USER = 'root'
PASSWORD = 'hKsxPKR+2ayZ^c'

TEST_CODE = '''
cd /opt/deep-agg
node -e "
const crypto = require('crypto');

// From .env
const TOKEN = '18745f2b94e785406561ef9bd83e9a0d0b941bb7a9f4b26327';
const SECRET = 'd94ba92af87285b24da6';

console.log('Token length:', TOKEN.length);
console.log('Secret length:', SECRET.length);
console.log('Token:', TOKEN);
console.log('Secret:', SECRET);

// Test signature
const query = 'SearchPlain=STM32F407VGT6';
const params = new URLSearchParams({
  Country: 'PL',
  Language: 'EN',
  SearchOrder: 'ACCURACY',
  SearchPlain: 'STM32F407VGT6'
});
const sortedParams = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
const paramString = sortedParams.map(([k, v]) => k + '=' + v).join('&');
const signatureMessage = TOKEN + paramString + SECRET;

console.log('');
console.log('Signature message:', signatureMessage);
console.log('Message length:', signatureMessage.length);

const signature = crypto.createHash('sha1').update(signatureMessage, 'utf8').digest('hex');
console.log('Signature:', signature);

// Test API call
(async () => {
  const url = 'https://api.tme.eu/search/Products.json?' + params.toString() + '&Token=' + TOKEN + '&ApiSignature=' + signature;
  console.log('');
  console.log('Full URL:', url);
  
  const response = await fetch(url);
  const text = await response.text();
  console.log('');
  console.log('Status:', response.status);
  console.log('Response:', text);
})();
"
'''

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, port=22)
    
    stdin, stdout, stderr = client.exec_command(TEST_CODE)
    output = stdout.read().decode()
    errors = stderr.read().decode()
    
    print(output)
    if errors:
        print('\nErrors:', errors)
    
    client.close()
    
except Exception as e:
    print(f'❌ Error: {e}')
    sys.exit(1)
