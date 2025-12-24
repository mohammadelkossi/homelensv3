"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white" style={{ backgroundColor: '#FFFFFF', color: '#000000' }}>
      <Navbar />
      <div className="container mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-[70vh]">
        <h1 className="text-4xl md:text-5xl font-bold text-center" style={{ color: '#000000' }}>
          Level up your<br />
          Property Investment Decisions
        </h1>
        <p className="text-lg md:text-xl text-center mt-6 italic" style={{ color: '#000000', fontStyle: 'italic' }}>
          Smarter frameworks, clearer insights, and practical tools<br />
          for choosing winning properties - without the guesswork
        </p>
      </div>
      <Footer />
    </div>
  )
}
