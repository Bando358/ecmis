"use client";

import { ChartType } from "@/lib/analytics/types";
import { Button } from "@/components/ui/button";
import {
  TableProperties,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  Layers,
} from "lucide-react";

interface ChartTypeSelectorProps {
  value: ChartType;
  onChange: (type: ChartType) => void;
  suggestions?: ChartType[];
}

const CHART_OPTIONS: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  { type: "pivotTable", label: "Tableau", icon: <TableProperties className="h-4 w-4" /> },
  { type: "bar", label: "Barres", icon: <BarChart3 className="h-4 w-4" /> },
  { type: "stackedBar", label: "Barres empilees", icon: <Layers className="h-4 w-4" /> },
  { type: "line", label: "Lignes", icon: <LineChartIcon className="h-4 w-4" /> },
  { type: "area", label: "Aires", icon: <AreaChartIcon className="h-4 w-4" /> },
  { type: "pie", label: "Secteurs", icon: <PieChartIcon className="h-4 w-4" /> },
];

export function ChartTypeSelector({
  value,
  onChange,
  suggestions,
}: ChartTypeSelectorProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {CHART_OPTIONS.map(({ type, label, icon }) => {
        const isSuggested = !suggestions || suggestions.includes(type);
        return (
          <Button
            key={type}
            variant={value === type ? "default" : "outline"}
            size="sm"
            className={`h-7 text-[10px] gap-1 ${!isSuggested ? "opacity-50" : ""}`}
            onClick={() => onChange(type)}
          >
            {icon}
            {label}
          </Button>
        );
      })}
    </div>
  );
}
