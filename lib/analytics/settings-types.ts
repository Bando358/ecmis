// ============================================================
// Types pour les parametres du module Analyser & Visualiser
// ============================================================

/** Tranche d'age individuelle */
export type AgeRangeBound = {
  label: string;
  min: number;
  max: number | null; // null = infinity (ex: "25+ ans")
};

/** Propriete individuelle d'un type de service */
export type ServiceTypeProperty = {
  key: string;
  label: string;
  /** Indique si cette propriete est incluse dans l'indicateur "Total" du type de service */
  includedInTotal?: boolean;
};

/** Configuration d'un type de service */
export type ServiceTypeConfig = {
  value: string;
  label: string;
  enabled: boolean;
  properties: ServiceTypeProperty[];
  /** Libelle personnalise de l'indicateur Total (ex: "Total PF") */
  totalLabel?: string;
};

/** Groupe 1 : Donnees */
export type DataSettings = {
  ageRanges: AgeRangeBound[];
  serviceTypes: ServiceTypeConfig[];
  contraceptionTypes: { value: string; label: string }[];
  clientStatuses: { value: string; label: string }[];
  genderValues: { value: string; label: string }[];
  formatting: {
    currencyUnit: string;
    percentageDecimals: number;
    decimalMaxFractionDigits: number;
    locale: string;
  };
};

/** Groupe 2 : Graphiques */
export type ChartSettings = {
  colorPalette: string[];
  defaultChartType: string;
  showTotalsDefault: boolean;
  showPercentagesDefault: boolean;
  chartHeight: string;
  period: {
    defaultType: "fixed" | "relative";
    defaultRelativeCount: number;
    maxRelativeCount: number;
    periodDimensionValuesCount: number;
    defaultGranularity: string;
  };
};

/** Groupe 3 : Export */
export type ExportSettings = {
  excel: {
    titleFontSize: number;
    headerBackgroundColor: string;
    headerBorderColor: string;
    defaultColumnWidth: number;
    firstColumnWidth: number;
    numberFormat: string;
    totalRowBackground: string;
  };
  pdf: {
    pageOrientation: "landscape" | "portrait";
    pageFormat: string;
    titleFontSize: number;
    tableFontSize: number;
    headerFillColor: [number, number, number];
    headerTextColor: [number, number, number];
    alternateRowColor: [number, number, number];
  };
};

/** Groupe 4 : Affichage */
export type DisplaySettings = {
  pivotTableMaxHeight: string;
  indicatorSelectorMaxHeight: string;
};

/** Configuration complete */
export type AnalyticsSettingsConfig = {
  data: DataSettings;
  charts: ChartSettings;
  export: ExportSettings;
  display: DisplaySettings;
};
