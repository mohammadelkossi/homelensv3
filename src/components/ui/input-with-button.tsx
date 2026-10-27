import * as React from "react"
import { Input } from "./input"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface InputWithButtonProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onButtonClick?: () => void
  buttonDisabled?: boolean
}

const InputWithButton = React.forwardRef<HTMLInputElement, InputWithButtonProps>(
  ({ className, onButtonClick, buttonDisabled, ...props }, ref) => {
    return (
      <div className="relative">
        <Input
          ref={ref}
          className={cn("pr-14", className)}
          {...props}
        />
        <button
          type="button"
          aria-label="Submit"
          onClick={onButtonClick}
          disabled={buttonDisabled}
          // 40px: a comfortable thumb target inside the 46px field.
          className="absolute right-[3px] top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-none bg-[#0B0B0C] text-white transition-colors hover:bg-[#2A2A2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/60 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-[#D4D4D8] disabled:text-[#6B6B70]"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    )
  }
)
InputWithButton.displayName = "InputWithButton"

export { InputWithButton }

