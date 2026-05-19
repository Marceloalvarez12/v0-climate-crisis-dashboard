"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  variant?: "login" | "header"
}

export function Logo({ className, variant = "header" }: LogoProps) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <span
        className={cn(
          "font-black tracking-tighter text-white select-none",
          variant === "login" && "text-5xl",
          variant === "header" && "text-lg",
          className
        )}
      >
        <span className="text-cyan-400">Z</span>NTINEL
      </span>
    )
  }

  return (
    <img
      src="/zntinel-logo-optimized.png"
      alt="ZNTINEL"
      width={variant === "login" ? 280 : 120}
      height={variant === "login" ? 80 : 32}
      className={cn(
        "object-contain select-none",
        variant === "login" && "h-20 w-auto drop-shadow-[0_0_24px_rgba(6,182,212,0.25)]",
        variant === "header" && "h-8 w-auto",
        className
      )}
      onError={() => setError(true)}
    />
  )
}
