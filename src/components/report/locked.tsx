"use client"

import { createContext, useContext } from "react"
import Link from "next/link"
import posthog from "posthog-js"

// The free preview report blurs its components one by one. ReportView turns locking on
// with <PreviewLock on>; each report component wraps its own content in <Locked>.
const LockContext = createContext(false)

export function PreviewLock({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <LockContext.Provider value={on}>{children}</LockContext.Provider>
}

/**
 * Blurs its content in the free preview. Hovering (or focusing) shows the way to unlock it;
 * touch screens can't hover, so they rely on the report's unlock bar instead.
 * A Locked inside another Locked renders plainly, so nothing is blurred twice.
 */
export function Locked({
  children,
  className = "",
  strong = false,
  soft = false,
}: {
  children: React.ReactNode
  className?: string
  /** Heavier blur for very large text, which stays readable through the normal one. */
  strong?: boolean
  /** Lighter blur, so the shape of a chart still reads through it. */
  soft?: boolean
}) {
  const on = useContext(LockContext)
  if (!on) return <>{children}</>
  return (
    <LockContext.Provider value={false}>
      <div className={`group/lock relative ${className}`}>
        <div aria-hidden="true" inert className={`pointer-events-none select-none ${strong ? "blur-[22px]" : soft ? "blur-[7px]" : "blur-[10px]"}`}>
          {children}
        </div>
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center [@media(hover:none)]:hidden">
          <div className="pointer-events-auto invisible opacity-0 transition-opacity duration-150 group-hover/lock:visible group-hover/lock:opacity-100 group-focus-within/lock:visible group-focus-within/lock:opacity-100">
            <Link
              href="/pricing"
              onClick={() => posthog.capture("preview_unlock_clicked")}
              className="flex flex-col items-center gap-1 whitespace-nowrap border border-[#0B0B0C] bg-white px-4 py-3 text-center text-[#0B0B0C] no-underline shadow-sm hover:bg-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/60"
              style={{ fontFamily: "var(--font-report-body)" }}
            >
              <span className="text-[13px] font-semibold">Unlock with Pro</span>
              <span className="text-[12px] text-[#0A369D]">See pricing →</span>
            </Link>
          </div>
        </div>
      </div>
    </LockContext.Provider>
  )
}
