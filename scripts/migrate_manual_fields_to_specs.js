import { openDb } from '../src/db/sql.mjs'

const db = openDb()

const rows = db.prepare('SELECT id, technical_specs FROM manual_products').all()
let migrated = 0
db.transaction(() => {
  for (const { id, technical_specs } of rows) {
    const specs = technical_specs && technical_specs.trim() ? JSON.parse(technical_specs) : {}
    const fields = db.prepare('SELECT field_name, field_value, field_type FROM manual_product_fields WHERE product_id = ?').all(id)
    if (!fields.length) continue
    for (const f of fields) {
      let val = f.field_value
      if (f.field_type === 'number') val = Number(val)
      else if (f.field_type === 'boolean') val = ['true','1','yes','on'].includes(String(val).toLowerCase())
      else if (f.field_type === 'json') { try { val = JSON.parse(val) } catch { /* keep string */ } }
      specs[f.field_name] = val
    }
    const json = JSON.stringify(specs)
    db.prepare('UPDATE manual_products SET technical_specs = ? WHERE id = ?').run(json, id)
    migrated++
  }
})();

console.log(`Migrated specs for ${migrated} products.`)
console.log('You can hide Manual Product Fields resource now.')


