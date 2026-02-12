"use client";

import { useState, useMemo, useCallback } from "react";
import { PeriodSelection, PeriodType } from "@/lib/analytics/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  ChevronUp,
  ChevronDown,
  Minus,
  Plus,
} from "lucide-react";

// ---------- Constantes ----------

const MONTH_NAMES = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];

type PeriodItem = { value: string; label: string };

function generatePeriodsForYear(
  periodType: PeriodType,
  year: number
): PeriodItem[] {
  switch (periodType) {
    case "month":
      return MONTH_NAMES.map((name, i) => ({
        value: `${year}-${String(i + 1).padStart(2, "0")}`,
        label: `${name} ${year}`,
      }));
    case "quarter":
      return [1, 2, 3, 4].map((q) => ({
        value: `${year}-T${q}`,
        label: `Trimestre ${q} ${year}`,
      }));
    case "semester":
      return [1, 2].map((s) => ({
        value: `${year}-S${s}`,
        label: `Semestre ${s} ${year}`,
      }));
    case "year":
      return [{ value: `${year}`, label: `${year}` }];
    case "week":
      return Array.from({ length: 52 }, (_, i) => ({
        value: `${year}-S${String(i + 1).padStart(2, "0")}`,
        label: `Semaine ${i + 1} ${year}`,
      }));
    case "day":
      // Generer tous les jours du mois courant de l'annee
      return MONTH_NAMES.map((name, m) => {
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, d) => ({
          value: `${year}-${String(m + 1).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}`,
          label: `${d + 1} ${name} ${year}`,
        }));
      }).flat();
    default:
      return [];
  }
}

// ---------- Props ----------

interface PeriodSelectorProps {
  value: PeriodSelection;
  onChange: (period: PeriodSelection) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const isFixed = value.type === "fixed";

  const periodLabel =
    value.type === "relative" && value.selectedKeys && value.selectedKeys.length > 0
      ? `${value.selectedKeys.length} selectionnee${value.selectedKeys.length > 1 ? "s" : ""}`
      : value.type === "fixed"
        ? "Fixe"
        : "Relative";

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-accent transition-colors text-sm font-medium"
        >
          <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          <span>Periode</span>
          <span className="ml-auto text-[10px] text-muted-foreground font-normal">
            {periodLabel}
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="flex flex-col gap-2 pl-6 pr-1 pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={value.type}
              onValueChange={(v) => {
                if (v === "fixed") {
                  onChange({
                    type: "fixed",
                    startDate: new Date(
                      new Date().getFullYear(),
                      new Date().getMonth(),
                      1
                    )
                      .toISOString()
                      .split("T")[0],
                    endDate: new Date().toISOString().split("T")[0],
                  });
                } else {
                  onChange({
                    type: "relative",
                    period: "month",
                    count: 3,
                    selectedKeys: [],
                  });
                }
              }}
            >
              <SelectTrigger className="w-35 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Periode fixe</SelectItem>
                <SelectItem value="relative">Periode relative</SelectItem>
              </SelectContent>
            </Select>

            {isFixed && value.type === "fixed" ? (
              <>
                <Input
                  type="date"
                  value={value.startDate}
                  onChange={(e) =>
                    onChange({ ...value, startDate: e.target.value })
                  }
                  className="w-35 h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground">au</span>
                <Input
                  type="date"
                  value={value.endDate}
                  onChange={(e) => onChange({ ...value, endDate: e.target.value })}
                  className="w-35 h-8 text-xs"
                />
              </>
            ) : value.type === "relative" ? (
              <Select
                value={value.period}
                onValueChange={(v) =>
                  onChange({
                    ...value,
                    period: v as PeriodType,
                    selectedKeys: [],
                  })
                }
              >
                <SelectTrigger className="w-30 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Jours</SelectItem>
                  <SelectItem value="week">Semaines</SelectItem>
                  <SelectItem value="month">Mois</SelectItem>
                  <SelectItem value="quarter">Trimestres</SelectItem>
                  <SelectItem value="semester">Semestres</SelectItem>
                  <SelectItem value="year">Annees</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
          </div>

          {/* Transfer de periodes pour le mode relatif */}
          {value.type === "relative" && (
            <PeriodTransfer
              periodType={value.period}
              selectedKeys={value.selectedKeys ?? []}
              onChange={(keys) => onChange({ ...value, selectedKeys: keys })}
            />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================
// Composant Transfer pour les periodes
// ============================================================

interface PeriodTransferProps {
  periodType: PeriodType;
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
}

function PeriodTransfer({
  periodType,
  selectedKeys,
  onChange,
}: PeriodTransferProps) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [leftChecked, setLeftChecked] = useState<Set<string>>(new Set());
  const [rightChecked, setRightChecked] = useState<Set<string>>(new Set());

  // Toutes les periodes de l'annee selectionnee
  const allPeriods = useMemo(
    () => generatePeriodsForYear(periodType, year),
    [periodType, year]
  );

  // Index pour le lookup label
  const periodMap = useMemo(
    () => new Map(allPeriods.map((p) => [p.value, p])),
    [allPeriods]
  );

  // Gauche : periodes non selectionnees pour l'annee choisie
  const leftItems = useMemo(() => {
    const selectedSet = new Set(selectedKeys);
    const lowerSearch = leftSearch.toLowerCase();
    return allPeriods.filter(
      (p) =>
        !selectedSet.has(p.value) &&
        p.label.toLowerCase().includes(lowerSearch)
    );
  }, [allPeriods, selectedKeys, leftSearch]);

  // Droite : toutes les periodes selectionnees (toutes annees confondues)
  const rightItems = useMemo(() => {
    const lowerSearch = rightSearch.toLowerCase();
    return selectedKeys
      .map((key) => {
        const found = periodMap.get(key);
        if (found) return found;
        // Cle d'une autre annee : generer le label
        return { value: key, label: formatPeriodKey(key, periodType) };
      })
      .filter((p) => p.label.toLowerCase().includes(lowerSearch));
  }, [selectedKeys, periodMap, rightSearch, periodType]);

  const leftTotal = useMemo(() => {
    const selectedSet = new Set(selectedKeys);
    return allPeriods.filter((p) => !selectedSet.has(p.value)).length;
  }, [allPeriods, selectedKeys]);

  // --- Transfert ---

  const moveRight = useCallback(() => {
    if (leftChecked.size === 0) return;
    onChange([...selectedKeys, ...leftChecked]);
    setLeftChecked(new Set());
  }, [leftChecked, selectedKeys, onChange]);

  const moveAllRight = useCallback(() => {
    const ids = leftItems.map((p) => p.value);
    onChange([...selectedKeys, ...ids]);
    setLeftChecked(new Set());
  }, [leftItems, selectedKeys, onChange]);

  const moveLeft = useCallback(() => {
    if (rightChecked.size === 0) return;
    onChange(selectedKeys.filter((k) => !rightChecked.has(k)));
    setRightChecked(new Set());
  }, [rightChecked, selectedKeys, onChange]);

  const moveAllLeft = useCallback(() => {
    const visibleIds = new Set(rightItems.map((p) => p.value));
    onChange(selectedKeys.filter((k) => !visibleIds.has(k)));
    setRightChecked(new Set());
  }, [rightItems, selectedKeys, onChange]);

  // --- Reordonnement ---

  const moveUp = useCallback(() => {
    if (rightChecked.size !== 1) return;
    const id = [...rightChecked][0];
    const idx = selectedKeys.indexOf(id);
    if (idx <= 0) return;
    const next = [...selectedKeys];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }, [rightChecked, selectedKeys, onChange]);

  const moveDown = useCallback(() => {
    if (rightChecked.size !== 1) return;
    const id = [...rightChecked][0];
    const idx = selectedKeys.indexOf(id);
    if (idx < 0 || idx >= selectedKeys.length - 1) return;
    const next = [...selectedKeys];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  }, [rightChecked, selectedKeys, onChange]);

  // --- Toggle ---

  const toggleLeft = useCallback((id: string) => {
    setLeftChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleRight = useCallback((id: string) => {
    setRightChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllLeft = useCallback(() => {
    const allIds = leftItems.map((p) => p.value);
    const allChecked = allIds.every((id) => leftChecked.has(id));
    setLeftChecked(allChecked ? new Set() : new Set(allIds));
  }, [leftItems, leftChecked]);

  const toggleAllRight = useCallback(() => {
    const allIds = rightItems.map((p) => p.value);
    const allChecked = allIds.every((id) => rightChecked.has(id));
    setRightChecked(allChecked ? new Set() : new Set(allIds));
  }, [rightItems, rightChecked]);

  const doubleClickRight = useCallback(
    (id: string) => {
      onChange([...selectedKeys, id]);
      setLeftChecked((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [selectedKeys, onChange]
  );

  const doubleClickLeft = useCallback(
    (id: string) => {
      onChange(selectedKeys.filter((k) => k !== id));
      setRightChecked((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [selectedKeys, onChange]
  );

  const leftAllChecked =
    leftTotal > 0 &&
    leftItems.every((p) => leftChecked.has(p.value));
  const rightAllChecked =
    rightItems.length > 0 &&
    rightItems.every((p) => rightChecked.has(p.value));

  return (
    <div className="flex flex-col gap-1.5">
      {/* Selecteur d'annee */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">Annee :</span>
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={() => setYear((y) => y - 1)}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Input
          type="number"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
          className="w-18 h-6 text-xs text-center"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={() => setYear((y) => y + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex gap-1 items-stretch">
        {/* ===== Panneau gauche : Disponibles ===== */}
        <div className="flex-1 min-w-0 border rounded-md flex flex-col">
          <div className="flex items-center gap-1 px-2 py-1 border-b bg-muted/30">
            <Checkbox
              checked={leftAllChecked}
              onCheckedChange={toggleAllLeft}
              className="h-3 w-3"
            />
            <span className="text-[10px] font-medium text-muted-foreground truncate">
              Disponibles ({leftTotal})
            </span>
          </div>

          <div className="relative px-1.5 py-1">
            <Search className="absolute left-3 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={leftSearch}
              onChange={(e) => setLeftSearch(e.target.value)}
              className="pl-6 h-6 text-[11px]"
            />
          </div>

          <div className="flex-1 max-h-48 overflow-y-auto px-1 pb-1">
            {leftItems.map((p) => (
              <div
                key={p.value}
                className="flex items-center gap-1.5 py-0.5 hover:bg-accent/50 rounded px-1 cursor-pointer"
                onClick={() => toggleLeft(p.value)}
                onDoubleClick={() => doubleClickRight(p.value)}
              >
                <Checkbox
                  checked={leftChecked.has(p.value)}
                  onCheckedChange={() => toggleLeft(p.value)}
                  className="h-3 w-3"
                />
                <span className="text-[11px] leading-tight truncate">
                  {p.label}
                </span>
              </div>
            ))}
            {leftItems.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic text-center py-3">
                Aucune periode disponible
              </p>
            )}
          </div>
        </div>

        {/* ===== Boutons ===== */}
        <div className="flex flex-col items-center justify-center gap-1 px-0.5">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={moveAllRight}
            disabled={leftTotal === 0}
            title="Tout ajouter"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={moveRight}
            disabled={leftChecked.size === 0}
            title="Ajouter"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={moveLeft}
            disabled={rightChecked.size === 0}
            title="Retirer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={moveAllLeft}
            disabled={selectedKeys.length === 0}
            title="Tout retirer"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="h-1" />
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={moveUp}
            disabled={rightChecked.size !== 1}
            title="Monter"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={moveDown}
            disabled={rightChecked.size !== 1}
            title="Descendre"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* ===== Panneau droit : Selectionnes ===== */}
        <div className="flex-1 min-w-0 border rounded-md flex flex-col">
          <div className="flex items-center gap-1 px-2 py-1 border-b bg-muted/30">
            <Checkbox
              checked={rightAllChecked}
              onCheckedChange={toggleAllRight}
              className="h-3 w-3"
            />
            <span className="text-[10px] font-medium text-muted-foreground truncate">
              Selectionnes ({selectedKeys.length})
            </span>
          </div>

          <div className="relative px-1.5 py-1">
            <Search className="absolute left-3 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={rightSearch}
              onChange={(e) => setRightSearch(e.target.value)}
              className="pl-6 h-6 text-[11px]"
            />
          </div>

          <div className="flex-1 max-h-48 overflow-y-auto px-1 pb-1">
            {rightItems.map((p) => (
              <div
                key={p.value}
                className="flex items-center gap-1.5 py-0.5 hover:bg-accent/50 rounded px-1 cursor-pointer"
                onClick={() => toggleRight(p.value)}
                onDoubleClick={() => doubleClickLeft(p.value)}
              >
                <Checkbox
                  checked={rightChecked.has(p.value)}
                  onCheckedChange={() => toggleRight(p.value)}
                  className="h-3 w-3"
                />
                <span className="text-[11px] leading-tight truncate">
                  {p.label}
                </span>
              </div>
            ))}
            {rightItems.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic text-center py-3">
                Aucune periode selectionnee
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Helper : formater une cle de periode en label lisible
// ============================================================

function formatPeriodKey(key: string, periodType: PeriodType): string {
  switch (periodType) {
    case "month": {
      const [year, month] = key.split("-");
      const m = parseInt(month) - 1;
      return m >= 0 && m < 12 ? `${MONTH_NAMES[m]} ${year}` : key;
    }
    case "quarter": {
      const [year, q] = key.split("-T");
      return `Trimestre ${q} ${year}`;
    }
    case "semester": {
      const [year, s] = key.split("-S");
      return `Semestre ${s} ${year}`;
    }
    case "year":
      return key;
    case "week": {
      const [year, w] = key.split("-S");
      return `Semaine ${parseInt(w)} ${year}`;
    }
    case "day":
      return key;
    default:
      return key;
  }
}
