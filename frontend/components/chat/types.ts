import { FileText, Sparkles } from "lucide-react"

/**
 * The shared vocabulary of the chat UI: the shapes of the data that flows
 * between the backend and the components. The field names mirror what the
 * backend's `sources` SSE event sends (see README.md for the contract).
 */
export type Role = "user" | "assistant"

export type ChatSource = {
  id: string
  document_name?: string
  page_number?: number
  rerank_score?: number
}

export type ChatMessage = {
  id: number
  role: Role
  content: string
  sources?: ChatSource[]
  error?: boolean
}

export type Status = "idle" | "thinking" | "streaming"

export type Conversation = {
  id: number
  title: string
}

export const USER_NAME = "Yahia"

export const MODEL_LABEL = "MiniMax M3· RAG"
/** Bump on every build so we can verify which code a browser tab runs. */
export const UI_VERSION = "v9"

export const SUGGESTIONS = [
  {
    icon: Sparkles,
    label: "How does this pipeline work?",
    prompt: "Explain step by step how this RAG pipeline works.",
  },
  {
    icon: FileText,
    label: "Alarm troubleshooting",
    prompt:
      "Search the 1830 Technical Description and summarize the alarm troubleshooting steps.",
  },
  {
    icon: FileText,
    label: "Capacity & interfaces",
    prompt: "What is the maximum capacity per slot and which cards provide it?",
  },
]
