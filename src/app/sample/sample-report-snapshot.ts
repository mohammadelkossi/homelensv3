// The public sample report (/sample): 10 Carrickmore Avenue, Liverpool L18 4QA.
// A frozen snapshot, so it reads the same every day: the report's own URL data plus
// every background response it fetched, and the offer and key points gpt-6-astra wrote
// from it — all captured on 2026-10-27. Visitors trigger no live lookups or AI calls.
// To refresh: re-run the report, re-capture its responses, regenerate the insights.
import type { ReportSnapshot } from "@/app/results/report-view"

export const SAMPLE_REPORT_QUERY =
  "rightmoveUrl=https%3A%2F%2Fwww.rightmove.co.uk%2Fproperties%2F92943087%23%2F%3Fchannel%3DRES_BUY&propertyAddress=Carrickmore+Avenue%2C+Liverpool%2C+L18&fullAddress=10%2C+CARRICKMORE+AVENUE%2C+LIVERPOOL%2C+L18+4QA&price=%C2%A3550%2C000&propertyType=Semi-Detached&bathrooms=1&bedrooms=3&area=117.24&timeOnMarket=9%2F9%2F2026&garden=Yes&parking=Yes&garage=Yes&priceHistory=%5B%7B%22price%22%3A%22330000%22%2C%22year%22%3A%222024%22%7D%5D&latitude=53.375298&longitude=-2.916249&preferredLatitude=null&preferredLongitude=null&preferredPostcode=null&distance=null&houseFullPostcode=L18+4QA&houseOutcode=L18&nearbyPlaces=%7B%22schools%22%3A%5B%7B%22name%22%3A%22St+Anthony+of+Padua+Catholic+Primary+School%22%2C%22distance%22%3A0.7933356327388144%7D%2C%7B%22name%22%3A%22Booker+Avenue+Junior+School%22%2C%22distance%22%3A0.8324232210070106%7D%2C%7B%22name%22%3A%22Booker+Avenue+Infant+School%22%2C%22distance%22%3A0.8324232210070106%7D%5D%2C%22stations%22%3A%5B%7B%22name%22%3A%22Mossley+Hill+Station%22%2C%22distance%22%3A0.4131772780579161%7D%2C%7B%22name%22%3A%22West+Allerton+Station%22%2C%22distance%22%3A0.8604602351427769%7D%2C%7B%22name%22%3A%22Aigburth+Station%22%2C%22distance%22%3A1.3593570607599614%7D%5D%2C%22parks%22%3A%5B%5D%2C%22supermarkets%22%3A%5B%5D%2C%22placesOfWorship%22%3A%5B%5D%2C%22gyms%22%3A%5B%5D%2C%22hospitals%22%3A%5B%5D%2C%22gpSurgeries%22%3A%5B%5D%2C%22dentists%22%3A%5B%5D%2C%22nurseries%22%3A%5B%5D%7D&salesCountPast12Months=0&averagePriceByYear=%7B%222022%22%3A403567.5396825397%2C%222023%22%3A398351.03883495147%2C%222024%22%3A435604.43548387097%2C%222025%22%3A451097.45454545453%2C%222026%22%3A457033.3333333333%7D&averagePriceFiveYear=422716.8415417559&epcRating=D&constructionAgeBand=1930%E2%80%931949&epcFloorArea=94&tenure=Freehold&savedReportId=39&preferredBedroomsScore=50&preferredBathroomsScore=50&preferredPropertyTypeScore=50&preferredSizeScore=50&preferredGardenScore=50&preferredParkingScore=50&preferredLocationScore=50&preferredGarageScore=50&userBedrooms=4&userBathrooms=3&userPropertyType=semi-detached&userSize=121-140"

export const SAMPLE_REPORT_SNAPSHOT: ReportSnapshot = {
  "asOf": "2026-10-27",
  "risks": {
    "planningConstraints": {
      "conservationAreas": [],
      "article4Directions": [],
      "greenBelt": [],
      "floodRiskZones": [],
      "listedBuildingsNearby": [],
      "treePreservationNearby": []
    },
    "crimeSummary": {
      "month": "2026-08",
      "totalCount": 237,
      "topCategories": [
        {
          "category": "Violent Crime",
          "count": 85
        },
        {
          "category": "Anti Social Behaviour",
          "count": 29
        },
        {
          "category": "Shoplifting",
          "count": 26
        },
        {
          "category": "Drugs",
          "count": 17
        },
        {
          "category": "Public Order",
          "count": 17
        }
      ],
      "baseline": {
        "forceId": "merseyside",
        "forceName": "Merseyside Police",
        "medianCount": 214,
        "sampleSize": 8
      }
    },
    "broadbandCoverage": {
      "postcode": "L184QA",
      "gigabitAvailability": 100,
      "ultrafastAvailability": 100,
      "superfastAvailability": 100,
      "belowUso": 0,
      "decentBroadbandFwa": 0
    },
    "environmentData": {
      "airQuality": {
        "no2": 10.3327,
        "pm25": 6.313029,
        "pm10": 9.657933
      },
      "noiseLevels": {
        "roadNoiseDb": 50.09000015258789,
        "railNoiseDb": null,
        "airportNoiseDb": null
      }
    }
  },
  "nearbyPlaces": {
    "schools": [
      {
        "name": "St Anthony of Padua Catholic Primary School",
        "distance": 0.7933356327388144
      },
      {
        "name": "Booker Avenue Junior School",
        "distance": 0.8324232210070106
      },
      {
        "name": "Booker Avenue Infant School",
        "distance": 0.8324232210070106
      }
    ],
    "stations": [
      {
        "name": "Mossley Hill Station",
        "distance": 0.4131772780579161
      },
      {
        "name": "West Allerton Station",
        "distance": 0.8604602351427769
      },
      {
        "name": "Aigburth Station",
        "distance": 1.3593570607599614
      }
    ],
    "parks": [
      {
        "name": "Penny Lane Millennium Green",
        "distance": 1.3704579546442612
      },
      {
        "name": "Greenbank Park",
        "distance": 1.4394874338887962
      },
      {
        "name": "Harthill Estate",
        "distance": 1.4579168153739177
      }
    ],
    "supermarkets": [],
    "placesOfWorship": [],
    "gyms": [],
    "hospitals": [
      {
        "name": "Mossley Hill",
        "distance": 0.9284488276051459,
        "ratingSource": "CQC"
      },
      {
        "name": "Spire Liverpool Hospital",
        "distance": 1.2272157481961716,
        "rating": "Good",
        "ratingSource": "CQC"
      },
      {
        "name": "Hope Centre",
        "distance": 2.2605743467360933,
        "ratingSource": "CQC"
      }
    ],
    "gpSurgeries": [
      {
        "name": "The Pinewoods Clinic at One Rose Lane",
        "distance": 0.375904741292541,
        "ratingSource": "CQC"
      },
      {
        "name": "Liverpool Skin Clinic",
        "distance": 0.6372630969135283,
        "rating": "Requires improvement",
        "ratingSource": "CQC"
      },
      {
        "name": "Storrsdale Medical Centre",
        "distance": 0.714394001881809,
        "rating": "Good",
        "ratingSource": "CQC"
      }
    ],
    "dentists": [
      {
        "name": "Rose Lane Dental Practice",
        "distance": 0.3750610177281862,
        "rating": "Not applicable",
        "ratingSource": "CQC"
      },
      {
        "name": "Night and Day Emergency Dentist",
        "distance": 1.1147239124144757,
        "ratingSource": "CQC"
      },
      {
        "name": "Khan Dental - Allerton Dental Care",
        "distance": 1.2697892888849975,
        "ratingSource": "CQC"
      }
    ],
    "nurseries": [
      {
        "name": "Mossley Hill Pre-School",
        "distance": 0.2907074176889368,
        "rating": "Good",
        "ratingSource": "Ofsted"
      },
      {
        "name": "Little Grasshoppers",
        "distance": 0.49273431851571753,
        "rating": "Good",
        "ratingSource": "Ofsted"
      },
      {
        "name": "Monkton Nursery School",
        "distance": 0.5477697355344278,
        "rating": "Good",
        "ratingSource": "Ofsted"
      }
    ]
  },
  "district": {
    "districts": [
      {
        "outcode": "L18",
        "yearly": [
          {
            "year": 2022,
            "avgPrice": 403567.5396825397,
            "saleCount": 126
          },
          {
            "year": 2023,
            "avgPrice": 398351.03883495147,
            "saleCount": 103
          },
          {
            "year": 2024,
            "avgPrice": 435604.43548387097,
            "saleCount": 124
          },
          {
            "year": 2025,
            "avgPrice": 451097.45454545453,
            "saleCount": 99
          },
          {
            "year": 2026,
            "avgPrice": 457033.3333333333,
            "saleCount": 15
          }
        ]
      },
      {
        "outcode": "L16",
        "yearly": [
          {
            "year": 2022,
            "avgPrice": 301989.1393442623,
            "saleCount": 122
          },
          {
            "year": 2023,
            "avgPrice": 298871.9411764706,
            "saleCount": 119
          },
          {
            "year": 2024,
            "avgPrice": 313562.21698113205,
            "saleCount": 106
          },
          {
            "year": 2025,
            "avgPrice": 341405.6179775281,
            "saleCount": 89
          },
          {
            "year": 2026,
            "avgPrice": 275225.7,
            "saleCount": 10
          }
        ]
      },
      {
        "outcode": "L17",
        "yearly": [
          {
            "year": 2022,
            "avgPrice": 371942.3076923077,
            "saleCount": 39
          },
          {
            "year": 2023,
            "avgPrice": 407038.46153846156,
            "saleCount": 39
          },
          {
            "year": 2024,
            "avgPrice": 393458.46341463417,
            "saleCount": 41
          },
          {
            "year": 2025,
            "avgPrice": 404881.5714285714,
            "saleCount": 42
          },
          {
            "year": 2026,
            "avgPrice": 336666.6666666667,
            "saleCount": 3
          }
        ]
      },
      {
        "outcode": "L19",
        "yearly": [
          {
            "year": 2022,
            "avgPrice": 299150.8333333333,
            "saleCount": 120
          },
          {
            "year": 2023,
            "avgPrice": 309023.1919191919,
            "saleCount": 99
          },
          {
            "year": 2024,
            "avgPrice": 312080.9636363636,
            "saleCount": 110
          },
          {
            "year": 2025,
            "avgPrice": 352369.5794392523,
            "saleCount": 107
          },
          {
            "year": 2026,
            "avgPrice": 311000,
            "saleCount": 9
          }
        ]
      },
      {
        "outcode": "L20",
        "yearly": [
          {
            "year": 2022,
            "avgPrice": 161164.74789915967,
            "saleCount": 119
          },
          {
            "year": 2023,
            "avgPrice": 164107.57575757575,
            "saleCount": 99
          },
          {
            "year": 2024,
            "avgPrice": 159937.67708333334,
            "saleCount": 96
          },
          {
            "year": 2025,
            "avgPrice": 187171.79411764705,
            "saleCount": 102
          },
          {
            "year": 2026,
            "avgPrice": 186272.72727272726,
            "saleCount": 11
          }
        ]
      }
    ],
    "salesTrend": {
      "currentCount": 64,
      "previousCount": 135,
      "changePercent": -52.59259259259259
    },
    "nearestSales": [
      {
        "address": "32 GLENMORE AVENUE",
        "postcode": "L18 4QF",
        "price": 500000,
        "dateOfTransfer": "2026-06-05",
        "distanceKm": 0.07983826263474603,
        "areaSqm": 107
      },
      {
        "address": "54 BRODIE AVENUE",
        "postcode": "L18 4PB",
        "price": 430000,
        "dateOfTransfer": "2025-07-28",
        "distanceKm": 0.09761913344164808,
        "areaSqm": 112
      },
      {
        "address": "4 GLENMORE AVENUE",
        "postcode": "L18 4QE",
        "price": 575000,
        "dateOfTransfer": "2025-06-06",
        "distanceKm": 0.21015826153509684,
        "areaSqm": 113
      },
      {
        "address": "21 GLENMORE AVENUE",
        "postcode": "L18 4QE",
        "price": 547500,
        "dateOfTransfer": "2025-05-02",
        "distanceKm": 0.21015826153509684,
        "areaSqm": 138
      },
      {
        "address": "95 BRODIE AVENUE",
        "postcode": "L18 4RF",
        "price": 450000,
        "dateOfTransfer": "2025-03-28",
        "distanceKm": 0.2266075529120994,
        "areaSqm": 121
      }
    ]
  },
  "supplyDemand": {
    "supplyDemand": {
      "forSaleCount": 44,
      "salesPerYear": 64,
      "monthsOfSupply": 8.25,
      "label": "Buyer's",
      "widened": false
    },
    "nearestForSale": [
      {
        "id": "172110674",
        "url": "https://www.rightmove.co.uk/properties/172110674#/?channel=RES_BUY",
        "price": 550000,
        "address": "Glenmore Avenue, Liverpool, L18",
        "areaSqm": 113.155854,
        "bedrooms": 3,
        "imageUrl": "https://media.rightmove.co.uk/property-photo/cd7a18932/172110674/cd7a18932fb25c865eb6b02496ffb58c.jpeg",
        "latitude": 53.375741,
        "bathrooms": 1,
        "longitude": -2.91704,
        "propertyType": "Semi-Detached",
        "distanceKm": 0.07197023256600038
      },
      {
        "id": "93491844",
        "url": "https://www.rightmove.co.uk/properties/93491844#/?channel=RES_BUY",
        "price": 475000,
        "address": "Brodie Avenue, Liverpool, L18",
        "areaSqm": 91.04494,
        "bedrooms": 3,
        "imageUrl": "https://media.rightmove.co.uk/property-photo/58279afa9/93491844/58279afa92dce77ee61aeac48e7299eb.jpeg",
        "latitude": 53.376376,
        "bathrooms": 1,
        "longitude": -2.91516,
        "propertyType": "Semi-Detached",
        "distanceKm": 0.13995280363397253
      },
      {
        "id": "93163434",
        "url": "https://www.rightmove.co.uk/properties/93163434#/?channel=RES_BUY",
        "price": 475000,
        "address": "Benmore Road, Liverpool, L18",
        "areaSqm": 118.91584,
        "bedrooms": 4,
        "imageUrl": "https://media.rightmove.co.uk/property-photo/c4a548e7c/93163434/c4a548e7c3e779b5ca24b24707db6e36.jpeg",
        "latitude": 53.375048,
        "bathrooms": 2,
        "longitude": -2.913658,
        "propertyType": "Semi-Detached",
        "distanceKm": 0.1741097328192612
      },
      {
        "id": "94543113",
        "url": "https://www.rightmove.co.uk/properties/94543113#/?channel=RES_BUY",
        "price": 380000,
        "address": "Mossville Road, Allerton, L18",
        "areaSqm": 100.521046,
        "bedrooms": 3,
        "imageUrl": "https://media.rightmove.co.uk/property-photo/e6d01f31c/94543113/e6d01f31c21d0d8cc11945a57e4c43a8.jpeg",
        "latitude": 53.374849,
        "bathrooms": 1,
        "longitude": -2.910835,
        "propertyType": "Semi-Detached",
        "distanceKm": 0.362596844150069
      },
      {
        "id": "94065711",
        "url": "https://www.rightmove.co.uk/properties/94065711#/?channel=RES_BUY",
        "price": 465000,
        "address": "Cooper Avenue North, Mossley Hill, L18",
        "areaSqm": null,
        "bedrooms": 3,
        "imageUrl": "https://media.rightmove.co.uk/property-photo/44fa91fe7/94065711/44fa91fe729ca3c2cc13079ab10e60ff.jpeg",
        "latitude": 53.372276,
        "bathrooms": 1,
        "longitude": -2.914125,
        "propertyType": "Semi-Detached",
        "distanceKm": 0.36437650415283024
      }
    ]
  },
  "pricePerSqm": {
    "averagePricePerSqm": 3579.363823389777,
    "averagePricePerSqmSimple": 3685.119907480039,
    "averagePricePerSqmMatchedSaleCount": 50
  },
  "census": {
    "tenure": {
      "totalHouseholds": 474,
      "ownedOutright": 222,
      "ownedWithMortgage": 188,
      "sharedOwnership": 0,
      "socialRentedCouncil": 1,
      "socialRentedOther": 5,
      "privateRented": 58,
      "livesRentFree": 0
    },
    "englandTenure": {
      "totalHouseholds": 23436085,
      "ownedOutright": 7624693,
      "ownedWithMortgage": 6744372,
      "sharedOwnership": 235951,
      "socialRentedCouncil": 1945152,
      "socialRentedOther": 2060511,
      "privateRented": 4794889,
      "livesRentFree": 30517
    }
  },
  "insights": {
    "keyPoints": {
      "know": [
        {
          "id": "ai-know-0",
          "title": "Station and GP within five minutes",
          "description": "Mossley Hill Station and The Pinewoods Clinic at One Rose Lane are both five minutes away on foot."
        },
        {
          "id": "ai-know-1",
          "title": "Nearby nursery rated Good",
          "description": "Mossley Hill Pre-School is a three-minute walk away, while St Anthony of Padua Catholic Primary School is ten minutes away."
        },
        {
          "id": "ai-know-2",
          "title": "Reassuring environmental checks",
          "description": "No flood zone is flagged, and local air quality is within UK objectives."
        }
      ],
      "consider": [
        {
          "id": "ai-consider-0",
          "title": "Premium pricing has some local support",
          "description": "At £4,691/m², pricing is 31% above L18, although June 2026's Glenmore Avenue sale achieved £4,673/m²."
        },
        {
          "id": "ai-consider-1",
          "title": "Sales activity has fallen sharply",
          "description": "Area sales fell 53%, with 8.3 months of supply, strengthening negotiating leverage despite reported annual price growth of 4.7%."
        },
        {
          "id": "ai-consider-2",
          "title": "Check the local crime picture",
          "description": "There were 237 crime reports within about a mile in August 2026, including 85 categorised as violent crime."
        }
      ],
      "ask": [
        {
          "id": "ai-ask-0",
          "title": "What supports the increase since 2024?",
          "description": "What improvements or other changes explain the 67% increase from the £330,000 sale in 2024?"
        },
        {
          "id": "ai-ask-1",
          "title": "What feedback followed the viewings?",
          "description": "After 48 days on the market, what offers or viewing feedback have sellers received, and would they consider £515,000?"
        },
        {
          "id": "ai-ask-2",
          "title": "Have any energy improvements been made?",
          "description": "With an EPC rating of D, have any energy improvements been completed since the assessment, and is supporting documentation available?"
        }
      ]
    },
    "offer": {
      "low": 510000,
      "high": 545000,
      "opening": 515000,
      "reasons": [
        "June 2026 Glenmore Avenue sale achieved £4,673/m²",
        "Buyer's market with 8.3 months of supply",
        "Nearby four-bedroom listing at £475,000 and £3,994/m²"
      ]
    }
  }
}
