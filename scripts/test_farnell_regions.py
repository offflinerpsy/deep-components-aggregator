#!/usr/bin/env python3
"""
Farnell API Region & Search Method Test

Tests Farnell API with different regions and search methods to understand empty results.
"""

import os
import sys
import json
import requests
from urllib.parse import urlencode

# Load credentials from environment or .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

FARNELL_API_KEY = os.getenv('FARNELL_API_KEY')

if not FARNELL_API_KEY:
    print("❌ Error: FARNELL_API_KEY must be set in environment")
    print("   Add it to .env file or export it:")
    print("   export FARNELL_API_KEY='your_api_key'")
    sys.exit(1)

print(f"🔑 Farnell API Key: {FARNELL_API_KEY[:10]}...{FARNELL_API_KEY[-4:]}")
print()


# Different Farnell/Element14 regions
REGIONS = [
    {
        'name': 'UK Farnell',
        'base': 'https://uk.farnell.com',
        'storeId': 10164,
        'catalogId': 15001,
        'langId': 44
    },
    {
        'name': 'US Newark',
        'base': 'https://www.newark.com',
        'storeId': 10194,
        'catalogId': 15001,
        'langId': -1
    },
    {
        'name': 'Element14 (Global)',
        'base': 'https://www.element14.com',
        'storeId': 10159,
        'catalogId': 15001,
        'langId': -1
    },
    {
        'name': 'CPC UK',
        'base': 'https://cpc.farnell.com',
        'storeId': 10179,
        'catalogId': 15001,
        'langId': 44
    }
]


def test_webapp_search(region, mpn, search_params):
    """Test webapp/wcs/stores/servlet/Search endpoint"""
    
    url = f"{region['base']}/webapp/wcs/stores/servlet/Search"
    
    params = {
        'storeId': region['storeId'],
        'catalogId': region['catalogId'],
        'langId': region['langId'],
        'apiKey': FARNELL_API_KEY,
        'resultsPerPage': 5,
        **search_params
    }
    
    try:
        response = requests.get(url, params=params, timeout=15)
        
        result = {
            'status': response.status_code,
            'url': response.url,
            'success': False,
            'num_results': 0,
            'products': []
        }
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Try different response structures
                if 'premierFarnellPartNumberReturn' in data:
                    pfpn = data['premierFarnellPartNumberReturn']
                    result['num_results'] = pfpn.get('numberOfResults', 0)
                    result['products'] = pfpn.get('products', [])
                elif 'products' in data:
                    result['num_results'] = len(data['products'])
                    result['products'] = data['products']
                
                result['success'] = result['num_results'] > 0
                result['raw'] = data
                
            except Exception as e:
                result['error'] = f"JSON parse error: {e}"
                result['raw_text'] = response.text[:500]
        else:
            result['error'] = response.text[:500]
        
        return result
        
    except Exception as e:
        return {
            'status': 0,
            'success': False,
            'error': str(e)
        }


def test_rest_api(mpn, search_method):
    """Test REST API v3 endpoint"""
    
    base_url = 'https://api.element14.com/catalog/products'
    
    params = {
        'callInfo.apiKey': FARNELL_API_KEY,
        'storeInfo.id': 'uk.farnell.com',
        'resultsSettings.numberOfResults': 5,
        'resultsSettings.responseGroup': 'medium'
    }
    
    if search_method == 'keyword':
        params['term'] = mpn
    elif search_method == 'mpn_exact':
        params['term'] = f'manuPartNum:{mpn}'
    elif search_method == 'mpn_field':
        params['manufacturerPartNumber'] = mpn
    
    try:
        response = requests.get(base_url, params=params, timeout=15)
        
        result = {
            'status': response.status_code,
            'url': response.url,
            'success': False,
            'num_results': 0,
            'products': []
        }
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check different response structures
                if 'products' in data:
                    result['products'] = data['products']
                    result['num_results'] = len(data['products'])
                elif 'productSearchReturn' in data:
                    products = data['productSearchReturn'].get('products', [])
                    result['products'] = products
                    result['num_results'] = len(products)
                
                result['success'] = result['num_results'] > 0
                result['raw'] = data
                
            except Exception as e:
                result['error'] = f"JSON parse error: {e}"
                result['raw_text'] = response.text[:500]
        else:
            result['error'] = response.text[:500]
        
        return result
        
    except Exception as e:
        return {
            'status': 0,
            'success': False,
            'error': str(e)
        }


def print_result(title, result):
    """Pretty print test result"""
    
    print(f"\n   {title}")
    print(f"   Status: {result['status']}")
    
    if result['success']:
        print(f"   ✅ SUCCESS - Found {result['num_results']} product(s)")
        
        if result['products']:
            product = result['products'][0]
            print(f"\n   First product:")
            
            # Try different field names
            mpn = (product.get('translatedManufacturerPartNumber') or 
                   product.get('manufacturerPartNumber') or 
                   product.get('mpn') or 
                   'N/A')
            sku = product.get('sku') or product.get('id') or 'N/A'
            desc = (product.get('displayName') or 
                    product.get('productDescription') or 
                    product.get('description') or 
                    'N/A')
            
            print(f"      MPN: {mpn}")
            print(f"      SKU: {sku}")
            print(f"      Description: {desc[:50]}...")
    else:
        if 'error' in result:
            print(f"   ❌ FAILED - {result['error']}")
        else:
            print(f"   ⚠️ No results found")


def test_region(region, mpn):
    """Test all search methods for a specific region"""
    
    print(f"\n{'='*80}")
    print(f"📍 {region['name']} - {mpn}")
    print(f"{'='*80}")
    
    search_methods = [
        {
            'name': 'Keyword Search (st)',
            'params': {'st': mpn, 'searchType': 'KEYWORD_SEARCH'}
        },
        {
            'name': 'MPN Exact Match',
            'params': {'mftrPartNumber': mpn}
        },
        {
            'name': 'Manufacturer Part Number',
            'params': {'manufacturerPartNumber': mpn}
        },
        {
            'name': 'Exact Match Field',
            'params': {'exactMatch': mpn}
        }
    ]
    
    results = []
    
    for method in search_methods:
        result = test_webapp_search(region, mpn, method['params'])
        print_result(method['name'], result)
        
        if result['success']:
            results.append((region['name'], method['name'], result))
    
    return results


def test_rest_api_all(mpn):
    """Test REST API with all search methods"""
    
    print(f"\n{'='*80}")
    print(f"🌐 REST API v3 - {mpn}")
    print(f"{'='*80}")
    
    search_methods = [
        ('Keyword', 'keyword'),
        ('MPN Exact (manuPartNum:)', 'mpn_exact'),
        ('MPN Field', 'mpn_field')
    ]
    
    results = []
    
    for name, method in search_methods:
        result = test_rest_api(mpn, method)
        print_result(name, result)
        
        if result['success']:
            results.append(('REST API', name, result))
    
    return results


def main():
    """Main test execution"""
    
    print(f"\n{'='*80}")
    print(f"Farnell API Region & Search Method Test")
    print(f"{'='*80}\n")
    
    # Test with common components
    test_mpns = [
        'LM317',
        'ATMEGA328P-PU',
        'LM317MBSTT3G',
        'STM32F407VGT6'
    ]
    
    all_successes = []
    
    for mpn in test_mpns:
        print(f"\n\n{'#'*80}")
        print(f"# Testing MPN: {mpn}")
        print(f"{'#'*80}")
        
        # Test webapp endpoints for each region
        for region in REGIONS:
            successes = test_region(region, mpn)
            all_successes.extend(successes)
        
        # Test REST API
        rest_successes = test_rest_api_all(mpn)
        all_successes.extend(rest_successes)
    
    # Print summary
    print(f"\n\n{'='*80}")
    print(f"📋 SUMMARY")
    print(f"{'='*80}\n")
    
    if all_successes:
        print(f"✅ Found {len(all_successes)} working combination(s):\n")
        
        for region, method, result in all_successes:
            print(f"   ✅ {region} - {method}: {result['num_results']} products")
        
        print(f"\n💡 Recommended configuration:")
        best = all_successes[0]
        print(f"   Region: {best[0]}")
        print(f"   Method: {best[1]}")
        print(f"   Results: {best[2]['num_results']}")
        
        if 'url' in best[2]:
            print(f"\n📝 Example URL:")
            print(f"   {best[2]['url']}")
    else:
        print(f"❌ No working combinations found!\n")
        print(f"⚠️ Possible issues:")
        print(f"   1. Invalid API key (check FARNELL_API_KEY)")
        print(f"   2. API key not activated (check Farnell developer portal)")
        print(f"   3. Wrong product database (try different regions)")
        print(f"   4. MPN format mismatch (check exact MPN formatting)")
        print(f"   5. Rate limiting (wait and retry)")
        
        print(f"\n💡 Next steps:")
        print(f"   1. Verify API key at: https://partner.element14.com/")
        print(f"   2. Check API key permissions (need 'Product Search' access)")
        print(f"   3. Try searching on website first to verify product exists")
        print(f"   4. Contact Farnell support if API key is correct")


if __name__ == '__main__':
    main()
