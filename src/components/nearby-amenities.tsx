"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GraduationCap, Train, TreePine, ShoppingCart, Church, Dumbbell, Heart, MapPin } from "lucide-react"

interface NearbyAmenitiesProps {
  amenities: {
    category: string
    name: string
    distance: number
    address: string
  }[]
}

const categoryConfig: Record<string, { icon: typeof GraduationCap; color: string }> = {
  School: { icon: GraduationCap, color: "bg-[#0A369D]/10 text-[#0A369D]" },
  Station: { icon: Train, color: "bg-[#4472CA]/10 text-[#4472CA]" },
  Park: { icon: TreePine, color: "bg-green-500/10 text-green-600" },
  Supermarket: { icon: ShoppingCart, color: "bg-amber-500/10 text-amber-600" },
  "Place of Worship": { icon: Church, color: "bg-[#5E7CE2]/10 text-[#5E7CE2]" },
  Gym: { icon: Dumbbell, color: "bg-pink-500/10 text-pink-600" },
  Hospital: { icon: Heart, color: "bg-red-500/10 text-red-600" },
}

export function NearbyAmenities({ amenities }: NearbyAmenitiesProps) {
  const categories = [...new Set(amenities.map((a) => a.category))]
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filteredAmenities = activeCategory ? amenities.filter((a) => a.category === activeCategory) : amenities

  return (
    <Card className="bg-[#CFDEE7]/30 border-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-bold" style={{ color: '#0A369D', fontSize: 'calc(1.5rem * 1.04)' }}>Nearby Amenities</CardTitle>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge
            variant="secondary"
            className={`cursor-pointer text-xs rounded-full px-3 py-1 ${
              activeCategory === null
                ? ""
                : "bg-[#CFDEE7] text-muted-foreground hover:bg-[#92B4F4]/30"
            }`}
            style={activeCategory === null ? { backgroundColor: '#0A369D', color: '#FFFFFF' } : {}}
            onClick={() => setActiveCategory(null)}
          >
            All
          </Badge>
          {categories.map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className={`cursor-pointer text-xs rounded-full px-3 py-1 ${
                activeCategory === category
                  ? ""
                  : "bg-[#CFDEE7] text-muted-foreground hover:bg-[#92B4F4]/30"
              }`}
              style={activeCategory === category ? { backgroundColor: '#0A369D', color: '#FFFFFF' } : {}}
              onClick={() => setActiveCategory(activeCategory === category ? null : category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAmenities.map((amenity, index) => {
            const config = categoryConfig[amenity.category] || {
              icon: MapPin,
              color: "bg-gray-500/10 text-gray-600",
            }
            const Icon = config.icon

            return (
              <div
                key={`${amenity.name}-${index}`}
                className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border/50 hover:border-[#92B4F4] transition-colors"
              >
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{amenity.name}</span>
                    <span className="text-xs font-semibold text-[#4472CA] whitespace-nowrap">
                      {amenity.distance.toFixed(2)} km
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{amenity.address}</p>
                  <span className="text-xs text-muted-foreground/70">{amenity.category}</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

