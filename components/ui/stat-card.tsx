"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  LucideIcon,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, formatPercent, formatCurrency } from "@/lib/formatters";

export type TrendDirection = "up" | "down" | "neutral";

interface StatCardProps {
  /** Titre de la stat */
  title: string;
  /** Valeur principale */
  value: number | string;
  /** Format de la valeur */
  format?: "number" | "currency" | "percent" | "none";
  /** Icône à afficher */
  icon?: LucideIcon;
  /** Couleur de l'icône */
  iconColor?: string;
  /** Description ou sous-titre */
  description?: string;
  /** Tendance (variation) */
  trend?: {
    value: number;
    direction: TrendDirection;
    label?: string;
  };
  /** En cours de chargement */
  isLoading?: boolean;
  /** Classe CSS additionnelle */
  className?: string;
  /** Contenu personnalisé en footer */
  footer?: ReactNode;
}

/**
 * Carte de statistique pour les dashboards
 *
 * @example
 * ```tsx
 * <StatCard
 *   title="Total Clients"
 *   value={1234}
 *   icon={Users}
 *   trend={{ value: 12, direction: "up", label: "vs mois dernier" }}
 * />
 *
 * <StatCard
 *   title="Chiffre d'affaires"
 *   value={1500000}
 *   format="currency"
 *   icon={DollarSign}
 *   iconColor="text-green-500"
 *   trend={{ value: 8.5, direction: "up" }}
 * />
 * ```
 */
export function StatCard({
  title,
  value,
  format = "number",
  icon: Icon,
  iconColor = "text-primary",
  description,
  trend,
  isLoading = false,
  className,
  footer,
}: StatCardProps) {
  // Formater la valeur selon le format
  const formattedValue = (() => {
    if (typeof value === "string") return value;
    switch (format) {
      case "currency":
        return formatCurrency(value);
      case "percent":
        return formatPercent(value);
      case "number":
        return formatNumber(value);
      default:
        return String(value);
    }
  })();

  // Icône et couleur de tendance
  const getTrendConfig = (direction: TrendDirection) => {
    switch (direction) {
      case "up":
        return {
          icon: TrendingUp,
          color: "text-green-600",
          bgColor: "bg-green-50",
        };
      case "down":
        return {
          icon: TrendingDown,
          color: "text-red-600",
          bgColor: "bg-red-50",
        };
      default:
        return {
          icon: Minus,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
        };
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className={cn("p-2 rounded-full bg-muted", iconColor)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>

        {/* Description ou tendance */}
        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded",
                getTrendConfig(trend.direction).bgColor,
                getTrendConfig(trend.direction).color
              )}
            >
              {trend.direction === "up" ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : trend.direction === "down" ? (
                <ArrowDownRight className="h-3 w-3" />
              ) : null}
              {formatPercent(Math.abs(trend.value))}
            </div>
          )}
          {(description || trend?.label) && (
            <span className="text-xs text-muted-foreground">
              {description || trend?.label}
            </span>
          )}
        </div>

        {footer && <div className="mt-3 pt-3 border-t">{footer}</div>}
      </CardContent>
    </Card>
  );
}

/**
 * Grille de stats pour le dashboard
 */
export function StatCardGrid({
  children,
  columns = 4,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}

/**
 * Stat compacte pour les listes
 */
export function StatInline({
  label,
  value,
  format = "number",
  trend,
  className,
}: {
  label: string;
  value: number | string;
  format?: "number" | "currency" | "percent" | "none";
  trend?: TrendDirection;
  className?: string;
}) {
  const formattedValue = (() => {
    if (typeof value === "string") return value;
    switch (format) {
      case "currency":
        return formatCurrency(value);
      case "percent":
        return formatPercent(value);
      case "number":
        return formatNumber(value);
      default:
        return String(value);
    }
  })();

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">{formattedValue}</span>
        {trend && (
          <span
            className={cn(
              "text-xs",
              trend === "up" && "text-green-600",
              trend === "down" && "text-red-600"
            )}
          >
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : trend === "down" ? (
              <TrendingDown className="h-3 w-3" />
            ) : null}
          </span>
        )}
      </div>
    </div>
  );
}
