import { useReducer } from "react";
import {
  AnalysisAction,
  AnalysisConfig,
  AnalysisState,
} from "@/lib/analytics/types";
import { ChartSettings } from "@/lib/analytics/settings-types";

const defaultConfig: AnalysisConfig = {
  indicators: [],
  rows: [],
  columns: [],
  filters: [],
  orgUnits: { level: "all", selectedIds: [], includeChildren: true },
  period: { type: "fixed", startDate: "", endDate: "" },
  visualization: { type: "pivotTable", showTotals: true, showPercentages: false },
};

const initialState: AnalysisState = {
  config: defaultConfig,
  result: null,
  loading: false,
  error: null,
  isDirty: false,
  savedAnalysisId: null,
  savedAnalysisName: null,
};

function reducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
  switch (action.type) {
    case "SET_PERIOD":
      return { ...state, config: { ...state.config, period: action.payload }, isDirty: true };
    case "SET_ORG_UNITS":
      return { ...state, config: { ...state.config, orgUnits: action.payload }, isDirty: true };
    case "SET_INDICATORS":
      return { ...state, config: { ...state.config, indicators: action.payload }, isDirty: true };
    case "SET_ROWS":
      return { ...state, config: { ...state.config, rows: action.payload }, isDirty: true };
    case "SET_COLUMNS":
      return { ...state, config: { ...state.config, columns: action.payload }, isDirty: true };
    case "ADD_FILTER":
      return {
        ...state,
        config: {
          ...state.config,
          filters: [...state.config.filters.filter((f) => f.dimensionId !== action.payload.dimensionId), action.payload],
        },
        isDirty: true,
      };
    case "REMOVE_FILTER":
      return {
        ...state,
        config: {
          ...state.config,
          filters: state.config.filters.filter((f) => f.dimensionId !== action.payload),
        },
        isDirty: true,
      };
    case "UPDATE_FILTER":
      return {
        ...state,
        config: {
          ...state.config,
          filters: state.config.filters.map((f) =>
            f.dimensionId === action.payload.dimensionId ? action.payload : f
          ),
        },
        isDirty: true,
      };
    case "SET_VISUALIZATION":
      return { ...state, config: { ...state.config, visualization: action.payload } };
    case "SET_RESULT":
      return { ...state, result: action.payload, loading: false, error: null };
    case "SET_LOADING":
      return { ...state, loading: action.payload, error: action.payload ? null : state.error };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "LOAD_SAVED":
      return {
        ...state,
        config: action.payload.config,
        savedAnalysisId: action.payload.id,
        savedAnalysisName: action.payload.name,
        isDirty: false,
        result: null,
      };
    case "MARK_SAVED":
      return {
        ...state,
        savedAnalysisId: action.payload.id,
        savedAnalysisName: action.payload.name,
        isDirty: false,
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export type InitialAnalysis = {
  id: string;
  name: string;
  config: AnalysisConfig;
};

export function useAnalysisState(initial?: InitialAnalysis, chartDefaults?: ChartSettings) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const today = now.toISOString().split("T")[0];

  const vizDefaults = {
    type: (chartDefaults?.defaultChartType ?? "pivotTable") as AnalysisConfig["visualization"]["type"],
    showTotals: chartDefaults?.showTotalsDefault ?? true,
    showPercentages: chartDefaults?.showPercentagesDefault ?? false,
  };

  const baseConfig: AnalysisConfig = initial
    ? initial.config
    : {
        ...defaultConfig,
        period: { type: "fixed", startDate: startOfMonth, endDate: today },
        visualization: vizDefaults,
      };

  return useReducer(reducer, {
    ...initialState,
    config: baseConfig,
    savedAnalysisId: initial?.id ?? null,
    savedAnalysisName: initial?.name ?? null,
  });
}
