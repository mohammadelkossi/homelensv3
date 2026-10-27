import type { ReactNode } from "react"
import { HelpTip } from "./help-tip"

// Shared building blocks for the two tool pages (/calculator, /upfront-costs),
// styled to match the rest of the site's Swiss/editorial design system: Inter
// + Inter Tight, hairline rules, no border-radius, no shadows.
// Field help tooltips reuse the existing shared Tooltip component — callers
// still need their own <TooltipProvider> higher up the tree.

export const DISPLAY_FONT = "var(--font-report-display)"
export const BODY_FONT = "var(--font-report-body)"
export const INK = "#0B0B0C"
export const MUTED = "#6B6B70"
export const HAIRLINE = "#E6E6E8"
export const ACCENT = "#0A369D"
export const WARN = "#C2410C"

export function ToolIntro({ label, title, subtitle }: { label: string; title: string; subtitle: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 px-5 md:px-12 pt-14 pb-10" style={{ fontFamily: BODY_FONT }}>
      <div className="md:col-span-3">
        <span className="text-[13px]" style={{ color: MUTED }}>
          {label}
        </span>
      </div>
      <div className="md:col-span-9">
        <h1 className="text-[40px] md:text-[56px] font-normal tracking-[-0.04em] leading-none" style={{ fontFamily: DISPLAY_FONT }}>
          {title}
        </h1>
        <p className="text-[15px] mt-4 max-w-xl" style={{ color: MUTED }}>
          {subtitle}
        </p>
      </div>
    </div>
  )
}

export function ToolSectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[13px] mb-4" style={{ color: MUTED, fontFamily: BODY_FONT }}>
      {children}
    </div>
  )
}

const FIELD_CLASS =
  "w-full h-11 px-3 text-[14px] bg-white outline-none focus-visible:border-[#0A369D] transition-colors"
const FIELD_STYLE = { border: `1px solid ${HAIRLINE}`, color: INK, fontFamily: BODY_FONT }

function FieldLabel({ htmlFor, label, help }: { htmlFor: string; label: string; help?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <label htmlFor={htmlFor} className="text-[12px]" style={{ color: MUTED, fontFamily: BODY_FONT }}>
        {label}
      </label>
      {help ? <HelpTip label={label} help={help} /> : null}
    </div>
  )
}

export function ToolField({
  id,
  label,
  help,
  ...inputProps
}: {
  id: string
  label: string
  help?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} help={help} />
      <input id={id} className={FIELD_CLASS} style={FIELD_STYLE} {...inputProps} />
    </div>
  )
}

export function ToolTextarea({
  id,
  label,
  help,
  ...textareaProps
}: {
  id: string
  label: string
  help?: string
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} help={help} />
      <textarea
        id={id}
        className="w-full px-3 py-2.5 text-[14px] bg-white outline-none focus-visible:border-[#0A369D] transition-colors resize-y"
        style={FIELD_STYLE}
        {...textareaProps}
      />
    </div>
  )
}

export function ToolSelect({
  id,
  label,
  help,
  children,
  ...selectProps
}: {
  id: string
  label: string
  help?: string
  children: ReactNode
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <FieldLabel htmlFor={id} label={label} help={help} />
      <select id={id} className={FIELD_CLASS} style={FIELD_STYLE} {...selectProps}>
        {children}
      </select>
    </div>
  )
}

export function ToolButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="h-11 px-8 text-[14px] font-medium text-white transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/50 focus-visible:ring-offset-2"
      style={{ backgroundColor: ACCENT, fontFamily: BODY_FONT }}
    >
      {children}
    </button>
  )
}

// Two-way toggle (e.g. Buy / Rent) — sharp-edged, no pill.
export function ToolToggle<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex" style={{ border: `1px solid ${INK}` }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className="px-5 h-10 text-[14px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/50"
          style={{
            backgroundColor: value === opt.value ? INK : "transparent",
            color: value === opt.value ? "#FFFFFF" : INK,
            fontFamily: BODY_FONT,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function ResultHeadline({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div>
      <div className="text-[12px]" style={{ color: MUTED }}>
        {label}
      </div>
      <div
        className="mt-2 text-[48px] sm:text-[64px]"
        style={{ fontFamily: DISPLAY_FONT, fontWeight: 300, color: ACCENT, lineHeight: 1, letterSpacing: "-0.03em" }}
      >
        {value}
      </div>
      {caption ? (
        <p className="mt-2.5 text-[13px]" style={{ color: MUTED }}>
          {caption}
        </p>
      ) : null}
    </div>
  )
}

// A cost-breakdown row with a thin proportional bar, matching the pattern
// used for "Paid in Y" / "Asking now" in the report's price-fairness section.
export function ResultRow({
  label,
  note,
  value,
  max,
  formatted,
}: {
  label: string
  note?: string
  value: number
  max: number
  formatted: string
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className="py-3" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
      <div className="flex justify-between items-baseline gap-4">
        <span className="text-[14px]" style={{ color: INK }}>
          {label}
        </span>
        <span className="text-[14px] font-semibold shrink-0" style={{ color: INK, fontFamily: BODY_FONT }}>
          {formatted}
        </span>
      </div>
      {note ? (
        <p className="text-[12px] mt-0.5" style={{ color: MUTED }}>
          {note}
        </p>
      ) : null}
      <div className="mt-2 h-[3px] w-full" style={{ backgroundColor: HAIRLINE }}>
        <div className="h-full" style={{ width: `${percent}%`, backgroundColor: ACCENT }} />
      </div>
    </div>
  )
}
