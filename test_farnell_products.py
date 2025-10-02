import requests
import json

# Test with Arduino/Raspberry parts that likely exist in Farnell
test_mpns = [
    "ATMEGA328P-PU",  # Arduino chip
    "BCM2837B0",       # Raspberry Pi chip
    "SN74HC595N",      # Popular shift register
    "LM7805CT",        # Voltage regulator
]

for mpn in test_mpns:
    print(f"\n{'='*60}")
    print(f"Testing: {mpn}")
    print('='*60)
    
    response = requests.get(f'http://5.129.228.88:9201/api/product?mpn={mpn}')
    data = response.json()
    
    if data['ok']:
        product = data['product']
        specs = product.get('technical_specs', {})
        sources = product.get('sources', {})
        
        print(f"✅ Found!")
        print(f"   Specs: {len(specs)}")
        print(f"   Sources: Mouser={sources.get('mouser')}, TME={sources.get('tme')}, Farnell={sources.get('farnell')}")
        
        if sources.get('farnell'):
            print(f"\n   🎉 FARNELL FOUND THIS ONE!")
            print(f"\n   First 10 specs:")
            for i, (k, v) in enumerate(list(specs.items())[:10], 1):
                print(f"      {i}. {k}: {v}")
            break
    else:
        print(f"❌ {data.get('error')}")
