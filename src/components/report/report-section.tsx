import type { ReactNode } from "react"

const DISPLAY_FONT = "var(--font-report-display)"
const BODY_FONT = "var(--font-report-body)"

export type ReportSectionProps = {
  id?: string
  number?: string
  title: string
  subtitle?: ReactNode
  children: ReactNode
}

export function ReportSection({ id, number, title, subtitle, children }: ReportSectionProps) {
  return (
    <section
      id={id}
      className="grid grid-cols-1 sm:grid-cols-12 gap-6 px-6 sm:px-12 py-10 border-t border-[#0B0B0C]"
      style={{ fontFamily: BODY_FONT, fontSize: 14, color: "#0B0B0C" }}
    >
      <div className="sm:col-span-3">
        {number ? (
          <div
            className="text-[40px] sm:text-[56px]"
            style={{ fontFamily: DISPLAY_FONT, fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1, color: "#0A369D" }}
          >
            {number}
          </div>
        ) : null}
        <h2
          className="mt-2.5 text-[18px] sm:text-[22px]"
          style={{ fontFamily: DISPLAY_FONT, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-[13px]" style={{ color: "#6B6B70" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="sm:col-span-9 min-w-0">{children}</div>
    </section>
  )
}
