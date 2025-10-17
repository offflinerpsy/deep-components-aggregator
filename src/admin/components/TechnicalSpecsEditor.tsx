import React, { useMemo, useState } from 'react'
import { BasePropertyProps } from 'adminjs'

type Row = { name: string; value: string; type: 'string' | 'number' | 'boolean' | 'json' }

function coerce(value: string, type: Row['type']): any {
  if (type === 'number') return Number(value)
  if (type === 'boolean') return ['true', '1', 'yes', 'on'].includes(value.toLowerCase())
  if (type === 'json') {
    try { return JSON.parse(value) } catch { return value }
  }
  return value
}

export default function TechnicalSpecsEditor(props: BasePropertyProps) {
  const { onChange, property, record } = props
  const initial = useMemo(() => {
    const raw = record.params[property.path] || '{}'
    try { const obj = JSON.parse(raw); return Object.entries(obj).map(([k,v]) => ({ name: String(k), value: typeof v === 'string' ? v : JSON.stringify(v), type: typeof v === 'boolean' ? 'boolean' : typeof v === 'number' ? 'number' : (typeof v === 'object' ? 'json' : 'string') })) } catch { return [] }
  }, [record.params, property.path])

  const [rows, setRows] = useState<Row[]>(initial)
  const [error, setError] = useState<string | null>(null)

  const update = (next: Row[]) => {
    setRows(next)
    setError(null)
    const obj: Record<string, any> = {}
    for (const r of next) {
      if (!r.name.trim()) { setError('Имя поля не может быть пустым'); continue }
      obj[r.name] = coerce(r.value, r.type)
    }
    onChange(property.path, JSON.stringify(obj))
  }

  const addRow = () => update([...rows, { name: '', value: '', type: 'string' }])
  const removeRow = (idx: number) => update(rows.filter((_, i) => i !== idx))

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button type="button" className="btn" onClick={addRow}>Добавить поле</button>
      </div>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <table className="table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Значение</th>
            <th>Тип</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              <td><input value={r.name} onChange={e => update(rows.map((x,i)=> i===idx?{...x, name:e.target.value}:x))} /></td>
              <td><input value={r.value} onChange={e => update(rows.map((x,i)=> i===idx?{...x, value:e.target.value}:x))} /></td>
              <td>
                <select value={r.type} onChange={e => update(rows.map((x,i)=> i===idx?{...x, type:e.target.value as Row['type']}:x))}>
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="json">json</option>
                </select>
              </td>
              <td><button type="button" className="btn btn-danger" onClick={() => removeRow(idx)}>🗑</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


