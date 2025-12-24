"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />

      <main className="container mx-auto px-6 py-12">
        <header className="max-w-3xl">
          <h1 className="text-3xl font-semibold mb-4">Accessibility Statement</h1>
          <p className="text-sm text-gray-600">
            Last updated: November 12, 2025
          </p>
        </header>

        <section className="max-w-3xl space-y-8 mt-10">
          <article>
            <h2 className="text-xl font-semibold mb-3">Our Commitment</h2>
            <p className="leading-relaxed">
              HomeLens is committed to making our website accessible to everyone,
              regardless of ability. We continually work to ensure our digital
              products meet or exceed the Web Content Accessibility Guidelines (WCAG)
              2.1 level AA standards.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-semibold mb-3">Measures We Take</h2>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>Semantic HTML structure and ARIA labels where appropriate.</li>
              <li>High-contrast colour palettes and scalable typography.</li>
              <li>Keyboard navigability across primary flows.</li>
              <li>Alt text on meaningful imagery and icons.</li>
              <li>Regular accessibility audits as part of our QA process.</li>
            </ul>
          </article>

          <article>
            <h2 className="text-xl font-semibold mb-3">Feedback</h2>
            <p className="leading-relaxed">
              If you encounter any accessibility barriers while using HomeLens,
              please let us know so we can address them promptly. You can reach our
              accessibility team at{" "}
              <a href="mailto:accessibility@homelens.com" className="underline">
                accessibility@homelens.com
              </a>.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-semibold mb-3">Third-Party Content</h2>
            <p className="leading-relaxed">
              Some content within HomeLens may originate from third parties (e.g.,
              embedded property media). While we strive to encourage accessible
              practices, we cannot guarantee compliance for third-party content.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-semibold mb-3">Continuous Improvement</h2>
            <p className="leading-relaxed">
              Accessibility is an ongoing effort. We are committed to reviewing and
              updating our accessibility roadmap, training our team, and partnering
              with users to ensure inclusive experiences across HomeLens.
            </p>
          </article>
        </section>
      </main>

      <Footer />
    </div>
  )
}


