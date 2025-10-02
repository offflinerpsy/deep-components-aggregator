import paramiko

c=paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('5.129.228.88',username='root',password='hKsxPKR+2ayZ^c')

print('🔍 Testing TME with common products...\n')

test_products = [
    'STM32F407VGT6',
    'ATMEGA328P-PU', 
    'LM358P',
    'NE555P'
]

for mpn in test_products:
    print(f'\n=== Testing: {mpn} ===')
    stdin,stdout,stderr=c.exec_command(f'''
cd /opt/deep-agg && node -e "
import('dotenv/config').then(() => {{
  import('./src/integrations/tme/client.mjs').then(async ({{tmeSearchProducts}}) => {{
    try {{
      const result = await tmeSearchProducts({{
        token: process.env.TME_TOKEN, 
        secret: process.env.TME_SECRET, 
        query: '{mpn}'
      }});
      if (result?.data?.ProductList?.length > 0) {{
        console.log('✅ Found:', result.data.ProductList[0].Symbol);
        console.log('Parameters:', (result.data.ProductList[0].Parameters || []).length);
      }} else {{
        console.log('❌ Not found (0 results)');
      }}
    }} catch(e) {{
      console.log('❌ Error:', e.message.substring(0, 100));
    }}
  }});
}});
" 2>&1
''')
    print(stdout.read().decode())

c.close()
