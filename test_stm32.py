import requests
import json

# Test with different MPN
mpn = "STM32F407VGT6"
response = requests.get(f'http://5.129.228.88:9201/api/product?mpn={mpn}')
data = response.json()

print(f"Testing MPN: {mpn}")
print(f"Status: {data['ok']}")
if data['ok']:
    product = data['product']
    specs = product.get('technical_specs', {})
    print(f"\n✅ Technical Specs Count: {len(specs)}")
    print(f"   Sources: {product.get('sources')}")
else:
    print(f"Error: {data.get('error')}")
