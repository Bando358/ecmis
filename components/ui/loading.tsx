"use client";

import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  /** Taille du spinner */
  size?: "sm" | "md" | "lg" | "xl";
  /** Texte à afficher */
  text?: string;
  /** Classe CSS additionnelle */
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

/**
 * Spinner de chargement simple
 */
export function LoadingSpinner({
  size = "md",
  text,
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn("flex items-center justify-center gap-2", className)}
      role="status"
      aria-label="Chargement"
    >
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {text && <span className="text-muted-foreground">{text}</span>}
    </div>
  );
}

/**
 * Page de chargement plein écran
 */
export function LoadingPage({ text = "Chargement..." }: { text?: string }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <LoadingSpinner size="xl" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

/**
 * Overlay de chargement (pour les modales, cards, etc.)
 */
export function LoadingOverlay({
  text,
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        className
      )}
    >
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

/**
 * Skeleton pour une carte
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-6", className)}>
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton pour une ligne de tableau
 */
export function TableRowSkeleton({
  columns = 5,
  className,
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <tr className={cn("animate-pulse", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-5 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton pour un tableau complet
 */
export function TableSkeleton({
  rows = 5,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="p-4 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Skeleton pour un formulaire
 */
export function FormSkeleton({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

/**
 * Skeleton pour le dashboard
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-[300px] w-full" />
        </div>
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>

      {/* Table */}
      <TableSkeleton rows={5} columns={6} />
    </div>
  );
}

/**
 * Skeleton pour la liste des clients
 */
export function ClientListSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Search bar */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table */}
      <TableSkeleton rows={8} columns={8} />

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}
