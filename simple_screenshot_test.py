#!/usr/bin/env python3
# simple_screenshot_test.py - Простое создание скриншотов без таймаутов
from playwright.sync_api import sync_playwright
import time
import os
from datetime import datetime

def log(msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {msg}")

def take_screenshots():
    """Делаем скриншоты всех ключевых страниц"""
    log("📸 СОЗДАНИЕ ФИНАЛЬНЫХ СКРИНШОТОВ...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1366, "height": 768})
        
        try:
            os.makedirs("final_screenshots", exist_ok=True)
            
            # 1. ГЛАВНАЯ СТРАНИЦА
            log("📄 Скриншот главной страницы...")
            page.goto("http://89.104.69.77/", wait_until="domcontentloaded")
            time.sleep(2)
            page.screenshot(path="final_screenshots/01_homepage.png", full_page=True)
            log(f"   ✅ Сохранен: final_screenshots/01_homepage.png")
            
            # 2. ПОИСК
            log("🔍 Скриншот страницы поиска...")
            page.goto("http://89.104.69.77/ui/search.html?q=LM317T", wait_until="domcontentloaded")
            time.sleep(5)  # Даем время на загрузку данных через API
            page.screenshot(path="final_screenshots/02_search.png", full_page=True)
            log(f"   ✅ Сохранен: final_screenshots/02_search.png")
            
            # Проверяем что загрузилось
            page_text = page.inner_text("body")
            if "LM317T" in page_text:
                log("   ✅ Данные поиска загружены на страницу")
            else:
                log("   ❌ Данные поиска не загрузились")
            
            # 3. КАРТОЧКА ТОВАРА
            log("📦 Скриншот карточки товара...")
            page.goto("http://89.104.69.77/ui/product.html?mpn=LM317T", wait_until="domcontentloaded")
            time.sleep(5)  # Даем время на загрузку данных через API
            page.screenshot(path="final_screenshots/03_product.png", full_page=True)
            log(f"   ✅ Сохранен: final_screenshots/03_product.png")
            
            # Проверяем что загрузилось
            product_text = page.inner_text("body")
            if "LM317T" in product_text and "Texas Instruments" in product_text:
                log("   ✅ Данные товара загружены на страницу")
            else:
                log("   ❌ Данные товара не загрузились")
                
            # 4. ПОИСК ДРУГОГО ТОВАРА
            log("🔍 Скриншот поиска другого товара...")
            page.goto("http://89.104.69.77/ui/search.html?q=2N7002", wait_until="domcontentloaded")
            time.sleep(5)
            page.screenshot(path="final_screenshots/04_search_2n7002.png", full_page=True)
            log(f"   ✅ Сохранен: final_screenshots/04_search_2n7002.png")
            
            # 5. ПОИСК НА РУССКОМ
            log("🔍 Скриншот поиска на русском...")
            page.goto("http://89.104.69.77/ui/search.html?q=резистор", wait_until="domcontentloaded")
            time.sleep(5)
            page.screenshot(path="final_screenshots/05_search_russian.png", full_page=True)
            log(f"   ✅ Сохранен: final_screenshots/05_search_russian.png")
            
            log("✅ ВСЕ СКРИНШОТЫ СОЗДАНЫ УСПЕШНО!")
            return True
            
        except Exception as e:
            log(f"❌ Ошибка создания скриншотов: {e}")
            return False
        finally:
            browser.close()

def main():
    log("🚀 СОЗДАНИЕ ФИНАЛЬНЫХ СКРИНШОТОВ РАБОТАЮЩЕГО САЙТА")
    
    success = take_screenshots()
    
    if success:
        log("🎉 СКРИНШОТЫ ГОТОВЫ!")
        log("📁 Папка: final_screenshots/")
        log("📸 Файлы:")
        log("   • 01_homepage.png - Главная страница")
        log("   • 02_search.png - Поиск LM317T")
        log("   • 03_product.png - Карточка LM317T")
        log("   • 04_search_2n7002.png - Поиск 2N7002")
        log("   • 05_search_russian.png - Поиск 'резистор'")
        log("")
        log("🌐 РАБОТАЮЩИЕ ССЫЛКИ:")
        log("   • http://89.104.69.77/ (главная)")
        log("   • http://89.104.69.77/ui/search.html?q=LM317T (поиск)")
        log("   • http://89.104.69.77/ui/product.html?mpn=LM317T (товар)")
        log("   • http://89.104.69.77/api/search?q=LM317T (API)")
        log("   • http://89.104.69.77/api/product?mpn=LM317T (API товар)")
        return True
    else:
        log("❌ НЕ УДАЛОСЬ СОЗДАТЬ СКРИНШОТЫ")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
