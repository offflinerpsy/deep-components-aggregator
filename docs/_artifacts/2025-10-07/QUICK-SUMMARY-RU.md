# Provider Coverage Test — Quick Summary

**Date**: 7 октября 2025  
**Test**: 5 товаров (2N3904, STM32F407VGT6, LM358, DS1307, 1N4007)  
**Providers**: DigiKey ✅ | Mouser ✅ | Farnell ✅ | TME ⚠️

---

## 📊 Результаты в Цифрах

| Критерий | DigiKey | Mouser | Farnell | TME |
|----------|---------|--------|---------|-----|
| **Всего строк** | 47 | 140 | 45 | 29 |
| **Цены** | ✅ 100% | ✅ 98% | ✅ 100% | ❌ **0%** |
| **Остатки** | ✅ 100% | ✅ 77% | ✅ 78% | ❌ **0%** |
| **Картинки** | ✅ 98% | ✅ 96% | ✅ 96% | ✅ 83% |
| **Описания** | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| **Даташиты** | ❌ 0% | ❌ 0% | ❌ 0% | ❌ 0% |

---

## 🎯 Кто Лучший по Ценам?

**2N3904** (транзистор):
- 🏆 **DigiKey** — ₽4 (vs Mouser ₽544, Farnell ₽1268)

**STM32F407VGT6** (MCU):
- 🏆 **Mouser** — ₽6,826 (vs DigiKey ₽9,717, Farnell ₽10,991)

**LM358** (опамп):
- 🏆 **DigiKey** — ₽20 (vs Mouser ₽29)

**DS1307** (RTC):
- 🏆 **DigiKey** — ₽352 (vs Farnell ₽506, Mouser ₽705)

**1N4007** (диод):
- 🏆 **Mouser** — ₽6 (vs DigiKey ₽14)

---

## 🚨 Критические Проблемы

### 1. TME: 0% Цен и Остатков ❌

**Что происходит**:
- TME возвращает товары (29 штук)
- Есть описания ✅, картинки ✅
- НО: `price = 0`, `stock = 0`, `price_breaks = []`

**Пример**:
```json
{
  "source": "tme",
  "title": "Transistor: NPN; bipolar; 40V; 0.2A",
  "stock": 0,           // ❌
  "min_price": null,    // ❌
  "price_breaks": []    // ❌
}
```

**Причина**: 
- GetProducts API вызывается но падает с `E_INVALID_SIGNATURE`
- Fallback на Search API (без цен)
- Та же проблема была на MacBook (но там GetProducts работал, просто нормализатор не парсил)

---

### 2. Даташиты: 0% У Всех ❌

**Что происходит**:
- API провайдеров ВОЗВРАЩАЮТ ссылки на даташиты
- Но нормализаторы их НЕ извлекают
- В UI нет кнопки "Скачать Datasheet"

**Быстрый фикс** (5 минут):
```javascript
// DigiKey normalizer
datasheet_url: product.PrimaryDatasheet

// Mouser normalizer  
datasheet_url: product.DataSheetUrl

// Farnell normalizer
datasheet_url: product.datasheets?.[0]?.url

// TME normalizer
datasheet_url: product.DocumentUrl
```

---

## 📝 Качество Описаний

**Все 100%!** Но стиль разный:

**DigiKey** (кратко):
> TRANS NPN 40V 0.2A TO-92

**Mouser** (категория + параметры):
> Bipolar Transistors - BJT BJT, TO-92, 40V, 200mA, NPN

**Farnell** (полное название + производитель):
> DIOTEC - 2N3904 - Bipolar (BJT) Single Transistor, NPN, 40 V, 200 mA, 625 mW, TO-226AA, Through Hole

**TME** (технический стиль):
> Transistor: NPN; bipolar; 40V; 0.2A; 625mW; TO92

🏆 **Farnell лучше всего** — есть производитель в названии!

---

## 📂 Артефакты

✅ **Полный отчет**: `docs/_artifacts/2025-10-07/provider-coverage-report.md`  
✅ **Сырые данные**: `docs/_artifacts/2025-10-07/provider-coverage-test.json`  
✅ **CSV сводка**: `docs/_artifacts/2025-10-07/provider-coverage-summary.csv`  
✅ **Скрипт**: `scripts/test-provider-coverage.mjs`

---

## 🎯 Следующие Шаги

**Priority 1** — Fix TME Pricing (CRITICAL):
```bash
# Debug GetProducts signature issue
# Check if WARP proxy needed
# Verify normTME() PriceList parsing
```

**Priority 2** — Add Datasheets (5 min):
```bash
# Update 4 normalizers
# Test with curl that URLs work
```

**Priority 3** — Improve Farnell Coverage:
```bash
# Farnell не нашёл LM358, 1N4007
# Попробовать варианты: LM358N, LM358P
```

---

## ✅ Выводы

1. **Все 4 провайдера работают** — это успех! 🎉
2. **DigiKey лучший по мелочам** (дешёвые компоненты)
3. **Mouser лучший по крупным IC** (MCU, специализированные)
4. **Farnell лучшие описания** (производитель в названии)
5. **TME не отдаёт цены** — надо чинить ASAP
6. **Даташитов нет** — быстрый фикс 5 минут

**Общий вердикт**: Система работает, но TME требует фикса подписи API!
