"""
Тест поиска LM317 - проверяю ВСЁ что работает
"""
from playwright.sync_api import sync_playwright
import time

def test_search():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("🔍 Открываю страницу поиска...")
        page.goto('http://5.129.228.88:9201/search.html?q=LM317', timeout=15000)
        
        # Ждём загрузки
        time.sleep(3)
        
        # Проверяю title
        title = page.title()
        print(f"📄 Title: {title}")
        
        # Проверяю summary
        summary = page.locator('#results-summary').text_content()
        print(f"📊 Summary: {summary}")
        
        # Проверяю tbody
        tbody = page.locator('#results-tbody')
        rows = tbody.locator('tr').count()
        print(f"📋 Rows in table: {rows}")
        
        # Если есть строки - выведу первую
        if rows > 0:
            first_row = tbody.locator('tr').first
            mpn = first_row.locator('td').nth(1).text_content()
            manufacturer = first_row.locator('td').nth(2).text_content()
            price = first_row.locator('td').nth(8).text_content()
            print(f"✅ Первый результат: {mpn} от {manufacturer}, цена: {price}")
        else:
            print("❌ НЕТ РЕЗУЛЬТАТОВ В ТАБЛИЦЕ!")
            
            # Проверяю console errors
            print("\n🔍 Проверяю Console Errors:")
            page.on("console", lambda msg: print(f"  CONSOLE {msg.type}: {msg.text}"))
            page.on("pageerror", lambda exc: print(f"  PAGE ERROR: {exc}"))
            
            # Проверяю что загрузилось
            print("\n🔍 Проверяю загруженные ресурсы:")
            page.on("response", lambda response: 
                print(f"  {response.status} {response.url}") if 'search' in response.url or 'api' in response.url else None
            )
            
            # Перезагружаю чтобы поймать ошибки
            page.reload(wait_until='networkidle')
            time.sleep(2)
            
            # Повторно проверяю
            rows_after = tbody.locator('tr').count()
            summary_after = page.locator('#results-summary').text_content()
            print(f"\n📊 После reload: summary='{summary_after}', rows={rows_after}")
        
        # Screenshot для отладки
        page.screenshot(path='search_test.png')
        print("\n📸 Screenshot сохранён: search_test.png")
        
        browser.close()
        
        return rows > 0

if __name__ == '__main__':
    success = test_search()
    print(f"\n{'✅ ТЕСТ ПРОЙДЕН' if success else '❌ ТЕСТ ПРОВАЛЕН'}")
    exit(0 if success else 1)
