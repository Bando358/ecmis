"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  AnalyticsSettingsConfig,
  ServiceTypeConfig,
  ServiceTypeProperty,
} from "@/lib/analytics/settings-types";
import { DEFAULT_ANALYTICS_SETTINGS } from "@/lib/analytics/settings-defaults";
import {
  updateAnalyticsSettings,
  resetAnalyticsSettings,
} from "@/lib/actions/analyticsSettingsActions";

interface AnalyticsSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSettings: AnalyticsSettingsConfig;
  onSave?: () => void;
}

// ============================================================
// Helpers pour cloner profondement
// ============================================================

function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================
// Composant principal
// ============================================================

export function AnalyticsSettingsDialog({
  open,
  onOpenChange,
  currentSettings,
  onSave,
}: AnalyticsSettingsDialogProps) {
  const [settings, setSettings] = useState<AnalyticsSettingsConfig>(() =>
    cloneDeep(currentSettings)
  );
  const [saving, setSaving] = useState(false);

  // Reset le formulaire quand on ouvre le dialog
  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (v) setSettings(cloneDeep(currentSettings));
      onOpenChange(v);
    },
    [currentSettings, onOpenChange]
  );

  // Sauvegarder
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateAnalyticsSettings(settings, "admin");
      toast.success("Parametres sauvegardes avec succes.");
      onOpenChange(false);
      onSave?.();
    } catch {
      toast.error("Erreur lors de la sauvegarde des parametres.");
    } finally {
      setSaving(false);
    }
  }, [settings, onOpenChange, onSave]);

  // Reinitialiser
  const handleReset = useCallback(async () => {
    setSaving(true);
    try {
      await resetAnalyticsSettings("admin");
      setSettings(cloneDeep(DEFAULT_ANALYTICS_SETTINGS));
      toast.success("Parametres reinitialises aux valeurs par defaut.");
      onSave?.();
    } catch {
      toast.error("Erreur lors de la reinitialisation.");
    } finally {
      setSaving(false);
    }
  }, [onSave]);

  // ============================================================
  // Updaters generiques
  // ============================================================

  const updateData = useCallback(
    (fn: (d: AnalyticsSettingsConfig["data"]) => void) => {
      setSettings((prev) => {
        const next = cloneDeep(prev);
        fn(next.data);
        return next;
      });
    },
    []
  );

  const updateCharts = useCallback(
    (fn: (c: AnalyticsSettingsConfig["charts"]) => void) => {
      setSettings((prev) => {
        const next = cloneDeep(prev);
        fn(next.charts);
        return next;
      });
    },
    []
  );

  const updateExport = useCallback(
    (fn: (e: AnalyticsSettingsConfig["export"]) => void) => {
      setSettings((prev) => {
        const next = cloneDeep(prev);
        fn(next.export);
        return next;
      });
    },
    []
  );

  const updateDisplay = useCallback(
    (fn: (d: AnalyticsSettingsConfig["display"]) => void) => {
      setSettings((prev) => {
        const next = cloneDeep(prev);
        fn(next.display);
        return next;
      });
    },
    []
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl! max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Parametres du module Analyser &amp; Visualiser</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="data" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="data" className="text-xs">Donnees</TabsTrigger>
            <TabsTrigger value="charts" className="text-xs">Graphiques</TabsTrigger>
            <TabsTrigger value="export" className="text-xs">Export</TabsTrigger>
            <TabsTrigger value="display" className="text-xs">Affichage</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 pr-1">
            {/* ============================================================ */}
            {/* ONGLET DONNEES */}
            {/* ============================================================ */}
            <TabsContent value="data" className="space-y-6 mt-0">
              {/* Tranches d'age */}
              <section>
                <h3 className="text-sm font-semibold mb-2">Tranches d&apos;age</h3>
                <div className="space-y-2">
                  {settings.data.ageRanges.map((range, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        className="h-8 text-xs w-28"
                        value={range.label}
                        onChange={(e) =>
                          updateData((d) => {
                            d.ageRanges[idx].label = e.target.value;
                          })
                        }
                        placeholder="Label"
                      />
                      <Input
                        className="h-8 text-xs w-16"
                        type="number"
                        value={range.min}
                        onChange={(e) =>
                          updateData((d) => {
                            d.ageRanges[idx].min = parseInt(e.target.value) || 0;
                          })
                        }
                        placeholder="Min"
                      />
                      <span className="text-xs text-muted-foreground">-</span>
                      <Input
                        className="h-8 text-xs w-16"
                        type="number"
                        value={range.max ?? ""}
                        onChange={(e) =>
                          updateData((d) => {
                            d.ageRanges[idx].max =
                              e.target.value === "" ? null : parseInt(e.target.value);
                          })
                        }
                        placeholder="Max (vide=infini)"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() =>
                          updateData((d) => {
                            d.ageRanges.splice(idx, 1);
                          })
                        }
                        disabled={settings.data.ageRanges.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() =>
                      updateData((d) => {
                        const last = d.ageRanges[d.ageRanges.length - 1];
                        d.ageRanges.push({
                          label: "",
                          min: (last?.max ?? 0) + 1,
                          max: null,
                        });
                      })
                    }
                  >
                    <Plus className="h-3 w-3" /> Ajouter
                  </Button>
                </div>
              </section>

              {/* Types de service (editeur avance) */}
              <ServiceTypeEditor
                serviceTypes={settings.data.serviceTypes}
                onChange={(items) => updateData((d) => { d.serviceTypes = items; })}
              />
              <EditableList
                title="Types de contraception"
                items={settings.data.contraceptionTypes}
                onChange={(items) => updateData((d) => { d.contraceptionTypes = items; })}
              />
              <EditableList
                title="Statuts client"
                items={settings.data.clientStatuses}
                onChange={(items) => updateData((d) => { d.clientStatuses = items; })}
              />
              <EditableList
                title="Valeurs genre"
                items={settings.data.genderValues}
                onChange={(items) => updateData((d) => { d.genderValues = items; })}
              />

              {/* Formatage */}
              <section>
                <h3 className="text-sm font-semibold mb-2">Formatage</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Unite monetaire</Label>
                    <Input
                      className="h-8 text-xs"
                      value={settings.data.formatting.currencyUnit}
                      onChange={(e) =>
                        updateData((d) => { d.formatting.currencyUnit = e.target.value; })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Locale</Label>
                    <Input
                      className="h-8 text-xs"
                      value={settings.data.formatting.locale}
                      onChange={(e) =>
                        updateData((d) => { d.formatting.locale = e.target.value; })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Decimales pourcentage</Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      value={settings.data.formatting.percentageDecimals}
                      onChange={(e) =>
                        updateData((d) => {
                          d.formatting.percentageDecimals = parseInt(e.target.value) || 0;
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Fractions max decimales</Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      value={settings.data.formatting.decimalMaxFractionDigits}
                      onChange={(e) =>
                        updateData((d) => {
                          d.formatting.decimalMaxFractionDigits = parseInt(e.target.value) || 0;
                        })
                      }
                    />
                  </div>
                </div>
              </section>
            </TabsContent>

            {/* ============================================================ */}
            {/* ONGLET GRAPHIQUES */}
            {/* ============================================================ */}
            <TabsContent value="charts" className="space-y-6 mt-0">
              {/* Palette de couleurs */}
              <section>
                <h3 className="text-sm font-semibold mb-2">Palette de couleurs</h3>
                <div className="grid grid-cols-5 gap-2">
                  {settings.charts.colorPalette.map((color, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) =>
                          updateCharts((c) => {
                            c.colorPalette[idx] = e.target.value;
                          })
                        }
                        className="h-7 w-7 rounded border cursor-pointer"
                      />
                      <Input
                        className="h-7 text-[10px] w-20 font-mono"
                        value={color}
                        onChange={(e) =>
                          updateCharts((c) => {
                            c.colorPalette[idx] = e.target.value;
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() =>
                      updateCharts((c) => { c.colorPalette.push("#000000"); })
                    }
                  >
                    <Plus className="h-3 w-3" /> Ajouter
                  </Button>
                  {settings.charts.colorPalette.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 text-destructive"
                      onClick={() =>
                        updateCharts((c) => { c.colorPalette.pop(); })
                      }
                    >
                      <Trash2 className="h-3 w-3" /> Supprimer derniere
                    </Button>
                  )}
                </div>
              </section>

              {/* Options graphiques */}
              <section>
                <h3 className="text-sm font-semibold mb-2">Options graphiques</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Type de graphique par defaut</Label>
                    <Select
                      value={settings.charts.defaultChartType}
                      onValueChange={(v) =>
                        updateCharts((c) => { c.defaultChartType = v; })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pivotTable">Tableau croise</SelectItem>
                        <SelectItem value="bar">Barres</SelectItem>
                        <SelectItem value="stackedBar">Barres empilees</SelectItem>
                        <SelectItem value="line">Lignes</SelectItem>
                        <SelectItem value="area">Aire</SelectItem>
                        <SelectItem value="pie">Camembert</SelectItem>
                        <SelectItem value="doughnut">Anneau</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Hauteur graphique</Label>
                    <Input
                      className="h-8 text-xs"
                      value={settings.charts.chartHeight}
                      onChange={(e) =>
                        updateCharts((c) => { c.chartHeight = e.target.value; })
                      }
                      placeholder="400px"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.charts.showTotalsDefault}
                      onCheckedChange={(v) =>
                        updateCharts((c) => { c.showTotalsDefault = v; })
                      }
                    />
                    <Label className="text-xs">Afficher totaux par defaut</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.charts.showPercentagesDefault}
                      onCheckedChange={(v) =>
                        updateCharts((c) => { c.showPercentagesDefault = v; })
                      }
                    />
                    <Label className="text-xs">Afficher pourcentages par defaut</Label>
                  </div>
                </div>
              </section>

              {/* Periode */}
              <section>
                <h3 className="text-sm font-semibold mb-2">Periode par defaut</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Type de periode</Label>
                    <Select
                      value={settings.charts.period.defaultType}
                      onValueChange={(v: "fixed" | "relative") =>
                        updateCharts((c) => { c.period.defaultType = v; })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixe</SelectItem>
                        <SelectItem value="relative">Relative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Granularite par defaut</Label>
                    <Select
                      value={settings.charts.period.defaultGranularity}
                      onValueChange={(v) =>
                        updateCharts((c) => { c.period.defaultGranularity = v; })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Jour</SelectItem>
                        <SelectItem value="week">Semaine</SelectItem>
                        <SelectItem value="month">Mois</SelectItem>
                        <SelectItem value="quarter">Trimestre</SelectItem>
                        <SelectItem value="year">Annee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Nombre periodes relatives par defaut</Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      value={settings.charts.period.defaultRelativeCount}
                      onChange={(e) =>
                        updateCharts((c) => {
                          c.period.defaultRelativeCount = parseInt(e.target.value) || 1;
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max periodes relatives</Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      value={settings.charts.period.maxRelativeCount}
                      onChange={(e) =>
                        updateCharts((c) => {
                          c.period.maxRelativeCount = parseInt(e.target.value) || 1;
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Valeurs dimension periode</Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      value={settings.charts.period.periodDimensionValuesCount}
                      onChange={(e) =>
                        updateCharts((c) => {
                          c.period.periodDimensionValuesCount = parseInt(e.target.value) || 1;
                        })
                      }
                    />
                  </div>
                </div>
              </section>
            </TabsContent>

            {/* ============================================================ */}
            {/* ONGLET EXPORT */}
            {/* ============================================================ */}
            <TabsContent value="export" className="space-y-6 mt-0">
              {/* Excel */}
              <section>
                <h3 className="text-sm font-semibold mb-2">Excel</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Taille police titre</Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      value={settings.export.excel.titleFontSize}
                      onChange={(e) =>
                        updateExport((ex) => {
                          ex.excel.titleFontSize = parseInt(e.target.value) || 14;
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Format nombres</Label>
                    <Input
                      className="h-8 text-xs font-mono"
                      value={settings.export.excel.numberFormat}
                      onChange={(e) =>
                        updateExport((ex) => { ex.excel.numberFormat = e.target.value; })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Couleur fond en-tete (ARGB)</Label>
                    <Input
                      className="h-8 text-xs font-mono"
                      value={settings.export.excel.headerBackgroundColor}
                      onChange={(e) =>
                        updateExport((ex) => { ex.excel.headerBackgroundColor = e.target.value; })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Couleur bordure en-tete (ARGB)</Label>
                    <Input
                      className="h-8 text-xs font-mono"
                      value={settings.export.excel.headerBorderColor}
                      onChange={(e) =>
                        updateExport((ex) => { ex.excel.headerBorderColor = e.target.value; })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Couleur fond total (ARGB)</Label>
                    <Input
                      className="h-8 text-xs font-mono"
                      value={settings.export.excel.totalRowBackground}
                      onChange={(e) =>
                        updateExport((ex) => { ex.excel.totalRowBackground = e.target.value; })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Largeur colonnes par defaut</Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      value={settings.export.excel.defaultColumnWidth}
                      onChange={(e) =>
                        updateExport((ex) => {
                          ex.excel.defaultColumnWidth = parseInt(e.target.value) || 16;
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Largeur 1ere colonne</Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      value={settings.export.excel.firstColumnWidth}
                      onChange={(e) =>
                        updateExport((ex) => {
                          ex.excel.firstColumnWidth = parseInt(e.target.value) || 24;
                        })
                      }
                    />
                  </div>
                </div>
              </section>

              {/* PDF */}
              <section>
                <h3 className="text-sm font-semibold mb-2">PDF</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Orientation page</Label>
                    <Select
                      value={settings.export.pdf.pageOrientation}
                      onValueChange={(v: "landscape" | "portrait") =>
                        updateExport((ex) => { ex.pdf.pageOrientation = v; })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="landscape">Paysage</SelectItem>
                        <SelectItem value="portrait">Portrait</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Format page</Label>
                    <Select
                      value={settings.export.pdf.pageFormat}
                      onValueChange={(v) =>
                        updateExport((ex) => { ex.pdf.pageFormat = v; })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a4">A4</SelectItem>
                        <SelectItem value="a3">A3</SelectItem>
                        <SelectItem value="letter">Letter</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Taille police titre</Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      value={settings.export.pdf.titleFontSize}
                      onChange={(e) =>
                        updateExport((ex) => {
                          ex.pdf.titleFontSize = parseInt(e.target.value) || 14;
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Taille police tableau</Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      value={settings.export.pdf.tableFontSize}
                      onChange={(e) =>
                        updateExport((ex) => {
                          ex.pdf.tableFontSize = parseInt(e.target.value) || 8;
                        })
                      }
                    />
                  </div>
                  <RgbInput
                    label="Couleur fond en-tete"
                    value={settings.export.pdf.headerFillColor}
                    onChange={(v) =>
                      updateExport((ex) => { ex.pdf.headerFillColor = v; })
                    }
                  />
                  <RgbInput
                    label="Couleur texte en-tete"
                    value={settings.export.pdf.headerTextColor}
                    onChange={(v) =>
                      updateExport((ex) => { ex.pdf.headerTextColor = v; })
                    }
                  />
                  <RgbInput
                    label="Couleur lignes alternees"
                    value={settings.export.pdf.alternateRowColor}
                    onChange={(v) =>
                      updateExport((ex) => { ex.pdf.alternateRowColor = v; })
                    }
                  />
                </div>
              </section>
            </TabsContent>

            {/* ============================================================ */}
            {/* ONGLET AFFICHAGE */}
            {/* ============================================================ */}
            <TabsContent value="display" className="space-y-6 mt-0">
              <section>
                <h3 className="text-sm font-semibold mb-2">Dimensions d&apos;affichage</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Hauteur max tableau croise</Label>
                    <Input
                      className="h-8 text-xs"
                      value={settings.display.pivotTableMaxHeight}
                      onChange={(e) =>
                        updateDisplay((d) => { d.pivotTableMaxHeight = e.target.value; })
                      }
                      placeholder="600px"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Hauteur max selecteur indicateurs</Label>
                    <Input
                      className="h-8 text-xs"
                      value={settings.display.indicatorSelectorMaxHeight}
                      onChange={(e) =>
                        updateDisplay((d) => { d.indicatorSelectorMaxHeight = e.target.value; })
                      }
                      placeholder="250px"
                    />
                  </div>
                </div>
              </section>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex items-center justify-between gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs text-destructive hover:text-destructive"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reinitialiser
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button size="sm" className="text-xs gap-1" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Sous-composant : liste editable de {value, label}
// ============================================================

function EditableList({
  title,
  items,
  onChange,
}: {
  title: string;
  items: { value: string; label: string }[];
  onChange: (items: { value: string; label: string }[]) => void;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              className="h-8 text-xs w-28 font-mono"
              value={item.value}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], value: e.target.value };
                onChange(next);
              }}
              placeholder="Valeur"
            />
            <Input
              className="h-8 text-xs flex-1"
              value={item.label}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], label: e.target.value };
                onChange(next);
              }}
              placeholder="Libelle"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive"
              onClick={() => {
                const next = items.filter((_, i) => i !== idx);
                onChange(next);
              }}
              disabled={items.length <= 1}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => onChange([...items, { value: "", label: "" }])}
        >
          <Plus className="h-3 w-3" /> Ajouter
        </Button>
      </div>
    </section>
  );
}

// ============================================================
// Proprietes disponibles par type de service
// ============================================================

const AVAILABLE_PROPERTIES: Record<string, { key: string; label: string }[]> = {
  planning: [
    { key: "consultation", label: "Consultation" },
    { key: "counsellingPf", label: "Counselling PF" },
    { key: "methodePrise", label: "Methode prise" },
    { key: "typeContraception", label: "Type de contraception" },
    { key: "statut", label: "Statut" },
    { key: "motifVisite", label: "Motif de visite" },
    // Courte duree - options individuelles
    { key: "courtDuree_noristera", label: "Injectable 2 mois (Noristera)" },
    { key: "courtDuree_injectable", label: "Injectable 3 mois" },
    { key: "courtDuree_pilule", label: "Pilule" },
    { key: "courtDuree_spotting", label: "Spotting pilule" },
    { key: "courtDuree_preservatif", label: "Preservatif" },
    { key: "courtDuree_spermicide", label: "Spermicide" },
    { key: "courtDuree_urgence", label: "Methode d'urgence" },
    // Implanon - insertion/controle
    { key: "implanon_insertion", label: "Implanon - Insertion" },
    { key: "implanon_controle", label: "Implanon - Controle" },
    // Jadelle - insertion/controle
    { key: "jadelle_insertion", label: "Jadelle - Insertion" },
    { key: "jadelle_controle", label: "Jadelle - Controle" },
    // Sterilet - insertion/controle
    { key: "sterilet_insertion", label: "Sterilet - Insertion" },
    { key: "sterilet_controle", label: "Sterilet - Controle" },
    { key: "retraitImplanon", label: "Retrait Implanon" },
    { key: "retraitJadelle", label: "Retrait Jadelle" },
    { key: "retraitSterilet", label: "Retrait Sterilet" },
    { key: "raisonRetrait", label: "Raison retrait" },
    { key: "raisonEffetSecondaire", label: "Raison effet secondaire" },
    { key: "rdvPf", label: "RDV PF" },
  ],
  gynecologie: [
    { key: "consultation", label: "Consultation" },
    { key: "motifConsultation", label: "Motif consultation" },
    { key: "counsellingAvantDepitage", label: "Counselling avant depistage" },
    { key: "counsellingApresDepitage", label: "Counselling apres depistage" },
    { key: "resultatIva", label: "Resultat IVA" },
    { key: "eligibleTraitementIva", label: "Eligible traitement IVA" },
    { key: "typeTraitement", label: "Type traitement" },
    { key: "counselingCancerSein", label: "Counseling cancer du sein" },
    { key: "resultatCancerSein", label: "Resultat cancer du sein" },
    { key: "counselingAutreProbleme", label: "Counseling autre probleme" },
    { key: "examenPhysique", label: "Examen physique" },
    { key: "examenPalpation", label: "Examen palpation" },
    { key: "toucheeVaginale", label: "Touchee vaginale" },
    { key: "reglesIrreguliere", label: "Regles irregulieres" },
    { key: "regularisationMenstruelle", label: "Regularisation menstruelle" },
    { key: "autreProblemeGyneco", label: "Autre probleme gyneco" },
  ],
  obstetrique: [
    { key: "obstConsultation", label: "Consultation prenatale" },
    { key: "obstCounselling", label: "Counselling" },
    { key: "obstTypeVisite", label: "Type visite" },
    { key: "obstVat", label: "VAT" },
    { key: "obstSp", label: "SP" },
    { key: "obstFer", label: "Fer" },
    { key: "obstFolate", label: "Folate" },
    { key: "obstDeparasitant", label: "Deparasitant" },
    { key: "obstMilda", label: "MILDA" },
    { key: "obstInvestigations", label: "Investigations" },
    { key: "obstEtatNutritionnel", label: "Etat nutritionnel" },
    { key: "obstEtatGrossesse", label: "Etat grossesse" },
    { key: "obstPfppi", label: "PFPPI" },
    { key: "obstAlbuminieSucre", label: "Albuminie/Sucre" },
    { key: "obstAnemie", label: "Anemie" },
    { key: "obstSyphilis", label: "Syphilis" },
    { key: "obstAghbs", label: "AgHBs" },
    { key: "obstRdv", label: "RDV" },
  ],
  accouchement: [
    { key: "accouchementConsultation", label: "Consultation" },
    { key: "accouchementLieu", label: "Lieu" },
    { key: "accouchementStatutVat", label: "Statut VAT" },
    { key: "accouchementComplications", label: "Complications" },
    { key: "accouchementEvacuationMere", label: "Evacuation mere" },
    { key: "accouchementTypeEvacuation", label: "Type evacuation" },
    { key: "accouchementEvacuationEnfant", label: "Evacuation enfant" },
    { key: "accouchementMultiple", label: "Accouchement multiple" },
    { key: "accouchementEtatNaissance", label: "Etat naissance" },
    { key: "accouchementEnfantVivant", label: "Enfant ne vivant" },
    { key: "accouchementEnfantMortNeFrais", label: "Mort-ne frais" },
    { key: "accouchementEnfantMortNeMacere", label: "Mort-ne macere" },
    { key: "accouchementNbPoidsEfantVivant", label: "Nb poids enfant vivant" },
  ],
  ist: [
    { key: "istTypeClient", label: "Type client" },
    { key: "istType", label: "Type IST" },
    { key: "istCounsellingAvantDepitage", label: "Counselling avant depistage" },
    { key: "istExamenPhysique", label: "Examen physique" },
    { key: "istCounsellingApresDepitage", label: "Counselling apres depistage" },
    { key: "istCounselingReductionRisque", label: "Counseling reduction risque" },
    { key: "istTypePec", label: "Type PEC" },
    { key: "istPecEtiologique", label: "PEC etiologique" },
  ],
  depistageVih: [
    { key: "depistageVihConsultation", label: "Consultation" },
    { key: "depistageVihTypeClient", label: "Type client" },
    { key: "depistageVihCounsellingPreTest", label: "Counselling pre-test" },
    { key: "depistageVihInvestigationTestRapide", label: "Test rapide" },
    { key: "depistageVihResultat", label: "Resultat" },
    { key: "depistageVihCounsellingPostTest", label: "Counselling post-test" },
    { key: "depistageVihCounsellingReductionRisque", label: "Counselling reduction risque" },
    { key: "depistageVihCounsellingSoutienPsychoSocial", label: "Soutien psycho-social" },
    { key: "depistageVihResultatPositifMisSousArv", label: "Positif mis sous ARV" },
  ],
  pecVih: [
    { key: "pecVihCounselling", label: "Counselling" },
    { key: "pecVihTypeclient", label: "Type client" },
    { key: "pecVihMoleculeArv", label: "Molecule ARV" },
    { key: "pecVihAesArv", label: "AES ARV" },
    { key: "pecVihCotrimo", label: "Cotrimoxazole" },
    { key: "pecVihSpdp", label: "SPDP" },
    { key: "pecVihIoPaludisme", label: "IO Paludisme" },
    { key: "pecVihIoTuberculose", label: "IO Tuberculose" },
    { key: "pecVihIoAutre", label: "IO Autre" },
    { key: "pecVihSoutienPsychoSocial", label: "Soutien psycho-social" },
    { key: "pecDateRdvSuivi", label: "Date RDV suivi" },
  ],
  medecine: [
    { key: "mdgConsultation", label: "Consultation" },
    { key: "mdgCounselling", label: "Counselling" },
    { key: "mdgTestRapidePalu", label: "Test rapide palu" },
    { key: "mdgEtatFemme", label: "Etat femme" },
    { key: "mdgMotifConsultation", label: "Motif consultation" },
    { key: "mdgTypeVisite", label: "Type visite" },
    { key: "mdgExamenPhysique", label: "Examen physique" },
    { key: "mdgSuspicionPalu", label: "Suspicion paludisme" },
    { key: "mdgDiagnostic", label: "Diagnostic" },
    { key: "mdgAutreDiagnostic", label: "Autre diagnostic" },
    { key: "mdgSoins", label: "Soins" },
    { key: "mdgPecAffection", label: "PEC affection" },
    { key: "mdgTypeAffection", label: "Type affection" },
    { key: "mdgTraitement", label: "Traitement" },
    { key: "mdgMiseEnObservation", label: "Mise en observation" },
    { key: "mdgDureeObservation", label: "Duree observation" },
  ],
  vbg: [
    { key: "vbgConsultation", label: "Consultation" },
    { key: "vbgType", label: "Type VBG" },
    { key: "vbgDuree", label: "Duree" },
    { key: "vbgCounsellingRelation", label: "Counselling relation" },
    { key: "vbgCounsellingViolenceSexuel", label: "Counselling violence sexuelle" },
    { key: "vbgCounsellingViolencePhysique", label: "Counselling violence physique" },
    { key: "vbgCounsellingSexuelite", label: "Counselling sexualite" },
    { key: "vbgPreventionViolenceSexuelle", label: "Prevention violence sexuelle" },
    { key: "vbgPreventionViolencePhysique", label: "Prevention violence physique" },
  ],
  infertilite: [
    { key: "infertConsultation", label: "Consultation" },
    { key: "infertCounselling", label: "Counselling" },
    { key: "infertExamenPhysique", label: "Examen physique" },
    { key: "infertTraitement", label: "Traitement" },
  ],
  saa: [
    { key: "saaConsultation", label: "Consultation" },
    { key: "saaTypeAvortement", label: "Type avortement" },
    { key: "saaMethodeAvortement", label: "Methode avortement" },
    { key: "saaSuiviPostAvortement", label: "Suivi post-avortement" },
    { key: "saaSuiviAutoRefere", label: "Suivi auto-refere" },
    { key: "saaCounsellingPre", label: "Counselling pre" },
    { key: "saaMotifDemande", label: "Motif demande" },
    { key: "saaConsultationPost", label: "Consultation post" },
    { key: "saaCounsellingPost", label: "Counselling post" },
    { key: "saaTypePec", label: "Type PEC" },
    { key: "saaTraitementComplication", label: "Traitement complication" },
  ],
  cpon: [
    { key: "cponConsultation", label: "Consultation" },
    { key: "cponCounselling", label: "Counselling" },
    { key: "cponInvestigationPhysique", label: "Investigation physique" },
    { key: "cponDuree", label: "Duree" },
  ],
};

// Proprietes communes a tous les services
const COMMON_PROPERTIES: { key: string; label: string }[] = [
  { key: "sexe", label: "Sexe" },
  { key: "ageRange", label: "Tranche d'age" },
  { key: "statusClient", label: "Statut client" },
  { key: "prescripteur", label: "Prescripteur" },
  { key: "clinique", label: "Clinique" },
  { key: "region", label: "Region" },
  { key: "district", label: "District" },
];

function getAvailablePropertiesForService(serviceValue: string): { key: string; label: string }[] {
  const specific = AVAILABLE_PROPERTIES[serviceValue] ?? [];
  return [...specific, ...COMMON_PROPERTIES];
}

// ============================================================
// Sous-composant : editeur avance de types de service
// ============================================================

function ServiceTypeEditor({
  serviceTypes,
  onChange,
}: {
  serviceTypes: ServiceTypeConfig[];
  onChange: (items: ServiceTypeConfig[]) => void;
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Normaliser les entrees pour garantir enabled + properties
  const normalized = serviceTypes.map((st) => ({
    ...st,
    enabled: st.enabled ?? true,
    properties: st.properties ?? [],
  }));

  return (
    <section>
      <h3 className="text-sm font-semibold mb-2">Types de service</h3>
      <div className="space-y-1">
        {normalized.map((st, idx) => {
          const usedKeys = new Set(st.properties.map((p) => p.key));
          const available = getAvailablePropertiesForService(st.value).filter(
            (p) => !usedKeys.has(p.key)
          );

          return (
            <div key={idx} className="border rounded-md">
              {/* Ligne principale du service */}
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Switch
                  checked={st.enabled}
                  onCheckedChange={(v) => {
                    const next = [...normalized];
                    next[idx] = { ...next[idx], enabled: v };
                    onChange(next);
                  }}
                />
                <button
                  type="button"
                  className="flex items-center gap-1 flex-1 text-left"
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                >
                  {expandedIdx === idx ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium">{st.label || st.value}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    ({st.properties.length} propriete{st.properties.length > 1 ? "s" : ""})
                  </span>
                </button>
                <Input
                  className="h-7 text-xs w-20 font-mono"
                  value={st.value}
                  onChange={(e) => {
                    const next = [...normalized];
                    next[idx] = { ...next[idx], value: e.target.value };
                    onChange(next);
                  }}
                  placeholder="Cle"
                />
                <Input
                  className="h-7 text-xs w-40"
                  value={st.label}
                  onChange={(e) => {
                    const next = [...normalized];
                    next[idx] = { ...next[idx], label: e.target.value };
                    onChange(next);
                  }}
                  placeholder="Libelle"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => onChange(normalized.filter((_, i) => i !== idx))}
                  disabled={normalized.length <= 1}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {/* Proprietes du service (expandable) */}
              {expandedIdx === idx && (
                <div className="px-4 pb-3 pt-1 border-t bg-muted/20">
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Proprietes du service &laquo; {st.label} &raquo; :
                  </p>
                  <div className="space-y-1.5">
                    {/* Ligne Total (visible quand au moins 1 prop est includedInTotal) */}
                    {st.properties.some((p) => p.includedInTotal === true) && (
                      <div className="flex items-center gap-2 bg-primary/5 border border-primary/30 rounded-md px-2 py-1">
                        <span className="h-7 text-xs w-36 font-mono flex items-center px-2 bg-primary/10 border border-primary/20 rounded-md truncate font-semibold text-primary">
                          TOTAL
                        </span>
                        <Input
                          className="h-7 text-xs flex-1"
                          value={st.totalLabel ?? `Total ${st.label}`}
                          onChange={(e) => {
                            const next = [...normalized];
                            next[idx] = { ...next[idx], totalLabel: e.target.value };
                            onChange(next);
                          }}
                          placeholder={`Total ${st.label}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          title="Retirer l'indicateur Total"
                          onClick={() => {
                            const next = [...normalized];
                            next[idx] = {
                              ...next[idx],
                              totalLabel: undefined,
                              properties: next[idx].properties.map((p) => ({
                                ...p,
                                includedInTotal: false,
                              })),
                            };
                            onChange(next);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {st.properties.map((prop, propIdx) => (
                      <div key={propIdx} className="flex items-center gap-2">
                        <span className="h-7 text-xs w-36 font-mono flex items-center px-2 bg-muted/50 border rounded-md truncate">
                          {prop.key}
                        </span>
                        <Input
                          className="h-7 text-xs flex-1"
                          value={prop.label}
                          onChange={(e) => {
                            const next = [...normalized];
                            const props = [...next[idx].properties];
                            props[propIdx] = { ...props[propIdx], label: e.target.value };
                            next[idx] = { ...next[idx], properties: props };
                            onChange(next);
                          }}
                          placeholder="Libelle propriete"
                        />
                        {/* Switch visible uniquement quand le Total est actif */}
                        {st.properties.some((p) => p.includedInTotal === true) && (
                          <label className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap cursor-pointer" title="Inclure dans l'indicateur Total">
                            <Switch
                              checked={prop.includedInTotal === true}
                              onCheckedChange={(v) => {
                                const next = [...normalized];
                                const props = [...next[idx].properties];
                                props[propIdx] = { ...props[propIdx], includedInTotal: v };
                                next[idx] = { ...next[idx], properties: props };
                                onChange(next);
                              }}
                              className="scale-75"
                            />
                            Total
                          </label>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => {
                            const next = [...normalized];
                            const props = next[idx].properties.filter((_, i) => i !== propIdx);
                            next[idx] = { ...next[idx], properties: props };
                            onChange(next);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    {/* Proprietes disponibles a ajouter */}
                    <div className="mt-2">
                      <p className="text-[10px] text-muted-foreground mb-1.5">
                        Ajouter une propriete :
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {/* Bouton + Total : visible uniquement quand le Total n'est pas actif */}
                        {!st.properties.some((p) => p.includedInTotal === true) && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-md border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer font-semibold text-primary"
                            onClick={() => {
                              const next = [...normalized];
                              next[idx] = {
                                ...next[idx],
                                totalLabel: next[idx].totalLabel || `Total ${next[idx].label}`,
                                properties: next[idx].properties.map((p) => ({
                                  ...p,
                                  includedInTotal: true,
                                })),
                              };
                              onChange(next);
                            }}
                          >
                            <Plus className="h-2.5 w-2.5" />
                            <span>{st.totalLabel || `Total ${st.label}`}</span>
                          </button>
                        )}
                        {available.map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-md border border-dashed border-muted-foreground/40 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                            onClick={() => {
                              const next = [...normalized];
                              next[idx] = {
                                ...next[idx],
                                properties: [
                                  ...next[idx].properties,
                                  { key: p.key, label: p.label, includedInTotal: false },
                                ],
                              };
                              onChange(next);
                            }}
                          >
                            <Plus className="h-2.5 w-2.5" />
                            <span>{p.label}</span>
                            <span className="text-muted-foreground">({p.key})</span>
                          </button>
                        ))}
                      </div>
                      {available.length === 0 && st.properties.length > 0 && !st.properties.some((p) => p.includedInTotal === true) && (
                        <p className="text-[10px] text-muted-foreground italic mt-1.5">
                          Toutes les proprietes disponibles sont deja ajoutees.
                        </p>
                      )}
                    </div>
                </div>
                </div>
              )}
            </div>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 mt-2"
          onClick={() =>
            onChange([
              ...normalized,
              { value: "", label: "", enabled: true, properties: [] },
            ])
          }
        >
          <Plus className="h-3 w-3" /> Ajouter un type de service
        </Button>
      </div>
    </section>
  );
}

// ============================================================
// Sous-composant : input RGB [r, g, b]
// ============================================================

function RgbInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: [number, number, number];
  onChange: (v: [number, number, number]) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          className="h-8 text-xs w-14"
          type="number"
          min={0}
          max={255}
          value={value[0]}
          onChange={(e) => onChange([parseInt(e.target.value) || 0, value[1], value[2]])}
          placeholder="R"
        />
        <Input
          className="h-8 text-xs w-14"
          type="number"
          min={0}
          max={255}
          value={value[1]}
          onChange={(e) => onChange([value[0], parseInt(e.target.value) || 0, value[2]])}
          placeholder="G"
        />
        <Input
          className="h-8 text-xs w-14"
          type="number"
          min={0}
          max={255}
          value={value[2]}
          onChange={(e) => onChange([value[0], value[1], parseInt(e.target.value) || 0])}
          placeholder="B"
        />
        <div
          className="h-7 w-7 rounded border flex-shrink-0"
          style={{ backgroundColor: `rgb(${value[0]},${value[1]},${value[2]})` }}
        />
      </div>
    </div>
  );
}
