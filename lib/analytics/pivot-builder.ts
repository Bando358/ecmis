import {
  AnalysisConfig,
  AnalysisResult,
  ColumnDef,
  ComputedDataPoint,
  IndicatorDefinition,
  PivotCell,
  PivotRow,
} from "./types";
import { formatNumber } from "./utils";
import { getIndicator } from "./indicators/registry";

/**
 * Construit un AnalysisResult (tableau croise dynamique) a partir
 * des data points calcules et de la configuration d'analyse.
 *
 * @param allColumnDimValues - Map dimensionId -> valeurs possibles (dans l'ordre souhaite).
 *   Permet de garantir que toutes les valeurs d'une dimension apparaissent en colonnes,
 *   meme si elles n'ont aucune donnee (ex: toutes les tranches d'age).
 */
export function buildPivotTable(
  computedData: ComputedDataPoint[],
  config: AnalysisConfig,
  indicatorRegistry?: IndicatorDefinition[],
  allColumnDimValues?: Record<string, string[]>
): AnalysisResult {
  const indicatorDef = config.indicators.length === 1
    ? getIndicator(config.indicators[0], indicatorRegistry)
    : null;
  const valueType = indicatorDef?.valueType ?? "integer";
  const unit = indicatorDef?.unit;

  // 1. Generer les cles de colonnes uniques a partir des donnees
  const columnKeysSet = new Map<string, Record<string, string>>();
  for (const dp of computedData) {
    const colKey = buildKey(dp.dimensions, config.columns);
    if (!columnKeysSet.has(colKey)) {
      const colDimValues: Record<string, string> = {};
      for (const dimId of config.columns) {
        colDimValues[dimId] = dp.dimensions[dimId] ?? "N/A";
      }
      columnKeysSet.set(colKey, colDimValues);
    }
  }

  // Si "indicator" est une dimension colonne, garantir que TOUS les indicateurs
  // selectionnes ont au moins une colonne (meme ceux avec 0 donnees)
  if (config.columns.includes("indicator") && config.indicators.length > 1) {
    const existingNames = new Set<string>();
    for (const [, dv] of columnKeysSet) {
      if (dv.indicator) existingNames.add(dv.indicator);
    }

    // Collecter les combinaisons uniques des autres dimensions colonnes
    const otherDimIds = config.columns.filter((d) => d !== "indicator");
    const otherCombos: Record<string, string>[] = [];
    if (otherDimIds.length > 0) {
      const seen = new Set<string>();
      for (const [, dv] of columnKeysSet) {
        const combo: Record<string, string> = {};
        for (const d of otherDimIds) combo[d] = dv[d] ?? "N/A";
        const sig = otherDimIds.map((d) => combo[d]).join("||");
        if (!seen.has(sig)) { seen.add(sig); otherCombos.push(combo); }
      }
    }

    // Ajouter les indicateurs manquants
    for (const indId of config.indicators) {
      const ind = getIndicator(indId, indicatorRegistry);
      if (!ind || existingNames.has(ind.shortName)) continue;

      if (otherCombos.length === 0) {
        // Seul "indicator" en colonnes
        columnKeysSet.set(ind.shortName, { indicator: ind.shortName });
      } else {
        // Composite : creer les croisements avec les autres dimensions
        for (const combo of otherCombos) {
          const dv = { ...combo, indicator: ind.shortName };
          const key = buildKey(dv, config.columns);
          if (!columnKeysSet.has(key)) columnKeysSet.set(key, dv);
        }
      }
    }
  }

  // Garantir que TOUTES les valeurs possibles de chaque dimension colonne apparaissent,
  // meme sans donnees (ex: toutes les tranches d'age, les deux sexes, etc.)
  if (allColumnDimValues && config.columns.length > 0) {
    const dimValueSets: { dimId: string; values: string[] }[] = [];

    for (const dimId of config.columns) {
      if (dimId === "indicator" && config.indicators.length > 1) {
        const indValues = config.indicators.map((id) => {
          const ind = tryGetIndicator(id, indicatorRegistry);
          return ind?.shortName ?? id;
        });
        dimValueSets.push({ dimId, values: indValues });
      } else if (allColumnDimValues[dimId]) {
        dimValueSets.push({ dimId, values: allColumnDimValues[dimId] });
      }
    }

    if (dimValueSets.length > 0) {
      const product = cartesian(dimValueSets.map((s) => s.values));

      for (const combo of product) {
        const dv: Record<string, string> = {};
        for (let i = 0; i < dimValueSets.length; i++) {
          dv[dimValueSets[i].dimId] = combo[i];
        }
        const key = buildKey(dv, config.columns);
        if (!columnKeysSet.has(key)) {
          columnKeysSet.set(key, dv);
        }
      }
    }
  }

  // Map de l'ordre de selection des indicateurs (reutilise pour tri colonnes ET lignes)
  const indicatorOrder = new Map<string, number>();
  if (config.indicators.length > 1) {
    for (let i = 0; i < config.indicators.length; i++) {
      const ind = tryGetIndicator(config.indicators[i], indicatorRegistry);
      if (ind) indicatorOrder.set(ind.shortName, i);
    }
  }

  // Maps d'ordre pour chaque dimension colonne (preservent l'ordre configure)
  const dimValueOrder = new Map<string, Map<string, number>>();
  if (allColumnDimValues) {
    for (const [dimId, values] of Object.entries(allColumnDimValues)) {
      const orderMap = new Map<string, number>();
      values.forEach((v, i) => orderMap.set(v, i));
      dimValueOrder.set(dimId, orderMap);
    }
  }

  let columns: ColumnDef[];
  columns = Array.from(columnKeysSet.entries())
    .sort(([, a], [, b]) => {
      // Trier d'abord par ordre de l'indicateur
      const aIdx = indicatorOrder.get(a.indicator ?? "") ?? 999;
      const bIdx = indicatorOrder.get(b.indicator ?? "") ?? 999;
      if (aIdx !== bIdx) return aIdx - bIdx;

      // Pour chaque dimension colonne, trier par l'ordre configure (si disponible)
      for (const dimId of config.columns) {
        if (dimId === "indicator") continue;
        const orderMap = dimValueOrder.get(dimId);
        if (orderMap) {
          const aOrder = orderMap.get(a[dimId] ?? "") ?? 999;
          const bOrder = orderMap.get(b[dimId] ?? "") ?? 999;
          if (aOrder !== bOrder) return aOrder - bOrder;
        } else {
          // Fallback : tri alphabetique
          const aVal = a[dimId] ?? "";
          const bVal = b[dimId] ?? "";
          if (aVal !== bVal) return aVal.localeCompare(bVal);
        }
      }
      return 0;
    })
    .map(([key, dimValues]) => ({
      key,
      label: Object.values(dimValues).join(" - "),
      dimensionValues: dimValues,
    }));

  // Si pas de colonnes et un seul indicateur, creer une colonne "Valeur"
  if (columns.length === 0) {
    columns = [{ key: "value", label: "Valeur", dimensionValues: {} }];
  }

  // 2. Grouper les data points par lignes
  const rowGroupsMap = new Map<string, { dimValues: Record<string, string>; points: ComputedDataPoint[] }>();

  for (const dp of computedData) {
    const rowKey = buildKey(dp.dimensions, config.rows);
    if (!rowGroupsMap.has(rowKey)) {
      const rowDimValues: Record<string, string> = {};
      for (const dimId of config.rows) {
        rowDimValues[dimId] = dp.dimensions[dimId] ?? "N/A";
      }
      rowGroupsMap.set(rowKey, { dimValues: rowDimValues, points: [] });
    }
    rowGroupsMap.get(rowKey)!.points.push(dp);
  }

  // Si "indicator" est une dimension ligne, garantir que TOUS les indicateurs ont une ligne
  if (config.rows.includes("indicator") && config.indicators.length > 1) {
    const existingRowNames = new Set<string>();
    for (const [, rg] of rowGroupsMap) {
      if (rg.dimValues.indicator) existingRowNames.add(rg.dimValues.indicator);
    }

    const otherRowDimIds = config.rows.filter((d) => d !== "indicator");
    const otherRowCombos: Record<string, string>[] = [];
    if (otherRowDimIds.length > 0) {
      const seen = new Set<string>();
      for (const [, rg] of rowGroupsMap) {
        const combo: Record<string, string> = {};
        for (const d of otherRowDimIds) combo[d] = rg.dimValues[d] ?? "N/A";
        const sig = otherRowDimIds.map((d) => combo[d]).join("||");
        if (!seen.has(sig)) { seen.add(sig); otherRowCombos.push(combo); }
      }
    }

    for (const indId of config.indicators) {
      const ind = getIndicator(indId, indicatorRegistry);
      if (!ind || existingRowNames.has(ind.shortName)) continue;

      if (otherRowCombos.length === 0) {
        const key = ind.shortName;
        rowGroupsMap.set(key, { dimValues: { indicator: ind.shortName }, points: [] });
      } else {
        for (const combo of otherRowCombos) {
          const dv = { ...combo, indicator: ind.shortName };
          const key = buildKey(dv, config.rows);
          if (!rowGroupsMap.has(key)) {
            rowGroupsMap.set(key, { dimValues: dv, points: [] });
          }
        }
      }
    }
  }

  // Si pas de dimensions en lignes, creer une seule ligne "Total"
  if (config.rows.length === 0 && rowGroupsMap.size === 0) {
    rowGroupsMap.set("total", { dimValues: { total: "Total" }, points: computedData });
  }

  // 3. Map shortName -> IndicatorDefinition pour le formatage par colonne
  const indByShortName = new Map<string, IndicatorDefinition>();
  if (config.indicators.length > 1) {
    for (const indId of config.indicators) {
      const ind = tryGetIndicator(indId, indicatorRegistry);
      if (ind) indByShortName.set(ind.shortName, ind);
    }
  }

  // 4. Construire les PivotRow
  const rows: PivotRow[] = [];
  for (const [, group] of rowGroupsMap) {
    const cells: Record<string, PivotCell> = {};

    for (const col of columns) {
      const matching = group.points.filter((dp) => {
        if (col.key === "value") return true;
        return buildKey(dp.dimensions, config.columns) === col.key;
      });
      const sum = matching.reduce((s, p) => s + p.value, 0);
      // Si la colonne correspond a un indicateur specifique, utiliser son format
      const colInd = col.dimensionValues?.indicator
        ? indByShortName.get(col.dimensionValues.indicator)
        : null;
      cells[col.key] = {
        value: sum,
        formattedValue: formatNumber(sum, colInd?.valueType ?? valueType, colInd?.unit ?? unit),
      };
    }

    const rowTotalValue = Object.values(cells).reduce((s, c) => s + c.value, 0);
    rows.push({
      dimensionValues: group.dimValues,
      cells,
      rowTotal: {
        value: rowTotalValue,
        formattedValue: formatNumber(rowTotalValue, valueType, unit),
      },
    });
  }

  // Trier les lignes en respectant l'ordre de selection des indicateurs
  rows.sort((a, b) => {
    if (indicatorOrder.size > 0) {
      const aIdx = indicatorOrder.get(a.dimensionValues.indicator ?? "") ?? 999;
      const bIdx = indicatorOrder.get(b.dimensionValues.indicator ?? "") ?? 999;
      if (aIdx !== bIdx) return aIdx - bIdx;
    }
    const aOther = Object.entries(a.dimensionValues).filter(([k]) => k !== "indicator").map(([, v]) => v).join(" ");
    const bOther = Object.entries(b.dimensionValues).filter(([k]) => k !== "indicator").map(([, v]) => v).join(" ");
    return aOther.localeCompare(bOther);
  });

  // 5. Calculer les totaux de colonnes
  const columnTotals: Record<string, PivotCell> = {};
  for (const col of columns) {
    const sum = rows.reduce((s, r) => s + (r.cells[col.key]?.value ?? 0), 0);
    const colInd = col.dimensionValues?.indicator
      ? indByShortName.get(col.dimensionValues.indicator)
      : null;
    columnTotals[col.key] = {
      value: sum,
      formattedValue: formatNumber(sum, colInd?.valueType ?? valueType, colInd?.unit ?? unit),
    };
  }

  // 5. Grand total
  const grandTotalValue = Object.values(columnTotals).reduce((s, c) => s + c.value, 0);

  // 6. Pourcentages si demande
  if (config.visualization.showPercentages && grandTotalValue > 0) {
    for (const row of rows) {
      for (const colKey of Object.keys(row.cells)) {
        row.cells[colKey].percentage = (row.cells[colKey].value / grandTotalValue) * 100;
      }
      row.rowTotal.percentage = (row.rowTotal.value / grandTotalValue) * 100;
    }
    for (const colKey of Object.keys(columnTotals)) {
      columnTotals[colKey].percentage = (columnTotals[colKey].value / grandTotalValue) * 100;
    }
  }

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      period: { start: "", end: "" },
      orgUnits: [],
      indicators: config.indicators,
      rowCount: rows.length,
      executionTimeMs: 0,
    },
    columns,
    rows,
    columnTotals,
    grandTotal: {
      value: grandTotalValue,
      formattedValue: formatNumber(grandTotalValue, valueType, unit),
    },
  };
}

// ---------- Helpers ----------

function buildKey(dimensions: Record<string, string>, dimIds: string[]): string {
  if (dimIds.length === 0) return "value";
  return dimIds.map((id) => dimensions[id] ?? "N/A").join("||");
}

function tryGetIndicator(id: string, registry?: IndicatorDefinition[]): IndicatorDefinition | undefined {
  return getIndicator(id, registry);
}

/** Produit cartesien de plusieurs tableaux de strings */
function cartesian(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const restProduct = cartesian(rest);
  return first.flatMap((v) => restProduct.map((r) => [v, ...r]));
}
