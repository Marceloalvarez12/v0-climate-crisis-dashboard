"use client"

import { useEffect, useRef } from "react"

/** Focus stays in the dialog, Escape closes it and focus returns to the trigger. */
export function useModalFocus(open: boolean, close: () => void, busy = false) {
  const container = useRef<HTMLDivElement>(null)
  const latest = useRef({ close, busy })
  useEffect(() => { latest.current = { close, busy } }, [close, busy])
  useEffect(() => {
    if (!open || !container.current) return
    const previous = document.activeElement as HTMLElement | null
    const node = container.current
    const elements = () => Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')).filter(el => el.getClientRects().length > 0)
    ;(elements()[0] ?? node).focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !latest.current.busy) { event.preventDefault(); latest.current.close() }
      if (event.key !== "Tab") return
      const items = elements()
      if (!items.length) { event.preventDefault(); node.focus(); return }
      if (event.shiftKey && (document.activeElement === items[0] || document.activeElement === node)) { event.preventDefault(); items.at(-1)?.focus() }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus() }
    }
    document.addEventListener("keydown", keydown)
    return () => { document.removeEventListener("keydown", keydown); if (previous?.isConnected) previous.focus() }
  }, [open])
  return container
}
