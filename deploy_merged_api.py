#!/usr/bin/env python3
"""
Deployment script for merged API implementation
Uploads server.js, mergeProductData.mjs, test script
Restarts server and clears cache
"""

import paramiko
import sys
import os
from pathlib import Path

# Server config
HOST = '5.129.228.88'
PORT = 9201
USER = 'root'
PASSWORD = 'hKsxPKR+2ayZ^c'
REMOTE_BASE = '/opt/deep-agg'

def deploy():
    print('🚀 Deploying merged API implementation...\n')
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f'📡 Connecting to {HOST}...')
        client.connect(HOST, username=USER, password=PASSWORD, port=22)
        print('✅ Connected\n')
        
        sftp = client.open_sftp()
        
        # 1. Upload server.js
        print('📤 Uploading server.js...')
        sftp.put('server.js', f'{REMOTE_BASE}/server.js')
        print('✅ server.js uploaded\n')
        
        # 2. Upload mergeProductData.mjs
        print('📤 Uploading src/utils/mergeProductData.mjs...')
        sftp.put('src/utils/mergeProductData.mjs', f'{REMOTE_BASE}/src/utils/mergeProductData.mjs')
        print('✅ mergeProductData.mjs uploaded\n')
        
        # 2.5 Upload TME client
        print('📤 Uploading src/integrations/tme/client.mjs...')
        sftp.put('src/integrations/tme/client.mjs', f'{REMOTE_BASE}/src/integrations/tme/client.mjs')
        print('✅ TME client uploaded\n')
        
        # 2.6 Upload Mouser scraper (simple version without cheerio)
        print('📤 Uploading src/scrapers/mouser-simple.mjs...')
        try:
            sftp.mkdir(f'{REMOTE_BASE}/src/scrapers')
        except:
            pass  # Directory may already exist
        sftp.put('src/scrapers/mouser-simple.mjs', f'{REMOTE_BASE}/src/scrapers/mouser-simple.mjs')
        print('✅ Mouser scraper uploaded\n')
        
        # 2.7 Upload DigiKey client
        print('📤 Uploading src/integrations/digikey/client.mjs...')
        try:
            sftp.mkdir(f'{REMOTE_BASE}/src/integrations/digikey')
        except:
            pass
        sftp.put('src/integrations/digikey/client.mjs', f'{REMOTE_BASE}/src/integrations/digikey/client.mjs')
        print('✅ DigiKey client uploaded\n')
        
        # 2.8 Upload DigiKey normalizer
        print('📤 Uploading src/integrations/digikey/normalize.mjs...')
        sftp.put('src/integrations/digikey/normalize.mjs', f'{REMOTE_BASE}/src/integrations/digikey/normalize.mjs')
        print('✅ DigiKey normalizer uploaded\n')
        
        # 2.9 Upload .env with DigiKey credentials
        print('📤 Uploading .env...')
        sftp.put('.env', f'{REMOTE_BASE}/.env')
        print('✅ .env uploaded\n')
        
        # 3. Upload test script
        print('📤 Uploading test-all-apis.mjs...')
        sftp.put('test-all-apis.mjs', f'{REMOTE_BASE}/test-all-apis.mjs')
        print('✅ test-all-apis.mjs uploaded\n')
        
        # 3.1 Upload DigiKey test
        print('📤 Uploading test_digikey.mjs...')
        sftp.put('test_digikey.mjs', f'{REMOTE_BASE}/test_digikey.mjs')
        print('✅ test_digikey.mjs uploaded\n')
        
        # 4. Upload product-page.js
        print('📤 Uploading public/scripts/product-page.js...')
        sftp.put('public/scripts/product-page.js', f'{REMOTE_BASE}/public/scripts/product-page.js')
        print('✅ product-page.js uploaded\n')
        
        # 5. Upload product.html
        print('📤 Uploading public/product.html...')
        sftp.put('public/product.html', f'{REMOTE_BASE}/public/product.html')
        print('✅ product.html uploaded\n')
        
        sftp.close()
        
        # 4. Clear cache database
        print('🗑️  Clearing cache database...')
        stdin, stdout, stderr = client.exec_command(f'rm -f {REMOTE_BASE}/cache.db')
        stdout.channel.recv_exit_status()
        print('✅ Cache cleared\n')
        
        # 5. Kill existing server process
        print('🛑 Stopping existing server...')
        stdin, stdout, stderr = client.exec_command("pkill -f 'node server.js'")
        stdout.channel.recv_exit_status()
        print('✅ Server stopped\n')
        
        # 6. Start server in background
        print('🚀 Starting server...')
        stdin, stdout, stderr = client.exec_command(
            f'cd {REMOTE_BASE} && nohup node server.js > server.log 2>&1 &'
        )
        stdout.channel.recv_exit_status()
        print('✅ Server started\n')
        
        # 7. Wait and check process
        print('⏳ Waiting 3 seconds...')
        stdin, stdout, stderr = client.exec_command('sleep 3 && ps aux | grep "node server.js" | grep -v grep')
        output = stdout.read().decode()
        if output.strip():
            print('✅ Server is running')
            print(f'   Process: {output.strip()}\n')
        else:
            print('❌ Server process not found!')
            stdin, stdout, stderr = client.exec_command(f'tail -20 {REMOTE_BASE}/server.log')
            log = stdout.read().decode()
            print(f'   Last 20 lines of log:\n{log}')
            return False
        
        print('=' * 60)
        print('✅ DEPLOYMENT COMPLETE')
        print('=' * 60)
        print(f'\n🌐 Server URL: http://{HOST}:{PORT}')
        print(f'📊 Test product: http://{HOST}:{PORT}/product.html?mpn=M83513/19-E01NW')
        print(f'\n💡 Run test script: ssh root@{HOST} "cd {REMOTE_BASE} && node test-all-apis.mjs"')
        
        return True
        
    except Exception as e:
        print(f'\n❌ Deployment failed: {e}')
        return False
    finally:
        client.close()

if __name__ == '__main__':
    success = deploy()
    sys.exit(0 if success else 1)
