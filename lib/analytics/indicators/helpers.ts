import { ComputedDataPoint, FetchedData } from "../types";

/**
 * Compte les enregistrements d'une source de donnees, optionnellement filtres.
 */
export function countRecords(
  records: Record<string, unknown>[] | undefined,
  predicate?: (record: Record<string, unknown>) => boolean
): ComputedDataPoint[] {
  if (!records) return [];
  const filtered = predicate ? records.filter(predicate) : records;
  return filtered.map((r) => ({
    indicatorId: "",
    value: 1,
    dimensions: {},
    _record: r,
  })) as (ComputedDataPoint & { _record: Record<string, unknown> })[];
}

/**
 * Compte les valeurs distinctes d'un champ.
 */
export function countDistinct(
  records: Record<string, unknown>[] | undefined,
  field: string
): ComputedDataPoint[] {
  if (!records) return [];
  const seen = new Set<string>();
  const result: (ComputedDataPoint & { _record: Record<string, unknown> })[] = [];

  for (const r of records) {
    const val = r[field] as string;
    if (val && !seen.has(val)) {
      seen.add(val);
      result.push({
        indicatorId: "",
        value: 1,
        dimensions: {},
        _record: r,
      });
    }
  }
  return result;
}

/**
 * Somme les valeurs d'un champ numerique.
 */
export function sumField(
  records: Record<string, unknown>[] | undefined,
  field: string
): ComputedDataPoint[] {
  if (!records) return [];
  return records.map((r) => ({
    indicatorId: "",
    value: (typeof r[field] === "number" ? r[field] : Number(r[field]) || 0) as number,
    dimensions: {},
    _record: r,
  })) as (ComputedDataPoint & { _record: Record<string, unknown> })[];
}

/**
 * Combine les data points de plusieurs sources pour un indicateur de somme totale.
 */
export function combineDataPoints(
  ...arrays: ComputedDataPoint[][]
): ComputedDataPoint[] {
  return arrays.flat();
}

/**
 * Calcule un ratio entre deux ensembles de data points (numerateur / denominateur).
 */
export function ratioCompute(
  data: FetchedData,
  numeratorFn: (d: FetchedData) => ComputedDataPoint[],
  denominatorFn: (d: FetchedData) => ComputedDataPoint[]
): ComputedDataPoint[] {
  const numPoints = numeratorFn(data);
  const denPoints = denominatorFn(data);

  const numTotal = numPoints.reduce((s, p) => s + p.value, 0);
  const denTotal = denPoints.reduce((s, p) => s + p.value, 0);

  if (denTotal === 0) {
    return [{ indicatorId: "", value: 0, dimensions: {} }];
  }

  return [
    {
      indicatorId: "",
      value: (numTotal / denTotal) * 100,
      dimensions: {},
    },
  ];
}
