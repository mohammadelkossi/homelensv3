// Snapshot of the real HomeLens report for 61 King Edward Crescent, LS18 4BE, taken
// 26 Oct 2026 from the report's own endpoints (district-comparison, supply-demand,
// risks-restrictions, census-tenure) and its generation-time nearby places. Rendered
// by the real report components in the homepage's "What's in a report" explorer.
import type { DistrictSalesTrend, DistrictYearlyData, NearbySale } from "@/lib/district-comparison"
import type { NearestForSaleListing, SupplyDemand } from "@/lib/use-supply-demand"
import type { RisksRestrictionsData } from "@/lib/use-risks-restrictions"
import type { NearbyPlacesResult } from "@/lib/nearby-amenities"
import type { CensusTenureBreakdown } from "@/lib/census-tenure"
import type { RankingRow } from "@/components/report/ranking-bars"
import type { KeyPoints } from "@/lib/rules-engine"
import type { AiOffer } from "@/lib/key-points/offer"

export const SAMPLE_ASKING_PRICE = 349000
export const SAMPLE_FLOOR_AREA_SQM = 94.1
export const SAMPLE_FIRST_LISTED = "2026-05-12"
export const SAMPLE_BEDROOMS = "4"
export const SAMPLE_BATHROOMS = "1"
export const SAMPLE_EPC_RATING = "C"
export const SAMPLE_AGE_BAND = "1930–1949"
// Illustrative: the listing didn't state tenure; semis here are typically freehold.
export const SAMPLE_TENURE = "Freehold"
export const SAMPLE_OUTCODE = "LS18"
export const SAMPLE_POSTCODE = "LS18 4BE"
export const SAMPLE_PROPERTY_TYPE = "Semi-Detached"
export const SAMPLE_DISTRICT_PRICE_PER_SQM = 3830.94
export const SAMPLE_POSTCODE_SALES_12M = 0
// Illustrative: 61 has no Land Registry sale since 1995, so this history is made up
// (in line with real King Edward Crescent sales) to show the full "fair price"
// section. The last sale keeps the seller's gain under the offer formula's 30%
// threshold, so the recommended offer still matches the homepage hero.
export const SAMPLE_PAST_SALES = [
  { price: 112500, year: 2003 },
  { price: 168000, year: 2013 },
  { price: 275000, year: 2021 },
]
export const SAMPLE_ASKING_YEAR = 2026
export const SAMPLE_RANKING_YEAR = 2026

export const SAMPLE_AVERAGE_PRICE_BY_YEAR: Record<string, number> = {
  "2022": 374461.1567164179,
  "2023": 340564.5,
  "2024": 363953.5,
  "2025": 374219.7,
  "2026": 365593.75
}

export const SAMPLE_NEIGHBOUR_DISTRICTS: DistrictYearlyData[] = [
  {
    "outcode": "LS18",
    "yearly": [
      {
        "year": 2022,
        "avgPrice": 374461.1567164179,
        "saleCount": 134
      },
      {
        "year": 2023,
        "avgPrice": 340564.5,
        "saleCount": 116
      },
      {
        "year": 2024,
        "avgPrice": 363953.5,
        "saleCount": 152
      },
      {
        "year": 2025,
        "avgPrice": 374219.7,
        "saleCount": 110
      },
      {
        "year": 2026,
        "avgPrice": 365593.75,
        "saleCount": 16
      }
    ]
  },
  {
    "outcode": "LS16",
    "yearly": [
      {
        "year": 2022,
        "avgPrice": 310810.0872727273,
        "saleCount": 275
      },
      {
        "year": 2023,
        "avgPrice": 328498.74436090223,
        "saleCount": 266
      },
      {
        "year": 2024,
        "avgPrice": 313008.18292682926,
        "saleCount": 328
      },
      {
        "year": 2025,
        "avgPrice": 333068.86995515693,
        "saleCount": 223
      },
      {
        "year": 2026,
        "avgPrice": 336206.3783783784,
        "saleCount": 37
      }
    ]
  },
  {
    "outcode": "LS17",
    "yearly": [
      {
        "year": 2022,
        "avgPrice": 355890.5869565217,
        "saleCount": 276
      },
      {
        "year": 2023,
        "avgPrice": 341823.0403587444,
        "saleCount": 223
      },
      {
        "year": 2024,
        "avgPrice": 367812.2332155477,
        "saleCount": 283
      },
      {
        "year": 2025,
        "avgPrice": 382012.85714285716,
        "saleCount": 196
      },
      {
        "year": 2026,
        "avgPrice": 349590.5652173913,
        "saleCount": 23
      }
    ]
  },
  {
    "outcode": "LS19",
    "yearly": [
      {
        "year": 2022,
        "avgPrice": 293520.0689655172,
        "saleCount": 145
      },
      {
        "year": 2023,
        "avgPrice": 278101,
        "saleCount": 105
      },
      {
        "year": 2024,
        "avgPrice": 312673.203125,
        "saleCount": 128
      },
      {
        "year": 2025,
        "avgPrice": 288952.68695652176,
        "saleCount": 115
      },
      {
        "year": 2026,
        "avgPrice": 234107.14285714287,
        "saleCount": 14
      }
    ]
  },
  {
    "outcode": "LS20",
    "yearly": [
      {
        "year": 2022,
        "avgPrice": 318899.8243243243,
        "saleCount": 74
      },
      {
        "year": 2023,
        "avgPrice": 342939.9,
        "saleCount": 50
      },
      {
        "year": 2024,
        "avgPrice": 324752.5616438356,
        "saleCount": 73
      },
      {
        "year": 2025,
        "avgPrice": 346355,
        "saleCount": 56
      },
      {
        "year": 2026,
        "avgPrice": 314750,
        "saleCount": 10
      }
    ]
  }
]

export const SAMPLE_RANKING: RankingRow[] = [
  {
    "label": "LS18",
    "price": 365593.75,
    "isSubjectDistrict": true
  },
  {
    "label": "LS17",
    "price": 349590.5652173913,
    "isSubjectDistrict": false
  },
  {
    "label": "LS16",
    "price": 336206.3783783784,
    "isSubjectDistrict": false
  },
  {
    "label": "LS20",
    "price": 314750,
    "isSubjectDistrict": false
  },
  {
    "label": "LS19",
    "price": 234107.14285714287,
    "isSubjectDistrict": false
  }
]

export const SAMPLE_SALES_TREND: DistrictSalesTrend = {
  "currentCount": 82,
  "previousCount": 140,
  "changePercent": -41.42857142857143
}

export const SAMPLE_NEAREST_SALES: NearbySale[] = [
  {
    "address": "39 KING EDWARD AVENUE",
    "postcode": "LS18 4BD",
    "price": 342500,
    "dateOfTransfer": "2026-05-18",
    "distanceKm": 0.10906142182554454,
    "areaSqm": 96
  },
  {
    "address": "3 SALMON CRESCENT",
    "postcode": "LS18 4ET",
    "price": 485000,
    "dateOfTransfer": "2025-12-12",
    "distanceKm": 0.14857209797818693,
    "areaSqm": 150
  },
  {
    "address": "35 DRURY AVENUE",
    "postcode": "LS18 4BR",
    "price": 338500,
    "dateOfTransfer": "2025-07-21",
    "distanceKm": 0.16954866625283305,
    "areaSqm": 106
  },
  {
    "address": "134 STANHOPE DRIVE",
    "postcode": "LS18 4EU",
    "price": 345000,
    "dateOfTransfer": "2024-10-25",
    "distanceKm": 0.19436350101119865,
    "areaSqm": 83
  },
  {
    "address": "85 STANHOPE DRIVE",
    "postcode": "LS18 4EU",
    "price": 317000,
    "dateOfTransfer": "2024-10-07",
    "distanceKm": 0.19436350101119865,
    "areaSqm": 96
  }
]

export const SAMPLE_SUPPLY_DEMAND: SupplyDemand = {
  "forSaleCount": 37,
  "salesPerYear": 82,
  "monthsOfSupply": 5.414634146341464,
  "label": "Balanced",
  "widened": false
}

// areaSqm values are illustrative: Rightmove didn't publish floor areas for these
// listings, so plausible sizes (by beds/baths) were filled in for the sample.
export const SAMPLE_NEAREST_FOR_SALE: NearestForSaleListing[] = [
  {
    "id": "93665802",
    "url": "https://www.rightmove.co.uk/properties/93665802#/?channel=RES_BUY",
    "price": 280000,
    "address": "Grove Road, Horsforth, LS18 4BP",
    "areaSqm": 88,
    "bedrooms": 3,
    "imageUrl": "https://media.rightmove.co.uk/property-photo/d4f40ac7a/93665802/d4f40ac7a8c1479978b3fdec3a4a6f62.jpeg",
    "latitude": 53.837009,
    "bathrooms": 2,
    "longitude": -1.63689,
    "propertyType": "Semi-Detached",
    "distanceKm": 0.1478449299748451
  },
  {
    "id": "93874794",
    "url": "https://www.rightmove.co.uk/properties/93874794#/?channel=RES_BUY",
    "price": 260000,
    "address": "Salmon Crescent, Horsforth, LEEDS",
    "areaSqm": 82,
    "bedrooms": 3,
    "imageUrl": "https://media.rightmove.co.uk/property-photo/46069d08a/93874794/46069d08a024b678e8b9ce2e1a523822.jpeg",
    "latitude": 53.83823,
    "bathrooms": 1,
    "longitude": -1.63312,
    "propertyType": "Semi-Detached",
    "distanceKm": 0.15192549640084188
  },
  {
    "id": "88845801",
    "url": "https://www.rightmove.co.uk/properties/88845801#/?channel=RES_BUY",
    "price": 485000,
    "address": "Stanhope Drive, Horsforth, Leeds",
    "areaSqm": 132,
    "bedrooms": 4,
    "imageUrl": "https://media.rightmove.co.uk/property-photo/adbe65fb6/88845801/adbe65fb63aaa3c07be954fbac43c44e.jpeg",
    "latitude": 53.838548,
    "bathrooms": 2,
    "longitude": -1.631152,
    "propertyType": "Semi-Detached",
    "distanceKm": 0.2854132395500341
  },
  {
    "id": "92861973",
    "url": "https://www.rightmove.co.uk/properties/92861973#/?channel=RES_BUY",
    "price": 325000,
    "address": "Broadway, Horsforth, Leeds, West Yorkshire",
    "areaSqm": 90,
    "bedrooms": 3,
    "imageUrl": "https://media.rightmove.co.uk/property-photo/6ac9edc84/92861973/6ac9edc84dc13cb02170392620ab0f88.jpeg",
    "latitude": 53.83491,
    "bathrooms": 1,
    "longitude": -1.635131,
    "propertyType": "Semi-Detached",
    "distanceKm": 0.3450617602470773
  },
  {
    "id": "94075479",
    "url": "https://www.rightmove.co.uk/properties/94075479#/?channel=RES_BUY",
    "price": 350000,
    "address": "New Crescent, Horsforth, Leeds, West Yorkshire, LS18",
    "areaSqm": 93,
    "bedrooms": 3,
    "imageUrl": "https://media.rightmove.co.uk/property-photo/278faec5e/94075479/278faec5e684ff0c8cf7d57ef1730c23.jpeg",
    "latitude": 53.836553,
    "bathrooms": 1,
    "longitude": -1.640082,
    "propertyType": "Semi-Detached",
    "distanceKm": 0.3469650060691712
  }
]

export const SAMPLE_RISKS: RisksRestrictionsData = {
  "planningConstraints": {
    "conservationAreas": [],
    "article4Directions": [
      {
        "name": "A4D01",
        "reference": "A4D01"
      }
    ],
    "greenBelt": [],
    "floodRiskZones": [],
    "listedBuildingsNearby": [],
    "treePreservationNearby": []
  },
  "crimeSummary": {
    "month": "2026-08",
    "totalCount": 171,
    "topCategories": [
      {
        "category": "Violent Crime",
        "count": 69
      },
      {
        "category": "Anti Social Behaviour",
        "count": 16
      },
      {
        "category": "Vehicle Crime",
        "count": 14
      },
      {
        "category": "Public Order",
        "count": 13
      },
      {
        "category": "Criminal Damage Arson",
        "count": 12
      }
    ],
    "baseline": {
      "forceId": "west-yorkshire",
      "forceName": "West Yorkshire Police",
      "medianCount": 240.5,
      "sampleSize": 8
    }
  },
  "broadbandCoverage": {
    "postcode": "LS184BE",
    "gigabitAvailability": 100,
    "ultrafastAvailability": 100,
    "superfastAvailability": 100,
    "belowUso": 0,
    "decentBroadbandFwa": 0
  },
  "environmentData": {
    "airQuality": {
      "no2": 10.75474,
      "pm25": 7.035836,
      "pm10": 10.53945
    },
    "noiseLevels": {
      "roadNoiseDb": 51.34000015258789,
      "railNoiseDb": null,
      "airportNoiseDb": null
    }
  }
}

export const SAMPLE_NEARBY: NearbyPlacesResult = {
  "schools": [
    {
      "name": "St Margaret's Church of England Voluntary Controlled Primary School",
      "distance": 0.3087065573706537
    },
    {
      "name": "Broadgate Primary School",
      "distance": 0.35853855618636105
    },
    {
      "name": "St Mary's Catholic Primary School, Horsforth",
      "distance": 0.35948700053377924
    }
  ],
  "stations": [
    {
      "name": "Horsforth Station",
      "distance": 1.107444512529185
    },
    {
      "name": "Kirkstall Forge Station",
      "distance": 1.8084701856215804
    },
    {
      "name": "Headingley Station",
      "distance": 3.517573996872248
    }
  ],
  "parks": [
    {
      "name": "Horsforth Hall Park",
      "distance": 0.8033873290266581
    },
    {
      "name": "The Green",
      "distance": 1.545099063486259
    },
    {
      "name": "Bramley Fall Park",
      "distance": 1.7310299305229209
    }
  ],
  "supermarkets": [],
  "placesOfWorship": [],
  "gyms": [],
  "hospitals": [
    {
      "name": "Mill Garth",
      "distance": 4.427035139638708,
      "rating": "Good"
    },
    {
      "name": "St Mary's Hospital",
      "distance": 4.494042279145869,
      "rating": "Good"
    },
    {
      "name": "Spring Wood Lodge",
      "distance": 6.238502170819142,
      "rating": "Good"
    }
  ],
  "gpSurgeries": [
    {
      "name": "MASTA Travel Clinic Leeds",
      "distance": 0.3057358359058529
    },
    {
      "name": "Vesper Road Surgery",
      "distance": 1.7728886624116065,
      "rating": "Good"
    },
    {
      "name": "Baskind Health",
      "distance": 2.1822388342628782,
      "rating": "Good"
    }
  ],
  "dentists": [
    {
      "name": "Ivory Dental Practice Limited",
      "distance": 0.2466220879454388
    },
    {
      "name": "The247dentist - Emergency Dentist - LEEDS",
      "distance": 0.2466220879454388
    },
    {
      "name": "Alexandra Road Dental Practice",
      "distance": 0.35704062501962214
    }
  ],
  "nurseries": [
    {
      "name": "567 Club",
      "distance": 0.28325297364542595,
      "rating": "Good"
    },
    {
      "name": "Ducklings at St Margaret's",
      "distance": 0.3057358359058529,
      "rating": "Good"
    },
    {
      "name": "Time Out",
      "distance": 0.3057358359058529
    }
  ]
}

export const SAMPLE_CENSUS_TENURE: CensusTenureBreakdown = {
  "totalHouseholds": 727,
  "ownedOutright": 166,
  "ownedWithMortgage": 247,
  "sharedOwnership": 1,
  "socialRentedCouncil": 217,
  "socialRentedOther": 10,
  "privateRented": 84,
  "livesRentFree": 2
}
export const SAMPLE_ENGLAND_TENURE: CensusTenureBreakdown = {
  "totalHouseholds": 23436085,
  "ownedOutright": 7624693,
  "ownedWithMortgage": 6744372,
  "sharedOwnership": 235951,
  "socialRentedCouncil": 1945152,
  "socialRentedOther": 2060511,
  "privateRented": 4794889,
  "livesRentFree": 30517
}

// Recommended offer and key points as written by gpt-6-astra from this report's
// findings (27 Oct 2026), saved here so the homepage doesn't call the model on every
// visit. "{days}" is filled with the live days-on-market count.
export const SAMPLE_AI_OFFER: AiOffer = {
  low: 325000,
  high: 340000,
  opening: 325000,
  reasons: ["Recent nearby sales at £3,193–£3,568/m²", "{days} days on the market", "Area sales down 41%"],
}

export const SAMPLE_KEY_POINTS: KeyPoints = {
  know: [
    { id: "ai-know-0", title: "Below the area's average pricing", description: "At £3,709/m², the home is 3.2% below the area average, providing some support for its pricing." },
    { id: "ai-know-1", title: "School and station within walking distance", description: "St Margaret's primary school is a four-minute walk away, while Horsforth Station is 13 minutes on foot." },
    { id: "ai-know-2", title: "Reassuring flood and air quality checks", description: "The findings flag no flood zone, and air quality is within UK objectives." },
  ],
  consider: [
    { id: "ai-consider-0", title: "Slow marketing amid fewer area sales", description: "The home has been listed for {days} days and area sales are down 41%, although supply and demand remain balanced." },
    { id: "ai-consider-1", title: "Recent sales suggest a lower valuation", description: "King Edward Avenue sold at £3,568/m² and Drury Avenue at £3,193/m², supporting an offer below asking when applied to this home's floor area." },
    { id: "ai-consider-2", title: "Crime reports warrant a closer look", description: "There were 171 reports within about a mile in August 2026, including 69 violent crime reports; these are not property-specific." },
  ],
  ask: [
    { id: "ai-ask-0", title: "What does Article 4 restrict here?", description: "Which alterations does the Article 4 direction cover, and can you supply any relevant planning permissions for this home?" },
    { id: "ai-ask-1", title: "What supports the increase since 2021?", description: "What improvements support the 27% increase over the £275,000 sale in 2021, and is documentation available?" },
    { id: "ai-ask-2", title: "What major maintenance has been completed?", description: "Given the estimated 1930–1949 construction date, when were the roof and wiring last renewed or inspected, and are records available?" },
  ],
}
