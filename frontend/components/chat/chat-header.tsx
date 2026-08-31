"use client"

import { Plus } from "lucide-react"

import { useGetHealthQuery } from "@/api/api-slice"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { InitialsAvatar } from "./initials-avatar"
import { MODEL_LABEL, UI_VERSION, USER_NAME } from "./types"

export function ChatHeader({ onNewChat }: { onNewChat: () => void }) {
  // RTK Query polls the backend health endpoint for a live status dot.
  const { data } = useGetHealthQuery(undefined, { pollingInterval: 30_000 })
  const online = data?.status === "ok"

  return (
    <header className="relative z-10 flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-2 rounded-full border bg-background px-3.5 py-1.5 text-sm">
        <span className="font-semibold">Nokia RAG</span>
        <span className="text-xs text-muted-foreground">{MODEL_LABEL}</span>
        {/* Build stamp: confirms which code this browser tab is running. */}
        <span className="text-[10px] tabular-nums opacity-50">{UI_VERSION}</span>
        <span
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          title={online ? "Backend reachable" : "Backend unreachable"}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              online
                ? "bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500/60"
                : "animate-pulse bg-destructive"
            )}
          />
          {online ? "Online" : "Offline"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={onNewChat} className="rounded-full">
          <Plus className="size-4" />
          New Chat
        </Button>
        <InitialsAvatar
          initials={USER_NAME.slice(0, 1).toUpperCase()}
          kind="user"
        />
      </div>
    </header>
  )
}
