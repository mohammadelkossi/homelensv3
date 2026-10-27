import type { Metadata } from "next"
import { LegalPage, LegalList, PolicyLink, type LegalSection } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Cookie policy — HomeLens",
  description: "How HomeLens uses cookies, and how to control them.",
}

const SECTIONS: LegalSection[] = [
  {
    number: "01",
    id: "what-are-cookies",
    title: "What are cookies?",
    body: (
      <p>
        Cookies are small text files stored on your device when you visit our website. They help
        us remember your preferences, understand how you use HomeLens, and deliver a better, more
        personalised experience.
      </p>
    ),
  },
  {
    number: "02",
    id: "how-we-use-cookies",
    title: "How we use cookies",
    body: (
      <LegalList
        items={[
          "Essential cookies to remember your session and keep you signed in.",
          "Performance cookies to analyse usage and improve our product.",
          "Functional cookies to store preferences such as saved properties.",
          "Optional analytics cookies to help us understand marketing effectiveness.",
        ]}
      />
    ),
  },
  {
    number: "03",
    id: "controlling-cookies",
    title: "Controlling cookies",
    body: (
      <p>
        You can manage or disable cookies in your browser settings. Please note that disabling
        essential cookies may impact site functionality. HomeLens also respects browser Do Not
        Track signals where supported.
      </p>
    ),
  },
  {
    number: "04",
    id: "third-party-cookies",
    title: "Third-party cookies",
    body: (
      <p>
        Certain features (e.g., embedded maps or analytics) may use third-party cookies. These
        providers are responsible for their own cookie policies. We recommend reviewing the
        privacy and cookie practices of those services.
      </p>
    ),
  },
  {
    number: "05",
    id: "updates",
    title: "Updates",
    body: (
      <p>
        We may update this Cookie Policy to reflect changes in technology, regulation, or our
        services. Any updates will be posted on this page with a revised date.
      </p>
    ),
  },
  {
    number: "06",
    id: "contact-us",
    title: "Contact us",
    body: (
      <p>
        Questions about our cookie usage? Contact us at{" "}
        <PolicyLink href="mailto:cookies@homelens.co">cookies@homelens.co</PolicyLink>.
      </p>
    ),
  },
]

export default function CookiePolicyPage() {
  return <LegalPage title="Cookie policy" lastUpdated="October 22, 2026" sections={SECTIONS} />
}
