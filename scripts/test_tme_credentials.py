#!/usr/bin/env python3
"""
TME API Credentials & Signature Test

Tests TME API with different signature generation methods to understand 403 error.
"""

import os
import sys
import hmac
import hashlib
import base64
import json
import requests
from urllib.parse import urlencode

# Load credentials from environment or .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

TME_TOKEN = os.getenv('TME_TOKEN')
TME_SECRET = os.getenv('TME_SECRET')
API_BASE = 'https://api.tme.eu'

if not TME_TOKEN or not TME_SECRET:
    print("❌ Error: TME_TOKEN and TME_SECRET must be set in environment")
    print("   Add them to .env file or export them:")
    print("   export TME_TOKEN='your_token'")
    print("   export TME_SECRET='your_secret'")
    sys.exit(1)

print(f"🔑 TME Credentials:")
print(f"   Token: {TME_TOKEN[:10]}...{TME_TOKEN[-4:]}")
print(f"   Secret: {TME_SECRET[:10]}...{TME_SECRET[-4:]}")
print()


def generate_signature_v1(token, secret, params):
    """
    Method 1: Official TME documentation format
    POST\napi.tme.eu\nquery_string
    """
    # Sort parameters alphabetically
    sorted_params = sorted(params.items())
    query_string = '&'.join([f"{k}={v}" for k, v in sorted_params])
    
    # Create plaintext: POST\napi.tme.eu\nquery_string
    plaintext = f"POST\napi.tme.eu\n{query_string}"
    
    # Generate HMAC-SHA1 signature
    signature = base64.b64encode(
        hmac.new(
            secret.encode('utf-8'),
            plaintext.encode('utf-8'),
            hashlib.sha1
        ).digest()
    ).decode('utf-8')
    
    return signature, plaintext


def generate_signature_v2(token, secret, params):
    """
    Method 2: Alternative format with full URL
    POST\nhttps://api.tme.eu\nquery_string
    """
    sorted_params = sorted(params.items())
    query_string = '&'.join([f"{k}={v}" for k, v in sorted_params])
    
    plaintext = f"POST\n{API_BASE}\n{query_string}"
    
    signature = base64.b64encode(
        hmac.new(
            secret.encode('utf-8'),
            plaintext.encode('utf-8'),
            hashlib.sha1
        ).digest()
    ).decode('utf-8')
    
    return signature, plaintext


def generate_signature_v3(token, secret, params):
    """
    Method 3: Query string only (no method/host)
    query_string
    """
    sorted_params = sorted(params.items())
    query_string = '&'.join([f"{k}={v}" for k, v in sorted_params])
    
    plaintext = query_string
    
    signature = base64.b64encode(
        hmac.new(
            secret.encode('utf-8'),
            plaintext.encode('utf-8'),
            hashlib.sha1
        ).digest()
    ).decode('utf-8')
    
    return signature, plaintext


def generate_signature_v4(token, secret, params):
    """
    Method 4: With endpoint path
    POST\n/products/search.json\nquery_string
    """
    sorted_params = sorted(params.items())
    query_string = '&'.join([f"{k}={v}" for k, v in sorted_params])
    
    plaintext = f"POST\n/products/search.json\n{query_string}"
    
    signature = base64.b64encode(
        hmac.new(
            secret.encode('utf-8'),
            plaintext.encode('utf-8'),
            hashlib.sha1
        ).digest()
    ).decode('utf-8')
    
    return signature, plaintext


def test_search(mpn, signature_method, method_name):
    """Test TME API with specific signature generation method"""
    
    params = {
        'Token': TME_TOKEN,
        'Country': 'RU',
        'Language': 'RU',
        'SearchPlain': mpn
    }
    
    signature, plaintext = signature_method(TME_TOKEN, TME_SECRET, params)
    params['ApiSignature'] = signature
    
    print(f"\n{'='*80}")
    print(f"🧪 Test: {method_name}")
    print(f"{'='*80}")
    print(f"MPN: {mpn}")
    print(f"\nPlaintext for signature:")
    print(f"{plaintext}")
    print(f"\nSignature: {signature}")
    print(f"\nRequest parameters:")
    for k, v in params.items():
        if k == 'ApiSignature':
            print(f"  {k}: {v[:20]}...{v[-10:]}")
        else:
            print(f"  {k}: {v}")
    
    url = f"{API_BASE}/products/search.json"
    
    try:
        response = requests.post(url, data=params, timeout=10)
        
        print(f"\n📊 Response:")
        print(f"   Status: {response.status_code}")
        print(f"   Headers:")
        for k, v in response.headers.items():
            if k.lower() in ['content-type', 'content-length', 'x-ratelimit-remaining']:
                print(f"      {k}: {v}")
        
        if response.status_code == 200:
            print(f"\n✅ SUCCESS!")
            try:
                data = response.json()
                print(f"\n   Response JSON:")
                print(f"   {json.dumps(data, indent=2)[:500]}...")
                return True
            except:
                print(f"\n   Response text:")
                print(f"   {response.text[:500]}")
                return False
        else:
            print(f"\n❌ FAILED")
            print(f"\n   Response text:")
            print(f"   {response.text[:500]}")
            return False
            
    except Exception as e:
        print(f"\n❌ Exception: {e}")
        return False


def test_all_methods(mpn):
    """Test all signature generation methods"""
    
    methods = [
        (generate_signature_v1, "Method 1: POST\\napi.tme.eu\\nquery"),
        (generate_signature_v2, "Method 2: POST\\nhttps://api.tme.eu\\nquery"),
        (generate_signature_v3, "Method 3: query only"),
        (generate_signature_v4, "Method 4: POST\\n/products/search.json\\nquery")
    ]
    
    results = []
    
    for method, name in methods:
        success = test_search(mpn, method, name)
        results.append((name, success))
    
    print(f"\n\n{'='*80}")
    print(f"📋 SUMMARY")
    print(f"{'='*80}")
    
    for name, success in results:
        status = "✅ SUCCESS" if success else "❌ FAILED"
        print(f"{status}: {name}")
    
    if any(success for _, success in results):
        print(f"\n🎉 At least one method worked!")
        return True
    else:
        print(f"\n⚠️ All methods failed. Possible issues:")
        print(f"   1. Invalid credentials (check TME_TOKEN and TME_SECRET)")
        print(f"   2. API key not activated (check TME developer portal)")
        print(f"   3. IP restrictions (may need whitelist)")
        print(f"   4. Missing API permissions (need 'products' access)")
        print(f"   5. Account expired or suspended")
        return False


def main():
    """Main test execution"""
    
    print(f"\n{'='*80}")
    print(f"TME API Signature Test")
    print(f"{'='*80}\n")
    
    # Test with common components
    test_mpns = [
        'LM317',
        'ATMEGA328P-PU',
        'LM317MBSTT3G'
    ]
    
    for mpn in test_mpns:
        print(f"\n\n{'#'*80}")
        print(f"# Testing MPN: {mpn}")
        print(f"{'#'*80}")
        
        success = test_all_methods(mpn)
        
        if success:
            print(f"\n✅ Found working signature method for {mpn}")
            break
    else:
        print(f"\n❌ No working signature method found for any test MPN")
        print(f"\n💡 Next steps:")
        print(f"   1. Check TME developer portal: https://developers.tme.eu/")
        print(f"   2. Verify API key is activated")
        print(f"   3. Check API permissions (need 'Products Search' access)")
        print(f"   4. Contact TME support if credentials are correct")


if __name__ == '__main__':
    main()
