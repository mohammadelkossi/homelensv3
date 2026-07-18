import { NextRequest, NextResponse } from "next/server"
import { buildRunningCostBreakdown } from "@/lib/running-costs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const purchasePrice = Number(body.purchasePrice)
    const deposit = Number(body.deposit ?? 0)
    const mortgageRatePercent = Number(body.mortgageRatePercent ?? 5)
    const termYears = Number(body.termYears ?? 25)
    const bedrooms = body.bedrooms != null ? Number(body.bedrooms) : null
    const occupants = body.occupants != null ? Number(body.occupants) : null

    if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
      return NextResponse.json({ error: "Enter a valid purchase price" }, { status: 400 })
    }
    if (!Number.isFinite(deposit) || deposit < 0 || deposit > purchasePrice) {
      return NextResponse.json({ error: "Enter a valid deposit" }, { status: 400 })
    }
    if (!Number.isFinite(mortgageRatePercent) || mortgageRatePercent < 0 || mortgageRatePercent > 25) {
      return NextResponse.json({ error: "Enter a mortgage rate between 0% and 25%" }, { status: 400 })
    }
    if (!Number.isFinite(termYears) || termYears < 1 || termYears > 40) {
      return NextResponse.json(
        { error: "Enter a repayment period between 1 and 40 years" },
        { status: 400 }
      )
    }
    if (bedrooms == null || !Number.isFinite(bedrooms) || bedrooms < 1 || bedrooms > 10) {
      return NextResponse.json({ error: "Enter between 1 and 10 bedrooms" }, { status: 400 })
    }
    if (occupants == null || !Number.isFinite(occupants) || occupants < 1 || occupants > 12) {
      return NextResponse.json(
        { error: "Enter between 1 and 12 people living in the property" },
        { status: 400 }
      )
    }

    const breakdown = buildRunningCostBreakdown({
      address: "Running cost estimate",
      purchasePrice,
      deposit,
      mortgageRatePercent,
      bedrooms,
      occupants,
      termYears,
    })

    return NextResponse.json({ breakdown })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to calculate running costs"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
