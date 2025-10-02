#!/usr/bin/env python3
"""Test TME with different Country params"""
import os
import base64
import hmac
import hashlib
import urllib.parse
import requests

TME_TOKEN = os.getenv('TME_TOKEN')
TME_SECRET = os.getenv('TME_SECRET')

if not TME_TOKEN or not TME_SECRET:
    print("ERROR: TME_TOKEN or TME_SECRET not set")
    exit(1)

def test_country(country, language, mpn):
    params = {
        'Token': TME_TOKEN,
        'Country': country,
        'Language': language,
        'SearchPlain': mpn,
        'SearchOrder': 'ACCURACY'
    }
    
    sorted_params = sorted(params.items())
    encoded_params = '&'.join([
        f"{urllib.parse.quote(str(k), safe='')}={urllib.parse.quote(str(v), safe='')}" 
        for k, v in sorted_params
    ])
    
    url = 'https://api.tme.eu/Products/Search.json'
    encoded_url = urllib.parse.quote(url, safe='')
    sig_base = f"POST&{encoded_url}&{encoded_params}"
    
    signature = base64.b64encode(
        hmac.new(TME_SECRET.encode(), sig_base.encode(), hashlib.sha1).digest()
    ).decode()
    
    params['ApiSignature'] = signature
    
    resp = requests.post(url, data=params, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    
    try:
        data = resp.json()
    except:
        print(f"  ERROR: Invalid JSON response")
        print(f"  Text: {resp.text[:200]}")
        return False
    
    # TME returns { Data: { ProductList: [...] } } or sometimes error structure
    if isinstance(data, dict):
        product_list = data.get('Data', {}).get('ProductList', []) if isinstance(data.get('Data'), dict) else []
        if not product_list:
            product_list = data.get('ProductList', []) if isinstance(data.get('ProductList'), list) else []
    else:
        product_list = []
    
    print(f"\nCountry={country}, Language={language}, MPN={mpn}")
    print(f"  Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"  Error response: {resp.text[:300]}")
    print(f"  Products found: {len(product_list)}")
    if product_list:
        print(f"  First: {product_list[0].get('Symbol', 'N/A')}")
    
    return len(product_list) > 0

print("=" * 60)
print("Testing TME API with different Country/Language combinations")
print("=" * 60)

# Test with different country codes
test_country('PL', 'EN', 'ATMEGA328P-PU')
test_country('RU', 'RU', 'ATMEGA328P-PU')
test_country('RU', 'EN', 'ATMEGA328P-PU')

# Try exact symbol from TME website
test_country('PL', 'EN', 'ATMEGA328P-AU')
test_country('PL', 'EN', 'STM32F407VGT6')

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
