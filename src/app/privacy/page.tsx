"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      <main className="container mx-auto px-6 py-12">
        <header className="max-w-3xl">
          <h1 className="text-3xl font-semibold mb-4">Privacy Policy</h1>
          <p className="text-sm text-gray-600">
            Last updated: November 12, 2025
          </p>
        </header>

        <section className="max-w-3xl space-y-8 mt-10">
          <article>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="leading-relaxed">
              HomeLens (“we”, “us”, or “our”) is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, and safeguard your personal information when you interact with our
              services.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <p className="leading-relaxed">
              We may collect information that you provide directly, such as contact details and preferences,
              as well as data gathered automatically, including device information, usage statistics, and cookies.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p className="leading-relaxed">
              Your information helps us deliver and improve our services, personalize your experience, communicate
              updates, and comply with legal obligations. We do not sell your personal information to third parties.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-semibold mb-3">4. Sharing Your Information</h2>
            <p className="leading-relaxed">
              We may share your information with trusted service providers who assist in operating our platform,
              provided they adhere to strict confidentiality and data protection requirements.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-semibold mb-3">5. Your Rights</h2>
            <p className="leading-relaxed">
              Depending on your location, you may have rights to access, correct, delete, or restrict the use of
              your personal data. To exercise these rights, please contact us using the details below.
            </p>
          </article>

          <article>
            <h2 className="text-xl font-semibold mb-3">6. Contact Us</h2>
            <p className="leading-relaxed">
              If you have any questions about this Privacy Policy or how we handle your data, please reach out to
              us at{" "}
              <a href="mailto:privacy@homelens.com" className="text-black underline">
                privacy@homelens.com
              </a>.
            </p>
          </article>
        </section>
      </main>
      <Footer />
    </div>
  )
}


