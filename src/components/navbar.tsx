"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu"

interface NavbarProps {
  isScrolled?: boolean
}

export function Navbar({ isScrolled = false }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const backgroundColor = isScrolled ? '#FFFFFF' : 'transparent'

  return (
    <nav className="border-b border-gray-200 shadow-sm sticky top-0" style={{ zIndex: 50, backgroundColor }}>
      <div className="container mx-auto px-4 sm:px-6" style={{ backgroundColor }}>
        <div className="flex items-center justify-between min-h-[4rem] md:min-h-[4.5rem]" style={{ backgroundColor }}>
          <Link href="/" className="flex items-center shrink-0">
            <img src="/HomeLens updated-3.svg" alt="HomeLens Logo" className="h-12 w-auto sm:h-16" />
          </Link>

          <div className="hidden md:flex flex-1 justify-center" style={{ backgroundColor }}>
            <NavigationMenu className="flex items-center justify-center w-full" style={{ backgroundColor }}>
              <NavigationMenuList className="flex items-center justify-center" style={{ gap: '40px', backgroundColor }}>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="/pricing" className="!text-black hover:!text-gray-600 transition-colors px-4 py-2 no-underline" style={{ color: '#000000', fontWeight: '600' }}>Pricing</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="/blog" className="!text-black hover:!text-gray-600 transition-colors px-4 py-2 no-underline" style={{ color: '#000000', fontWeight: '600' }}>Blog</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="hidden md:flex items-center gap-x-[22px] shrink-0">
            <Button asChild size="lg" className="bg-[#0A369D] text-white hover:bg-[#082e83] rounded-full h-[40px] px-[30px] text-[1.1rem]" style={{ fontWeight: '600' }}>
              <Link href="/preferences" className="no-underline text-white !text-white" style={{ fontWeight: '600', color: '#ffffff' }}>Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-black border-[#0A369D] hover:bg-[#0A369D]/10 focus-visible:ring-[#0A369D]/50 rounded-full h-[40px] px-[30px] text-[1.1rem]" style={{ fontWeight: '600' }}>
              <Link href="/login" className="no-underline" style={{ fontWeight: '600', color: '#000000' }}>Log In</Link>
            </Button>
          </div>

          <button
            type="button"
            className="md:hidden flex items-center justify-center p-2 rounded-lg text-black hover:bg-gray-100"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileMenuOpen((o) => !o)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 flex flex-col gap-3 bg-white">
            <Link href="/pricing" className="px-4 py-3 text-black font-semibold hover:bg-gray-100 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
            <Link href="/blog" className="px-4 py-3 text-black font-semibold hover:bg-gray-100 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Blog</Link>
            <div className="flex flex-col gap-2 px-4 pt-2">
              <Button asChild size="lg" className="w-full bg-[#0A369D] text-white hover:bg-[#082e83] rounded-full h-11" style={{ fontWeight: '600' }}>
                <Link href="/preferences" className="no-underline text-white" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full text-black border-[#0A369D] hover:bg-[#0A369D]/10 rounded-full h-11" style={{ fontWeight: '600' }}>
                <Link href="/login" className="no-underline" style={{ color: '#000000' }} onClick={() => setMobileMenuOpen(false)}>Log In</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}