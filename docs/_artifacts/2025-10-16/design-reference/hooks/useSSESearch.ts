"use client"

import { useState, useEffect, useRef } from "react"
import type { SearchResult } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9201"

export function useSSESearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ provider: string; status: string }[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    // Close previous connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setIsLoading(true)
    setError(null)
    setResults([])
    setProgress([])

    const eventSource = new EventSource(`${API_URL}/api/live/search?q=${encodeURIComponent(query)}`)
    eventSourceRef.current = eventSource

    eventSource.addEventListener("result", (e) => {
      const data = JSON.parse(e.data)
      setResults((prev) => {
        const existing = prev.find((r) => r.mpn === data.mpn)
        if (existing) {
          return prev.map((r) => (r.mpn === data.mpn ? { ...r, providers: [...r.providers, ...data.providers] } : r))
        }
        return [...prev, data]
      })
    })

    eventSource.addEventListener("provider:partial", (e) => {
      const data = JSON.parse(e.data)
      setProgress((prev) => {
        const existing = prev.find((p) => p.provider === data.provider)
        if (existing) {
          return prev.map((p) => (p.provider === data.provider ? data : p))
        }
        return [...prev, data]
      })
    })

    eventSource.addEventListener("done", () => {
      setIsLoading(false)
      eventSource.close()
    })

    eventSource.onerror = () => {
      setError("Ошибка подключения к серверу")
      setIsLoading(false)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [query])

  return { results, isLoading, error, progress }
}
