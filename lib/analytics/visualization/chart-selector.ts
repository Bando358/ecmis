import { AnalysisConfig, ChartType } from "../types";

/**
 * Suggere les types de graphiques adaptes en fonction de la configuration d'analyse.
 */
export function suggestChartTypes(config: AnalysisConfig): ChartType[] {
  const hasTimeDimension =
    config.rows.includes("period") || config.columns.includes("period");
  const hasSingleIndicator = config.indicators.length === 1;
  const hasMultipleRows = config.rows.length > 0;

  const suggestions: ChartType[] = ["pivotTable"];

  if (hasTimeDimension) {
    suggestions.push("line", "area");
  }

  if (hasSingleIndicator && hasMultipleRows) {
    suggestions.push("bar");
  }

  if (config.indicators.length > 1) {
    suggestions.push("stackedBar");
  }

  if (hasSingleIndicator && !hasTimeDimension) {
    suggestions.push("pie");
  }

  if (!hasTimeDimension && hasMultipleRows) {
    suggestions.push("bar");
  }

  // Deduplicate
  return [...new Set(suggestions)];
}
