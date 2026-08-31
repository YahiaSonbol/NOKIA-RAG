"use client"

/**
 * chat-slice -- the brain of the chat UI.
 *
 * Everything the user sees in the message area is state managed here:
 * messages, streaming status, the input box text, sidebar conversations.
 *
 * The interesting part is `sendQuestion` (async thunk below). It opens the
 * SSE stream to the backend and translates frames into Redux actions:
 *
 *   dispatch(questionSubmitted)  -> your message appears, status = thinking
 *   event "sources"              -> sourcesReceived (for the thinking bar)
 *   event "token"                -> assistantStarted on first token,
 *                                   then tokenReceived per piece
 *   event "done"                 -> statusReset (input enabled again)
 *   failure                      -> an assistant message with the reason
 *
 * The reducers at the bottom are tiny on purpose: they only mutate state;
 * all network logic stays inside the thunk.
 */
import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit"

import type {
  ChatMessage,
  ChatSource,
  Conversation,
  Status,
} from "@/components/chat/types"
import type { RootState } from "@/api/store"

// Same-origin SSE request: next.config.ts forwards /api/* to the backend
// server-side, so the browser never needs a direct connection to :8000.
const API_URL = ""

type ChatState = {
  messages: ChatMessage[]
  status: Status
  input: string
  conversations: Conversation[]
  activeConversationId: number | null
  /** Sources from the latest `sources` SSE event while still streaming. */
  pendingSources: ChatSource[]
}

const initialState: ChatState = {
  messages: [],
  status: "idle",
  input: "",
  conversations: [],
  activeConversationId: null,
  pendingSources: [],
}

let idCounter = 0
const nextId = () => ++idCounter

// Not serializable, so it lives outside the store on purpose.
let activeController: AbortController | null = null

/**
 * The chat is an SSE STREAM, not a request/response -- RTK Query's cache
 * cannot express "append tokens as they arrive", so per the RTK docs this
 * is modeled as an async thunk that dispatches incremental actions.
 */
export const sendQuestion = createAsyncThunk<
  void,
  string,
  { state: RootState }
>("chat/sendQuestion", async (rawText, { dispatch, getState }) => {
  const text = rawText.trim()
  if (!text || getState().chat.status !== "idle") return

  const userMessageId = nextId()
  dispatch(questionSubmitted({ id: userMessageId, text }))

  let assistantId: number | null = null

  const appendDelta = (delta: string) => {
    if (assistantId === null) {
      assistantId = nextId()
      // The reducer attaches the pending sources to this message.
      dispatch(assistantStarted({ id: assistantId }))
    }
    dispatch(tokenReceived({ id: assistantId!, delta }))
  }

  const controller = new AbortController()
  activeController = controller

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: text }),
      signal: controller.signal,
    })

    if (!response.ok || !response.body) {
      throw new Error(`Backend responded with ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    const handleFrame = (frame: string) => {
      const event = /^event: (.+)$/m.exec(frame)?.[1]
      const dataRaw = /^data: (.+)$/m.exec(frame)?.[1]
      if (!event || !dataRaw) return

      const data = JSON.parse(dataRaw) as {
        text?: string
        message?: string
      }

      if (event === "sources") {
        dispatch(
          sourcesReceived(Array.isArray(data) ? (data as ChatSource[]) : [])
        )
      } else if (event === "token") {
        appendDelta(String(data.text ?? ""))
      } else if (event === "error") {
        const streamError = new Error(
          data.message || "The backend reported an error."
        )
        streamError.name = "SseError"
        throw streamError
      }
    }

    // Consume the SSE stream: frames are separated by blank lines.
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split("\n\n")
      buffer = frames.pop() ?? ""

      for (const frame of frames) {
        if (frame.trim()) handleFrame(frame)
      }
    }
  } catch (error) {
    if ((error as Error).name !== "AbortError") {
      if (assistantId === null) {
        assistantId = nextId()
        dispatch(assistantStarted({ id: assistantId }))
      }
      const failedId = assistantId

      // Different message depending on where the failure happened.
      const failureText =
        (error as Error).name === "SseError"
          ? `The model failed to answer: ${(error as Error).message} Please try again.`
          : "I couldn't reach the RAG backend. Is the backend container running?"

      dispatch(tokenReceived({ id: failedId, delta: failureText }))
      dispatch(messageFailed({ id: failedId }))
    }
  } finally {
    activeController = null
    dispatch(statusReset())
  }
})

export const stopGeneration = createAsyncThunk<void, void, { state: RootState }>(
  "chat/stopGeneration",
  async (_, { dispatch }) => {
    activeController?.abort()
    activeController = null
    dispatch(statusReset())
  }
)

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    questionSubmitted(
      state,
      action: PayloadAction<{ id: number; text: string }>
    ) {
      state.messages.push({
        id: action.payload.id,
        role: "user",
        content: action.payload.text,
      })
      state.status = "thinking"
      state.input = ""

      // First message of a fresh session -> remember it in the sidebar.
      if (state.activeConversationId === null) {
        state.activeConversationId = action.payload.id
        state.conversations.unshift({
          id: action.payload.id,
          title: action.payload.text,
        })
      }
    },
    assistantStarted(state, action: PayloadAction<{ id: number }>) {
      state.messages.push({
        id: action.payload.id,
        role: "assistant",
        content: "",
        sources: state.pendingSources,
      })
      state.pendingSources = []
      state.status = "streaming"
    },
    sourcesReceived(state, action: PayloadAction<ChatSource[]>) {
      state.pendingSources = action.payload
    },
    tokenReceived(state, action: PayloadAction<{ id: number; delta: string }>) {
      const message = state.messages.find(
        (candidate) => candidate.id === action.payload.id
      )
      if (message) message.content += action.payload.delta
    },
    messageFailed(state, action: PayloadAction<{ id: number }>) {
      const message = state.messages.find(
        (candidate) => candidate.id === action.payload.id
      )
      if (message) message.error = true
    },
    statusReset(state) {
      state.status = "idle"
      state.pendingSources = []
    },
    inputChanged(state, action: PayloadAction<string>) {
      state.input = action.payload
    },
    conversationSelected(state, action: PayloadAction<number | null>) {
      state.activeConversationId = action.payload
    },
    chatCleared(state) {
      state.messages = []
      state.status = "idle"
      state.input = ""
      state.activeConversationId = null
      state.pendingSources = []
    },
  },
})

const { actions, reducer } = chatSlice
export const {
  questionSubmitted,
  assistantStarted,
  sourcesReceived,
  tokenReceived,
  messageFailed,
  statusReset,
  inputChanged,
  conversationSelected,
  chatCleared,
} = actions
export const chatReducer = reducer

export const selectChat = (state: RootState) => state.chat
