"use client"

import { useState } from "react"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * A field's ⓘ help. Opens on hover, keyboard focus or tap: touch screens can't hover, so a
 * tap toggles it. The icon stays 14px but its tap area is 44px.
 */
export function HelpTip({ label, help }: { label: string; help: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        asChild
        // The tooltip closes itself on press and click; preventDefault tells it not to, so a
        // tap can toggle it instead (Radix skips its own handler when the event is prevented).
        onPointerDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault()
          setOpen((o) => !o)
        }}
      >
        <button
          type="button"
          className="-m-[15px] inline-flex h-11 w-11 items-center justify-center p-0 transition-colors"
          style={{ color: "#9CA3AF" }}
          aria-label={`What is ${label}?`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>{help}</p>
      </TooltipContent>
    </Tooltip>
  )
}
