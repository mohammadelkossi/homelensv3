// Live lookups against planning.data.gov.uk (MHCLG's Planning Data API) for
// statutory planning constraints affecting a property. No API key, but
// "polite" rate limiting is requested by the docs, so we issue two requests
// per property (batching multiple datasets into each) rather than one per
// dataset.
//
// Conservation areas, Article 4 directions, green belt, and flood risk zones
// are polygon datasets, so a plain point-intersects query is an accurate
// "is this property inside it" test. Listed buildings and tree preservation
// orders/zones are registered as small point/footprint geometries, so a
// property's coordinates will rarely land exactly on one — we query a small
// buffer around the point instead and report results as "nearby" rather than
// asserting the property itself is listed, since overclaiming here has real
// legal/financial consequences for the reader.

const PLANNING_DATA_BASE_URL = "https://www.planning.data.gov.uk/entity.json";
const PROXIMITY_BUFFER_DEGREES = 0.0002; // ~20m at UK latitudes

export type PlanningConstraint = {
  name: string;
  reference?: string;
  grade?: string;
  documentUrl?: string;
};

export type PlanningConstraintsResult = {
  conservationAreas: PlanningConstraint[];
  article4Directions: PlanningConstraint[];
  greenBelt: PlanningConstraint[];
  floodRiskZones: PlanningConstraint[];
  listedBuildingsNearby: PlanningConstraint[];
  treePreservationNearby: PlanningConstraint[];
};

export function emptyPlanningConstraints(): PlanningConstraintsResult {
  return {
    conservationAreas: [],
    article4Directions: [],
    greenBelt: [],
    floodRiskZones: [],
    listedBuildingsNearby: [],
    treePreservationNearby: [],
  };
}

export function hasPlanningConstraintsContent(
  result: PlanningConstraintsResult | null | undefined
): boolean {
  if (!result) return false;
  return Object.values(result).some((group) => group.length > 0);
}

export const REPORT_PLANNING_CONSTRAINTS_STORAGE_KEY = "homelens_report_planning_constraints";

export function readStoredPlanningConstraints(): PlanningConstraintsResult | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(REPORT_PLANNING_CONSTRAINTS_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlanningConstraintsResult;
  } catch {
    sessionStorage.removeItem(REPORT_PLANNING_CONSTRAINTS_STORAGE_KEY);
    return null;
  }
}

export function storePlanningConstraints(result: PlanningConstraintsResult): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(REPORT_PLANNING_CONSTRAINTS_STORAGE_KEY, JSON.stringify(result));
}

type PlanningDataEntity = {
  name?: string;
  dataset?: string;
  reference?: string;
  "listed-building-grade"?: string;
  "flood-risk-level"?: string;
  "flood-risk-type"?: string;
  "document-url"?: string;
  "documentation-url"?: string;
};

type PlanningDataResponse = {
  entities?: PlanningDataEntity[];
};

function toConstraint(entity: PlanningDataEntity, fallbackName?: string): PlanningConstraint {
  return {
    name: entity.name?.trim() || fallbackName || "Unnamed",
    reference: entity.reference,
    grade: entity["listed-building-grade"],
    documentUrl: entity["document-url"] || entity["documentation-url"],
  };
}

async function queryPlanningData(params: URLSearchParams): Promise<PlanningDataEntity[]> {
  const response = await fetch(`${PLANNING_DATA_BASE_URL}?${params.toString()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    console.error("Planning Data API error:", response.status);
    return [];
  }
  const data: PlanningDataResponse = await response.json();
  return data.entities ?? [];
}

function bufferPolygonWkt(latitude: number, longitude: number): string {
  const d = PROXIMITY_BUFFER_DEGREES;
  const points = [
    [longitude - d, latitude - d],
    [longitude + d, latitude - d],
    [longitude + d, latitude + d],
    [longitude - d, latitude + d],
    [longitude - d, latitude - d],
  ];
  const ring = points.map(([lon, lat]) => `${lon} ${lat}`).join(",");
  return `POLYGON((${ring}))`;
}

export async function fetchPlanningConstraints(
  latitude: number,
  longitude: number
): Promise<PlanningConstraintsResult> {
  if (!latitude || !longitude) return emptyPlanningConstraints();

  const polygonParams = new URLSearchParams();
  polygonParams.set("latitude", String(latitude));
  polygonParams.set("longitude", String(longitude));
  for (const dataset of ["conservation-area", "article-4-direction-area", "green-belt", "flood-risk-zone"]) {
    polygonParams.append("dataset", dataset);
  }
  polygonParams.set("limit", "50");

  const proximityParams = new URLSearchParams();
  proximityParams.set("geometry", bufferPolygonWkt(latitude, longitude));
  proximityParams.set("geometry_relation", "intersects");
  for (const dataset of ["listed-building", "tree-preservation-zone", "tree-preservation-order"]) {
    proximityParams.append("dataset", dataset);
  }
  proximityParams.set("limit", "50");

  try {
    const [polygonEntities, proximityEntities] = await Promise.all([
      queryPlanningData(polygonParams),
      queryPlanningData(proximityParams),
    ]);

    const result = emptyPlanningConstraints();
    for (const entity of polygonEntities) {
      if (entity.dataset === "conservation-area") {
        result.conservationAreas.push(toConstraint(entity));
      } else if (entity.dataset === "article-4-direction-area") {
        result.article4Directions.push(toConstraint(entity));
      } else if (entity.dataset === "green-belt") {
        result.greenBelt.push(toConstraint(entity));
      } else if (entity.dataset === "flood-risk-zone") {
        const label = `Flood Zone ${entity["flood-risk-level"] ?? "?"}${entity["flood-risk-type"] ? ` (${entity["flood-risk-type"]})` : ""}`;
        result.floodRiskZones.push(toConstraint(entity, label));
      }
    }

    for (const entity of proximityEntities) {
      if (entity.dataset === "listed-building") {
        result.listedBuildingsNearby.push(toConstraint(entity));
      } else if (entity.dataset === "tree-preservation-zone" || entity.dataset === "tree-preservation-order") {
        result.treePreservationNearby.push(toConstraint(entity, "Tree Preservation Order"));
      }
    }

    return result;
  } catch (error) {
    console.error("Error fetching planning constraints:", error);
    return emptyPlanningConstraints();
  }
}
