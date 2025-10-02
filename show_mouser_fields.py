#!/usr/bin/env python3
"""
Показать какие КОНКРЕТНО поля отдаёт Mouser API для одного товара
БЕЗ СКРАПИНГА - только чистый API response
"""

import os
import requests
import json

# Mouser API
MOUSER_API_KEY = os.getenv('MOUSER_API_KEY')
MOUSER_API_BASE = 'https://api.mouser.com/api/v1'

def show_mouser_response(mpn):
    """Показать полный ответ Mouser API"""
    
    url = f"{MOUSER_API_BASE}/search/keyword"
    
    params = {
        'apiKey': MOUSER_API_KEY
    }
    
    body = {
        'SearchByKeywordRequest': {
            'keyword': mpn,
            'records': 1,
            'startingRecord': 0,
            'searchOptions': None,
            'searchWithYourSignUpLanguage': None
        }
    }
    
    print(f"\n{'='*80}")
    print(f"🔍 Mouser API Response for: {mpn}")
    print(f"{'='*80}\n")
    
    response = requests.post(url, params=params, json=body)
    
    print(f"Status: {response.status_code}\n")
    
    if response.status_code == 200:
        data = response.json()
        
        if 'SearchResults' in data and 'Parts' in data['SearchResults']:
            parts = data['SearchResults']['Parts']
            
            if len(parts) > 0:
                product = parts[0]
                
                print(f"✅ Найден продукт: {product.get('ManufacturerPartNumber')}\n")
                
                # 1. ProductAttributes
                print(f"{'─'*80}")
                print(f"1️⃣  ProductAttributes (основные характеристики):")
                print(f"{'─'*80}")
                
                attrs = product.get('ProductAttributes', [])
                if attrs:
                    for i, attr in enumerate(attrs, 1):
                        name = attr.get('AttributeName', 'N/A')
                        value = attr.get('AttributeValue', 'N/A')
                        print(f"   {i}. {name}: {value}")
                    print(f"\n   Итого: {len(attrs)} параметров\n")
                else:
                    print("   ⚠️  Пусто\n")
                
                # 2. Main Fields
                print(f"{'─'*80}")
                print(f"2️⃣  Main Product Fields (основные поля):")
                print(f"{'─'*80}")
                
                main_fields = {
                    'Manufacturer': product.get('Manufacturer'),
                    'ManufacturerPartNumber': product.get('ManufacturerPartNumber'),
                    'MouserPartNumber': product.get('MouserPartNumber'),
                    'Category': product.get('Category'),
                    'Description': product.get('Description'),
                    'ROHSStatus': product.get('ROHSStatus'),
                    'LifecycleStatus': product.get('LifecycleStatus'),
                    'Availability': product.get('Availability'),
                    'AvailabilityInStock': product.get('AvailabilityInStock'),
                    'FactoryStock': product.get('FactoryStock'),
                    'LeadTime': product.get('LeadTime'),
                    'Min': product.get('Min'),
                    'Mult': product.get('Mult'),
                    'Package': product.get('Package'),
                    'Packaging': product.get('Packaging'),
                    'Series': product.get('Series'),
                    'Weight': product.get('Weight'),
                    'UnitWeightKg': product.get('UnitWeightKg'),
                    'Reeling': product.get('Reeling'),
                    'ImagePath': product.get('ImagePath'),
                    'DataSheetUrl': product.get('DataSheetUrl'),
                    'ProductDetailUrl': product.get('ProductDetailUrl')
                }
                
                count = 0
                for key, value in main_fields.items():
                    if value:
                        print(f"   {key}: {value}")
                        count += 1
                
                print(f"\n   Итого: {count} непустых полей\n")
                
                # 3. ProductCompliance
                print(f"{'─'*80}")
                print(f"3️⃣  ProductCompliance (сертификация):")
                print(f"{'─'*80}")
                
                compliance = product.get('ProductCompliance', [])
                if compliance:
                    for i, comp in enumerate(compliance, 1):
                        name = comp.get('ComplianceName', 'N/A')
                        value = comp.get('ComplianceValue', 'N/A')
                        print(f"   {i}. {name}: {value}")
                    print(f"\n   Итого: {len(compliance)} параметров\n")
                else:
                    print("   ⚠️  Пусто\n")
                
                # 4. PriceBreaks
                print(f"{'─'*80}")
                print(f"4️⃣  PriceBreaks (цены):")
                print(f"{'─'*80}")
                
                prices = product.get('PriceBreaks', [])
                if prices:
                    for i, price in enumerate(prices, 1):
                        qty = price.get('Quantity', 'N/A')
                        p = price.get('Price', 'N/A')
                        curr = price.get('Currency', 'USD')
                        print(f"   {i}. Qty {qty}: {p} {curr}")
                    print(f"\n   Итого: {len(prices)} ценовых уровней\n")
                else:
                    print("   ⚠️  Пусто\n")
                
                # 5. AlternatePackagings
                print(f"{'─'*80}")
                print(f"5️⃣  AlternatePackagings:")
                print(f"{'─'*80}")
                
                alt_pack = product.get('AlternatePackagings', [])
                if alt_pack:
                    print(f"   ✅ Доступно {len(alt_pack)} альтернативных упаковок\n")
                else:
                    print("   ⚠️  Нет\n")
                
                # 6. ProductDocuments
                print(f"{'─'*80}")
                print(f"6️⃣  ProductDocuments (документы):")
                print(f"{'─'*80}")
                
                docs = product.get('ProductDocuments', [])
                if docs:
                    for i, doc in enumerate(docs, 1):
                        url = doc.get('DocumentUrl', 'N/A')
                        doc_type = doc.get('DocumentType', 'N/A')
                        print(f"   {i}. {doc_type}: {url}")
                    print(f"\n   Итого: {len(docs)} документов\n")
                else:
                    print("   ⚠️  Пусто\n")
                
                # ИТОГОВЫЙ ПОДСЧЁТ
                print(f"\n{'='*80}")
                print(f"📊 ИТОГО ТЕХНИЧЕСКИХ ХАРАКТЕРИСТИК:")
                print(f"{'='*80}")
                
                total_specs = len(attrs)  # ProductAttributes
                
                # Count non-empty main fields (excluding images/urls)
                spec_main_fields = ['Manufacturer', 'Category', 'ROHSStatus', 'LifecycleStatus', 
                                   'Package', 'Packaging', 'Series', 'Weight', 'LeadTime']
                for field in spec_main_fields:
                    if main_fields.get(field):
                        total_specs += 1
                
                total_specs += len(compliance)  # ProductCompliance
                
                print(f"\n   ProductAttributes: {len(attrs)}")
                print(f"   Main Fields (specs only): ~{len([f for f in spec_main_fields if main_fields.get(f)])}")
                print(f"   ProductCompliance: {len(compliance)}")
                print(f"   {'─'*40}")
                print(f"   ВСЕГО: ~{total_specs} характеристик")
                print(f"\n   ✅ Mouser API отдаёт ПОЛНЫЕ данные!\n")
                
            else:
                print("❌ Продукт не найден\n")
        else:
            print("❌ Неожиданная структура ответа\n")
            print(json.dumps(data, indent=2)[:500])
    else:
        print(f"❌ Ошибка API: {response.text}\n")


if __name__ == '__main__':
    if not MOUSER_API_KEY:
        print("❌ Error: MOUSER_API_KEY not set")
        print("   Set it: export MOUSER_API_KEY='your_key'")
    else:
        # Тестовые MPN
        test_mpns = ['LM317MBSTT3G', 'ATMEGA328P-PU']
        
        for mpn in test_mpns:
            show_mouser_response(mpn)
            print("\n\n")
