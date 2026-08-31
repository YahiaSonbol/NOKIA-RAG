"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

type LogLine = { text: string; kind: "info" | "ok" | "fail" }

/**
 * Standalone connection diagnostic. It runs the exact same requests as the
 * chat UI (same-origin /health and /api/chat) and prints every step with a
 * timestamp, so we can see precisely where a given browser fails.
 */
export default function DebugPage() {
  const [log, setLog] = useState<LogLine[]>([])
  const [running, setRunning] = useState(false)

  const add = (text: string, kind: LogLine["kind"] = "info") =>
    setLog((prev) => [...prev, { text, kind }])

  const run = async () => {
    setRunning(true)
    setLog([])
    const t0 = Date.now()
    const at = () => `+${((Date.now() - t0) / 1000).toFixed(1)}s`

    try {
      // Step 1: the health probe (same request the header dot uses).
      add(`${at()} GET /health ...`)
      const healthRes = await fetch("/health")
      const healthBody = await healthRes.text()
      add(
        `${at()} /health -> HTTP ${healthRes.status} ${healthBody.slice(0, 60)}`,
        healthRes.ok ? "ok" : "fail"
      )

      // Step 2: the SSE chat stream (same request the chat input uses).
      add(`${at()} POST /api/chat (streaming) ...`)
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Say only: OK" }),
      })
      add(`${at()} /api/chat -> HTTP ${res.status}`, res.ok ? "ok" : "fail")
      if (!res.body) {
        add(`${at()} FAIL: response has no body`, "fail")
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let events = 0
      let tokens = 0

      for (;;) {
        const { done, value } = await reader.read()
        if (done) {
          add(`${at()} stream ended. events=${events} tokens=${tokens}`, "ok")
          break
        }
        buffer += decoder.decode(value, { stream: true })
        const frames = buffer.split("\n\n")
        buffer = frames.pop() ?? ""
        for (const frame of frames) {
          const event = /^event: (.+)$/m.exec(frame)?.[1]
          const data = /^data: (.+)$/m.exec(frame)?.[1]
          if (!event) continue
          events++
          if (event === "token") tokens++
          if (events <= 6) {
            const detail =
              event === "token"
                ? JSON.stringify((data ?? "").slice(0, 30))
                : (data ?? "").slice(0, 60)
            add(`${at()} event: ${event} ${detail}`)
          }
        }
      }
    } catch (error) {
      add(`${at()} FAILED: ${(error as Error).message}`, "fail")
    } finally {
      setRunning(false)
    }
  }

  const color = {
    info: "text-foreground",
    ok: "text-emerald-600 dark:text-emerald-400",
    fail: "text-red-600 dark:text-red-400",
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8 font-mono text-sm">
      <h1 className="font-sans text-lg font-semibold">Connection diagnostic</h1>
      <p className="font-sans text-sm text-muted-foreground">
        Runs the same requests as the chat UI and shows exactly where a
        browser fails. Takes ~30s (the model answers &quot;OK&quot;).
      </p>
      <Button onClick={run} disabled={running}>
        {running ? "Running..." : "Run diagnostic"}
      </Button>
      <pre className="min-h-40 whitespace-pre-wrap rounded-lg border bg-muted/30 p-4">
        {log.length === 0
          ? "Click the button, then share what appears here."
          : log.map((line, index) => (
              <div key={index} className={color[line.kind]}>
                {line.text}
              </div>
            ))}
      </pre>
    </main>
  )
}
