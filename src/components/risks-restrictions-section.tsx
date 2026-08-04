"use client";

import { useEffect, useState } from "react";
import { RisksRestrictions } from "@/components/risks-restrictions";
import {
  emptyPlanningConstraints,
  readStoredPlanningConstraints,
  type PlanningConstraintsResult,
} from "@/lib/planning-constraints";
import { readStoredCrimeSummary, type CrimeSummary } from "@/lib/crime-data";
import { readStoredBroadbandCoverage, type BroadbandCoverage } from "@/lib/broadband-coverage";
import { readStoredEnvironmentData, type EnvironmentData } from "@/lib/environment-data";

type RisksRestrictionsSectionProps = {
  planningConstraintsParam: string | null;
  crimeSummaryParam: string | null;
  broadbandCoverageParam: string | null;
  environmentDataParam: string | null;
};

function parsePlanningConstraintsParam(param: string | null): PlanningConstraintsResult | null {
  if (!param || param === "null") return null;
  try {
    return JSON.parse(param) as PlanningConstraintsResult;
  } catch {
    return null;
  }
}

function parseCrimeSummaryParam(param: string | null): CrimeSummary | null {
  if (!param || param === "null") return null;
  try {
    return JSON.parse(param) as CrimeSummary;
  } catch {
    return null;
  }
}

function parseBroadbandCoverageParam(param: string | null): BroadbandCoverage | null {
  if (!param || param === "null") return null;
  try {
    return JSON.parse(param) as BroadbandCoverage;
  } catch {
    return null;
  }
}

function parseEnvironmentDataParam(param: string | null): EnvironmentData | null {
  if (!param || param === "null") return null;
  try {
    return JSON.parse(param) as EnvironmentData;
  } catch {
    return null;
  }
}

const emptyEnvironmentData: EnvironmentData = {
  airQuality: null,
  noiseLevels: { roadNoiseDb: null, railNoiseDb: null, airportNoiseDb: null },
};

export function RisksRestrictionsSection({
  planningConstraintsParam,
  crimeSummaryParam,
  broadbandCoverageParam,
  environmentDataParam,
}: RisksRestrictionsSectionProps) {
  const [constraints, setConstraints] = useState<PlanningConstraintsResult>(() => {
    return (
      parsePlanningConstraintsParam(planningConstraintsParam) ??
      readStoredPlanningConstraints() ??
      emptyPlanningConstraints()
    );
  });
  const [crimeSummary, setCrimeSummary] = useState<CrimeSummary | null>(() => {
    return parseCrimeSummaryParam(crimeSummaryParam) ?? readStoredCrimeSummary();
  });
  const [broadbandCoverage, setBroadbandCoverage] = useState<BroadbandCoverage | null>(() => {
    return parseBroadbandCoverageParam(broadbandCoverageParam) ?? readStoredBroadbandCoverage();
  });
  const [environmentData, setEnvironmentData] = useState<EnvironmentData>(() => {
    return parseEnvironmentDataParam(environmentDataParam) ?? readStoredEnvironmentData() ?? emptyEnvironmentData;
  });

  useEffect(() => {
    setConstraints(
      parsePlanningConstraintsParam(planningConstraintsParam) ??
        readStoredPlanningConstraints() ??
        emptyPlanningConstraints()
    );
    setCrimeSummary(parseCrimeSummaryParam(crimeSummaryParam) ?? readStoredCrimeSummary());
    setBroadbandCoverage(parseBroadbandCoverageParam(broadbandCoverageParam) ?? readStoredBroadbandCoverage());
    setEnvironmentData(
      parseEnvironmentDataParam(environmentDataParam) ?? readStoredEnvironmentData() ?? emptyEnvironmentData
    );
  }, [planningConstraintsParam, crimeSummaryParam, broadbandCoverageParam, environmentDataParam]);

  return (
    <RisksRestrictions
      conservationAreas={constraints.conservationAreas}
      article4Directions={constraints.article4Directions}
      listedBuildingsNearby={constraints.listedBuildingsNearby}
      treePreservationNearby={constraints.treePreservationNearby}
      greenBelt={constraints.greenBelt}
      floodRiskZones={constraints.floodRiskZones}
      crimeSummary={crimeSummary}
      broadbandCoverage={broadbandCoverage}
      airQuality={environmentData.airQuality}
      noiseLevels={environmentData.noiseLevels}
    />
  );
}
