#!/usr/bin/env python3
"""
Quick deploy and test all 3 APIs on server
Tests: DigiKey, TME, Farnell with M83513/19-E01NW
"""

import subprocess
import sys

SERVER = "root@37.60.243.19"
KEY = "deploy_key"

print("🚀 Deploying fixed API clients to server...")
print("")

# Upload all files
files = [
    "src/integrations/digikey/client.mjs",
    "src/integrations/tme/client.mjs",
    "src/integrations/farnell/client.mjs",
    ".env"
]

for f in files:
    subprocess.run([
        "scp", "-i", KEY, "-o", "StrictHostKeyChecking=no",
        f, f"{SERVER}:/root/aggregator/{f}"
    ], check=False)

print("")
print("✅ Files uploaded")
print("")
print("🧪 Testing APIs on server...")
print("")

# Create test script
test_script = """
cd /root/aggregator
node -e "
import('dotenv/config').then(() => {
  import('./src/integrations/digikey/client.mjs').then(async ({ digikeySearch }) => {
    console.log('\\n🔵 Testing DigiKey...');
    try {
      const result = await digikeySearch({
        clientId: process.env.DIGIKEY_CLIENT_ID,
        clientSecret: process.env.DIGIKEY_CLIENT_SECRET,
        keyword: 'M83513/19-E01NW',
        limit: 1
      });
      console.log('✅ DigiKey:', result.data.ProductsCount || 0, 'products');
      if (result.data.Products?.[0]?.Parameters) {
        console.log('   Parameters:', result.data.Products[0].Parameters.length);
      }
    } catch (e) {
      console.log('❌ DigiKey:', e.message.substring(0, 200));
    }
  });

  import('./src/integrations/tme/client.mjs').then(async ({ tmeSearchProducts }) => {
    console.log('\\n🟡 Testing TME...');
    try {
      const result = await tmeSearchProducts({
        token: process.env.TME_TOKEN,
        secret: process.env.TME_SECRET,
        query: 'M83513/19-E01NW'
      });
      console.log('✅ TME:', result.data?.Data?.ProductList?.length || 0, 'products');
    } catch (e) {
      console.log('❌ TME:', e.message.substring(0, 200));
    }
  });

  import('./src/integrations/farnell/client.mjs').then(async ({ farnellByMPN }) => {
    console.log('\\n🟢 Testing Farnell...');
    try {
      const result = await farnellByMPN({
        apiKey: process.env.FARNELL_API_KEY,
        region: process.env.FARNELL_REGION,
        q: 'M83513/19-E01NW',
        limit: 1
      });
      console.log('✅ Farnell:', result.data?.numberOfResults || 0, 'products');
    } catch (e) {
      console.log('❌ Farnell:', e.message.substring(0, 200));
    }
  });
});
"
"""

# Run test
result = subprocess.run([
    "ssh", "-i", KEY, "-o", "StrictHostKeyChecking=no",
    SERVER,
    test_script
], capture_output=False)

sys.exit(result.returncode)
