import requests
import json

# Test both products from screenshots
products = [
    ("STM32F407VGT6", "STM32"),
    ("M83513/19-E01NW", "M83513")
]

for mpn, name in products:
    print(f"\n{'='*60}")
    print(f"Testing: {name} ({mpn})")
    print('='*60)
    
    response = requests.get(f'http://5.129.228.88:9201/api/product?mpn={mpn}')
    data = response.json()
    
    if data['ok']:
        product = data['product']
        specs = product.get('technical_specs', {})
        images = product.get('images', [])
        photo = product.get('photo', '')
        
        print(f"\n✅ API Response OK")
        print(f"   Main photo: {photo if photo else '❌ EMPTY'}")
        print(f"   Images count: {len(images)}")
        if images:
            print(f"   Images:")
            for i, img in enumerate(images, 1):
                print(f"      {i}. {img}")
        else:
            print(f"   ❌ NO IMAGES!")
        
        print(f"\n   Technical specs: {len(specs)}")
        if len(specs) < 10:
            print(f"   ⚠️  TOO FEW SPECS!")
        
        print(f"\n   All specs:")
        for i, (key, value) in enumerate(specs.items(), 1):
            print(f"      {i}. {key}: {value}")
        
        # Check sources
        sources = product.get('sources', {})
        print(f"\n   Data sources: {sources}")
        
    else:
        print(f"❌ Error: {data.get('error')}")
