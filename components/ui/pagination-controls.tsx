"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGINATION } from "@/lib/constants";

export interface PaginationControlsProps {
  /** Page actuelle (commence à 1) */
  currentPage: number;
  /** Nombre total de pages */
  totalPages: number;
  /** Nombre total d'éléments */
  totalItems: number;
  /** Nombre d'éléments par page */
  pageSize: number;
  /** Callback quand la page change */
  onPageChange: (page: number) => void;
  /** Callback quand la taille de page change */
  onPageSizeChange?: (pageSize: number) => void;
  /** Afficher le sélecteur de taille de page */
  showPageSizeSelector?: boolean;
  /** Afficher le compteur d'éléments */
  showItemCount?: boolean;
  /** Options de taille de page */
  pageSizeOptions?: readonly number[];
  /** Désactiver les contrôles */
  disabled?: boolean;
  /** Classe CSS additionnelle */
  className?: string;
}

/**
 * Composant de contrôles de pagination réutilisable
 *
 * @example
 * ```tsx
 * <PaginationControls
 *   currentPage={page}
 *   totalPages={10}
 *   totalItems={200}
 *   pageSize={20}
 *   onPageChange={setPage}
 *   onPageSizeChange={setPageSize}
 * />
 * ```
 */
export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
  showItemCount = true,
  pageSizeOptions = PAGINATION.PAGE_SIZE_OPTIONS,
  disabled = false,
  className = "",
}: PaginationControlsProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div
      className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      {/* Compteur d'éléments */}
      {showItemCount && (
        <div className="text-sm text-muted-foreground">
          {totalItems === 0 ? (
            "Aucun élément"
          ) : (
            <>
              Affichage de <span className="font-medium">{startItem}</span> à{" "}
              <span className="font-medium">{endItem}</span> sur{" "}
              <span className="font-medium">{totalItems}</span> élément
              {totalItems > 1 ? "s" : ""}
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Sélecteur de taille de page */}
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Par page:
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Boutons de navigation */}
        <div className="flex items-center gap-1">
          {/* Première page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={disabled || !canGoPrevious}
            title="Première page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Page précédente */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={disabled || !canGoPrevious}
            title="Page précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Indicateur de page */}
          <div className="flex items-center gap-1 px-2">
            <span className="text-sm font-medium">{currentPage}</span>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">
              {totalPages || 1}
            </span>
          </div>

          {/* Page suivante */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={disabled || !canGoNext}
            title="Page suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Dernière page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={disabled || !canGoNext}
            title="Dernière page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
