"use client"

import { useState } from "react"
import type { KeyPoints } from "@/lib/rules-engine"

const DISPLAY_FONT = "var(--font-report-display)"
const BODY_FONT = "var(--font-report-body)"

const TABS: { key: keyof KeyPoints; label: string }[] = [
  { key: "know", label: "Why It Works" },
  { key: "consider", label: "To Watch Out For" },
  { key: "ask", label: "Ask the Agent" },
]

export function KeyPointsTabs({ keyPoints, loading = false }: { keyPoints: KeyPoints; loading?: boolean }) {
  const [active, setActive] = useState<keyof KeyPoints>("know")
  const items = keyPoints[active]

  return (
    <div style={{ fontFamily: BODY_FONT, fontSize: 14 }}>
      <div className="flex flex-wrap gap-x-3.5 sm:gap-x-7 mb-[14px] text-[13px]" role="tablist" aria-label="Key points">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            // 44px tall for touch; the underline still sits under the label.
            className="min-h-[44px] flex items-end shrink-0"
            style={{ background: "none", cursor: "pointer", color: active === tab.key ? "#0B0B0C" : "#8A8A8F" }}
          >
            <span className="pb-1 border-b" style={{ borderColor: active === tab.key ? "#0B0B0C" : "transparent" }}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
      {loading ? (
        <div aria-live="polite">
          <p className="mb-4 text-[12px]" style={{ color: "#6B6B70" }}>
            Writing the key points for this home…
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-[31px]" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-[36px] w-[24px] sm:h-[44px]" style={{ backgroundColor: "#EFEFF1" }} />
                <div className="mt-[13px] h-[15px] w-4/5" style={{ backgroundColor: "#EFEFF1" }} />
                <div className="mt-[9px] h-[12px] w-full" style={{ backgroundColor: "#F4F4F5" }} />
                <div className="mt-[6px] h-[12px] w-2/3" style={{ backgroundColor: "#F4F4F5" }} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-[31px]">
          {items.map((item, i) => (
            <div key={item.id}>
              <div
                className="text-[36px] sm:text-[44px]"
                style={{ fontFamily: DISPLAY_FONT, fontWeight: 300, color: "#C2410C", lineHeight: 1 }}
              >
                {i + 1}
              </div>
              <div className="mt-[13px] font-semibold text-[15px]">{item.title}</div>
              <div className="mt-[5px]" style={{ color: "#6B6B70" }}>
                {item.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
