"use client";

import { useEffect, useState } from "react";
import { NearbyAmenities } from "@/components/nearby-amenities";
import {
  emptyNearbyPlaces,
  hasNearbyPlacesContent,
  mergeNearbyPlaces,
  nearbyPlacesToAmenityList,
  readStoredNearbyPlaces,
  type NearbyPlacesResult,
} from "@/lib/nearby-amenities";

type NearbyAmenitiesSectionProps = {
  nearbyPlacesParam: string | null;
  latitude: string;
  longitude: string;
};

function parseNearbyPlacesParam(param: string | null): NearbyPlacesResult | null {
  if (!param || param === "null") return null;
  try {
    return JSON.parse(param) as NearbyPlacesResult;
  } catch {
    return null;
  }
}

export function NearbyAmenitiesSection({
  nearbyPlacesParam,
  latitude,
  longitude,
}: NearbyAmenitiesSectionProps) {
  const [places, setPlaces] = useState<NearbyPlacesResult>(() => {
    return (
      parseNearbyPlacesParam(nearbyPlacesParam) ??
      readStoredNearbyPlaces() ??
      emptyNearbyPlaces()
    );
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initial =
      parseNearbyPlacesParam(nearbyPlacesParam) ??
      readStoredNearbyPlaces() ??
      emptyNearbyPlaces();
    setPlaces(initial);

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    // Freshly generated reports already come with fully-populated nearby
    // places (report generation now computes them server-side), so skip the
    // redundant re-fetch. Older cached reports without that data still fall
    // back to fetching client-side.
    if (hasNearbyPlacesContent(initial)) return;

    let cancelled = false;
    setLoading(true);

    void fetch(`/api/nearby-amenities?lat=${lat}&lon=${lon}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((osmPlaces: NearbyPlacesResult | null) => {
        if (cancelled || !osmPlaces) return;
        setPlaces(mergeNearbyPlaces(initial, osmPlaces));
      })
      .catch((error) => {
        console.error("Failed to load nearby amenities:", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [nearbyPlacesParam, latitude, longitude]);

  return (
    <NearbyAmenities
      amenities={nearbyPlacesToAmenityList(places)}
      loading={loading && !hasNearbyPlacesContent(places)}
    />
  );
}
