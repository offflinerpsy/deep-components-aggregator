#!/usr/bin/env python3
"""Test Octopart scraper via Node.js"""

import subprocess
import json

# Test part number
TEST_MPN = "M83513/19-E01NW"

# Create test script
test_js = f"""
import {{ octopartSearchByMPN }} from './src/integrations/octopart/scraper.mjs';

console.log('🔍 Testing Octopart Scraper...');
console.log('Part Number:', '{TEST_MPN}');
console.log('');

const result = await octopartSearchByMPN('{TEST_MPN}');

console.log('');
console.log('=== RESULT ===');
console.log('Success:', result.ok);
console.log('Products found:', result.count);

if (result.products && result.products.length > 0) {{
    const p = result.products[0];
    console.log('');
    console.log('First Product:');
    console.log('- URL:', p.url);
    console.log('- MPN:', p.mpn);
    console.log('- Manufacturer:', p.manufacturer);
    console.log('- Description:', p.description);
    console.log('- Specs count:', Object.keys(p.specs || {{}}).length);
    
    if (p.specs && Object.keys(p.specs).length > 0) {{
        console.log('');
        console.log('Specifications:');
        for (const [key, value] of Object.entries(p.specs)) {{
            console.log(`  ${{key}}: ${{value}}`);
        }}
    }}
    
    if (p.distributors && p.distributors.length > 0) {{
        console.log('');
        console.log('Distributors:');
        for (const d of p.distributors) {{
            console.log(`  - ${{d.name}}: ${{d.stock}} @ ${{d.price}}`);
        }}
    }}
}} else {{
    console.log('❌ No products found');
    if (result.error) {{
        console.log('Error:', result.error);
    }}
}}
"""

# Write test file
with open('test_octopart.mjs', 'w', encoding='utf-8') as f:
    f.write(test_js)

print("Running Octopart scraper test...")
print("=" * 60)

# Run test
result = subprocess.run(
    ['node', 'test_octopart.mjs'],
    capture_output=True,
    text=True,
    encoding='utf-8'
)

print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)

print("=" * 60)
print(f"Exit code: {result.returncode}")
