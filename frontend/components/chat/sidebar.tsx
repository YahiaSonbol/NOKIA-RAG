"use client"

/**
 * Sidebar -- brand, "New Chat", the in-memory conversation history and the
 * user card. Conversations are titles only (first prompt of each session);
 * they live in Redux and reset when the tab reloads.
 */
import { useState } from "react"

import { MessageSquareText, Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { InitialsAvatar } from "./initials-avatar"
import { USER_NAME, type Conversation } from "./types"

type SidebarProps = {
  conversations: Conversation[]
  activeConversationId: number | null
  onSelectConversation: (id: number) => void
  onNewChat: () => void
}

export function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: SidebarProps) {
  const [search, setSearch] = useState("")
  const normalizedSearch = search.trim().toLowerCase()
  const visibleConversations = conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(normalizedSearch)
  )

  return (
    <aside className="hidden w-64 shrink-0 flex-col justify-between p-4 md:flex">
      <div className="flex min-h-0 flex-col gap-5">
        <div className="flex items-start justify-between px-1">
          <div>
            <p className="text-xl leading-none font-bold tracking-tight text-primary">
              NOKIA
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              RAG Assistant
            </p>
          </div>
          <Button
            onClick={onNewChat}
            size="icon"
            variant="outline"
            className="size-8 rounded-lg"
            title="New chat"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            className="h-9 w-full rounded-lg border bg-card pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          <p className="px-3 pb-1 text-xs text-muted-foreground">History</p>
          {visibleConversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelectConversation(conversation.id)}
              className={cn(
                "w-full truncate rounded-lg px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                conversation.id === activeConversationId
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              {conversation.title}
            </button>
          ))}
          {visibleConversations.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <MessageSquareText className="size-5 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                {conversations.length === 0
                  ? "No conversations yet. Ask your first question."
                  : "No conversations found."}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2.5 rounded-xl border bg-card p-2.5">
        <InitialsAvatar
          initials={USER_NAME.slice(0, 1).toUpperCase()}
          kind="user"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{USER_NAME}</p>
          <p className="truncate text-xs text-muted-foreground">
            Local workspace
          </p>
        </div>
      </div>
    </aside>
  )
}
