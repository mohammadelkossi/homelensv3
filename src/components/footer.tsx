"use client"

import Link from "next/link"
import { useLoginPopup } from "@/components/login-popup"

export function Footer() {
  const { openLogin } = useLoginPopup()
  return (
    <footer className="bg-white text-black">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-8">
          {/* Logo */}
          <div className="flex justify-center md:justify-start">
            <Link href="/" className="flex items-center no-underline text-black hover:text-black visited:text-black" style={{ color: '#000000' }}>
              <img src="/HomeLens updated-3.svg" alt="HomeLens Logo" className="h-12 sm:h-14 md:h-16 w-auto" />
            </Link>
          </div>

          {/* Links + copyright: stacked on mobile, row on desktop */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center md:justify-end gap-4 sm:gap-6 md:gap-8 text-sm" style={{ color: '#000000' }}>
            <button type="button" onClick={openLogin} className="text-black hover:opacity-80 transition-opacity no-underline whitespace-nowrap bg-transparent border-0 cursor-pointer p-0 font-inherit text-inherit">
              Log In
            </button>
            <Link href="/pricing" className="text-black hover:opacity-80 visited:text-black transition-opacity no-underline whitespace-nowrap">
              Pricing
            </Link>
            <Link href="/privacy" className="text-black hover:opacity-80 visited:text-black transition-opacity no-underline whitespace-nowrap">
              Privacy Policy
            </Link>
            <Link href="/cookies" className="text-black hover:opacity-80 visited:text-black transition-opacity no-underline whitespace-nowrap">
              Cookie Policy
            </Link>
            <Link href="/accessibility" className="text-black hover:opacity-80 visited:text-black transition-opacity no-underline whitespace-nowrap">
              Accessibility
            </Link>
            <p className="text-sm m-0 whitespace-nowrap order-last sm:order-none">
              © 2025 HomeLens. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
