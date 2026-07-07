import { NextRequest, NextResponse } from "next/server"
import {
  getCouncilTaxBand,
  getEpc,
  getPostcodeProfile,
  getPropertyDetails,
} from "@/lib/homedata"
import { buildRunningCostBreakdown } from "@/lib/running-costs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const uprn = String(body.uprn ?? "").trim()
    const purchasePrice = Number(body.purchasePrice)
    const deposit = Number(body.deposit ?? 0)
    const mortgageRatePercent = Number(body.mortgageRatePercent ?? 5)

    if (!uprn) {
      return NextResponse.json({ error: "Property address is required" }, { status: 400 })
    }
    if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
      return NextResponse.json({ error: "Enter a valid purchase price" }, { status: 400 })
    }
    if (!Number.isFinite(deposit) || deposit < 0 || deposit > purchasePrice) {
      return NextResponse.json({ error: "Enter a valid deposit" }, { status: 400 })
    }
    if (!Number.isFinite(mortgageRatePercent) || mortgageRatePercent < 0 || mortgageRatePercent > 25) {
      return NextResponse.json({ error: "Enter a mortgage rate between 0% and 25%" }, { status: 400 })
    }

    const hintPostcode =
      typeof body.postcode === "string" ? body.postcode.trim() : ""
    const hintAddress =
      typeof body.address === "string" ? body.address.trim() : ""

    const [property, epc] = await Promise.all([
      getPropertyDetails(uprn, { postcode: hintPostcode, address: hintAddress }),
      getEpc(uprn),
    ])

    const postcode = property.postcode
    if (!postcode) {
      return NextResponse.json(
        {
          error:
            "Could not resolve a UK postcode for this property. Try selecting the address again from the suggestions list.",
        },
        { status: 422 }
      )
    }

    const profile = await getPostcodeProfile(postcode)
    const bandDCharge = profile?.council_tax?.annual_charge_pence ?? null

    const buildingIdentifier =
      property.sub_building ||
      property.building_name ||
      property.building_number ||
      undefined

    const councilTaxLookup = await getCouncilTaxBand({
      postcode,
      ...(property.building_number ? { building_number: property.building_number } : {}),
      ...(buildingIdentifier && !property.building_number
        ? { building_name: buildingIdentifier }
        : {}),
    })

    const councilTaxBand =
      councilTaxLookup?.council_tax_band ??
      property.council_tax_band ??
      profile?.council_tax?.dominant_band ??
      null

    const breakdown = buildRunningCostBreakdown({
      address: property.full_address ?? property.address ?? "Selected property",
      purchasePrice,
      deposit,
      mortgageRatePercent,
      property,
      epc,
      councilTaxBand,
      bandDAnnualChargePence: bandDCharge,
      councilTaxUsesFallbackCharge: !bandDCharge,
    })

    return NextResponse.json({ breakdown })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to calculate running costs"
    const status = message.includes("HOMEDATA_API_KEY") ? 500 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
