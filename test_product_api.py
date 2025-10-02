import requests
import json

response = requests.get('http://5.129.228.88:9201/api/product?mpn=M83513/19-E01NW')
data = response.json()

print(f"Status: {data['ok']}")
if data['ok']:
    product = data['product']
    specs = product.get('technical_specs', {})
    print(f"\n✅ Technical Specs Count: {len(specs)}")
    print(f"   Sources: {product.get('sources')}")
    print(f"   Images: {len(product.get('images', []))}")
    print(f"   Datasheets: {len(product.get('datasheets', []))}")
    print(f"   Price RUB: {product.get('price_rub')}")
    print(f"   Stock: {product.get('availability', {}).get('inStock')}")
    print(f"\n📋 Specifications:")
    for i, (key, value) in enumerate(list(specs.items())[:25], 1):
        print(f"   {i}. {key}: {value}")
    if len(specs) > 25:
        print(f"   ... and {len(specs) - 25} more")
else:
    print(f"Error: {data.get('error')}")
