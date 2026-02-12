"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAnalysisState, InitialAnalysis } from "./useAnalysisState";
import { PeriodSelector } from "./toolbar/PeriodSelector";
import { OrgUnitSelector } from "./toolbar/OrgUnitSelector";
import { IndicatorSelector } from "./toolbar/IndicatorSelector";
import { DimensionConfigurator } from "./toolbar/DimensionConfigurator";
import { FilterConfigurator } from "./toolbar/FilterConfigurator";
import { ChartTypeSelector } from "./visualization/ChartTypeSelector";
import { PivotTableView } from "./visualization/PivotTableView";
import { AnalyticsChart } from "./visualization/AnalyticsChart";
import { suggestChartTypes } from "@/lib/analytics/visualization/chart-selector";
import {
  runAnalysis,
  saveAnalysis,
  loadSavedAnalysis,
  deleteSavedAnalysis,
  exportAnalysisToExcel,
  exportAnalysisToPdf,
} from "@/lib/actions/analyticsActions";
import {
  OrgUnitTreeNode,
  DimensionValue,
  DimensionFilter,
} from "@/lib/analytics/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Play,
  Save,
  Download,
  FileText,
  Clock,
  Trash2,
  Settings2,
  PanelLeftOpen,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AnalyticsSettingsConfig } from "@/lib/analytics/settings-types";
import { AnalyticsSettingsDialog } from "./settings/AnalyticsSettingsDialog";

type IndicatorGroup = {
  category: string;
  categoryLabel: string;
  indicators: {
    id: string;
    name: string;
    shortName: string;
    description: string;
  }[];
};

type DimensionInfo = {
  id: string;
  name: string;
  type: string;
  values: DimensionValue[];
  canBeRow: boolean;
  canBeColumn: boolean;
  canBeFilter: boolean;
};

type SavedAnalysisInfo = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: Date;
  version: number;
  isShared: boolean;
  createdByUserId: string;
};

interface AnalyserClientProps {
  orgUnitTree: OrgUnitTreeNode[];
  indicatorGroups: IndicatorGroup[];
  dimensions: DimensionInfo[];
  savedAnalyses: SavedAnalysisInfo[];
  userId: string;
  initialAnalysis?: InitialAnalysis;
  isAdmin?: boolean;
  analyticsSettings: AnalyticsSettingsConfig;
}

export function AnalyserClient({
  orgUnitTree,
  indicatorGroups,
  dimensions,
  savedAnalyses: initialSavedAnalyses,
  userId,
  initialAnalysis,
  isAdmin = false,
  analyticsSettings,
}: AnalyserClientProps) {
  const router = useRouter();
  const [state, dispatch] = useAnalysisState(
    initialAnalysis,
    analyticsSettings.charts,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [savedAnalyses, setSavedAnalyses] = useState(initialSavedAnalyses);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Save dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveShared, setSaveShared] = useState(false);

  const chartSuggestions = suggestChartTypes(state.config);

  // Auto-run loaded analysis on mount
  useEffect(() => {
    if (
      initialAnalysis &&
      state.config.indicators.length > 0 &&
      !state.result
    ) {
      dispatch({ type: "SET_LOADING", payload: true });
      startTransition(async () => {
        try {
          const result = await runAnalysis(state.config);
          dispatch({ type: "SET_RESULT", payload: result });
        } catch (err) {
          dispatch({
            type: "SET_ERROR",
            payload:
              err instanceof Error
                ? err.message
                : "Erreur lors de l'execution.",
          });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRun = useCallback(() => {
    if (state.config.indicators.length === 0) {
      dispatch({
        type: "SET_ERROR",
        payload: "Veuillez selectionner au moins un indicateur.",
      });
      return;
    }

    // Cacher le sidebar pour donner toute la place a la visualisation
    setSidebarCollapsed(true);

    dispatch({ type: "SET_LOADING", payload: true });
    startTransition(async () => {
      try {
        const result = await runAnalysis(state.config);
        dispatch({ type: "SET_RESULT", payload: result });
      } catch (err) {
        dispatch({
          type: "SET_ERROR",
          payload:
            err instanceof Error
              ? err.message
              : "Erreur lors de l'execution de l'analyse.",
        });
      }
    });
  }, [state.config, dispatch]);

  const handleSave = useCallback(async () => {
    if (!saveName.trim()) return;
    try {
      const { id } = await saveAnalysis({
        name: saveName,
        description: saveDescription || undefined,
        configuration: state.config,
        userId,
        isShared: saveShared,
      });
      dispatch({ type: "MARK_SAVED", payload: { id, name: saveName } });
      setSavedAnalyses((prev) => [
        {
          id,
          name: saveName,
          description: saveDescription,
          updatedAt: new Date(),
          version: 1,
          isShared: saveShared,
          createdByUserId: userId,
        },
        ...prev,
      ]);
      setSaveDialogOpen(false);
      setSaveName("");
      setSaveDescription("");
      toast.success("Analyse sauvegardee avec succes !");
    } catch {
      toast.error("Erreur lors de la sauvegarde de l'analyse.");
    }
  }, [saveName, saveDescription, saveShared, state.config, userId, dispatch]);

  const handleLoad = useCallback(
    async (analysisId: string) => {
      try {
        const loaded = await loadSavedAnalysis(analysisId);
        if (loaded) {
          dispatch({
            type: "LOAD_SAVED",
            payload: {
              id: loaded.id,
              name: loaded.name,
              config: loaded.configuration,
            },
          });
          toast.info(`Analyse "${loaded.name}" chargee.`);
        }
      } catch {
        toast.error("Erreur lors du chargement de l'analyse.");
      }
    },
    [dispatch],
  );

  const handleDelete = useCallback(
    async (analysisId: string) => {
      const analysis = savedAnalyses.find((a) => a.id === analysisId);
      if (!analysis) return;
      if (analysis.createdByUserId !== userId) {
        toast.error("Vous ne pouvez supprimer que vos propres analyses.");
        return;
      }
      try {
        await deleteSavedAnalysis(analysisId, userId);
        setSavedAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
        if (state.savedAnalysisId === analysisId) {
          dispatch({ type: "RESET" });
        }
        toast.success(`Analyse "${analysis.name}" supprimee.`);
      } catch {
        toast.error("Erreur lors de la suppression.");
      }
    },
    [savedAnalyses, userId, state.savedAnalysisId, dispatch],
  );

  const handleExportExcel = useCallback(async () => {
    if (!state.result) return;
    try {
      const base64 = await exportAnalysisToExcel(state.result, state.config);
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNumbers)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analyse-ecmis-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export Excel telecharge.");
    } catch {
      toast.error("Erreur lors de l'export Excel.");
    }
  }, [state.result, state.config]);

  const handleExportPdf = useCallback(async () => {
    if (!state.result) return;
    try {
      const base64 = await exportAnalysisToPdf(state.result, state.config);
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNumbers)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analyse-ecmis-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export PDF telecharge.");
    } catch {
      toast.error("Erreur lors de l'export PDF.");
    }
  }, [state.result, state.config]);

  const handleAddFilter = useCallback(
    (filter: DimensionFilter) =>
      dispatch({ type: "ADD_FILTER", payload: filter }),
    [dispatch],
  );
  const handleRemoveFilter = useCallback(
    (dimId: string) => dispatch({ type: "REMOVE_FILTER", payload: dimId }),
    [dispatch],
  );

  // Apres le rendu des resultats, verifier si le tableau tient
  // avec le sidebar visible. Si oui, re-afficher le sidebar.
  // La largeur du sidebar est ~420px (basis-100 = 25rem + gap).
  const SIDEBAR_WIDTH = 420;

  useEffect(() => {
    if (!state.result || isPending) return;

    const timer = setTimeout(() => {
      const scrollable = document.querySelector("[data-viz-scroll]");
      if (!scrollable) {
        // Pas de tableau (graphique ou aucune donnee) → re-afficher le sidebar
        setSidebarCollapsed(false);
        return;
      }
      // Le sidebar est deja cache, donc la viz a toute la largeur.
      // Si le contenu du tableau + largeur du sidebar < largeur dispo,
      // on peut re-afficher le sidebar.
      const contentWidth = scrollable.scrollWidth;
      const availableWidth = scrollable.clientWidth;
      const slack = availableWidth - contentWidth;
      if (slack >= SIDEBAR_WIDTH) {
        setSidebarCollapsed(false);
      }
      // Sinon, le sidebar reste cache
    }, 300);
    return () => clearTimeout(timer);
  }, [state.result, isPending]);

  const isRunnable = state.config.indicators.length > 0;

  return (
    <div className="flex flex-col gap-4 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Analyser &amp; Visualiser</h1>
          {state.savedAnalysisName && (
            <Badge variant="outline" className="text-xs">
              {state.savedAnalysisName}
              {state.isDirty && " (modifie)"}
            </Badge>
          )}
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setSettingsOpen(true)}
              title="Parametres du module"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Charger une analyse */}
          {savedAnalyses.length > 0 && (
            <Select onValueChange={handleLoad}>
              <SelectTrigger className="w-55 h-8 text-xs">
                <SelectValue placeholder="Charger une analyse..." />
              </SelectTrigger>
              <SelectContent>
                {savedAnalyses.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <div className="flex flex-col">
                      <span className="text-xs">
                        {a.name}
                        {a.isShared && " (partage)"}
                      </span>
                      {a.description && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                          {a.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Supprimer l'analyse courante */}
          {state.savedAnalysisId && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 text-destructive hover:text-destructive"
              onClick={() => handleDelete(state.savedAnalysisId!)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Sauvegarder */}
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <Save className="h-3.5 w-3.5" /> Sauvegarder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sauvegarder l&apos;analyse</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-2">
                <div>
                  <Label className="text-sm">Nom</Label>
                  <Input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Nom de l'analyse"
                  />
                </div>
                <div>
                  <Label className="text-sm">Description (optionnel)</Label>
                  <Input
                    value={saveDescription}
                    onChange={(e) => setSaveDescription(e.target.value)}
                    placeholder="Description"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={saveShared}
                    onCheckedChange={(v) => setSaveShared(!!v)}
                  />
                  <Label className="text-sm">Partager avec l&apos;equipe</Label>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSave} disabled={!saveName.trim()}>
                  Sauvegarder
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            disabled={!state.result}
            onClick={handleExportExcel}
          >
            <Download className="h-3.5 w-3.5" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            disabled={!state.result}
            onClick={handleExportPdf}
          >
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>

          {/* Executer */}
          <Button
            size="sm"
            className="h-8 text-xs gap-1"
            disabled={!isRunnable || isPending}
            onClick={handleRun}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Executer
          </Button>
        </div>
      </div>

      {/* Configuration */}
      <div className="flex flex-col lg:flex-row gap-4 min-w-0">
        {/* Colonne gauche : selecteurs */}
        <Card
          className={`lg:shrink-0 lg:grow-0 transition-all duration-300 ease-in-out overflow-hidden ${
            sidebarCollapsed
              ? "lg:basis-0 lg:w-0 lg:p-0 lg:border-0 opacity-0 pointer-events-none"
              : "lg:basis-100 opacity-100"
          }`}
        >
          <CardContent className="p-4 space-y-1 min-w-100">
            <OrgUnitSelector
              tree={orgUnitTree}
              value={state.config.orgUnits}
              onChange={(o) => dispatch({ type: "SET_ORG_UNITS", payload: o })}
            />

            <PeriodSelector
              value={state.config.period}
              onChange={(p) => dispatch({ type: "SET_PERIOD", payload: p })}
            />

            <IndicatorSelector
              groups={indicatorGroups}
              selected={state.config.indicators}
              onChange={(i) => dispatch({ type: "SET_INDICATORS", payload: i })}
            />

            <DimensionConfigurator
              dimensions={dimensions}
              rows={state.config.rows}
              columns={state.config.columns}
              onRowsChange={(r) => dispatch({ type: "SET_ROWS", payload: r })}
              onColumnsChange={(c) =>
                dispatch({ type: "SET_COLUMNS", payload: c })
              }
            />

            <FilterConfigurator
              dimensions={dimensions}
              filters={state.config.filters}
              usedDimIds={[...state.config.rows, ...state.config.columns]}
              onAdd={handleAddFilter}
              onRemove={handleRemoveFilter}
            />
          </CardContent>
        </Card>

        {/* Zone de visualisation */}
        <Card className="flex-1 min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setSidebarCollapsed((v) => !v)}
                  title={sidebarCollapsed ? "Afficher les selecteurs" : "Masquer les selecteurs"}
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
                <CardTitle className="text-sm">Resultats</CardTitle>
              </div>
              <ChartTypeSelector
                value={state.config.visualization.type}
                onChange={(t) =>
                  dispatch({
                    type: "SET_VISUALIZATION",
                    payload: { ...state.config.visualization, type: t },
                  })
                }
                suggestions={chartSuggestions}
              />
            </div>
          </CardHeader>
          <CardContent>
            {/* Loading */}
            {isPending && (
              <div className="flex items-center justify-center h-[400px] gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyse en cours...
              </div>
            )}

            {/* Erreur */}
            {state.error && (
              <div className="flex items-center justify-center h-[400px] text-sm text-destructive">
                {state.error}
              </div>
            )}

            {/* Resultat vide */}
            {!isPending && !state.error && !state.result && (
              <div className="flex flex-col items-center justify-center h-[400px] gap-2 text-sm text-muted-foreground">
                <Play className="h-8 w-8 opacity-30" />
                <p>
                  Selectionnez des indicateurs et cliquez sur
                  &quot;Executer&quot;.
                </p>
              </div>
            )}

            {/* Resultat */}
            {!isPending && !state.error && state.result && (
              <>
                {/* Metadata */}
                <div className="flex items-center gap-4 mb-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {state.result.metadata.executionTimeMs}ms
                  </span>
                  <span>{state.result.metadata.rowCount} lignes</span>
                </div>

                {state.config.visualization.type === "pivotTable" ? (
                  <PivotTableView
                    result={state.result}
                    showTotals={state.config.visualization.showTotals}
                    maxHeight={analyticsSettings.display.pivotTableMaxHeight}
                  />
                ) : (
                  <AnalyticsChart
                    result={state.result}
                    chartType={state.config.visualization.type}
                    colorPalette={analyticsSettings.charts.colorPalette}
                    chartHeight={analyticsSettings.charts.chartHeight}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog parametres (admin uniquement) */}
      {isAdmin && (
        <AnalyticsSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          currentSettings={analyticsSettings}
          onSave={() => router.refresh()}
        />
      )}
    </div>
  );
}
