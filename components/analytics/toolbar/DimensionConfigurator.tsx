"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, Plus, GripVertical } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type DimensionInfo = {
  id: string;
  name: string;
  canBeRow: boolean;
  canBeColumn: boolean;
  canBeFilter: boolean;
};

interface DimensionConfiguratorProps {
  dimensions: DimensionInfo[];
  rows: string[];
  columns: string[];
  onRowsChange: (rows: string[]) => void;
  onColumnsChange: (columns: string[]) => void;
}

function SortableBadge({
  id,
  label,
  onRemove,
}: {
  id: string;
  label: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Badge
      ref={setNodeRef}
      style={style}
      variant="outline"
      className="text-[10px] gap-0.5 cursor-grab active:cursor-grabbing"
    >
      <span {...attributes} {...listeners} className="flex items-center">
        <GripVertical className="h-2.5 w-2.5 text-muted-foreground mr-0.5" />
        {label}
      </span>
      <button onClick={onRemove}>
        <X className="h-2.5 w-2.5" />
      </button>
    </Badge>
  );
}

export function DimensionConfigurator({
  dimensions,
  rows,
  columns,
  onRowsChange,
  onColumnsChange,
}: DimensionConfiguratorProps) {
  const [addingTo, setAddingTo] = useState<"rows" | "columns" | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const usedDimIds = new Set([...rows, ...columns]);

  const availableForRows = dimensions.filter(
    (d) => d.canBeRow && !usedDimIds.has(d.id)
  );
  const availableForColumns = dimensions.filter(
    (d) => d.canBeColumn && !usedDimIds.has(d.id)
  );

  const getDimName = (id: string) =>
    dimensions.find((d) => d.id === id)?.name ?? id;

  const removeRow = (id: string) => onRowsChange(rows.filter((r) => r !== id));
  const removeCol = (id: string) => onColumnsChange(columns.filter((c) => c !== id));

  const addDimension = (dimId: string, target: "rows" | "columns") => {
    if (target === "rows") {
      onRowsChange([...rows, dimId]);
    } else {
      onColumnsChange([...columns, dimId]);
    }
    setAddingTo(null);
  };

  const handleRowDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rows.indexOf(active.id as string);
      const newIndex = rows.indexOf(over.id as string);
      onRowsChange(arrayMove(rows, oldIndex, newIndex));
    }
  };

  const handleColDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = columns.indexOf(active.id as string);
      const newIndex = columns.indexOf(over.id as string);
      onColumnsChange(arrayMove(columns, oldIndex, newIndex));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Lignes */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">
            Lignes
          </Label>
          {availableForRows.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[10px] px-1.5"
              onClick={() => setAddingTo(addingTo === "rows" ? null : "rows")}
            >
              <Plus className="h-3 w-3 mr-0.5" /> Ajouter
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 min-h-[24px]">
          {rows.length === 0 && (
            <span className="text-[10px] text-muted-foreground italic">
              Aucune dimension en ligne
            </span>
          )}
          {rows.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRowDragEnd}>
              <SortableContext items={rows} strategy={horizontalListSortingStrategy}>
                {rows.map((id) => (
                  <SortableBadge key={id} id={id} label={getDimName(id)} onRemove={() => removeRow(id)} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
        {addingTo === "rows" && (
          <Select onValueChange={(v) => addDimension(v, "rows")}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Choisir une dimension..." />
            </SelectTrigger>
            <SelectContent>
              {availableForRows.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Colonnes */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">
            Colonnes
          </Label>
          {availableForColumns.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[10px] px-1.5"
              onClick={() => setAddingTo(addingTo === "columns" ? null : "columns")}
            >
              <Plus className="h-3 w-3 mr-0.5" /> Ajouter
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 min-h-[24px]">
          {columns.length === 0 && (
            <span className="text-[10px] text-muted-foreground italic">
              Aucune dimension en colonne
            </span>
          )}
          {columns.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColDragEnd}>
              <SortableContext items={columns} strategy={horizontalListSortingStrategy}>
                {columns.map((id) => (
                  <SortableBadge key={id} id={id} label={getDimName(id)} onRemove={() => removeCol(id)} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
        {addingTo === "columns" && (
          <Select onValueChange={(v) => addDimension(v, "columns")}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Choisir une dimension..." />
            </SelectTrigger>
            <SelectContent>
              {availableForColumns.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
