import type { ReactNode } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { interBody, interTight } from "@/app/results/report-fonts"

// Shared "Legal A — Numbered" layout, used by /privacy, /cookies and
// /accessibility so all three stay visually and structurally identical.
// Changing the design here changes it everywhere; don't restyle per-page.

const DISPLAY_FONT = "var(--font-report-display)"
const BODY_FONT = "var(--font-report-body)"
const INK = "#0B0B0C"
const MUTED = "#6B6B70"
const ACCENT = "#0A369D"

export function PolicyLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      style={{ color: ACCENT }}
      className="hover:underline rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/50 focus-visible:ring-offset-2"
    >
      {children}
    </a>
  )
}

// A plain row list with no bullets, for content like §02's "Measures we take"
// — matches the existing cookie-policy list pattern rather than a bulleted <ul>.
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-none p-0 m-0">
      {items.map((item, i) => (
        <li key={i} className="text-[15px] py-2.5" style={{ color: MUTED, borderBottom: i < items.length - 1 ? "1px solid #E6E6E8" : "none" }}>
          {item}
        </li>
      ))}
    </ul>
  )
}

export type LegalSection = {
  number: string
  id: string
  title: string
  body: ReactNode
}

export function LegalPage({
  title,
  lastUpdated,
  sections,
}: {
  title: string
  lastUpdated: string
  sections: LegalSection[]
}) {
  return (
    <div className={`min-h-screen bg-[#FBFAF7] ${interBody.variable} ${interTight.variable}`} style={{ color: INK }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3 focus:px-4 focus:py-2 focus:rounded-sm"
        style={{ backgroundColor: ACCENT, color: "#FFFFFF" }}
      >
        Skip to content
      </a>

      <Navbar />

      <main id="main-content" style={{ fontFamily: BODY_FONT }}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 px-5 md:px-12 pt-14 pb-10">
          <div className="md:col-span-3">
            <span className="text-[13px]" style={{ color: MUTED }}>
              Legal
            </span>
          </div>
          <div className="md:col-span-9">
            <h1
              className="text-[44px] md:text-[64px] font-normal tracking-[-0.04em] leading-none"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              {title}
            </h1>
            <p className="text-[12px] mt-3" style={{ color: MUTED }}>
              Last updated: {lastUpdated}
            </p>
          </div>
        </div>

        <div className="px-5 md:px-12">
          {sections.map((section) => (
            <section
              key={section.number}
              id={section.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 py-7"
              style={{ borderBottom: `1px solid ${INK}` }}
            >
              <div className="md:col-span-3">
                <span
                  aria-hidden="true"
                  className="text-[40px] md:text-[64px] font-light tracking-[-0.04em] leading-none"
                  style={{ fontFamily: DISPLAY_FONT, color: ACCENT }}
                >
                  {section.number}
                </span>
              </div>
              <div className="md:col-span-9">
                <h2
                  className="text-[22px] font-medium tracking-[-0.015em] mb-1.5"
                  style={{ fontFamily: DISPLAY_FONT }}
                >
                  {section.title}
                </h2>
                <div className="text-[15px] leading-[1.65] max-w-[680px]" style={{ color: MUTED }}>
                  {section.body}
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
