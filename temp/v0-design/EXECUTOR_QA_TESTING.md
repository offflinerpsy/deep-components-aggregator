# ИНСТРУКЦИЯ ПО ПРОВЕРКЕ И ТЕСТИРОВАНИЮ

## ⚠️ ВАЖНО: НЕ СДАВАЙ РАБОТУ ПОКА НЕ ПРОЙДЕНЫ ВСЕ ПРОВЕРКИ

Ты должен самостоятельно проверить свою работу и исправить ВСЕ несоответствия. Работа считается выполненной только когда ВСЕ пункты ниже пройдены.

---

## Шаг 1: Автоматическая проверка с Playwright

Создай файл `qa-check.js`:

\`\`\`javascript
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function qaCheck() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  const qaDir = './qa-results';
  if (!fs.existsSync(qaDir)) {
    fs.mkdirSync(qaDir, { recursive: true });
  }

  const results = {
    passed: [],
    failed: [],
    timestamp: new Date().toISOString()
  };

  console.log('🔍 Начинаю проверку...\n');

  // ============================================
  // ПРОВЕРКА 1: ГЛАВНАЯ СТРАНИЦА
  // ============================================
  console.log('📋 Проверка 1: Главная страница');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);

  // 1.1 Анимированный фон
  const hasAnimatedBg = await page.evaluate(() => {
    const before = window.getComputedStyle(document.body, '::before');
    return before.content !== 'none' && before.animation !== 'none';
  });
  
  if (hasAnimatedBg) {
    console.log('  ✅ Анимированный фон работает');
    results.passed.push('Анимированный фон');
  } else {
    console.log('  ❌ Анимированный фон НЕ работает');
    results.failed.push('Анимированный фон отсутствует или не анимирован');
  }

  // 1.2 Glassmorphism поисковая строка
  const searchGlass = await page.evaluate(() => {
    const searchBlock = document.querySelector('.glass');
    if (!searchBlock) return false;
    const styles = window.getComputedStyle(searchBlock);
    return styles.backdropFilter.includes('blur') || styles.webkitBackdropFilter.includes('blur');
  });
  
  if (searchGlass) {
    console.log('  ✅ Поисковая строка с glassmorphism');
    results.passed.push('Glassmorphism поиск');
  } else {
    console.log('  ❌ Поисковая строка БЕЗ glassmorphism');
    results.failed.push('Поисковая строка не имеет эффекта стекла');
  }

  // 1.3 Кликабельные плитки компонентов
  const componentCards = await page.locator('[class*="component-card"], [class*="card"]').count();
  const clickableCards = await page.locator('[class*="component-card"] a, [class*="card"] a, [class*="component-card"][role="button"]').count();
  
  if (clickableCards >= 6) {
    console.log(`  ✅ Найдено ${clickableCards} кликабельных плиток`);
    results.passed.push('Кликабельные плитки');
  } else {
    console.log(`  ❌ Найдено только ${clickableCards} кликабельных плиток (нужно минимум 6)`);
    results.failed.push(`Недостаточно кликабельных плиток: ${clickableCards}/6`);
  }

  // 1.4 Тест клика по плитке
  if (clickableCards > 0) {
    const firstCard = page.locator('[class*="component-card"] a, [class*="card"] a').first();
    await firstCard.click();
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/search')) {
      console.log('  ✅ Клик по плитке ведет на страницу поиска');
      results.passed.push('Навигация с плитки');
    } else {
      console.log('  ❌ Клик по плитке НЕ ведет на страницу поиска');
      results.failed.push('Навигация с плитки не работает');
    }
  }

  await page.screenshot({ path: path.join(qaDir, '1-main-page-qa.png'), fullPage: true });

  // ============================================
  // ПРОВЕРКА 2: СТРАНИЦА ПОИСКА
  // ============================================
  console.log('\n📋 Проверка 2: Страница поиска');
  await page.goto('http://localhost:3000');
  await page.fill('input[type="text"]', 'LM317');
  await page.press('input[type="text"]', 'Enter');
  await page.waitForTimeout(4000); // Ждем SSE

  // 2.1 Лоадер при переходе
  const hasLoader = await page.locator('[class*="loader"], [class*="loading"], [class*="spinner"]').count() > 0;
  if (hasLoader) {
    console.log('  ✅ Лоадер отображается');
    results.passed.push('Лоадер');
  } else {
    console.log('  ⚠️  Лоадер не найден (проверь вручную)');
  }

  // 2.2 Таблица с glassmorphism
  const tableGlass = await page.evaluate(() => {
    const table = document.querySelector('table');
    if (!table) return false;
    const parent = table.closest('.glass');
    if (!parent) return false;
    const styles = window.getComputedStyle(parent);
    return styles.backdropFilter.includes('blur') || styles.webkitBackdropFilter.includes('blur');
  });
  
  if (tableGlass) {
    console.log('  ✅ Таблица с glassmorphism');
    results.passed.push('Glassmorphism таблица');
  } else {
    console.log('  ❌ Таблица БЕЗ glassmorphism');
    results.failed.push('Таблица не имеет эффекта стекла');
  }

  // 2.3 Кнопка "Купить" в каждой строке
  const buyButtons = await page.locator('table tbody tr button:has-text("Купить"), table tbody tr a:has-text("Купить")').count();
  const tableRows = await page.locator('table tbody tr').count();
  
  if (buyButtons >= tableRows && tableRows > 0) {
    console.log(`  ✅ Кнопки "Купить" в каждой строке (${buyButtons}/${tableRows})`);
    results.passed.push('Кнопки Купить');
  } else {
    console.log(`  ❌ Не хватает кнопок "Купить" (${buyButtons}/${tableRows})`);
    results.failed.push(`Кнопки "Купить" отсутствуют в ${tableRows - buyButtons} строках`);
  }

  // 2.4 Фильтры
  const filters = await page.locator('select, input[type="text"][placeholder*="фильтр"], input[type="text"][placeholder*="Фильтр"]').count();
  
  if (filters >= 4) {
    console.log(`  ✅ Найдено ${filters} фильтров`);
    results.passed.push('Фильтры');
  } else {
    console.log(`  ❌ Найдено только ${filters} фильтров (нужно минимум 4: цена, наличие, производитель, имя)`);
    results.failed.push(`Недостаточно фильтров: ${filters}/4`);
  }

  // 2.5 Зеленые цены
  const greenPrices = await page.evaluate(() => {
    const prices = Array.from(document.querySelectorAll('td')).filter(td => 
      td.textContent.includes('₽') || td.textContent.includes('руб')
    );
    return prices.some(price => {
      const color = window.getComputedStyle(price).color;
      return color.includes('34, 197, 94') || color.includes('16, 185, 129'); // green-500 or green-600
    });
  });
  
  if (greenPrices) {
    console.log('  ✅ Цены зеленого цвета');
    results.passed.push('Зеленые цены');
  } else {
    console.log('  ❌ Цены НЕ зеленого цвета');
    results.failed.push('Цены должны быть зеленого цвета');
  }

  await page.screenshot({ path: path.join(qaDir, '2-search-page-qa.png'), fullPage: true });

  // ============================================
  // ПРОВЕРКА 3: КАРТОЧКА ТОВАРА
  // ============================================
  console.log('\n📋 Проверка 3: Карточка товара');
  
  // Кликаем на первую кнопку "Купить"
  const firstBuyButton = page.locator('table tbody tr button:has-text("Купить"), table tbody tr a:has-text("Купить")').first();
  if (await firstBuyButton.count() > 0) {
    await firstBuyButton.click();
    await page.waitForTimeout(3000);

    // 3.1 Галерея изображений
    const hasGallery = await page.locator('[class*="gallery"], [class*="carousel"], [class*="swiper"]').count() > 0;
    const galleryImages = await page.locator('[class*="gallery"] img, [class*="carousel"] img, [class*="swiper"] img').count();
    
    if (hasGallery && galleryImages > 1) {
      console.log(`  ✅ Галерея с ${galleryImages} изображениями`);
      results.passed.push('Галерея');
    } else {
      console.log(`  ❌ Галерея отсутствует или только 1 изображение`);
      results.failed.push('Нет галереи с плавными переключениями');
    }

    // 3.2 Табы (Характеристики/Предложения/Документы)
    const tabs = await page.locator('[role="tab"], [class*="tab"]').count();
    
    if (tabs >= 3) {
      console.log(`  ✅ Найдено ${tabs} табов`);
      results.passed.push('Табы');
      
      // Проверяем ховер на табах
      const firstTab = page.locator('[role="tab"], [class*="tab"]').first();
      await firstTab.hover();
      await page.waitForTimeout(500);
      
      const cursorStyle = await firstTab.evaluate(el => window.getComputedStyle(el).cursor);
      if (cursorStyle === 'pointer') {
        console.log('  ✅ Курсор меняется на pointer при ховере');
        results.passed.push('Ховер на табах');
      } else {
        console.log('  ❌ Курсор НЕ меняется на pointer');
        results.failed.push('Курсор на табах должен быть pointer');
      }
    } else {
      console.log(`  ❌ Найдено только ${tabs} табов (нужно 3)`);
      results.failed.push('Недостаточно табов');
    }

    // 3.3 Выбор количества товара
    const quantityInput = await page.locator('input[type="number"], input[name*="quantity"], input[placeholder*="количество"]').count();
    
    if (quantityInput > 0) {
      console.log('  ✅ Поле выбора количества есть');
      results.passed.push('Выбор количества');
    } else {
      console.log('  ❌ Поле выбора количества отсутствует');
      results.failed.push('Нет поля для выбора количества товара');
    }

    // 3.4 Sticky блок заказа
    const stickyBlock = await page.evaluate(() => {
      const orderBlock = document.querySelector('[class*="order"], [class*="price-block"]');
      if (!orderBlock) return false;
      const styles = window.getComputedStyle(orderBlock);
      return styles.position === 'sticky' || styles.position === 'fixed';
    });
    
    if (stickyBlock) {
      console.log('  ✅ Блок заказа sticky');
      results.passed.push('Sticky блок');
    } else {
      console.log('  ❌ Блок заказа НЕ sticky');
      results.failed.push('Блок заказа должен быть sticky');
    }

    // 3.5 Футер не прыгает
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    const footerPosition1 = await page.locator('footer').boundingBox();
    
    // Переключаем таб
    const secondTab = page.locator('[role="tab"], [class*="tab"]').nth(1);
    if (await secondTab.count() > 0) {
      await secondTab.click();
      await page.waitForTimeout(1000);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
      const footerPosition2 = await page.locator('footer').boundingBox();
      
      if (footerPosition1 && footerPosition2 && Math.abs(footerPosition1.y - footerPosition2.y) < 10) {
        console.log('  ✅ Футер не прыгает при переключении табов');
        results.passed.push('Футер зафиксирован');
      } else {
        console.log('  ❌ Футер прыгает при переключении табов');
        results.failed.push('Футер должен быть зафиксирован внизу');
      }
    }

    await page.screenshot({ path: path.join(qaDir, '3-product-page-qa.png'), fullPage: true });
  } else {
    console.log('  ❌ Не удалось перейти на карточку товара');
    results.failed.push('Кнопка "Купить" не работает');
  }

  // ============================================
  // ИТОГОВЫЙ ОТЧЕТ
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ');
  console.log('='.repeat(50));
  console.log(`✅ Пройдено: ${results.passed.length}`);
  console.log(`❌ Провалено: ${results.failed.length}`);
  console.log('');

  if (results.failed.length > 0) {
    console.log('❌ РАБОТА НЕ ПРИНЯТА. Исправь следующие проблемы:\n');
    results.failed.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`);
    });
  } else {
    console.log('✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ! Можно сдавать работу.');
  }

  // Сохраняем отчет
  fs.writeFileSync(
    path.join(qaDir, 'qa-report.json'),
    JSON.stringify(results, null, 2)
  );

  await browser.close();
  
  return results.failed.length === 0;
}

qaCheck().then(passed => {
  process.exit(passed ? 0 : 1);
}).catch(err => {
  console.error('Ошибка при проверке:', err);
  process.exit(1);
});
\`\`\`

Запусти проверку:
\`\`\`bash
node qa-check.js
\`\`\`

---

## Шаг 2: Визуальная проверка (вручную)

После автоматической проверки, проверь визуально:

### Чеклист визуальной проверки:

#### Главная страница:
- [ ] Фон анимируется плавно (градиент меняется)
- [ ] Плавающие пятна двигаются
- [ ] Поисковая строка в glassmorphism блоке (видно размытие фона)
- [ ] Плитки компонентов выглядят премиально (не дешево)
- [ ] При наведении на плитку - плавный hover эффект
- [ ] Шрифты читаемые, отступы равномерные
- [ ] Логотип "ДИПОНИКА" анимирован

#### Страница поиска:
- [ ] При переходе показывается лоадер (минимум 1 секунда)
- [ ] Таблица в glassmorphism блоке
- [ ] Цены ЗЕЛЕНЫЕ и жирные
- [ ] Кнопка "Купить" в каждой строке, видна четко
- [ ] Фильтры работают (можно вводить текст, выбирать значения)
- [ ] Фильтры с автоподхватом (начинаешь вводить - появляются подсказки)
- [ ] Длинные значения в фильтрах не рвут layout
- [ ] Hover на строках таблицы (подсветка)

#### Карточка товара:
- [ ] При переходе показывается лоадер
- [ ] Галерея работает (можно переключать фото)
- [ ] Переключение фото ПЛАВНОЕ (с анимацией)
- [ ] Картинка товара НЕ огромная (разумный размер)
- [ ] Табы четко выделены (понятно что это табы)
- [ ] При наведении на таб - hover эффект
- [ ] Курсор на табах - pointer
- [ ] Техническое описание красиво оформлено (поля названий/значений)
- [ ] Блок заказа sticky (прилипает при скролле)
- [ ] Есть поле выбора количества товара
- [ ] Футер НЕ прыгает при переключении табов
- [ ] Длинные блоки обрезаны с кнопкой "Читать больше"

#### Общий дизайн:
- [ ] Цвета контрастные (не бледные)
- [ ] Выглядит премиально (не дешево)
- [ ] Единый стиль на всех страницах
- [ ] Шрифты одинаковые везде
- [ ] Отступы равномерные
- [ ] Все анимации плавные (не дергаются)

---

## Шаг 3: Сравнение с эталоном

Открой эталонные скриншоты из репозитория v0:
- https://github.com/offflinerpsy/v0-components-aggregator-page

Сравни ВИЗУАЛЬНО:
1. Цвета должны совпадать
2. Размеры блоков должны быть похожи
3. Анимации должны быть такие же
4. Glassmorphism эффект должен быть виден

**Если есть отличия - ИСПРАВЬ!**

---

## Шаг 4: Формат отчета для v0

После того как ВСЕ проверки пройдены, создай файл `FINAL_REPORT.md`:

\`\`\`markdown
# ФИНАЛЬНЫЙ ОТЧЕТ

## Дата: [дата]
## Исполнитель: [твое имя]

## Статус: ✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ

## Автоматические тесты

\`\`\`
Запуск: node qa-check.js
Результат: ✅ Все тесты пройдены (0 ошибок)
\`\`\`

## Визуальная проверка

- ✅ Главная страница соответствует эталону
- ✅ Страница поиска соответствует эталону
- ✅ Карточка товара соответствует эталону

## Скриншоты

Приложены скриншоты:
- `qa-results/1-main-page-qa.png`
- `qa-results/2-search-page-qa.png`
- `qa-results/3-product-page-qa.png`

## Изменения

### Файл: app/page.tsx
- Добавлены кликабельные плитки компонентов
- Исправлена навигация

### Файл: app/search/page.tsx
- Добавлены кнопки "Купить"
- Добавлены фильтры с автоподхватом
- Добавлен лоадер

### Файл: app/product/[id]/page.tsx
- Добавлена галерея с плавными переключениями
- Исправлены табы (hover, cursor)
- Добавлено поле выбора количества
- Зафиксирован футер

### Файл: app/globals.css
- Улучшен контраст цветов
- Добавлены премиум стили

## Проблемы (если были)

[Опиши какие проблемы были и как решил]

## Готово к продакшену: ✅ ДА
\`\`\`

---

## Шаг 5: Загрузка результатов

\`\`\`bash
# Создай новый коммит
git add .
git commit -m "QA: All checks passed, ready for production"

# Запушь в GitHub
git push origin main

# Создай архив с результатами
cd qa-results
zip -r ../qa-final.zip .
cd ..
\`\`\`

Отправь:
1. Ссылку на GitHub репозиторий
2. Файл `FINAL_REPORT.md`
3. Архив `qa-final.zip` со скриншотами

---

## ⚠️ КРИТЕРИИ ПРИЕМКИ (СТРОГО!)

Работа НЕ ПРИНИМАЕТСЯ если:

1. ❌ Хотя бы 1 автоматический тест провален
2. ❌ Визуально отличается от эталона
3. ❌ Нет лоадеров при переходах
4. ❌ Футер прыгает
5. ❌ Нет галереи на карточке товара
6. ❌ Табы не кликабельные или без hover
7. ❌ Фильтры не работают
8. ❌ Цены не зеленые
9. ❌ Дизайн выглядит дешево (не премиум)
10. ❌ Анимации дергаются или отсутствуют

## ✅ Работа ПРИНИМАЕТСЯ если:

1. ✅ Все автоматические тесты пройдены (0 ошибок)
2. ✅ Визуально совпадает с эталоном (90%+ совпадение)
3. ✅ Все анимации плавные
4. ✅ Премиум дизайн
5. ✅ Единый стиль везде
6. ✅ Все функции работают

---

## Итеративная доработка

Если тесты не прошли:

1. Посмотри какие тесты провалены
2. Исправь проблемы
3. Запусти тесты снова
4. Повторяй пока все не пройдет

**НЕ СДАВАЙ РАБОТУ ПОКА ВСЕ НЕ ЗЕЛЕНОЕ!**

---

## Контакт с v0

Если застрял:
1. Сделай скриншоты проблемы
2. Скопируй код проблемного места
3. Опиши что не работает
4. Отправь v0 для помощи

Но сначала попробуй исправить сам!
