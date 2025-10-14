# Test Orders Creation Report — October 14, 2025

## Summary
Created 5 test orders via `/api/order` endpoint to verify AdminJS Orders panel functionality.

## Orders Created

### Order 1: LM317 Voltage Regulator
```json
{
  "customer": {
    "name": "Иван Тестов",
    "contact": {
      "email": "ivan.testov@example.com",
      "phone": "+79001234567"
    }
  },
  "item": {
    "mpn": "LM317T",
    "manufacturer": "Texas Instruments",
    "qty": 10
  },
  "meta": {
    "comment": "Стабилизаторы напряжения для блока питания"
  }
}
```
**ID**: `4ca352cb-f665-46ef-b870-9d0998f6b533`  
**Status**: `pending`  
**Created**: 2025-10-14 11:03:09

---

### Order 2: STM32 Microcontroller
```json
{
  "customer": {
    "name": "Мария Инженерова",
    "contact": {
      "email": "maria.eng@techcorp.ru",
      "phone": "+79115550100"
    }
  },
  "item": {
    "mpn": "STM32F407VGT6",
    "manufacturer": "STMicroelectronics",
    "qty": 5
  },
  "meta": {
    "comment": "Микроконтроллеры для прототипа устройства"
  }
}
```
**ID**: `f61a9261-7bc7-415a-9521-03da579a09b5`  
**Status**: `pending`  
**Created**: 2025-10-14 11:03:10

---

### Order 3: Resistor
```json
{
  "customer": {
    "name": "Петр Сидоров",
    "contact": {
      "email": "petr.sidorov@mail.ru",
      "phone": "+79217778899"
    }
  },
  "item": {
    "mpn": "ERJ-6ENF1002V",
    "manufacturer": "Panasonic",
    "qty": 100
  },
  "meta": {
    "comment": "Резисторы 10kΩ 1% SMD 0805"
  }
}
```
**ID**: `74ec2261-d85a-45cb-bdd4-eecf8e5f3387`  
**Status**: `pending`  
**Created**: 2025-10-14 11:03:11

---

### Order 4: Capacitor
```json
{
  "customer": {
    "name": "Анна Электроникова",
    "contact": {
      "email": "anna.e@protonmail.com",
      "phone": "+79523332211"
    }
  },
  "item": {
    "mpn": "GRM21BR71C106KE15L",
    "manufacturer": "Murata",
    "qty": 50
  },
  "meta": {
    "comment": "Керамические конденсаторы 10uF 16V X7R 0805"
  }
}
```
**ID**: `832a0589-8857-4c05-bb34-6291cdefdd0d`  
**Status**: `pending`  
**Created**: 2025-10-14 11:03:12

---

### Order 5: Connector
```json
{
  "customer": {
    "name": "Дмитрий Коннекторов",
    "contact": {
      "email": "dmitry.k@yandex.ru",
      "phone": "+79054445566"
    }
  },
  "item": {
    "mpn": "1-826576-0",
    "manufacturer": "TE Connectivity",
    "qty": 20
  },
  "meta": {
    "comment": "USB Type-C разъёмы для кабельной сборки"
  }
}
```
**ID**: `6d48363c-8e6a-44b7-bd37-6ecb503be109`  
**Status**: `pending`  
**Created**: 2025-10-14 11:03:13

---

## Database Verification

```sql
SELECT 
  id, 
  customer_name, 
  mpn, 
  manufacturer, 
  qty, 
  status, 
  datetime(created_at/1000, 'unixepoch', 'localtime') as created 
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;
```

**Result**:
```
6d48363c... | Дмитрий Коннекторов  | 1-826576-0       | TE Connectivity      | 20  | pending | 2025-10-14 11:03:13
832a0589... | Анна Электроникова   | GRM21BR71C106KE15L | Murata             | 50  | pending | 2025-10-14 11:03:12
74ec2261... | Петр Сидоров         | ERJ-6ENF1002V    | Panasonic           | 100 | pending | 2025-10-14 11:03:11
f61a9261... | Мария Инженерова     | STM32F407VGT6    | STMicroelectronics  | 5   | pending | 2025-10-14 11:03:10
4ca352cb... | Иван Тестов          | LM317T           | Texas Instruments   | 10  | pending | 2025-10-14 11:03:09
```

## Server Logs Confirmation

```
[INFO] [object Object] Pricing calculated from policy
[INFO] [object Object] Order created successfully
[INFO] [object Object] Pricing calculated from policy
[INFO] [object Object] Order created successfully
[INFO] [object Object] Pricing calculated from policy
[INFO] [object Object] Order created successfully
[INFO] [object Object] Pricing calculated from policy
[INFO] [object Object] Order created successfully
[INFO] [object Object] Pricing calculated from policy
[INFO] [object Object] Order created successfully
```

## AdminJS Access

**URL**: https://prosnab.tech/admin  
**Login**: admin@deepagg.local  
**Password**: admin123  
**Navigate to**: Orders → Admin Orders

Expected view:
- List of 5 orders
- Columns: ID, Customer Name, MPN, Manufacturer, Qty, Status, Created At
- Filter by status (all should be "pending")
- Click on any order to see full details including pricing snapshot and metadata

## Validation Schema Notes

**Important**: Phone numbers must follow E.164 format (no dashes):
- ✅ Correct: `+79001234567`
- ❌ Wrong: `+7-900-123-4567`

**Comment field** must be in `meta.comment`, not `item.comment`:
```json
{
  "meta": {
    "comment": "Your comment here"
  }
}
```

## Component Diversity

Orders cover 5 different component types:
1. **Voltage Regulator** (LM317T) — Linear IC
2. **Microcontroller** (STM32F407VGT6) — Complex IC
3. **Resistor** (ERJ-6ENF1002V) — Passive SMD
4. **Capacitor** (GRM21BR71C106KE15L) — Passive SMD
5. **Connector** (1-826576-0) — Mechanical/Electromechanical

Quantities range from 5 to 100 units, representing typical small-batch orders.

---

**Status**: ✅ All 5 test orders created successfully  
**Date**: October 14, 2025, 11:03 UTC  
**Script**: `/tmp/create_test_orders_fixed.sh`  
**Next**: Verify in AdminJS panel at https://prosnab.tech/admin