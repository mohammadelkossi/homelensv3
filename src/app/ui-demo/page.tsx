"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export default function UIDemo() {
  return (
    <div className="min-h-screen bg-[#F5F7FA] p-8 space-y-8">
      <h1 className="text-2xl font-semibold">shadcn/ui demo</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Textarea</h2>
        <Textarea
          placeholder="Paste the Rightmove link here..."
          className="min-h-[120px] max-w-2xl"
        />
      </section>
    </div>
  )
}


