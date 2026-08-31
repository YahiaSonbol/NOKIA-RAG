"use client"

/**
 * ChatInput -- the composer at the bottom: textarea, suggestion chips and
 * the Send/Stop button (they morph into each other while streaming).
 * Pure presentation: it owns no state, everything comes in via props and
 * leaves via the callbacks (all wired to Redux by app/page.tsx).
 */
import { ArrowUp, Square } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { PromptSuggestion } from "@/components/ui/prompt-suggestion"
import { cn } from "@/lib/utils"

import { SUGGESTIONS } from "./types"

type ChatInputProps = {
  input: string
  onInputChange: (value: string) => void
  onSubmit: (text: string) => void
  onStop: () => void
  isLoading: boolean
  isEmpty: boolean
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  onStop,
  isLoading,
  isEmpty,
}: ChatInputProps) {
  const canSend = input.trim().length > 0 && !isLoading

  return (
    <PromptInput
      isLoading={isLoading}
      value={input}
      onValueChange={onInputChange}
      onSubmit={() => onSubmit(input)}
      className="w-full max-w-3xl"
    >
      <PromptInputTextarea
        placeholder="Initiate a query or send a command to the AI..."
        className={isEmpty ? "min-h-24" : "min-h-11"}
      />
      <PromptInputActions className="justify-between pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {!isEmpty &&
            SUGGESTIONS.slice(0, 2).map((suggestion) => (
              <PromptSuggestion
                key={suggestion.label}
                size="sm"
                onClick={() => onSubmit(suggestion.prompt)}
                className="rounded-full text-muted-foreground"
              >
                <suggestion.icon className="size-3.5" />
                {suggestion.label}
              </PromptSuggestion>
            ))}
        </div>
        <PromptInputAction
          tooltip={isLoading ? "Stop generating" : "Send message"}
        >
          <span
            onClick={() => (isLoading ? onStop() : onSubmit(input))}
            className={cn(
              buttonVariants(),
              "cursor-pointer rounded-xl px-3",
              !canSend && isLoading === false && "pointer-events-none opacity-50"
            )}
          >
            {isLoading ? (
              <Square className="size-4 fill-current" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </span>
        </PromptInputAction>
      </PromptInputActions>
    </PromptInput>
  )
}
