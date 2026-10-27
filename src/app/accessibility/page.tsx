import type { Metadata } from "next"
import { LegalPage, LegalList, PolicyLink, type LegalSection } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Accessibility statement — HomeLens",
  description: "HomeLens's commitment to web accessibility and how to report barriers.",
}

const SECTIONS: LegalSection[] = [
  {
    number: "01",
    id: "our-commitment",
    title: "Our commitment",
    body: (
      <p>
        HomeLens is committed to making our website accessible to everyone, regardless of ability.
        We continually work to ensure our digital products meet or exceed the Web Content
        Accessibility Guidelines (WCAG) 2.1 level AA standards.
      </p>
    ),
  },
  {
    number: "02",
    id: "measures-we-take",
    title: "Measures we take",
    body: (
      <LegalList
        items={[
          "Semantic HTML structure and ARIA labels where appropriate.",
          "High-contrast colour palettes and scalable typography.",
          "Keyboard navigability across primary flows.",
          "Alt text on meaningful imagery and icons.",
          "Regular accessibility audits as part of our QA process.",
        ]}
      />
    ),
  },
  {
    number: "03",
    id: "feedback",
    title: "Feedback",
    body: (
      <p>
        If you encounter any accessibility barriers while using HomeLens, please let us know so we
        can address them promptly. You can reach us at{" "}
        <PolicyLink href="mailto:accessibility@homelens.co">accessibility@homelens.co</PolicyLink>.
      </p>
    ),
  },
  {
    number: "04",
    id: "third-party-content",
    title: "Third-party content",
    body: (
      <p>
        Some content within HomeLens may originate from third parties (e.g., embedded property
        media). While we strive to encourage accessible practices, we cannot guarantee compliance
        for third-party content.
      </p>
    ),
  },
  {
    number: "05",
    id: "continuous-improvement",
    title: "Continuous improvement",
    body: (
      <p>
        Accessibility is an ongoing effort. We are committed to reviewing and updating our
        accessibility roadmap, training our team, and partnering with users to ensure inclusive
        experiences across HomeLens.
      </p>
    ),
  },
]

export default function AccessibilityStatementPage() {
  return <LegalPage title="Accessibility statement" lastUpdated="October 22, 2026" sections={SECTIONS} />
}
