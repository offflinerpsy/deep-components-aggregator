#!/usr/bin/env python3
"""Check TME product structure"""
import os
import hmac
import hashlib
import base64
import requests
import json
from urllib.parse import urlencode, quote

TOKEN = os.environ.get('TME_TOKEN', '')
SECRET = os.environ.get('TME_SECRET', '')

def test_tme_search(mpn, country='PL'):
    url = 'https://api.tme.eu/Products/Search.json'
    
    params = {
        'Token': TOKEN,
        'Country': country,
        'Language': 'EN',
        'SearchPlain': mpn,
        'SearchOrder': 'ACCURACY'
    }
    
    # Sort parameters
    sorted_params = sorted(params.items(), key=lambda x: x[0])
    
    # URL encode parameters
    encoded_params = '&'.join([f'{quote(k, safe="")}={quote(str(v), safe="")}' for k, v in sorted_params])
    
    # Build signature base
    encoded_url = quote(url, safe='')
    encoded_query = quote(encoded_params, safe='')
    signature_base = f'POST&{encoded_url}&{encoded_query}'
    
    # Generate HMAC-SHA1 signature
    signature = base64.b64encode(
        hmac.new(SECRET.encode(), signature_base.encode(), hashlib.sha1).digest()
    ).decode()
    
    params['ApiSignature'] = signature
    
    # POST request
    response = requests.post(url, data=params, headers={
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
    })
    
    print(f'\n=== {mpn} with Country={country} ===')
    print(f'Status: {response.status_code}')
    
    if response.status_code == 200:
        data = response.json()
        products = data.get('Data', {}).get('ProductList', [])
        print(f'Products found: {len(products)}')
        
        for i, p in enumerate(products[:3]):
            print(f'\nProduct {i+1}:')
            print(f'  Symbol: {p.get("Symbol")}')
            print(f'  OriginalSymbol: {p.get("OriginalSymbol")}')
            print(f'  Producer: {p.get("Producer")}')
            print(f'  Description: {p.get("Description", "")[:60]}')
            
            # Check if matches MPN
            if p.get('OriginalSymbol', '').upper() == mpn.upper():
                print(f'  ✅ EXACT MATCH on OriginalSymbol!')
            elif p.get('Symbol', '').upper() == mpn.upper():
                print(f'  ✅ EXACT MATCH on Symbol!')

if __name__ == '__main__':
    test_tme_search('STM32F103C8T6', 'PL')
    test_tme_search('ATMEGA328P-PU', 'PL')
    test_tme_search('NE555P', 'PL')
