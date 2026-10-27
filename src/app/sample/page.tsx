import { Suspense } from "react"
import type { Metadata } from "next"
import { ReportView } from "@/app/results/report-view"
import { SAMPLE_REPORT_QUERY, SAMPLE_REPORT_SNAPSHOT } from "./sample-report-snapshot"

export const metadata: Metadata = {
  title: "Sample report · HomeLens",
  description: "A full HomeLens property report for a real Rightmove listing: price, market, risks, daily life and a recommended offer.",
}

export default function SamplePage() {
  return (
    <Suspense fallback={null}>
      <ReportView query={SAMPLE_REPORT_QUERY} snapshot={SAMPLE_REPORT_SNAPSHOT} />
    </Suspense>
  )
}
