declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void
    }
  }
}

/** Override in production via NEXT_PUBLIC_CALENDLY_URL (requires redeploy). */
export const DEFAULT_CALENDLY_URL = "https://calendly.com/mohammad-homelens/30min"

export function getCalendlyBookingUrl(): string {
  return process.env.NEXT_PUBLIC_CALENDLY_URL || DEFAULT_CALENDLY_URL
}

let loadPromise: Promise<void> | null = null

function loadCalendlyWidget(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.Calendly) return Promise.resolve()

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('link[href*="calendly.com/assets/external/widget.css"]')) {
        const link = document.createElement("link")
        link.href = "https://assets.calendly.com/assets/external/widget.css"
        link.rel = "stylesheet"
        document.head.appendChild(link)
      }

      const script = document.createElement("script")
      script.src = "https://assets.calendly.com/assets/external/widget.js"
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error("Failed to load Calendly widget"))
      document.body.appendChild(script)
    })
  }

  return loadPromise
}

export function preloadCalendlyWidget(): void {
  void loadCalendlyWidget().catch(() => {})
}

export async function openCalendlyPopup(url = getCalendlyBookingUrl()): Promise<void> {
  await loadCalendlyWidget()
  if (!window.Calendly?.initPopupWidget) {
    throw new Error("Calendly widget unavailable")
  }
  window.Calendly.initPopupWidget({ url })
}

export function openCalendlyBooking(url = getCalendlyBookingUrl()): void {
  void openCalendlyPopup(url).catch(() => {
    window.open(url, "_blank", "noopener,noreferrer")
  })
}
