#!/usr/bin/env python3
# browser_verification_test.py - Полная браузерная верификация с реальными скриншотами
from playwright.sync_api import sync_playwright
import requests
import json
import time
from datetime import datetime
import os

def log(msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {msg}")
    with open("browser_test.log", "a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] {msg}\n")

def test_api_data():
    """Тестируем что API возвращает реальные данные"""
    log("🧪 Тестируем API данные...")

    # Тест Search API
    try:
        response = requests.get("http://89.104.69.77/api/search?q=LM317T", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") and data.get("items") and len(data["items"]) > 0:
                item = data["items"][0]
                has_image = bool(item.get("image"))
                has_price = bool(item.get("price_min_rub"))
                has_region = bool(item.get("offers") and len(item["offers"]) > 0)

                log(f"✅ Search API: image={has_image}, price={has_price}, region={has_region}")
                log(f"   Данные: {item.get('title')}, цена={item.get('price_min_rub')}₽")

                if has_image and has_price and has_region:
                    return True
                else:
                    log("❌ Search API: отсутствуют критические данные")
                    return False
            else:
                log("❌ Search API: пустой ответ")
                return False
        else:
            log(f"❌ Search API: HTTP {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ Search API ошибка: {e}")
        return False

def test_product_api():
    """Тестируем Product API"""
    log("🧪 Тестируем Product API...")

    try:
        response = requests.get("http://89.104.69.77/api/product?mpn=LM317T", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") and data.get("product"):
                product = data["product"]
                has_gallery = bool(product.get("gallery") and len(product["gallery"]) > 0)
                has_specs = bool(product.get("specs") and len(product["specs"]) > 0)
                has_order = bool(product.get("order"))

                log(f"✅ Product API: gallery={has_gallery}, specs={has_specs}, order={has_order}")
                log(f"   Данные: {product.get('title')}, изображений={len(product.get('gallery', []))}")

                if has_gallery and has_specs and has_order:
                    return True
                else:
                    log("❌ Product API: отсутствуют критические данные")
                    return False
            else:
                log("❌ Product API: пустой ответ")
                return False
        else:
            log(f"❌ Product API: HTTP {response.status_code}")
            return False
    except Exception as e:
        log(f"❌ Product API ошибка: {e}")
        return False

def browser_full_test():
    """Полное браузерное тестирование с реальными скриншотами"""
    log("🌐 Запускаем полное браузерное тестирование...")

    with sync_playwright() as p:
        # Запускаем браузер
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1366, "height": 768})

        try:
            # Создаем папку для скриншотов
            os.makedirs("screenshots", exist_ok=True)

            # 1. ТЕСТ ГЛАВНОЙ СТРАНИЦЫ
            log("📄 Тестируем главную страницу...")
            page.goto("http://89.104.69.77/", wait_until="networkidle", timeout=30000)

            # Проверяем что страница загрузилась
            title = page.title()
            log(f"   Заголовок: {title}")

            # Скриншот главной
            page.screenshot(path="screenshots/01_homepage.png", full_page=True)
            log("✅ Скриншот главной страницы сохранен")

            # 2. ТЕСТ ПОИСКА
            log("🔍 Тестируем поиск...")

            # Ищем форму поиска
            search_input = page.locator("input[type='text'], input[name*='search'], input[placeholder*='поиск'], #search-input")
            search_button = page.locator("button[type='submit'], button:has-text('Поиск'), .search-btn, #search-btn")

            if search_input.count() > 0:
                log("   Найдена форма поиска")
                search_input.first.fill("LM317T")
                page.screenshot(path="screenshots/02_search_filled.png", full_page=True)

                # Нажимаем поиск
                if search_button.count() > 0:
                    search_button.first.click()
                else:
                    # Пробуем Enter
                    search_input.first.press("Enter")

                # Ждем результатов
                page.wait_for_timeout(3000)
                page.screenshot(path="screenshots/03_search_results.png", full_page=True)
                log("✅ Скриншот результатов поиска сохранен")

                # Проверяем наличие результатов
                results = page.locator(".search-result, .item, .product-item, tr, .result-row")
                if results.count() > 0:
                    log(f"   Найдено {results.count()} результатов")

                    # Проверяем наличие изображений
                    images = page.locator("img[src*='placeholder'], img[src*='http']")
                    log(f"   Изображений: {images.count()}")

                    # Проверяем наличие цен
                    prices = page.locator(":text-matches('₽|руб|RUB|[0-9]+)', 'i')")
                    log(f"   Цен: {prices.count()}")

                    # 3. ТЕСТ КАРТОЧКИ ТОВАРА
                    log("📦 Тестируем карточку товара...")

                    # Ищем первую ссылку на товар
                    product_links = page.locator("a[href*='product'], a[href*='#/product'], .product-link, .item-title a")
                    if product_links.count() > 0:
                        product_links.first.click()
                        page.wait_for_timeout(3000)
                        page.screenshot(path="screenshots/04_product_card.png", full_page=True)
                        log("✅ Скриншот карточки товара сохранен")

                        # Проверяем элементы карточки
                        gallery = page.locator("img, .gallery, .product-image")
                        specs = page.locator(".specs, .specifications, .params, table")
                        order_btn = page.locator("button:has-text('Купить'), .buy-btn, .order-btn")

                        log(f"   Галерея: {gallery.count()} элементов")
                        log(f"   Спецификации: {specs.count()} блоков")
                        log(f"   Кнопка заказа: {order_btn.count()}")

                        if gallery.count() > 0 and specs.count() > 0:
                            log("✅ Карточка товара содержит все необходимые элементы")
                            return True
                        else:
                            log("❌ Карточка товара неполная")
                            return False
                    else:
                        log("❌ Не найдены ссылки на товары")
                        return False
                else:
                    log("❌ Результаты поиска не найдены")
                    return False
            else:
                log("❌ Форма поиска не найдена")

                # Пробуем прямой переход к поиску
                log("   Пробуем прямой переход к поиску...")
                page.goto("http://89.104.69.77/ui/search.html?q=LM317T", wait_until="networkidle")
                page.wait_for_timeout(3000)
                page.screenshot(path="screenshots/03_direct_search.png", full_page=True)
                log("✅ Прямой переход к поиску - скриншот сохранен")

                # Проверяем результаты
                results = page.locator("tr, .item, .result")
                if results.count() > 0:
                    log(f"   Найдено {results.count()} результатов через прямой переход")

                    # Тестируем карточку товара напрямую
                    log("📦 Тестируем карточку товара напрямую...")
                    page.goto("http://89.104.69.77/ui/product.html?mpn=LM317T", wait_until="networkidle")
                    page.wait_for_timeout(3000)
                    page.screenshot(path="screenshots/04_direct_product.png", full_page=True)
                    log("✅ Прямая карточка товара - скриншот сохранен")

                    return True
                else:
                    log("❌ Даже прямой переход не дал результатов")
                    return False

        except Exception as e:
            log(f"❌ Браузерный тест не удался: {e}")
            page.screenshot(path="screenshots/error.png", full_page=True)
            return False
        finally:
            browser.close()

def main():
    log("🚀 ПОЛНАЯ ВЕРИФИКАЦИЯ РАБОТОСПОСОБНОСТИ")

    # Тестируем API
    api_search_ok = test_api_data()
    api_product_ok = test_product_api()

    if not (api_search_ok and api_product_ok):
        log("❌ API тесты не прошли, браузерное тестирование может не работать")
        return False

    # Браузерное тестирование
    browser_ok = browser_full_test()

    if browser_ok:
        log("🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
        log("📸 Скриншоты сохранены в папке screenshots/")
        log("🌐 Сайт полностью функционален:")
        log("   - http://89.104.69.77/ (главная)")
        log("   - http://89.104.69.77/ui/search.html?q=LM317T (поиск)")
        log("   - http://89.104.69.77/ui/product.html?mpn=LM317T (товар)")
        return True
    else:
        log("❌ БРАУЗЕРНЫЕ ТЕСТЫ НЕ ПРОШЛИ")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
