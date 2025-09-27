#!/usr/bin/env python3
# final_browser_test_debug.py - Финальное браузерное тестирование с детальной отладкой
from playwright.sync_api import sync_playwright
import requests
import json
import time
from datetime import datetime
import os

def log(msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {msg}")

def test_direct_urls():
    """Тестируем прямые URL без формы поиска"""
    log("🧪 ТЕСТИРУЕМ ПРЯМЫЕ URL...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1366, "height": 768})
        
        try:
            os.makedirs("screenshots_final", exist_ok=True)
            
            # 1. ГЛАВНАЯ СТРАНИЦА
            log("📄 Тестируем главную страницу...")
            page.goto("http://89.104.69.77/", wait_until="networkidle", timeout=30000)
            page.screenshot(path="screenshots_final/01_homepage.png", full_page=True)
            
            title = page.title()
            content = page.content()
            log(f"   Заголовок: {title}")
            log(f"   Размер контента: {len(content)} символов")
            
            # Проверяем наличие формы поиска
            search_forms = page.locator("form, input[type='text']")
            log(f"   Форм поиска: {search_forms.count()}")
            
            # 2. ПРЯМОЙ ПЕРЕХОД К ПОИСКУ
            log("🔍 Тестируем прямой поиск...")
            search_url = "http://89.104.69.77/ui/search.html?q=LM317T"
            page.goto(search_url, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(5000)  # Ждем загрузки данных
            
            page.screenshot(path="screenshots_final/02_direct_search.png", full_page=True)
            
            # Проверяем содержимое страницы
            page_text = page.inner_text("body")
            log(f"   Текст на странице поиска (первые 200 символов): {page_text[:200]}")
            
            # Ищем результаты
            results_divs = page.locator(".result-item, .results, #results")
            log(f"   Найдено результатов: {results_divs.count()}")
            
            # Ищем изображения
            images = page.locator("img")
            log(f"   Изображений на странице: {images.count()}")
            
            # Ищем цены
            price_elements = page.locator(":text-matches('[0-9]+₽|[0-9]+ руб', 'i')")
            log(f"   Ценовых элементов: {price_elements.count()}")
            
            # Проверяем наличие данных в DOM
            if "LM317T" in page_text and ("₽" in page_text or "руб" in page_text):
                log("✅ Данные найдены на странице поиска!")
                
                # 3. ПРЯМОЙ ПЕРЕХОД К ТОВАРУ
                log("📦 Тестируем прямую карточку товара...")
                product_url = "http://89.104.69.77/ui/product.html?mpn=LM317T"
                page.goto(product_url, wait_until="networkidle", timeout=30000)
                page.wait_for_timeout(5000)  # Ждем загрузки данных
                
                page.screenshot(path="screenshots_final/03_direct_product.png", full_page=True)
                
                product_text = page.inner_text("body")
                log(f"   Текст карточки товара (первые 200 символов): {product_text[:200]}")
                
                # Ищем элементы карточки
                images = page.locator("img")
                specs = page.locator("table, .specs")
                price = page.locator(":text-matches('[0-9]+₽', 'i')")
                
                log(f"   Изображений: {images.count()}")
                log(f"   Таблиц/спецификаций: {specs.count()}")
                log(f"   Цен: {price.count()}")
                
                if "LM317T" in product_text and images.count() > 0 and specs.count() > 0:
                    log("✅ КАРТОЧКА ТОВАРА РАБОТАЕТ КОРРЕКТНО!")
                    return True
                else:
                    log("❌ Карточка товара неполная")
                    return False
            else:
                log("❌ Данные не найдены на странице поиска")
                
                # Дополнительная отладка - проверяем консоль браузера
                log("🔍 Проверяем консоль браузера...")
                console_messages = []
                page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
                
                page.reload(wait_until="networkidle")
                page.wait_for_timeout(3000)
                
                log(f"   Сообщений в консоли: {len(console_messages)}")
                for msg in console_messages[-5:]:  # Показываем последние 5
                    log(f"     {msg}")
                
                return False
                
        except Exception as e:
            log(f"❌ Ошибка браузерного теста: {e}")
            page.screenshot(path="screenshots_final/error.png", full_page=True)
            return False
        finally:
            browser.close()

def main():
    log("🚀 ФИНАЛЬНОЕ БРАУЗЕРНОЕ ТЕСТИРОВАНИЕ")
    
    # Сначала проверяем API
    log("🧪 Проверяем API...")
    try:
        response = requests.get("http://89.104.69.77/api/search?q=LM317T", timeout=10)
        if response.status_code == 200:
            data = response.json()
            log(f"✅ Search API работает: {len(data.get('items', []))} результатов")
            if data.get('items'):
                item = data['items'][0]
                log(f"   Пример: {item.get('title')}, {item.get('price_min_rub')}₽")
        else:
            log(f"❌ Search API: статус {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ Search API ошибка: {e}")
        return False
    
    try:
        response = requests.get("http://89.104.69.77/api/product?mpn=LM317T", timeout=10)
        if response.status_code == 200:
            data = response.json()
            log(f"✅ Product API работает: {data.get('ok')}")
            if data.get('product'):
                product = data['product']
                log(f"   Пример: {product.get('title')}, галерея: {len(product.get('gallery', []))}")
        else:
            log(f"❌ Product API: статус {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ Product API ошибка: {e}")
        return False
    
    # Браузерное тестирование
    success = test_direct_urls()
    
    if success:
        log("🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
        log("📸 Финальные скриншоты в папке screenshots_final/")
        log("🌐 САЙТ ПОЛНОСТЬЮ ФУНКЦИОНАЛЕН:")
        log("   • Главная: http://89.104.69.77/")
        log("   • Поиск: http://89.104.69.77/ui/search.html?q=LM317T")
        log("   • Товар: http://89.104.69.77/ui/product.html?mpn=LM317T")
        log("   • API поиск: http://89.104.69.77/api/search?q=LM317T")
        log("   • API товар: http://89.104.69.77/api/product?mpn=LM317T")
        return True
    else:
        log("❌ БРАУЗЕРНЫЕ ТЕСТЫ НЕ ПРОШЛИ")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
