import { cn } from "@/lib/utils"

export function InitialsAvatar({
  initials,
  kind,
  className,
}: {
  initials: string
  kind: "ai" | "user"
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold select-none",
        kind === "ai"
          ? "border border-primary/25 bg-primary/10 text-primary"
          : "bg-secondary text-secondary-foreground",
        className
      )}
    >
      {initials}
    </div>
  )
}
