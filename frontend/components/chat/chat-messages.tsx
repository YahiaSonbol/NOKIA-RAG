"use client"

/**
 * ChatMessages -- renders the message list, one Message per chat turn.
 *
 * State flows in through props (owned by Redux, see api/chat-slice.ts):
 *   - messages       -> every user + assistant bubble so far
 *   - status         -> "thinking" shows the ThinkingBar, "streaming"
 *                       shows a typing indicator on the last message
 *   - pendingSources -> retriever results, expandable from the ThinkingBar
 * Only this file knows what a message LOOKS like; the slice knows what
 * the messages ARE.
 */
import { useCallback, useRef, useState } from "react"

import { Check, Copy, FileText } from "lucide-react"

import { Loader } from "@/components/ui/loader"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ui/message"
import { ThinkingBar } from "@/components/ui/thinking-bar"
import { cn } from "@/lib/utils"

import { InitialsAvatar } from "./initials-avatar"
import type { ChatMessage, ChatSource, Status } from "./types"

// CSS-only entrance: visible even if JS animations ever fail to run.
const ENTER_ANIMATION = "animate-in fade-in slide-in-from-bottom-2 duration-300"

type ChatMessagesProps = {
  messages: ChatMessage[]
  status: Status
  /** Sources found by the retriever while the answer is still pending. */
  pendingSources: ChatSource[]
  onStop: () => void
}

export function ChatMessages({
  messages,
  status,
  pendingSources,
  onStop,
}: ChatMessagesProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [showRetrieved, setShowRetrieved] = useState(false)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback((id: number, content: string) => {
    navigator.clipboard.writeText(content).catch(() => {})
    setCopiedId(id)
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    copiedTimeoutRef.current = setTimeout(() => setCopiedId(null), 1600)
  }, [])

  const lastMessageId = messages[messages.length - 1]?.id

  return (
    <>
      {messages.map((message) => (
        <div key={message.id} className={ENTER_ANIMATION}>
          <Message
            className={cn(message.role === "user" && "flex-row-reverse")}
          >
            <InitialsAvatar
              initials={message.role === "assistant" ? "AI" : "Y"}
              kind={message.role === "assistant" ? "ai" : "user"}
            />
            <div
              className={cn(
                "flex max-w-[85%] min-w-0 flex-col gap-1.5",
                message.role === "user" && "items-end"
              )}
            >
              <MessageContent
                markdown={message.role === "assistant"}
                className={cn(
                  message.role === "assistant" &&
                    "ai-prose prose max-w-none border border-border/60 bg-card/80 shadow-sm",
                  message.role === "user" &&
                    "border border-primary/40 bg-gradient-to-b from-primary/90 to-primary/70 text-primary-foreground shadow-sm",
                  message.error &&
                    "border-destructive/40 bg-destructive/10 text-foreground"
                )}
              >
                {message.content}
              </MessageContent>

              {/* Real sources returned by the backend */}
              {message.role === "assistant" &&
                message.sources &&
                message.sources.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1.5">
                    {message.sources.map((source) => (
                      <span
                        key={source.id}
                        title={
                          source.rerank_score != null
                            ? `rerank score: ${source.rerank_score.toFixed(2)}`
                            : undefined
                        }
                        className="inline-flex cursor-default items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 py-1 pr-2.5 pl-2 text-xs text-foreground/80 transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-foreground"
                      >
                        <FileText className="size-3 shrink-0 text-primary/80" />
                        <span className="max-w-56 truncate">
                          {source.document_name ?? "source"}
                        </span>
                        {source.page_number != null && (
                          <span className="text-[11px] font-medium text-muted-foreground">
                            p.{source.page_number}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

              {message.role === "assistant" &&
                status === "streaming" &&
                message.id === lastMessageId && (
                  <Loader
                    variant="typing"
                    size="sm"
                    className="ml-1 text-muted-foreground"
                  />
                )}

              {message.role === "assistant" &&
                message.content &&
                !(
                  status === "streaming" && message.id === lastMessageId
                ) && (
                  <MessageActions>
                    <MessageAction
                      tooltip={copiedId === message.id ? "Copied!" : "Copy"}
                      side="bottom"
                    >
                      <span
                        onClick={() => copy(message.id, message.content)}
                        className="flex cursor-pointer items-center gap-1 px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {copiedId === message.id ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        {copiedId === message.id ? "Copied" : "Copy"}
                      </span>
                    </MessageAction>
                  </MessageActions>
                )}
            </div>
          </Message>
        </div>
      ))}

      {status === "thinking" && (
        <div className={ENTER_ANIMATION}>
          <Message>
            <InitialsAvatar initials="AI" kind="ai" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-2">
              {/* prompt-kit ThinkingBar: click to expand what was retrieved */}
              <ThinkingBar
                text={
                  pendingSources.length > 0
                    ? `Found ${pendingSources.length} passages`
                    : "Searching your documents"
                }
                stopLabel="Stop"
                onStop={onStop}
                onClick={() => setShowRetrieved((value) => !value)}
              />
              {showRetrieved &&
                (pendingSources.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {pendingSources.map((source) => (
                      <span
                        key={source.id}
                        className="inline-flex cursor-default items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 py-1 pr-2.5 pl-2 text-xs text-foreground/80"
                      >
                        <FileText className="size-3 shrink-0 text-primary/80" />
                        <span className="max-w-56 truncate">
                          {source.document_name ?? "source"}
                        </span>
                        {source.page_number != null && (
                          <span className="text-[11px] font-medium text-muted-foreground">
                            p.{source.page_number}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No passages retrieved yet — the retriever is still working.
                  </p>
                ))}
            </div>
          </Message>
        </div>
      )}
    </>
  )
}
