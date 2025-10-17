// scripts/notify-dispatch-test.mjs
// Manual test: dispatch an example admin notification using current DB settings
// Usage: node scripts/notify-dispatch-test.mjs

import { openDb } from '../src/db/sql.mjs'
import { dispatchAdminNotification } from '../src/lib/notify-admin.mjs'

const db = openDb()
const logger = {
  info: (...args) => console.log('[INFO]', ...args)
}

const now = Date.now()
const sample = {
  id: 'test-notif',
  created_at: now,
  type: 'order_created',
  payload: {
    order_id: 'test-order-id',
    order_code: 'ORD-TEST1',
    customer_name: 'Тест Клиент',
    mpn: 'SN74HC595N',
    manufacturer: 'Texas Instruments',
    qty: 10,
    created_at: now
  }
}

const out = await dispatchAdminNotification(db, logger, sample)
console.log(JSON.stringify(out, null, 2))
