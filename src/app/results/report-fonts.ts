import { Inter, Inter_Tight } from "next/font/google"

export const interBody = Inter({
  variable: "--font-report-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

export const interTight = Inter_Tight({
  variable: "--font-report-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
})
