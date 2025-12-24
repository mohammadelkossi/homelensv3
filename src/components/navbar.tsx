"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
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
  const backgroundColor = isScrolled ? '#FFFFFF' : 'transparent'
  
  return (
    <nav className="border-b border-gray-200 shadow-sm sticky top-0" style={{ zIndex: 50, backgroundColor }}>
      <div className="container mx-auto px-6" style={{ backgroundColor }}>
        <div className="flex items-center justify-between h-18" style={{ backgroundColor }}>
          <Link href="/" className="flex items-center" style={{ marginLeft: '2%' }}>
            <img src="/HomeLens updated-3.svg" alt="HomeLens Logo" className="h-16 w-auto" />
          </Link>

          <div className="flex flex-1 justify-center" style={{ backgroundColor }}>
            <NavigationMenu className="flex items-center justify-center w-full" style={{ backgroundColor }}>
              <NavigationMenuList className="flex items-center justify-center" style={{ gap: '40px', backgroundColor }}>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/pricing"
                      className="!text-black hover:!text-gray-600 transition-colors px-4 py-2 no-underline"
                      style={{ color: '#000000', fontWeight: '600' }}
                    >
                      Pricing
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/blog"
                      className="!text-black hover:!text-gray-600 transition-colors px-4 py-2 no-underline"
                      style={{ color: '#000000', fontWeight: '600' }}
                    >
                      Blog
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="flex items-center gap-x-[22px] mr-[50px]">
            <Button asChild size="lg" className="bg-[#0A369D] text-white hover:bg-[#082e83] rounded-full h-[40px] px-[30px] text-[1.1rem]" style={{ fontWeight: '600' }}>
              <Link href="/preferences" className="no-underline text-white !text-white" style={{ fontWeight: '600', color: '#ffffff' }}>Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-black border-[#0A369D] hover:bg-[#0A369D]/10 focus-visible:ring-[#0A369D]/50 rounded-full h-[40px] px-[30px] text-[1.1rem]" style={{ fontWeight: '600' }}>
              <Link href="/login" className="no-underline" style={{ fontWeight: '600', color: '#000000' }}>Log In</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}