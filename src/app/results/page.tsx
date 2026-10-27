import { Suspense } from "react"
import { ReportView } from "./report-view"

export default function ResultsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReportView />
    </Suspense>
  )
}
