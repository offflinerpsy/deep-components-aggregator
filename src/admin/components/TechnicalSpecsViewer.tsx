import React from 'react'
import { BasePropertyProps } from 'adminjs'

export default function TechnicalSpecsViewer({ property, record }: BasePropertyProps) {
  let data: Record<string, any> = {}
  try {
    data = JSON.parse(record.params[property.path] || '{}')
  } catch {}

  const entries = Object.entries(data)
  if (!entries.length) return <div>—</div>

  return (
    <table className="table">
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k}>
            <td style={{ fontWeight: 600 }}>{k}</td>
            <td>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}


