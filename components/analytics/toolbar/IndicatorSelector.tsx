"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from "lucide-react";

type Indicator = {
  id: string;
  name: string;
  shortName: string;
  description: string;
};

type IndicatorGroup = {
  category: string;
  categoryLabel: string;
  indicators: Indicator[];
};

interface IndicatorSelectorProps {
  groups: IndicatorGroup[];
  selected: string[];
  onChange: (indicators: string[]) => void;
}

export function IndicatorSelector({
  groups,
  selected,
  onChange,
}: IndicatorSelectorProps) {
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [leftChecked, setLeftChecked] = useState<Set<string>>(new Set());
  const [rightChecked, setRightChecked] = useState<Set<string>>(new Set());

  // Index plat de tous les indicateurs
  const allIndicators = useMemo(
    () => new Map(groups.flatMap((g) => g.indicators).map((i) => [i.id, i])),
    [groups]
  );

  // Panneau gauche : indicateurs disponibles (non selectionnes), groupes par categorie
  const leftGroups = useMemo(() => {
    const selectedSet = new Set(selected);
    const lowerSearch = leftSearch.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        indicators: g.indicators.filter(
          (i) =>
            !selectedSet.has(i.id) &&
            (i.name.toLowerCase().includes(lowerSearch) ||
              i.shortName.toLowerCase().includes(lowerSearch))
        ),
      }))
      .filter((g) => g.indicators.length > 0);
  }, [groups, selected, leftSearch]);

  // Panneau droit : indicateurs selectionnes, dans l'ordre de selection
  const rightItems = useMemo(() => {
    const lowerSearch = rightSearch.toLowerCase();
    return selected
      .map((id) => allIndicators.get(id))
      .filter(
        (i): i is Indicator =>
          !!i &&
          (i.name.toLowerCase().includes(lowerSearch) ||
            i.shortName.toLowerCase().includes(lowerSearch))
      );
  }, [selected, allIndicators, rightSearch]);

  // Compteurs
  const leftTotal = useMemo(() => {
    const selectedSet = new Set(selected);
    return groups
      .flatMap((g) => g.indicators)
      .filter((i) => !selectedSet.has(i.id)).length;
  }, [groups, selected]);

  // --- Actions de transfert ---

  const moveRight = useCallback(() => {
    if (leftChecked.size === 0) return;
    onChange([...selected, ...leftChecked]);
    setLeftChecked(new Set());
  }, [leftChecked, selected, onChange]);

  const moveAllRight = useCallback(() => {
    const allAvailable = leftGroups.flatMap((g) => g.indicators.map((i) => i.id));
    onChange([...selected, ...allAvailable]);
    setLeftChecked(new Set());
  }, [leftGroups, selected, onChange]);

  const moveLeft = useCallback(() => {
    if (rightChecked.size === 0) return;
    onChange(selected.filter((id) => !rightChecked.has(id)));
    setRightChecked(new Set());
  }, [rightChecked, selected, onChange]);

  const moveAllLeft = useCallback(() => {
    const visibleIds = new Set(rightItems.map((i) => i.id));
    onChange(selected.filter((id) => !visibleIds.has(id)));
    setRightChecked(new Set());
  }, [rightItems, selected, onChange]);

  // --- Actions de reordonnement (panneau droit) ---

  const moveUp = useCallback(() => {
    if (rightChecked.size !== 1) return;
    const id = [...rightChecked][0];
    const idx = selected.indexOf(id);
    if (idx <= 0) return;
    const next = [...selected];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }, [rightChecked, selected, onChange]);

  const moveDown = useCallback(() => {
    if (rightChecked.size !== 1) return;
    const id = [...rightChecked][0];
    const idx = selected.indexOf(id);
    if (idx < 0 || idx >= selected.length - 1) return;
    const next = [...selected];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  }, [rightChecked, selected, onChange]);

  // --- Toggle checkboxes ---

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

  // Select all / deselect all in left panel
  const toggleAllLeft = useCallback(() => {
    const allVisible = leftGroups.flatMap((g) => g.indicators.map((i) => i.id));
    const allChecked = allVisible.every((id) => leftChecked.has(id));
    if (allChecked) {
      setLeftChecked(new Set());
    } else {
      setLeftChecked(new Set(allVisible));
    }
  }, [leftGroups, leftChecked]);

  // Select all / deselect all in right panel
  const toggleAllRight = useCallback(() => {
    const allVisible = rightItems.map((i) => i.id);
    const allChecked = allVisible.every((id) => rightChecked.has(id));
    if (allChecked) {
      setRightChecked(new Set());
    } else {
      setRightChecked(new Set(allVisible));
    }
  }, [rightItems, rightChecked]);

  // Double-click pour transferer un seul item
  const doubleClickRight = useCallback(
    (id: string) => {
      onChange([...selected, id]);
      setLeftChecked((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [selected, onChange]
  );

  const doubleClickLeft = useCallback(
    (id: string) => {
      onChange(selected.filter((s) => s !== id));
      setRightChecked((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [selected, onChange]
  );

  // --- Drag and drop (panneau droit) ---
  const dragIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, id: string) => {
      dragIdRef.current = id;
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, id: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (id !== dragIdRef.current) setDragOverId(id);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
      e.preventDefault();
      setDragOverId(null);
      const fromId = dragIdRef.current;
      if (!fromId || fromId === targetId) return;
      const next = [...selected];
      const fromIdx = next.indexOf(fromId);
      const toIdx = next.indexOf(targetId);
      if (fromIdx < 0 || toIdx < 0) return;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, fromId);
      onChange(next);
    },
    [selected, onChange]
  );

  const handleDragEnd = useCallback(() => {
    dragIdRef.current = null;
    setDragOverId(null);
  }, []);

  const leftAllChecked =
    leftTotal > 0 &&
    leftGroups.flatMap((g) => g.indicators.map((i) => i.id)).every((id) =>
      leftChecked.has(id)
    );
  const rightAllChecked =
    rightItems.length > 0 &&
    rightItems.every((i) => rightChecked.has(i.id));

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-accent transition-colors text-sm font-medium"
        >
          <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          <span>Indicateurs</span>
          <span className="ml-auto text-[10px] text-muted-foreground font-normal">
            {selected.length} selectionnes
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
      <div className="flex gap-1 items-stretch pl-6 pr-1 pb-2">
        {/* ===== Panneau gauche : Disponibles ===== */}
        <div className="flex-1 min-w-0 border rounded-md flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30">
            <Checkbox
              checked={leftAllChecked}
              onCheckedChange={toggleAllLeft}
              className="h-3 w-3"
            />
            <span className="text-[10px] font-medium text-muted-foreground truncate">
              Disponibles ({leftTotal})
            </span>
          </div>

          {/* Search */}
          <div className="relative px-1.5 py-1">
            <Search className="absolute left-3 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={leftSearch}
              onChange={(e) => setLeftSearch(e.target.value)}
              className="pl-6 h-6 text-[11px]"
            />
          </div>

          {/* List */}
          <div className="flex-1 max-h-70 overflow-y-auto px-1 pb-1 space-y-1">
            {leftGroups.map((group) => (
              <div key={group.category}>
                <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-1 py-0.5 sticky top-0 bg-background/95 backdrop-blur-sm">
                  {group.categoryLabel}
                </div>
                {group.indicators.map((ind) => (
                  <div
                    key={ind.id}
                    className="flex items-center gap-1.5 py-0.5 hover:bg-accent/50 rounded px-1 cursor-pointer group"
                    onClick={() => toggleLeft(ind.id)}
                    onDoubleClick={() => doubleClickRight(ind.id)}
                    title={ind.description}
                  >
                    <Checkbox
                      checked={leftChecked.has(ind.id)}
                      onCheckedChange={() => toggleLeft(ind.id)}
                      className="h-3 w-3"
                    />
                    <span className="text-[11px] leading-tight truncate">
                      {ind.name}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            {leftGroups.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic text-center py-4">
                Aucun indicateur disponible
              </p>
            )}
          </div>
        </div>

        {/* ===== Boutons de transfert ===== */}
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
            title="Ajouter la selection"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={moveLeft}
            disabled={rightChecked.size === 0}
            title="Retirer la selection"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={moveAllLeft}
            disabled={selected.length === 0}
            title="Tout retirer"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>

          {/* Separateur visuel */}
          <div className="h-2" />

          {/* Reordonnement */}
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
          {/* Header */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30">
            <Checkbox
              checked={rightAllChecked}
              onCheckedChange={toggleAllRight}
              className="h-3 w-3"
            />
            <span className="text-[10px] font-medium text-muted-foreground truncate">
              Selectionnes ({selected.length})
            </span>
          </div>

          {/* Search */}
          <div className="relative px-1.5 py-1">
            <Search className="absolute left-3 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={rightSearch}
              onChange={(e) => setRightSearch(e.target.value)}
              className="pl-6 h-6 text-[11px]"
            />
          </div>

          {/* List */}
          <div className="flex-1 max-h-70 overflow-y-auto px-1 pb-1">
            {rightItems.map((ind) => (
              <div
                key={ind.id}
                draggable
                onDragStart={(e) => handleDragStart(e, ind.id)}
                onDragOver={(e) => handleDragOver(e, ind.id)}
                onDrop={(e) => handleDrop(e, ind.id)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-1.5 py-0.5 rounded px-1 cursor-grab active:cursor-grabbing group transition-colors ${
                  dragOverId === ind.id
                    ? "bg-primary/10 border-t-2 border-primary"
                    : "hover:bg-accent/50"
                }`}
                onClick={() => toggleRight(ind.id)}
                onDoubleClick={() => doubleClickLeft(ind.id)}
                title={ind.description}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                <Checkbox
                  checked={rightChecked.has(ind.id)}
                  onCheckedChange={() => toggleRight(ind.id)}
                  className="h-3 w-3"
                />
                <span className="text-[11px] leading-tight truncate">
                  {ind.shortName}
                </span>
              </div>
            ))}
            {rightItems.length === 0 && (
              <p className="text-[10px] text-muted-foreground italic text-center py-4">
                Aucun indicateur selectionne
              </p>
            )}
          </div>
        </div>
      </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
