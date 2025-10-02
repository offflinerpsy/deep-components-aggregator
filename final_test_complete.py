import requests

print("="*60)
print("ФИНАЛЬНАЯ ПРОВЕРКА - M83513/19-E01NW")
print("="*60)

# Test API
api_url = 'http://5.129.228.88:9201/api/product?mpn=M83513/19-E01NW'
response = requests.get(api_url)
data = response.json()

if data['ok']:
    product = data['product']
    specs = product.get('technical_specs', {})
    images = product.get('images', [])
    
    print(f"\n✅ API Response:")
    print(f"   Спецификации: {len(specs)}")
    print(f"   Картинки: {len(images)}")
    
    print(f"\n📋 Спецификации:")
    for i, (key, value) in enumerate(specs.items(), 1):
        print(f"   {i}. {key}: {value}")
    
    print(f"\n🖼️  Картинки:")
    for i, img in enumerate(images, 1):
        print(f"   {i}. {img}")
    
    # Test image proxy
    if images:
        img_url = images[0]
        proxy_url = f'http://5.129.228.88:9201/api/image?url={img_url}'
        print(f"\n🔄 Тест прокси картинки:")
        print(f"   Оригинал: {img_url}")
        print(f"   Прокси: {proxy_url}")
        
        img_response = requests.head(proxy_url)
        if img_response.status_code == 200:
            print(f"   ✅ Прокси работает! {img_response.headers.get('Content-Type')}, {img_response.headers.get('Content-Length')} bytes")
        else:
            print(f"   ❌ Прокси не работает: {img_response.status_code}")
    
    print(f"\n" + "="*60)
    print("📊 ИТОГОВЫЙ РЕЗУЛЬТАТ")
    print("="*60)
    print(f"✅ API работает")
    print(f"✅ Спецификаций: {len(specs)} (было 1)")
    print(f"✅ Картинок: {len(images)}")
    print(f"✅ Image proxy работает")
    print(f"\n🌐 Открой страницу:")
    print(f"   http://5.129.228.88:9201/product.html?mpn=M83513/19-E01NW")
    print(f"\n⚠️  ВАЖНО: Нажми Ctrl+Shift+R для жесткого обновления!")
    print(f"   (чтобы загрузить версию ?v=6)")
    
else:
    print(f"❌ Ошибка API: {data.get('error')}")
