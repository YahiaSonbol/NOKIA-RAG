"use client"

import { AnimatePresence, motion } from "framer-motion"

import { ChatHeader } from "@/components/chat/chat-header"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatMessages } from "@/components/chat/chat-messages"
import { Sidebar } from "@/components/chat/sidebar"
import { WelcomeScreen } from "@/components/chat/welcome-screen"
import { useChat } from "@/hooks/use-chat"
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "@/components/ui/chat-container"

export default function Page() {
  const {
    messages,
    status,
    input,
    setInput,
    conversations,
    activeConversationId,
    setActiveConversationId,
    pendingSources,
    submit,
    stop,
    newChat,
  } = useChat()

  const isEmpty = messages.length === 0 && status === "idle"

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewChat={newChat}
      />

      {/* Main area */}
      <main className="flex min-w-0 flex-1 flex-col p-2 pl-0">
        <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
          {/* Slow ambient wave at the bottom (CSS only) */}
          <div
            aria-hidden
            className="bottom-ellipse-glow pointer-events-none absolute bottom-0"
          >
            <div className="bottom-ellipse-wave bottom-ellipse-wave-a" />
            <div className="bottom-ellipse-wave bottom-ellipse-wave-b" />
          </div>

          <ChatHeader onNewChat={newChat} />

          <div className="relative z-10 min-h-0 w-full flex-1 px-6">
            <div className="relative h-full">
              {/* No mode="wait": both layers are absolutely positioned, so they
                  crossfade in place. If the exit animation ever stalls, the
                  chat must still appear immediately. */}
              <AnimatePresence initial={false}>
                {isEmpty ? (
                  <motion.div
                    key="welcome"
                    className="absolute inset-0 flex items-center justify-center overflow-y-auto px-4 py-8"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -24, scale: 0.97 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <WelcomeScreen onSubmit={submit} />
                  </motion.div>
                ) : (
                  /* Plain div on purpose: the chat must be visible even if
                     JS-driven animations ever fail to run. */
                  <div key="chat" className="absolute inset-0">
                    <ChatContainerRoot className="h-full">
                      <ChatContainerContent className="mx-auto w-full max-w-3xl space-y-6 py-6">
                        <ChatMessages
                          messages={messages}
                          status={status}
                          pendingSources={pendingSources}
                          onStop={stop}
                        />
                      </ChatContainerContent>
                      <ChatContainerScrollAnchor />
                    </ChatContainerRoot>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <footer className="relative z-10 flex justify-center px-6 pt-2 pb-5">
            <ChatInput
              input={input}
              onInputChange={setInput}
              onSubmit={submit}
              onStop={stop}
              isLoading={status !== "idle"}
              isEmpty={isEmpty}
            />
          </footer>
        </div>
      </main>
    </div>
  )
}
