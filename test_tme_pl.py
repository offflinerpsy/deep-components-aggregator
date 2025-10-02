#!/usr/bin/env python3
"""Test TME API with PL country"""
import os
import hmac
import hashlib
import base64
import requests
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
    
    # Build signature base: POST&encoded_url&encoded_params
    encoded_url = quote(url, safe='')
    encoded_query = quote(encoded_params, safe='')
    signature_base = f'POST&{encoded_url}&{encoded_query}'
    
    print(f'\n=== Testing {mpn} with Country={country} ===')
    print(f'Signature base: {signature_base[:100]}...')
    
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
    
    print(f'Status: {response.status_code}')
    
    if response.status_code == 200:
        data = response.json()
        products = data.get('Data', {}).get('ProductList', [])
        print(f'Products found: {len(products)}')
        if products:
            print(f'First product: {products[0].get("Symbol", "N/A")}')
            print(f'Description: {products[0].get("Description", "N/A")[:80]}')
        else:
            print('Response keys:', list(data.keys()))
            if 'Data' in data:
                print('Data keys:', list(data['Data'].keys()))
    else:
        print(f'Error: {response.text[:500]}')
    
    return response.status_code, response.json() if response.status_code == 200 else None

if __name__ == '__main__':
    if not TOKEN or not SECRET:
        print('ERROR: Set TME_TOKEN and TME_SECRET environment variables')
        exit(1)
    
    # Test with different MPNs
    test_tme_search('STM32F103C8T6', 'PL')
    test_tme_search('STM32F407VGT6', 'PL')
    test_tme_search('ATMEGA328P-PU', 'PL')
