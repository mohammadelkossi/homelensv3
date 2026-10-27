"use client";

import { RisksRestrictions } from "@/components/risks-restrictions";
import type { RisksRestrictionsData } from "@/lib/use-risks-restrictions";

type RisksRestrictionsSectionProps = {
  data: RisksRestrictionsData;
  loading: boolean;
  linkDocuments?: boolean;
};

export function RisksRestrictionsSection({ data, loading, linkDocuments = true }: RisksRestrictionsSectionProps) {
  return (
    <RisksRestrictions
      conservationAreas={data.planningConstraints.conservationAreas}
      article4Directions={data.planningConstraints.article4Directions}
      listedBuildingsNearby={data.planningConstraints.listedBuildingsNearby}
      treePreservationNearby={data.planningConstraints.treePreservationNearby}
      greenBelt={data.planningConstraints.greenBelt}
      floodRiskZones={data.planningConstraints.floodRiskZones}
      crimeSummary={data.crimeSummary}
      broadbandCoverage={data.broadbandCoverage}
      airQuality={data.environmentData.airQuality}
      noiseLevels={data.environmentData.noiseLevels}
      loading={loading}
      linkDocuments={linkDocuments}
    />
  );
}
