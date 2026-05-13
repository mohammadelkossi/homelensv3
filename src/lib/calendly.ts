declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void
    }
  }
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

export async function openCalendlyPopup(url: string): Promise<void> {
  await loadCalendlyWidget()
  window.Calendly?.initPopupWidget({ url })
}
