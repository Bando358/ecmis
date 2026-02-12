import { AnalyticsSettingsConfig } from "./settings-types";

/**
 * Valeurs par defaut pour tous les parametres du module Analyser & Visualiser.
 * Ces valeurs sont utilisees quand aucun parametre n'est enregistre en base.
 */
export const DEFAULT_ANALYTICS_SETTINGS: AnalyticsSettingsConfig = {
  data: {
    ageRanges: [
      { label: "<10 ans", min: 0, max: 9 },
      { label: "10-14 ans", min: 10, max: 14 },
      { label: "15-19 ans", min: 15, max: 19 },
      { label: "20-24 ans", min: 20, max: 24 },
      { label: "25+ ans", min: 25, max: null },
    ],
    serviceTypes: [
      {
        value: "planning",
        label: "Planification Familiale",
        enabled: true,
        totalLabel: "Total PF",
        properties: [
          { key: "consultation", label: "Consultation", includedInTotal: true },
          { key: "counsellingPf", label: "Counselling PF", includedInTotal: false },
          { key: "methodePrise", label: "Methode prise", includedInTotal: false },
          { key: "typeContraception", label: "Type de contraception", includedInTotal: false },
          { key: "statut", label: "Statut", includedInTotal: false },
          { key: "motifVisite", label: "Motif de visite", includedInTotal: false },
        ],
      },
      {
        value: "gynecologie",
        label: "Gynecologie",
        enabled: true,
        totalLabel: "Total Gynecologie",
        properties: [
          { key: "consultation", label: "Consultation", includedInTotal: true },
          { key: "resultatIva", label: "Resultat IVA", includedInTotal: false },
        ],
      },
      {
        value: "obstetrique",
        label: "Obstetrique",
        enabled: true,
        totalLabel: "Total Obstetrique",
        properties: [
          { key: "obstConsultation", label: "Consultation prenatale", includedInTotal: true },
        ],
      },
      {
        value: "accouchement",
        label: "Accouchement",
        enabled: true,
        totalLabel: "Total Accouchement",
        properties: [
          { key: "accouchementConsultation", label: "Consultation", includedInTotal: true },
          { key: "accouchementEnfantVivant", label: "Enfant ne vivant", includedInTotal: false },
        ],
      },
      {
        value: "ist",
        label: "IST",
        enabled: true,
        totalLabel: "Total IST",
        properties: [
          { key: "istType", label: "Type IST", includedInTotal: true },
          { key: "istTypePec", label: "Type PEC", includedInTotal: false },
        ],
      },
      {
        value: "depistageVih",
        label: "Depistage VIH",
        enabled: true,
        totalLabel: "Total Depistage VIH",
        properties: [
          { key: "depistageVihConsultation", label: "Consultation", includedInTotal: true },
          { key: "depistageVihResultat", label: "Resultat", includedInTotal: false },
        ],
      },
      {
        value: "pecVih",
        label: "PEC VIH",
        enabled: true,
        totalLabel: "Total PEC VIH",
        properties: [
          { key: "pecVihCounselling", label: "Counselling", includedInTotal: true },
          { key: "pecVihMoleculeArv", label: "Molecule ARV", includedInTotal: false },
        ],
      },
      {
        value: "medecine",
        label: "Medecine Generale",
        enabled: true,
        totalLabel: "Total Medecine",
        properties: [
          { key: "mdgConsultation", label: "Consultation", includedInTotal: true },
          { key: "mdgSuspicionPalu", label: "Suspicion paludisme", includedInTotal: false },
        ],
      },
      {
        value: "vbg",
        label: "VBG",
        enabled: true,
        totalLabel: "Total VBG",
        properties: [
          { key: "vbgConsultation", label: "Consultation", includedInTotal: true },
          { key: "vbgType", label: "Type VBG", includedInTotal: false },
        ],
      },
      {
        value: "infertilite",
        label: "Infertilite",
        enabled: true,
        totalLabel: "Total Infertilite",
        properties: [
          { key: "infertConsultation", label: "Consultation", includedInTotal: true },
        ],
      },
      {
        value: "saa",
        label: "SAA",
        enabled: true,
        totalLabel: "Total SAA",
        properties: [
          { key: "saaConsultation", label: "Consultation", includedInTotal: true },
          { key: "saaTypeAvortement", label: "Type avortement", includedInTotal: false },
        ],
      },
      {
        value: "cpon",
        label: "CPON",
        enabled: true,
        totalLabel: "Total CPON",
        properties: [
          { key: "cponConsultation", label: "Consultation", includedInTotal: true },
        ],
      },
    ],
    contraceptionTypes: [
      { value: "courte_duree", label: "Courte duree" },
      { value: "longue_duree", label: "Longue duree" },
      { value: "permanent", label: "Permanent" },
    ],
    clientStatuses: [
      { value: "nouveau", label: "Nouveau" },
      { value: "ancien", label: "Ancien" },
    ],
    genderValues: [
      { value: "M", label: "Masculin" },
      { value: "F", label: "Feminin" },
    ],
    formatting: {
      currencyUnit: "CFA",
      percentageDecimals: 1,
      decimalMaxFractionDigits: 2,
      locale: "fr-FR",
    },
  },
  charts: {
    colorPalette: [
      "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
      "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#14b8a6",
      "#0ea5e9", "#9333ea", "#10b981", "#eab308", "#fb7185",
      "#0891b2", "#facc15", "#64748b", "#dc2626", "#475569",
    ],
    defaultChartType: "pivotTable",
    showTotalsDefault: true,
    showPercentagesDefault: false,
    chartHeight: "400px",
    period: {
      defaultType: "fixed",
      defaultRelativeCount: 3,
      maxRelativeCount: 24,
      periodDimensionValuesCount: 12,
      defaultGranularity: "month",
    },
  },
  export: {
    excel: {
      titleFontSize: 14,
      headerBackgroundColor: "FFE2E8F0",
      headerBorderColor: "FF94A3B8",
      defaultColumnWidth: 16,
      firstColumnWidth: 24,
      numberFormat: "#,##0",
      totalRowBackground: "FFF1F5F9",
    },
    pdf: {
      pageOrientation: "landscape",
      pageFormat: "a4",
      titleFontSize: 14,
      tableFontSize: 8,
      headerFillColor: [226, 232, 240],
      headerTextColor: [30, 41, 59],
      alternateRowColor: [248, 250, 252],
    },
  },
  display: {
    pivotTableMaxHeight: "600px",
    indicatorSelectorMaxHeight: "250px",
  },
};
