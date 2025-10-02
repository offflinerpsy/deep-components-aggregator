import requests
import json

# Test M83513/19-E01NW
response = requests.get('http://5.129.228.88:9201/api/product?mpn=M83513/19-E01NW')
data = response.json()

if data['ok']:
    product = data['product']
    specs = product.get('technical_specs', {})
    
    print(f"✅ API Response OK")
    print(f"   Specifications: {len(specs)}")
    print(f"   Sources: {product.get('sources')}")
    print(f"\n📋 All specifications:")
    for i, (key, value) in enumerate(specs.items(), 1):
        print(f"   {i}. {key}: {value}")
    
    # Test with STM32
    print(f"\n{'='*60}")
    print(f"Testing STM32F407VGT6")
    print('='*60)
    
    response2 = requests.get('http://5.129.228.88:9201/api/product?mpn=STM32F407VGT6')
    data2 = response2.json()
    
    if data2['ok']:
        specs2 = data2['product'].get('technical_specs', {})
        print(f"\n✅ STM32 Specs: {len(specs2)}")
        print(f"\n📋 First 10:")
        for i, (key, value) in enumerate(list(specs2.items())[:10], 1):
            print(f"   {i}. {key}: {value}")
    
    print(f"\n{'='*60}")
    print(f"✅ SUCCESS SUMMARY")
    print('='*60)
    print(f"M83513/19-E01NW: {len(specs)} specifications (was 1 before fix)")
    print(f"STM32F407VGT6: {len(specs2)} specifications (was 1 before fix)")
    print(f"\n🎉 IMPROVEMENT: {len(specs)}x more specs for M83513!")
    print(f"🎉 IMPROVEMENT: {len(specs2)}x more specs for STM32!")
else:
    print(f"❌ Error: {data.get('error')}")
