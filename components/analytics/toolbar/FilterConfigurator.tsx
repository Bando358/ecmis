"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Plus, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DimensionFilter, DimensionValue } from "@/lib/analytics/types";

type DimensionInfo = {
  id: string;
  name: string;
  type: string;
  values: DimensionValue[];
  canBeFilter: boolean;
};

interface FilterConfiguratorProps {
  dimensions: DimensionInfo[];
  filters: DimensionFilter[];
  usedDimIds: string[];
  onAdd: (filter: DimensionFilter) => void;
  onRemove: (dimensionId: string) => void;
}

export function FilterConfigurator({
  dimensions,
  filters,
  usedDimIds,
  onAdd,
  onRemove,
}: FilterConfiguratorProps) {
  const [adding, setAdding] = useState(false);
  const [selectedDimId, setSelectedDimId] = useState<string | null>(null);
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set());

  const filteredDimIds = new Set(filters.map((f) => f.dimensionId));
  const availableDims = dimensions.filter(
    (d) => d.canBeFilter && !filteredDimIds.has(d.id) && !usedDimIds.includes(d.id) && d.values.length > 0
  );

  const getDimName = (id: string) =>
    dimensions.find((d) => d.id === id)?.name ?? id;

  const getFilterLabel = (filter: DimensionFilter) => {
    const dim = dimensions.find((d) => d.id === filter.dimensionId);
    if (!dim) return filter.dimensionId;
    const valueLabels = filter.values
      .map((v) => dim.values.find((dv) => dv.value === v)?.label ?? v)
      .join(", ");
    return `${dim.name}: ${valueLabels}`;
  };

  const selectedDim = selectedDimId
    ? dimensions.find((d) => d.id === selectedDimId)
    : null;

  const toggleValue = (val: string) => {
    setSelectedValues((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  };

  const confirmAdd = () => {
    if (!selectedDimId || selectedValues.size === 0) return;
    onAdd({
      dimensionId: selectedDimId,
      operator: "in",
      values: Array.from(selectedValues),
    });
    setAdding(false);
    setSelectedDimId(null);
    setSelectedValues(new Set());
  };

  const cancelAdd = () => {
    setAdding(false);
    setSelectedDimId(null);
    setSelectedValues(new Set());
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Filter className="h-3 w-3" />
          Filtres
        </Label>
        {availableDims.length > 0 && !adding && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-[10px] px-1.5"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3 w-3 mr-0.5" /> Ajouter
          </Button>
        )}
      </div>

      {/* Active filters */}
      <div className="flex flex-wrap gap-1 min-h-[20px]">
        {filters.length === 0 && !adding && (
          <span className="text-[10px] text-muted-foreground italic">
            Aucun filtre actif
          </span>
        )}
        {filters.map((f) => (
          <Badge key={f.dimensionId} variant="secondary" className="text-[10px] gap-1">
            {getFilterLabel(f)}
            <button onClick={() => onRemove(f.dimensionId)}>
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Add filter form */}
      {adding && (
        <div className="border rounded-md p-2 space-y-2 bg-muted/30">
          <Select
            onValueChange={(v) => {
              setSelectedDimId(v);
              setSelectedValues(new Set());
            }}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Dimension a filtrer..." />
            </SelectTrigger>
            <SelectContent>
              {availableDims.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedDim && (
            <>
              <div className="text-[10px] text-muted-foreground">
                Selectionner les valeurs a inclure :
              </div>
              <div className="max-h-[120px] overflow-y-auto space-y-1">
                {selectedDim.values.map((v) => (
                  <label
                    key={String(v.value)}
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedValues.has(String(v.value))}
                      onCheckedChange={() => toggleValue(String(v.value))}
                      className="h-3 w-3"
                    />
                    <span className="text-xs">{v.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  disabled={selectedValues.size === 0}
                  onClick={confirmAdd}
                >
                  Appliquer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={cancelAdd}
                >
                  Annuler
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
