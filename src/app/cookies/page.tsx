"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />

      <main className="container mx-auto px-6 py-12">
        <header className="max-w-3xl">
          <h1 className="text-3xl font-semibold mb-4">Cookie Policy</h1>
          <p className="text-sm text-gray-600">
            Last updated: November 12, 2025
          </p>
        </header>

        <section className="max-w-3xl space-y-8 mt-10">
          <article>
            <h2 className="text-xl font-semibold mb-3">1. What are cookies?</h2>
            <p className="leading-relaxed">
              Cookies are small text files stored on your device when you visit our website.
              They help us remember your preferences, understand how you use HomeLens, and
              deliver a better, more personalised experience.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-semibold mb-3">2. How we use cookies</h2>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>Essential cookies to remember your session and keep you signed in.</li>
              <li>Performance cookies to analyse usage and improve our product.</li>
              <li>Functional cookies to store preferences such as saved properties.</li>
              <li>Optional analytics cookies to help us understand marketing effectiveness.</li>
            </ul>
          </article>

          <article>
            <h2 className="text-xl font-semibold mb-3">3. Controlling cookies</h2>
            <p className="leading-relaxed">
              You can manage or disable cookies in your browser settings. Please note that
              disabling essential cookies may impact site functionality. HomeLens also
              respects browser Do Not Track signals where supported.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-semibold mb-3">4. Third-party cookies</h2>
            <p className="leading-relaxed">
              Certain features (e.g., embedded maps or analytics) may use third-party cookies.
              These providers are responsible for their own cookie policies. We recommend
              reviewing the privacy and cookie practices of those services.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-semibold mb-3">5. Updates</h2>
            <p className="leading-relaxed">
              We may update this Cookie Policy to reflect changes in technology, regulation,
              or our services. Any updates will be posted on this page with a revised date.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-semibold mb-3">6. Contact us</h2>
            <p className="leading-relaxed">
              Questions about our cookie usage? Contact us at{" "}
              <a href="mailto:cookies@homelens.com" className="underline">
                cookies@homelens.com
              </a>.
            </p>
          </article>
        </section>
      </main>

      <Footer />
    </div>
  )
}


