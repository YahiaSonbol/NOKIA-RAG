/**
 * useChat() -- the ONE hook UI components use to talk to the chat state.
 *
 * It is a thin wrapper over the Redux slice below: components read state
 * with useAppSelector(selectChat) and send actions with dispatch. Keeping
 * this wrapper means components never import Redux internals directly.
 */
"use client"

import { useCallback } from "react"

import {
  chatCleared,
  conversationSelected,
  inputChanged,
  selectChat,
  sendQuestion,
  stopGeneration,
} from "@/api/chat-slice"
import { useAppDispatch, useAppSelector } from "@/api/hooks"

/**
 * Thin wrapper over the Redux store. Keeps the exact same API the
 * components already use, so no component had to change when the
 * state moved into Redux.
 */
export function useChat() {
  const dispatch = useAppDispatch()
  const chat = useAppSelector(selectChat)

  const submit = useCallback(
    (text: string) => void dispatch(sendQuestion(text)),
    [dispatch]
  )
  const stop = useCallback(() => void dispatch(stopGeneration()), [dispatch])
  const newChat = useCallback(() => dispatch(chatCleared()), [dispatch])
  const setInput = useCallback(
    (value: string) => dispatch(inputChanged(value)),
    [dispatch]
  )
  const setActiveConversationId = useCallback(
    (id: number | null) => dispatch(conversationSelected(id)),
    [dispatch]
  )

  return {
    ...chat,
    submit,
    stop,
    newChat,
    setInput,
    setActiveConversationId,
  }
}
