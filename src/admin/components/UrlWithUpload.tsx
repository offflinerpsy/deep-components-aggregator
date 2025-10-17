import React, { useRef, useState } from 'react'
import { BasePropertyProps } from 'adminjs'

export default function UrlWithUpload({ property, record, onChange }: BasePropertyProps) {
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const value = record.params[property.path] || ''

  const upload = async (file: File) => {
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json && json.ok && json.url) {
        onChange(property.path, json.url)
      } else {
        alert(json?.error || 'Upload failed')
      }
    } catch (e: any) {
      alert(e.message || 'Upload failed')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(property.path, e.target.value)}
        placeholder={property.props?.placeholder || 'https://...'}
        style={{ flex: 1 }}
      />
      <input ref={fileRef} type="file" onChange={(e) => e.target.files && e.target.files[0] && upload(e.target.files[0])} style={{ display: 'none' }} />
      <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? 'Загрузка…' : 'Загрузить'}
      </button>
    </div>
  )
}


