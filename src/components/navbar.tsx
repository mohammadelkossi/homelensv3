"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, ChevronDown } from "lucide-react"
import { useLoginPopup } from "@/components/login-popup"
import { createBrowserClient } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"
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
  const [user, setUser] = useState<User | null>(null)
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)
  const accountDropdownRef = useRef<HTMLDivElement>(null)
  const { openLogin } = useLoginPopup()
  const backgroundColor = isScrolled ? '#FFFFFF' : 'transparent'

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
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="hidden md:flex items-center gap-x-[22px] shrink-0">
            <Button asChild size="lg" className="bg-[#0A369D] text-white hover:bg-[#082e83] rounded-full h-[40px] px-[30px] text-[1.1rem]" style={{ fontWeight: '600' }}>
              <Link href="/preferences" className="no-underline text-white !text-white" style={{ fontWeight: '600', color: '#ffffff' }}>Get Started</Link>
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
              <Button variant="outline" size="lg" className="text-black border-[#0A369D] hover:bg-[#0A369D]/10 focus-visible:ring-[#0A369D]/50 rounded-full h-[40px] px-[30px] text-[1.1rem]" style={{ fontWeight: '600' }} onClick={openLogin}>
                Log In
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
            {user && (
              <>
                <Link href="/account" className="px-4 py-3 text-black font-medium hover:bg-gray-100 rounded-lg truncate" onClick={() => setMobileMenuOpen(false)}>
                  {user.user_metadata?.full_name ?? user.email ?? "Account"}
                </Link>
                <Link href="/contact" className="px-4 py-3 text-black font-medium hover:bg-gray-100 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Contact Us</Link>
              </>
            )}
            <div className="flex flex-col gap-2 px-4 pt-2">
              <Button asChild size="lg" className="w-full bg-[#0A369D] text-white hover:bg-[#082e83] rounded-full h-11" style={{ fontWeight: '600' }}>
                <Link href="/preferences" className="no-underline text-white" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
              </Button>
              {user ? (
                <Button variant="outline" size="lg" className="w-full text-black border-[#0A369D] hover:bg-[#0A369D]/10 rounded-full h-11" style={{ fontWeight: '600' }} onClick={async () => {
                  setMobileMenuOpen(false)
                  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
                  await supabase.auth.signOut()
                }}>
                  Sign out
                </Button>
              ) : (
                <Button variant="outline" size="lg" className="w-full text-black border-[#0A369D] hover:bg-[#0A369D]/10 rounded-full h-11" style={{ fontWeight: '600' }} onClick={() => { setMobileMenuOpen(false); openLogin(); }}>
                  Log In
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}