import paramiko

c=paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('5.129.228.88',username='root',password='hKsxPKR+2ayZ^c')

print('🕷️  Testing Mouser scraper...\n')

stdin,stdout,stderr=c.exec_command('''
cd /opt/deep-agg && node -e "
import('./src/scrapers/mouser-simple.mjs').then(async ({scrapeMouserProduct}) => {
  try {
    const result = await scrapeMouserProduct('M83513/19-E01NW');
    if (result.ok && result.specs) {
      console.log('✅ Scraper works!');
      console.log('Specs found:', Object.keys(result.specs).length);
      console.log('\\nFirst 10 specs:');
      Object.entries(result.specs).slice(0, 10).forEach(([k, v]) => {
        console.log(' ', k + ':', v);
      });
    } else {
      console.log('❌ Scraper failed:', result.error);
    }
  } catch(e) {
    console.log('❌ Error:', e.message);
  }
});
" 2>&1
''')

print(stdout.read().decode())
c.close()
