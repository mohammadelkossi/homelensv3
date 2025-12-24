"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white" style={{ backgroundColor: '#FFFFFF' }}>
      <Navbar />
      <div className="container mx-auto px-6 py-12 flex items-center justify-center min-h-[70vh]">
        <h1 className="text-4xl md:text-5xl font-bold text-center" style={{ color: '#000000' }}>
          Coming Soon
        </h1>
      </div>
      <Footer />
    </div>
  )
}


