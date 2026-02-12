// ============================================================
// Types centraux du module Analyser & Visualiser
// ============================================================

// ---------- Periode ----------

export type PeriodType = "day" | "week" | "month" | "quarter" | "semester" | "year";

export type PeriodSelection =
  | { type: "fixed"; startDate: string; endDate: string }
  | { type: "relative"; period: PeriodType; count: number; selectedKeys?: string[] };

// ---------- Unite d'organisation ----------

export type OrgUnitLevel = "all" | "region" | "district" | "clinique";

export type OrgUnitSelection = {
  level: OrgUnitLevel;
  selectedIds: string[];
  includeChildren: boolean;
};

export type OrgUnitTreeNode = {
  id: string;
  name: string;
  code: string;
  level: OrgUnitLevel;
  children: OrgUnitTreeNode[];
};

// ---------- Filtres / Dimensions ----------

export type FilterOperator =
  | "in"
  | "notIn"
  | "eq"
  | "neq"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "between";

export type DimensionFilter = {
  dimensionId: string;
  operator: FilterOperator;
  values: (string | number)[];
};

// ---------- Visualisation ----------

export type ChartType =
  | "pivotTable"
  | "bar"
  | "stackedBar"
  | "line"
  | "area"
  | "pie"
  | "doughnut";

export type VisualizationConfig = {
  type: ChartType;
  showTotals: boolean;
  showPercentages: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

// ---------- Configuration d'analyse ----------

export type AnalysisConfig = {
  indicators: string[];
  rows: string[];
  columns: string[];
  filters: DimensionFilter[];
  orgUnits: OrgUnitSelection;
  period: PeriodSelection;
  visualization: VisualizationConfig;
};

// ---------- Resultat d'analyse ----------

export type PivotCell = {
  value: number;
  formattedValue: string;
  percentage?: number;
};

export type PivotRow = {
  dimensionValues: Record<string, string>;
  cells: Record<string, PivotCell>;
  rowTotal: PivotCell;
};

export type ColumnDef = {
  key: string;
  label: string;
  dimensionValues: Record<string, string>;
};

export type AnalysisResult = {
  metadata: {
    generatedAt: string;
    period: { start: string; end: string };
    orgUnits: string[];
    indicators: string[];
    rowCount: number;
    executionTimeMs: number;
  };
  columns: ColumnDef[];
  rows: PivotRow[];
  columnTotals: Record<string, PivotCell>;
  grandTotal: PivotCell;
};

// ---------- Sources de donnees ----------

export type DataSource =
  | "visite"
  | "client"
  | "planning"
  | "gynecologie"
  | "obstetrique"
  | "accouchement"
  | "cpon"
  | "ist"
  | "infertilite"
  | "vbg"
  | "medecine"
  | "saa"
  | "depistageVih"
  | "pecVih"
  | "testGrossesse"
  | "grossesse"
  | "facturePrestation"
  | "factureProduit"
  | "factureExamen"
  | "factureEchographie";

export type FetchedData = {
  [K in DataSource]?: Record<string, unknown>[];
};

// ---------- Donnees calculees ----------

export type ComputedDataPoint = {
  indicatorId: string;
  value: number;
  dimensions: Record<string, string>;
};

// ---------- Indicateurs ----------

export type AggregationType =
  | "count"
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "countDistinct"
  | "ratio";

export type IndicatorCategory =
  | "general"
  | "planification_familiale"
  | "gynecologie"
  | "obstetrique"
  | "accouchement"
  | "ist"
  | "depistage_vih"
  | "pec_vih"
  | "medecine"
  | "pharmacie"
  | "laboratoire"
  | "financier"
  | "vbg"
  | "infertilite"
  | "saa"
  | "cpon";

export type IndicatorDefinition = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: IndicatorCategory;
  dataSources: DataSource[];
  aggregation: AggregationType;
  compute: (data: FetchedData) => ComputedDataPoint[];
  numeratorId?: string;
  denominatorId?: string;
  valueType: "integer" | "decimal" | "percentage" | "currency";
  unit?: string;
};

// ---------- Dimensions ----------

export type DimensionType = "fixed" | "dynamic";

export type DimensionValue = {
  value: string;
  label: string;
};

export type DimensionContext = {
  cliniqueMap: Map<string, { nomClinique: string; idRegion: string; idDistrict?: string | null }>;
  regionMap: Map<string, { nomRegion: string }>;
  districtMap: Map<string, { nomDistrict: string }>;
};

export type DimensionDefinition = {
  id: string;
  name: string;
  type: DimensionType;
  extractor: (record: Record<string, unknown>, context?: DimensionContext) => string;
  getValues: () => Promise<DimensionValue[]> | DimensionValue[];
  canBeRow: boolean;
  canBeColumn: boolean;
  canBeFilter: boolean;
};

// ---------- Etat de l'analyse (front-end) ----------

export type AnalysisState = {
  config: AnalysisConfig;
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  isDirty: boolean;
  savedAnalysisId: string | null;
  savedAnalysisName: string | null;
};

export type AnalysisAction =
  | { type: "SET_PERIOD"; payload: PeriodSelection }
  | { type: "SET_ORG_UNITS"; payload: OrgUnitSelection }
  | { type: "SET_INDICATORS"; payload: string[] }
  | { type: "SET_ROWS"; payload: string[] }
  | { type: "SET_COLUMNS"; payload: string[] }
  | { type: "ADD_FILTER"; payload: DimensionFilter }
  | { type: "REMOVE_FILTER"; payload: string }
  | { type: "UPDATE_FILTER"; payload: DimensionFilter }
  | { type: "SET_VISUALIZATION"; payload: VisualizationConfig }
  | { type: "SET_RESULT"; payload: AnalysisResult }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "LOAD_SAVED"; payload: { id: string; name: string; config: AnalysisConfig } }
  | { type: "MARK_SAVED"; payload: { id: string; name: string } }
  | { type: "RESET" };
