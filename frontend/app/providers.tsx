"use client"

import { useRef } from "react"
import { Provider } from "react-redux"

import { makeStore, type AppStore } from "@/api/store"

/**
 * Next.js renders on the server too, so every request/browser tab gets
 * its own store instance instead of one shared module-level singleton.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = makeStore()
  }

  return <Provider store={storeRef.current}>{children}</Provider>
}
