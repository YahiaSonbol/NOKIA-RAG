"use client"

/**
 * WelcomeScreen -- the empty-state landing view (greeting, orb, suggestion
 * chips) shown instead of the message list until the first prompt is sent.
 * Clicking a chip submits its prompt directly, same as typing it.
 */
import { useEffect, useState } from "react"

import { motion } from "framer-motion"

import { PromptSuggestion } from "@/components/ui/prompt-suggestion"

import { SUGGESTIONS, USER_NAME } from "./types"

function greetingFromHour(hour: number) {
  if (hour < 12) return "Good Morning"
  if (hour < 18) return "Good Afternoon"
  return "Good Evening"
}

/**
 * The colored sphere on the welcome screen: a conic gradient spinning
 * slowly inside a breathing circle, with a pulsing glow behind it.
 * All motion is CSS (see globals.css) so it stays perfectly smooth.
 */
function Orb() {
  return (
    <motion.div
      className="relative mx-auto flex size-28 items-center justify-center"
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div
        aria-hidden
        className="orb-glow absolute -inset-7 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--primary) 50%, transparent), transparent 70%)",
        }}
      />
      <div className="orb-breathe relative size-16 overflow-hidden rounded-full shadow-lg">
        <div aria-hidden className="orb-colors absolute -inset-10" />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 32% 26%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.12) 38%, transparent 60%)",
          }}
        />
      </div>
    </motion.div>
  )
}

type WelcomeScreenProps = {
  onSubmit: (prompt: string) => void
}

export function WelcomeScreen({ onSubmit }: WelcomeScreenProps) {
  const [greeting, setGreeting] = useState("Welcome back")

  useEffect(() => {
    // Depends on the client clock -> set after mount to keep the
    // server-rendered markup stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(greetingFromHour(new Date().getHours()))
  }, [])

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <Orb />

      <motion.h2
        className="mx-auto max-w-2xl text-center text-3xl font-semibold tracking-tight"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
      >
        {greeting}, {USER_NAME}
        <br />
        How Can I <span className="text-primary">Assist You Today?</span>
      </motion.h2>

      <motion.div
        className="flex flex-wrap items-center justify-center gap-2"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
      >
        {SUGGESTIONS.map((suggestion) => (
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
      </motion.div>
    </div>
  )
}
