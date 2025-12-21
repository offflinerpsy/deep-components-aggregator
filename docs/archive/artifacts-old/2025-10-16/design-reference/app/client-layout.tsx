"use client"

import type React from "react"
import { Suspense } from "react"

export function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
}

// Default export
export default ClientLayout
