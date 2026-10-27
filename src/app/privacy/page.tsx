import type { Metadata } from "next"
import { LegalPage, PolicyLink, type LegalSection } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Privacy policy — HomeLens",
  description:
    "How HomeLens collects, uses, and protects your personal data, in line with UK GDPR and the Data Protection Act 2018.",
}

const SECTIONS: LegalSection[] = [
  {
    number: "01",
    id: "introduction",
    title: "Introduction",
    body: (
      <p>
        HomeLens (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to
        protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard
        your personal information when you interact with our services.
      </p>
    ),
  },
  {
    number: "02",
    id: "information-we-collect",
    title: "Information We Collect",
    body: (
      <p>
        We may collect information that you provide directly, such as contact details and
        preferences, as well as data gathered automatically, including device information, usage
        statistics, and cookies.
      </p>
    ),
  },
  {
    number: "03",
    id: "how-we-use-your-information",
    title: "How We Use Your Information",
    body: (
      <p>
        Your information helps us deliver and improve our services, personalize your experience,
        communicate updates, and comply with legal obligations. We do not sell your personal
        information to third parties.
      </p>
    ),
  },
  {
    number: "04",
    id: "sharing-your-information",
    title: "Sharing Your Information",
    body: (
      <p>
        We may share your information with trusted service providers who assist in operating our
        platform, provided they adhere to strict confidentiality and data protection requirements.
      </p>
    ),
  },
  {
    number: "05",
    id: "your-rights",
    title: "Your Rights",
    body: (
      <p>
        Depending on your location, you may have rights to access, correct, delete, or restrict the
        use of your personal data. To exercise these rights, please contact us using the details
        below.
      </p>
    ),
  },
  {
    number: "06",
    id: "contact-us",
    title: "Contact Us",
    body: (
      <p>
        If you have any questions about this Privacy Policy or how we handle your data, please
        reach out to us at <PolicyLink href="mailto:privacy@homelens.co">privacy@homelens.co</PolicyLink>.
      </p>
    ),
  },
]

export default function PrivacyPolicyPage() {
  return <LegalPage title="Privacy policy" lastUpdated="October 22, 2026" sections={SECTIONS} />
}
