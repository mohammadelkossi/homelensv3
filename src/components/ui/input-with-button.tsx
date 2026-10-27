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
          className="absolute inline-flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            position: 'absolute', 
            right: '8px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            width: '28px', 
            height: '28px', 
            borderRadius: '0.5rem', 
            backgroundColor: 'transparent', 
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <ArrowRight className="w-4 h-4" style={{ color: '#808080' }} />
        </button>
      </div>
    )
  }
)
InputWithButton.displayName = "InputWithButton"

export { InputWithButton }

