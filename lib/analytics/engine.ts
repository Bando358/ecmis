import prisma from "@/lib/prisma";
import {
  AnalysisConfig,
  AnalysisResult,
  ComputedDataPoint,
  DimensionContext,
  DimensionDefinition,
  FetchedData,
  IndicatorDefinition,
  PeriodType,
} from "./types";
import { resolvePeriod, getPeriodKey } from "./utils";
import { fetchAnalyticsData } from "./data-fetcher";
import { buildPivotTable } from "./pivot-builder";
import { getIndicator } from "./indicators/registry";
import { getDimension } from "./dimensions/registry";
import { resolveCliniqueId, resolveDateField } from "./utils";

/**
 * Point d'entree principal du moteur d'analyse.
 * Orchestre : resolution org units -> resolution periode -> fetch data ->
 * compute indicateurs -> extraction dimensions -> build pivot table.
 * @param dimensionRegistry - registre de dimensions a jour (optionnel, utilise le defaut sinon)
 */
export async function executeAnalysis(
  config: AnalysisConfig,
  dimensionRegistry?: DimensionDefinition[],
  indicatorRegistry?: IndicatorDefinition[]
): Promise<AnalysisResult> {
  const startTime = Date.now();

  // 1. Resoudre les unites d'organisation -> liste de clinique IDs
  const cliniqueIds = await resolveOrgUnits(config);

  if (cliniqueIds.length === 0) {
    return emptyResult(config, startTime);
  }

  // 2. Resoudre la periode
  const { startDate, endDate } = resolvePeriod(config.period);

  // 3. Fetch les donnees brutes
  const rawData = await fetchAnalyticsData({
    indicators: config.indicators,
    cliniqueIds,
    startDate,
    endDate,
    filters: config.filters,
    indicatorRegistry,
  });

  // 4. Construire le contexte de dimensions (maps org unit)
  const dimContext = await buildDimensionContext(cliniqueIds);

  // 5. Calculer les data points : pour chaque indicateur, appliquer compute
  //    puis extraire les dimensions de chaque enregistrement
  const allDataPoints: ComputedDataPoint[] = [];

  // Si plusieurs indicateurs et "indicator" n'est dans aucune dimension,
  // l'ajouter automatiquement aux colonnes pour eviter la fusion des valeurs
  const effectiveColumns = [...config.columns];
  if (
    config.indicators.length > 1 &&
    !config.rows.includes("indicator") &&
    !config.columns.includes("indicator")
  ) {
    effectiveColumns.push("indicator");
  }

  const allDimIds = [...config.rows, ...effectiveColumns];

  // Determiner le type de periode pour le groupement
  const periodType = derivePeriodType(config);

  for (const indicatorId of config.indicators) {
    const indicator = getIndicator(indicatorId, indicatorRegistry);
    if (!indicator) continue; // Indicateur supprime ou renomme, on l'ignore

    const rawPoints = indicator.compute(rawData);

    for (const point of rawPoints) {
      // Extraire les dimensions de l'enregistrement sous-jacent
      const record = (point as unknown as { _record?: Record<string, unknown> })._record;
      const dimensions: Record<string, string> = {};

      for (const dimId of allDimIds) {
        if (dimId === "indicator") {
          // Traitement special pour la dimension indicateur
          dimensions.indicator = indicator.shortName;
        } else if (dimId === "period") {
          // Traitement special pour la dimension periode
          const date = record ? resolveDateField(record) : null;
          dimensions.period = date ? getPeriodKey(date, periodType) : "N/A";
        } else {
          const dim = getDimension(dimId, dimensionRegistry);
          dimensions[dimId] = record ? dim.extractor(record, dimContext) : "N/A";
        }
      }

      const dp: ComputedDataPoint = { indicatorId, value: point.value, dimensions };
      // Preserver _record pour que applyFilters puisse re-extraire les dimensions
      if (record) (dp as unknown as Record<string, unknown>)._record = record;
      allDataPoints.push(dp);
    }
  }

  // 6. Appliquer les filtres sur les data points
  let filteredPoints = applyFilters(allDataPoints, config, rawData, dimContext, dimensionRegistry);

  // 6b. Si des periodes specifiques sont selectionnees, filtrer par cles de periode
  if (
    config.period.type === "relative" &&
    config.period.selectedKeys &&
    config.period.selectedKeys.length > 0
  ) {
    const allowedKeys = new Set(config.period.selectedKeys);
    filteredPoints = filteredPoints.filter(
      (dp) => !dp.dimensions.period || allowedKeys.has(dp.dimensions.period)
    );
  }

  // 7. Resoudre toutes les valeurs possibles pour chaque dimension colonne
  //    afin de garantir que les colonnes vides (valeur 0) apparaissent aussi.
  const DISPLAY_NAME_DIMS = new Set(["orgUnit", "region", "district", "prescripteur"]);
  const allColumnDimValues: Record<string, string[]> = {};

  for (const dimId of effectiveColumns) {
    if (dimId === "indicator") continue; // gere par buildPivotTable

    if (dimId === "period") {
      // Generer les cles de periode depuis la plage de dates effective
      if (
        config.period.type === "relative" &&
        config.period.selectedKeys &&
        config.period.selectedKeys.length > 0
      ) {
        allColumnDimValues[dimId] = config.period.selectedKeys;
      } else {
        allColumnDimValues[dimId] = generateAllPeriodKeys(startDate, endDate, periodType);
      }
    } else {
      const dim = getDimension(dimId, dimensionRegistry);
      const values = await Promise.resolve(dim.getValues());
      // Les extracteurs d'orgUnit/region/district/prescripteur retournent le nom (label),
      // les autres retournent la valeur brute (value)
      allColumnDimValues[dimId] = values.map((v) =>
        DISPLAY_NAME_DIMS.has(dimId) ? v.label : v.value
      );
    }
  }

  // 8. Construire le pivot table (avec colonnes effectives incluant "indicator" si necessaire)
  const effectiveConfig = effectiveColumns !== config.columns
    ? { ...config, columns: effectiveColumns }
    : config;
  const result = buildPivotTable(filteredPoints, effectiveConfig, indicatorRegistry, allColumnDimValues);

  // 8. Enrichir les metadata
  result.metadata.period = {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
  result.metadata.orgUnits = cliniqueIds;
  result.metadata.executionTimeMs = Date.now() - startTime;

  return result;
}

// ---------- Helpers ----------

async function resolveOrgUnits(config: AnalysisConfig): Promise<string[]> {
  const { level, selectedIds, includeChildren } = config.orgUnits;

  if (level === "all") {
    const all = await prisma.clinique.findMany({ select: { id: true } });
    return all.map((c) => c.id);
  }

  if (level === "clinique") {
    return selectedIds;
  }

  if (level === "region") {
    if (includeChildren) {
      const cliniques = await prisma.clinique.findMany({
        where: { idRegion: { in: selectedIds } },
        select: { id: true },
      });
      return cliniques.map((c) => c.id);
    }
    return selectedIds;
  }

  if (level === "district") {
    if (includeChildren) {
      const cliniques = await prisma.clinique.findMany({
        where: { idDistrict: { in: selectedIds } },
        select: { id: true },
      });
      return cliniques.map((c) => c.id);
    }
    return selectedIds;
  }

  return selectedIds;
}

async function buildDimensionContext(
  cliniqueIds: string[]
): Promise<DimensionContext> {
  const [cliniques, regions, districts] = await Promise.all([
    prisma.clinique.findMany({
      where: { id: { in: cliniqueIds } },
      select: { id: true, nomClinique: true, idRegion: true, idDistrict: true },
    }),
    prisma.region.findMany({ select: { id: true, nomRegion: true } }),
    prisma.district.findMany({ select: { id: true, nomDistrict: true } }),
  ]);

  return {
    cliniqueMap: new Map(
      cliniques.map((c) => [
        c.id,
        { nomClinique: c.nomClinique, idRegion: c.idRegion, idDistrict: c.idDistrict },
      ])
    ),
    regionMap: new Map(regions.map((r) => [r.id, { nomRegion: r.nomRegion }])),
    districtMap: new Map(districts.map((d) => [d.id, { nomDistrict: d.nomDistrict }])),
  };
}

function derivePeriodType(config: AnalysisConfig): PeriodType {
  // Si l'utilisateur a choisi une periode relative, utiliser son type
  if (config.period.type === "relative") {
    return config.period.period;
  }
  // Sinon deduire du range de dates
  const start = new Date(config.period.startDate);
  const end = new Date(config.period.endDate);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 31) return "day";
  if (diffDays <= 90) return "week";
  if (diffDays <= 365) return "month";
  if (diffDays <= 730) return "quarter";
  return "year";
}

function applyFilters(
  dataPoints: ComputedDataPoint[],
  config: AnalysisConfig,
  rawData: FetchedData,
  dimContext: DimensionContext,
  dimensionRegistry?: DimensionDefinition[]
): ComputedDataPoint[] {
  if (config.filters.length === 0) return dataPoints;

  return dataPoints.filter((dp) => {
    for (const filter of config.filters) {
      const record = (dp as unknown as { _record?: Record<string, unknown> })._record;
      if (!record) continue;

      const dim = getDimension(filter.dimensionId, dimensionRegistry);
      const actualValue = dim.extractor(record, dimContext);

      switch (filter.operator) {
        case "in":
          if (!filter.values.includes(actualValue)) return false;
          break;
        case "notIn":
          if (filter.values.includes(actualValue)) return false;
          break;
        case "eq":
          if (actualValue !== String(filter.values[0])) return false;
          break;
        case "neq":
          if (actualValue === String(filter.values[0])) return false;
          break;
        default:
          break;
      }
    }
    return true;
  });
}

function generateAllPeriodKeys(startDate: Date, endDate: Date, periodType: PeriodType): string[] {
  const keys: string[] = [];
  const current = new Date(startDate);

  // Aligner sur le debut de la periode
  switch (periodType) {
    case "month": current.setDate(1); break;
    case "quarter": current.setDate(1); current.setMonth(Math.floor(current.getMonth() / 3) * 3); break;
    case "semester": current.setDate(1); current.setMonth(current.getMonth() < 6 ? 0 : 6); break;
    case "year": current.setDate(1); current.setMonth(0); break;
    case "week": {
      const day = current.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      current.setDate(current.getDate() + diff);
      break;
    }
  }

  const seen = new Set<string>();
  while (current <= endDate) {
    const key = getPeriodKey(current, periodType);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    switch (periodType) {
      case "day": current.setDate(current.getDate() + 1); break;
      case "week": current.setDate(current.getDate() + 7); break;
      case "month": current.setMonth(current.getMonth() + 1); break;
      case "quarter": current.setMonth(current.getMonth() + 3); break;
      case "semester": current.setMonth(current.getMonth() + 6); break;
      case "year": current.setFullYear(current.getFullYear() + 1); break;
    }
  }

  return keys;
}

function emptyResult(config: AnalysisConfig, startTime: number): AnalysisResult {
  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      period: { start: "", end: "" },
      orgUnits: [],
      indicators: config.indicators,
      rowCount: 0,
      executionTimeMs: Date.now() - startTime,
    },
    columns: [],
    rows: [],
    columnTotals: {},
    grandTotal: { value: 0, formattedValue: "0" },
  };
}
