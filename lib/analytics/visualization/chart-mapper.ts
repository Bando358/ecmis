import { AnalysisResult, ChartType } from "../types";

export type RechartsDataItem = Record<string, string | number>;

/**
 * Transforme un AnalysisResult en format compatible Recharts.
 */
export function mapToRechartsData(
  result: AnalysisResult,
  chartType: ChartType
): { data: RechartsDataItem[]; dataKeys: string[]; nameKey: string } {
  if (!result.rows.length || !result.columns.length) {
    return { data: [], dataKeys: [], nameKey: "name" };
  }

  switch (chartType) {
    case "bar":
    case "stackedBar": {
      const data: RechartsDataItem[] = result.rows.map((row) => {
        const item: RechartsDataItem = {
          name: Object.values(row.dimensionValues).join(" - "),
        };
        for (const col of result.columns) {
          item[col.label] = row.cells[col.key]?.value ?? 0;
        }
        return item;
      });
      return {
        data,
        dataKeys: result.columns.map((c) => c.label),
        nameKey: "name",
      };
    }

    case "line":
    case "area": {
      const data: RechartsDataItem[] = result.rows.map((row) => {
        const item: RechartsDataItem = {
          period: row.dimensionValues.period ?? Object.values(row.dimensionValues)[0] ?? "",
        };
        for (const col of result.columns) {
          item[col.label] = row.cells[col.key]?.value ?? 0;
        }
        return item;
      });
      return {
        data,
        dataKeys: result.columns.map((c) => c.label),
        nameKey: "period",
      };
    }

    case "pie":
    case "doughnut": {
      const data: RechartsDataItem[] = result.rows.map((row) => ({
        name: Object.values(row.dimensionValues).join(" - "),
        value: row.rowTotal.value,
      }));
      return { data, dataKeys: ["value"], nameKey: "name" };
    }

    default:
      return { data: [], dataKeys: [], nameKey: "name" };
  }
}

/**
 * Palette de couleurs pour les graphiques (identique a DashboardChart.tsx).
 */
import { DEFAULT_ANALYTICS_SETTINGS } from "../settings-defaults";

export const CHART_COLORS = DEFAULT_ANALYTICS_SETTINGS.charts.colorPalette;

export function getChartColors(palette?: string[]): string[] {
  return palette ?? CHART_COLORS;
}
