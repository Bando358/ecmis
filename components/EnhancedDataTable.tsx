"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { ArrowUpDown, Search, X, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useDebounce } from "@/hooks/useDebounce";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";

export interface EnhancedDataTableProps<TData, TValue> {
  /** Définition des colonnes */
  columns: ColumnDef<TData, TValue>[];
  /** Données à afficher */
  data: TData[];
  /** Nombre total d'éléments (pour pagination serveur) */
  totalItems?: number;
  /** Chargement en cours */
  isLoading?: boolean;
  /** Activer la recherche globale */
  searchable?: boolean;
  /** Placeholder pour la recherche */
  searchPlaceholder?: string;
  /** Colonne(s) à filtrer lors de la recherche */
  searchColumn?: string;
  /** Activer la pagination */
  paginated?: boolean;
  /** Pagination côté serveur */
  serverSidePagination?: boolean;
  /** Page actuelle (pagination serveur) */
  currentPage?: number;
  /** Callback changement de page (pagination serveur) */
  onPageChange?: (page: number) => void;
  /** Taille de page actuelle */
  pageSize?: number;
  /** Callback changement taille de page */
  onPageSizeChange?: (size: number) => void;
  /** Callback recherche (pour serveur) */
  onSearch?: (query: string) => void;
  /** Message si aucune donnée */
  emptyMessage?: string;
  /** Clé unique pour la persistance des préférences */
  storageKey?: string;
  /** Classe CSS additionnelle */
  className?: string;
  /** Actions supplémentaires dans la toolbar */
  toolbarActions?: React.ReactNode;
}

/**
 * Composant DataTable amélioré avec:
 * - Recherche intégrée (client ou serveur)
 * - Pagination (client ou serveur)
 * - Tri des colonnes
 * - Persistance des préférences
 *
 * @example
 * ```tsx
 * // Pagination côté client
 * <EnhancedDataTable
 *   columns={columns}
 *   data={clients}
 *   searchable
 *   paginated
 * />
 *
 * // Pagination côté serveur
 * <EnhancedDataTable
 *   columns={columns}
 *   data={clients}
 *   totalItems={totalClients}
 *   serverSidePagination
 *   currentPage={page}
 *   onPageChange={setPage}
 *   onSearch={handleSearch}
 *   isLoading={isLoading}
 * />
 * ```
 */
export function EnhancedDataTable<TData, TValue>({
  columns,
  data,
  totalItems,
  isLoading = false,
  searchable = false,
  searchPlaceholder = "Rechercher...",
  searchColumn,
  paginated = false,
  serverSidePagination = false,
  currentPage = 1,
  onPageChange,
  pageSize: controlledPageSize,
  onPageSizeChange,
  onSearch,
  emptyMessage = "Aucune donnée trouvée",
  storageKey,
  className,
  toolbarActions,
}: EnhancedDataTableProps<TData, TValue>) {
  // État local
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Persistance de la taille de page
  const [storedPageSize, setStoredPageSize] = useLocalStorage(
    storageKey ? `${storageKey}_pageSize` : "table_pageSize",
    20
  );

  const pageSize = controlledPageSize ?? storedPageSize;

  // Pagination côté client
  const [clientPage, setClientPage] = useState(1);
  const activePage = serverSidePagination ? currentPage : clientPage;

  // Données paginées côté client
  const paginatedData = useMemo(() => {
    if (!paginated || serverSidePagination) return data;

    const start = (clientPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, paginated, serverSidePagination, clientPage, pageSize]);

  // Calcul du total de pages
  const totalPages = useMemo(() => {
    if (serverSidePagination && totalItems) {
      return Math.ceil(totalItems / pageSize);
    }
    return Math.ceil(data.length / pageSize);
  }, [serverSidePagination, totalItems, data.length, pageSize]);

  // Appel du callback de recherche serveur
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (serverSidePagination && onSearch) {
        // Reset à la page 1 lors d'une nouvelle recherche
        if (onPageChange) onPageChange(1);
      }
    },
    [serverSidePagination, onSearch, onPageChange]
  );

  // Effet pour la recherche serveur
  useMemo(() => {
    if (serverSidePagination && onSearch && debouncedSearch !== undefined) {
      onSearch(debouncedSearch);
    }
  }, [debouncedSearch, serverSidePagination, onSearch]);

  // Configuration de la table
  const table = useReactTable({
    data: paginated && !serverSidePagination ? paginatedData : data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
      globalFilter: serverSidePagination ? undefined : searchQuery,
    },
    globalFilterFn: "includesString",
  });

  // Gestion du changement de page
  const handlePageChange = useCallback(
    (page: number) => {
      if (serverSidePagination && onPageChange) {
        onPageChange(page);
      } else {
        setClientPage(page);
      }
    },
    [serverSidePagination, onPageChange]
  );

  // Gestion du changement de taille de page
  const handlePageSizeChange = useCallback(
    (size: number) => {
      setStoredPageSize(size);
      if (onPageSizeChange) {
        onPageSizeChange(size);
      }
      // Reset à la page 1
      if (serverSidePagination && onPageChange) {
        onPageChange(1);
      } else {
        setClientPage(1);
      }
    },
    [setStoredPageSize, onPageSizeChange, serverSidePagination, onPageChange]
  );

  // Effacer la recherche
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    if (searchColumn) {
      table.getColumn(searchColumn)?.setFilterValue("");
    }
  }, [searchColumn, table]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      {(searchable || toolbarActions) && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {searchable && (
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                  onClick={clearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          {toolbarActions && (
            <div className="flex items-center gap-2">{toolbarActions}</div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          "flex items-center gap-2",
                          header.column.getCanSort() &&
                            "cursor-pointer select-none hover:text-foreground"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <ArrowUpDown className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Chargement...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {paginated && (
        <PaginationControls
          currentPage={activePage}
          totalPages={totalPages}
          totalItems={serverSidePagination ? (totalItems ?? 0) : data.length}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          disabled={isLoading}
        />
      )}
    </div>
  );
}

/**
 * Helper pour créer une colonne triable
 */
export function createSortableColumn<TData, TValue>(
  accessorKey: keyof TData & string,
  header: string
): ColumnDef<TData, TValue> {
  return {
    accessorKey,
    header,
    enableSorting: true,
  };
}
