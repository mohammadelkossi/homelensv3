"use client"

import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-white text-black" style={{ minHeight: '20vh' }}>
      <div className="container mx-auto px-6 py-0">
        <div className="flex justify-between items-center">
          {/* Logo Column */}
          <div className="pl-6 pr-8" style={{ transform: 'translateX(0%) translateY(80%)' }}>
            <Link href="/" className="flex items-center no-underline text-black hover:text-black visited:text-black" style={{ color: '#000000' }}>
              <img src="/HomeLens updated-3.svg" alt="HomeLens Logo" className="h-16 w-auto" style={{ marginLeft: '2%' }} />
            </Link>
          </div>

          {/* All Links in One Row */}
          <div className="flex items-center space-x-12 text-sm text-black" style={{ color: '#000000', transform: 'translateX(0%) translateY(270%)', gap: '3rem' }}>
            <Link href="/login" className="text-black hover:text-black visited:text-black transition-colors no-underline" style={{ color: '#000000', whiteSpace: 'nowrap' }}>
              Log In
            </Link>
            <Link href="/pricing" className="text-black hover:text-black visited:text-black transition-colors no-underline" style={{ color: '#000000' }}>
              Pricing
            </Link>
            <Link href="/blog" className="text-black hover:text-black visited:text-black transition-colors no-underline" style={{ color: '#000000' }}>
              Blog
            </Link>
            <Link href="/privacy" className="text-black hover:text-black visited:text-black transition-colors no-underline" style={{ color: '#000000', whiteSpace: 'nowrap' }}>
              Privacy Policy
            </Link>
            <Link href="/cookies" className="text-black hover:text-black visited:text-black transition-colors no-underline" style={{ color: '#000000', whiteSpace: 'nowrap' }}>
              Cookie Policy
            </Link>
            <Link href="/accessibility" className="text-black hover:text-black visited:text-black transition-colors no-underline" style={{ color: '#000000' }}>
              Accessibility
            </Link>
            <p className="text-sm m-0" style={{ color: '#000000', whiteSpace: 'nowrap' }}>
              © 2025 HomeLens. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
