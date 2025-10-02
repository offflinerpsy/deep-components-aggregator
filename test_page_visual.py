import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

options = webdriver.ChromeOptions()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--window-size=1920,1200')

driver = webdriver.Chrome(options=options)

try:
    url = 'http://5.129.228.88:9201/product.html?mpn=M83513/19-E01NW'
    print(f"Loading: {url}")
    driver.get(url)
    
    # Wait for specs to load
    print("Waiting for technical specs section...")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, "technicalSpecsList"))
    )
    
    time.sleep(2)  # Extra wait for JS
    
    # Count specs
    specs_list = driver.find_element(By.ID, "technicalSpecsList")
    spec_items = specs_list.find_elements(By.TAG_NAME, "li")
    
    print(f"\n✅ Found {len(spec_items)} specifications on page!")
    print("\nFirst 15 specifications:")
    for i, item in enumerate(spec_items[:15], 1):
        print(f"   {i}. {item.text}")
    
    if len(spec_items) > 15:
        print(f"   ... and {len(spec_items) - 15} more")
    
    # Take screenshot
    driver.save_screenshot('product_page_specs.png')
    print(f"\n📸 Screenshot saved: product_page_specs.png")
    
except Exception as e:
    print(f"❌ Error: {e}")
    driver.save_screenshot('product_page_error.png')
finally:
    driver.quit()
