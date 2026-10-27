"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, ChevronDown } from "lucide-react"
import { useLoginPopup } from "@/components/login-popup"
import { createBrowserClient } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"
import { interBody } from "@/app/results/report-fonts"
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from "@/components/ui/navigation-menu"

interface NavbarProps {
  isScrolled?: boolean
}

// Matches the homepage hero's primary button: square, near-black, Inter 14px medium.
const GET_STARTED_CLASS = `${interBody.variable} rounded-none bg-[#0B0B0C] hover:bg-[#2A2A2E] text-white h-[40px] px-6 text-[14px] font-medium border border-[#0B0B0C] shadow-none`
const BUTTON_FONT_STYLE = { fontFamily: "var(--font-report-body)" }
// Matches the hero's secondary ("See sample report") button: square, white, black outline.
const SECONDARY_CLASS = `${interBody.variable} rounded-none bg-white hover:bg-[#F4F4F5] text-[#0B0B0C] hover:text-[#0B0B0C] h-[40px] px-6 text-[14px] font-medium border border-[#0B0B0C] shadow-none focus-visible:ring-[#0A369D]/50`

export function Navbar({ isScrolled = false }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)
  const accountDropdownRef = useRef<HTMLDivElement>(null)
  const { openLogin } = useLoginPopup()
  const backgroundColor = isScrolled ? '#FBFAF7' : 'transparent'

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setAccountDropdownOpen(false)
      }
    }
    if (accountDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [accountDropdownOpen])

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return
    const supabase = createBrowserClient(url, key)
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <nav className={`${interBody.variable} border-b border-gray-200 shadow-sm sticky top-0`} style={{ zIndex: 50, backgroundColor, fontFamily: "var(--font-report-body)" }}>
      <div className="container mx-auto px-4 sm:px-6" style={{ backgroundColor }}>
        <div className="flex items-center justify-between min-h-[4rem] md:min-h-[4.5rem]" style={{ backgroundColor }}>
          <Link href="/" className="flex items-center shrink-0">
            <img src="/HomeLens updated-3.svg" alt="HomeLens Logo" className="h-12 w-auto sm:h-16" />
          </Link>

          <div className="hidden md:flex flex-1 justify-center" style={{ backgroundColor }}>
            <NavigationMenu className="flex items-center justify-center w-full" viewport={false} style={{ backgroundColor }}>
              <NavigationMenuList className="flex items-center justify-center" style={{ gap: '40px', backgroundColor }}>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="/pricing" className="!text-[#0B0B0C] hover:!text-gray-600 transition-colors px-4 py-2 no-underline text-[14px]" style={{ fontWeight: 500 }}>Pricing</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="!bg-transparent !text-[#0B0B0C] hover:!text-gray-600 data-[state=open]:!bg-transparent text-[14px]" style={{ fontWeight: 500 }}>Tools</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <NavigationMenuLink asChild>
                      <Link href="/calculator" className="!text-black no-underline whitespace-nowrap" style={{ color: '#000000' }}>Ongoing costs</Link>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <Link href="/upfront-costs" className="!text-black no-underline whitespace-nowrap" style={{ color: '#000000' }}>Upfront costs</Link>
                    </NavigationMenuLink>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="hidden md:flex items-center gap-x-[22px] shrink-0">
            <Button asChild size="lg" className={GET_STARTED_CLASS} style={BUTTON_FONT_STYLE}>
              <Link href="/preferences" className="no-underline !text-white">Get started</Link>
            </Button>
            {user ? (
              <div className="relative" ref={accountDropdownRef}>
                <button
                  type="button"
                  onClick={() => setAccountDropdownOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-sm font-medium text-black hover:text-[#0A369D] py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors"
                  title={user.email ?? undefined}
                >
                  <span className="truncate max-w-[160px]">{user.user_metadata?.full_name ?? user.email ?? "Account"}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${accountDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {accountDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 py-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
                    <Link
                      href="/account"
                      className="block px-4 py-2 text-sm text-black hover:bg-gray-100 no-underline"
                      onClick={() => setAccountDropdownOpen(false)}
                    >
                      Account
                    </Link>
                    <Link
                      href="/contact"
                      className="block px-4 py-2 text-sm text-black hover:bg-gray-100 no-underline"
                      onClick={() => setAccountDropdownOpen(false)}
                    >
                      Contact Us
                    </Link>
                    <div className="my-1 border-t border-gray-200" aria-hidden="true" />
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2 text-sm text-black hover:bg-gray-100"
                      onClick={async () => {
                        setAccountDropdownOpen(false)
                        const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
                        await supabase.auth.signOut()
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button variant="outline" size="lg" className={SECONDARY_CLASS} style={BUTTON_FONT_STYLE} onClick={openLogin}>
                Log in
              </Button>
            )}
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
            <div className="px-4 py-3">
              <p className="text-black font-semibold mb-1">Tools</p>
              <Link href="/calculator" className="block pl-3 py-2 text-black font-medium hover:bg-gray-100 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Ongoing costs</Link>
              <Link href="/upfront-costs" className="block pl-3 py-2 text-black font-medium hover:bg-gray-100 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Upfront costs</Link>
            </div>
            {user && (
              <>
                <Link href="/account" className="px-4 py-3 text-black font-medium hover:bg-gray-100 rounded-lg truncate" onClick={() => setMobileMenuOpen(false)}>
                  {user.user_metadata?.full_name ?? user.email ?? "Account"}
                </Link>
                <Link href="/contact" className="px-4 py-3 text-black font-medium hover:bg-gray-100 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Contact Us</Link>
              </>
            )}
            <div className="flex flex-col gap-2 px-4 pt-2">
              <Button asChild size="lg" className={`${GET_STARTED_CLASS} w-full !h-11`} style={BUTTON_FONT_STYLE}>
                <Link href="/preferences" className="no-underline !text-white" onClick={() => setMobileMenuOpen(false)}>Get started</Link>
              </Button>
              {user ? (
                <Button variant="outline" size="lg" className={`${SECONDARY_CLASS} w-full !h-11`} style={BUTTON_FONT_STYLE} onClick={async () => {
                  setMobileMenuOpen(false)
                  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
                  await supabase.auth.signOut()
                }}>
                  Sign out
                </Button>
              ) : (
                <Button variant="outline" size="lg" className={`${SECONDARY_CLASS} w-full !h-11`} style={BUTTON_FONT_STYLE} onClick={() => { setMobileMenuOpen(false); openLogin(); }}>
                  Log in
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}