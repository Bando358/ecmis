"use client";

import * as React from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  /** Plage de dates sélectionnée */
  value?: DateRange;
  /** Callback lors du changement */
  onChange?: (range: DateRange | undefined) => void;
  /** Placeholder quand aucune date n'est sélectionnée */
  placeholder?: string;
  /** Désactiver le composant */
  disabled?: boolean;
  /** Classes CSS additionnelles */
  className?: string;
  /** Afficher les presets */
  showPresets?: boolean;
  /** Nombre de mois à afficher */
  numberOfMonths?: number;
  /** Date minimum sélectionnable */
  minDate?: Date;
  /** Date maximum sélectionnable */
  maxDate?: Date;
}

type PresetKey =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear";

const presets: Record<PresetKey, { label: string; getValue: () => DateRange }> = {
  today: {
    label: "Aujourd'hui",
    getValue: () => {
      const today = new Date();
      return { from: today, to: today };
    },
  },
  yesterday: {
    label: "Hier",
    getValue: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: yesterday, to: yesterday };
    },
  },
  last7days: {
    label: "7 derniers jours",
    getValue: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  last30days: {
    label: "30 derniers jours",
    getValue: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  thisMonth: {
    label: "Ce mois",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  lastMonth: {
    label: "Mois dernier",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
  thisYear: {
    label: "Cette année",
    getValue: () => ({
      from: startOfYear(new Date()),
      to: endOfYear(new Date()),
    }),
  },
  lastYear: {
    label: "Année dernière",
    getValue: () => {
      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      return {
        from: startOfYear(lastYear),
        to: endOfYear(lastYear),
      };
    },
  },
};

/**
 * Sélecteur de plage de dates avec presets
 *
 * @example
 * ```tsx
 * // Basique
 * const [dateRange, setDateRange] = useState<DateRange>();
 *
 * <DateRangePicker
 *   value={dateRange}
 *   onChange={setDateRange}
 * />
 *
 * // Avec presets et contraintes
 * <DateRangePicker
 *   value={dateRange}
 *   onChange={setDateRange}
 *   showPresets
 *   minDate={new Date(2020, 0, 1)}
 *   maxDate={new Date()}
 * />
 * ```
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder = "Sélectionner une période",
  disabled = false,
  className,
  showPresets = true,
  numberOfMonths = 2,
  minDate,
  maxDate,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handlePresetSelect = (presetKey: string) => {
    const preset = presets[presetKey as PresetKey];
    if (preset && onChange) {
      onChange(preset.getValue());
    }
  };

  const formatDateRange = (range: DateRange | undefined): string => {
    if (!range?.from) return placeholder;

    if (range.to) {
      return `${format(range.from, "dd MMM yyyy", { locale: fr })} - ${format(
        range.to,
        "dd MMM yyyy",
        { locale: fr }
      )}`;
    }

    return format(range.from, "dd MMM yyyy", { locale: fr });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets */}
          {showPresets && (
            <div className="border-r p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Périodes prédéfinies
              </p>
              {Object.entries(presets).map(([key, preset]) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={() => handlePresetSelect(key)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value?.from}
              selected={value}
              onSelect={onChange}
              numberOfMonths={numberOfMonths}
              locale={fr}
              disabled={(date) => {
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
            />
          </div>
        </div>

        {/* Footer avec bouton réinitialiser */}
        <div className="border-t p-3 flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange?.(undefined)}
          >
            Réinitialiser
          </Button>
          <Button size="sm" onClick={() => setIsOpen(false)}>
            Appliquer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Sélecteur de période simple avec select
 */
export function PeriodSelect({
  value,
  onChange,
  className,
}: {
  value?: PresetKey;
  onChange?: (range: DateRange | undefined, key: PresetKey) => void;
  className?: string;
}) {
  const handleChange = (key: PresetKey) => {
    const preset = presets[key];
    if (preset && onChange) {
      onChange(preset.getValue(), key);
    }
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className={cn("w-[180px]", className)}>
        <SelectValue placeholder="Sélectionner période" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(presets).map(([key, preset]) => (
          <SelectItem key={key} value={key}>
            {preset.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Hook pour gérer une plage de dates avec presets
 */
export function useDateRange(initialPreset?: PresetKey) {
  const [range, setRange] = React.useState<DateRange | undefined>(
    initialPreset ? presets[initialPreset].getValue() : undefined
  );
  const [preset, setPreset] = React.useState<PresetKey | undefined>(initialPreset);

  const setFromPreset = React.useCallback((presetKey: PresetKey) => {
    const presetConfig = presets[presetKey];
    if (presetConfig) {
      setRange(presetConfig.getValue());
      setPreset(presetKey);
    }
  }, []);

  const setCustomRange = React.useCallback((newRange: DateRange | undefined) => {
    setRange(newRange);
    setPreset(undefined);
  }, []);

  const reset = React.useCallback(() => {
    setRange(undefined);
    setPreset(undefined);
  }, []);

  return {
    range,
    preset,
    setFromPreset,
    setCustomRange,
    reset,
    from: range?.from,
    to: range?.to,
  };
}
