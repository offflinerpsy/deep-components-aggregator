import paramiko

c=paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('5.129.228.88',username='root',password='hKsxPKR+2ayZ^c')

print('🔍 Searching M83513/19-E01NW across APIs...\n')

# Try TME
print('=== TME ===')
stdin,stdout,stderr=c.exec_command('''
cd /opt/deep-agg && node -e "
import('dotenv/config').then(() => {
  import('./src/integrations/tme/client.mjs').then(async ({tmeSearchProducts}) => {
    try {
      const result = await tmeSearchProducts({
        token: process.env.TME_TOKEN, 
        secret: process.env.TME_SECRET, 
        query: 'M83513/19-E01NW'
      });
      if (result?.data?.ProductList?.length > 0) {
        console.log('✅ Found:', result.data.ProductList[0].Symbol);
      } else {
        console.log('❌ Not found');
      }
    } catch(e) {
      console.log('❌ Error:', e.message);
    }
  });
});
" 2>&1
''')
print(stdout.read().decode())

# Try Farnell  
print('\n=== Farnell ===')
stdin,stdout,stderr=c.exec_command('''
cd /opt/deep-agg && node -e "
import('dotenv/config').then(() => {
  import('./src/integrations/farnell/client.mjs').then(async ({farnellByMPN}) => {
    try {
      const result = await farnellByMPN({
        apiKey: process.env.FARNELL_API_KEY,
        region: process.env.FARNELL_REGION,
        q: 'M83513/19-E01NW',
        limit: 1
      });
      if (result?.data?.products?.length > 0) {
        const p = result.data.products[0];
        console.log('✅ Found:', p.displayName);
        console.log('Attributes:', (p.attributes || []).length);
      } else {
        console.log('❌ Not found (0 results)');
      }
    } catch(e) {
      console.log('❌ Error:', e.message);
    }
  });
});
" 2>&1
''')
print(stdout.read().decode())

c.close()
