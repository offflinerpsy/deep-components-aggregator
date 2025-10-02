import paramiko
import json

c=paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('5.129.228.88',username='root',password='hKsxPKR+2ayZ^c')

# Get full API response
stdin,stdout,stderr=c.exec_command('''
cd /opt/deep-agg && node -e "
import('dotenv/config').then(() => {
  import('./src/integrations/mouser/client.mjs').then(async ({mouserSearchByKeyword}) => {
    const result = await mouserSearchByKeyword({apiKey: process.env.MOUSER_API_KEY, q: 'M83513/19-E01NW', records: 1});
    const p = result?.data?.SearchResults?.Parts?.[0];
    console.log('\\n=== ProductAttributes ===');
    console.log(JSON.stringify(p.ProductAttributes, null, 2));
    console.log('\\n=== ALL FIELDS ===');
    console.log(Object.keys(p).join(', '));
  });
});
"
''')

output = stdout.read().decode()
print(output)

c.close()
