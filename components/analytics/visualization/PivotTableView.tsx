"use client";

import { useMemo } from "react";
import { AnalysisResult, ColumnDef } from "@/lib/analytics/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PivotTableViewProps {
  result: AnalysisResult;
  showTotals?: boolean;
  maxHeight?: string;
}

// ---------- Helpers pour en-tetes multi-niveaux ----------

type HeaderCell = {
  label: string;
  colSpan: number;
};

/**
 * Construit les lignes d'en-tete hierarchiques a partir des colonnes.
 * S'il y a N dimensions en colonnes, on produit N lignes d'en-tete.
 * Ex: dimensions = ["indicator", "period"]
 *   Ligne 1 : indicator groups (colSpan = nb periodes par indicateur)
 *   Ligne 2 : period values
 */
function buildHeaderRows(
  columns: ColumnDef[],
  showTotals: boolean
): HeaderCell[][] {
  if (columns.length === 0) return [];

  // Extraire les cles de dimension colonne (dans l'ordre)
  const dimKeys = Object.keys(columns[0].dimensionValues);

  // Si une seule dimension ou aucune, pas besoin de multi-niveaux
  if (dimKeys.length <= 1) return [];

  const headerRows: HeaderCell[][] = [];

  for (let level = 0; level < dimKeys.length; level++) {
    const dimKey = dimKeys[level];
    const cells: HeaderCell[] = [];
    let i = 0;

    while (i < columns.length) {
      const value = columns[i].dimensionValues[dimKey] ?? "N/A";
      let span = 1;

      // Regrouper les colonnes consecutives ayant la meme valeur
      // pour CETTE dimension ET toutes les dimensions precedentes
      while (i + span < columns.length) {
        const nextCol = columns[i + span];
        // Verifier que toutes les dimensions de niveau 0..level sont identiques
        let sameGroup = true;
        for (let k = 0; k <= level; k++) {
          if (
            (nextCol.dimensionValues[dimKeys[k]] ?? "N/A") !==
            (columns[i].dimensionValues[dimKeys[k]] ?? "N/A")
          ) {
            sameGroup = false;
            break;
          }
        }
        if (!sameGroup) break;
        span++;
      }

      cells.push({ label: value, colSpan: span });
      i += span;
    }

    // Ajouter la cellule Total sur la derniere ligne d'en-tete uniquement
    if (showTotals && level === dimKeys.length - 1) {
      cells.push({ label: "Total", colSpan: 1 });
    }

    headerRows.push(cells);
  }

  return headerRows;
}

export function PivotTableView({ result, showTotals = true, maxHeight = "600px" }: PivotTableViewProps) {
  if (result.rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        Aucune donnee disponible pour cette analyse.
      </div>
    );
  }

  // Determiner les labels des dimensions en ligne
  const rowDimKeys = result.rows.length > 0
    ? Object.keys(result.rows[0].dimensionValues)
    : [];

  // En-tetes multi-niveaux pour les colonnes
  const multiHeaders = useMemo(
    () => buildHeaderRows(result.columns, showTotals),
    [result.columns, showTotals]
  );
  const useMultiHeaders = multiHeaders.length > 0;

  return (
    <div data-viz-scroll className="overflow-auto border rounded-lg" style={{ maxHeight }}>
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          {useMultiHeaders ? (
            <>
              {multiHeaders.map((headerCells, hIdx) => {
                const isLastRow = hIdx === multiHeaders.length - 1;
                return (
                  <TableRow key={hIdx}>
                    {/* Cellules dimensions lignes : rowSpan sur la premiere ligne seulement */}
                    {hIdx === 0 &&
                      rowDimKeys.map((dimKey) => (
                        <TableHead
                          key={dimKey}
                          rowSpan={multiHeaders.length}
                          className="text-xs font-semibold whitespace-nowrap bg-muted/50 sticky left-0 z-20 border-r"
                        >
                          {dimKey.charAt(0).toUpperCase() + dimKey.slice(1)}
                        </TableHead>
                      ))}
                    {headerCells.map((cell, cIdx) => (
                      <TableHead
                        key={cIdx}
                        colSpan={cell.colSpan}
                        className={`text-xs font-semibold text-center whitespace-nowrap border-x ${
                          cell.label === "Total"
                            ? "bg-muted/70 font-bold"
                            : isLastRow
                            ? "bg-muted/50"
                            : "bg-muted/30"
                        }`}
                      >
                        {cell.label}
                      </TableHead>
                    ))}
                    {/* Cellule Total : rowSpan sur les lignes precedentes, visible sur la derniere */}
                    {showTotals && !isLastRow && hIdx === 0 && (
                      <TableHead
                        rowSpan={multiHeaders.length - 1}
                        className="text-xs font-bold text-center whitespace-nowrap bg-muted/70"
                      />
                    )}
                  </TableRow>
                );
              })}
            </>
          ) : (
            /* En-tete simple (1 seule dimension colonne ou aucune) */
            <TableRow>
              {rowDimKeys.map((dimKey) => (
                <TableHead
                  key={dimKey}
                  className="text-xs font-semibold whitespace-nowrap bg-muted/50 sticky left-0 z-20"
                >
                  {dimKey.charAt(0).toUpperCase() + dimKey.slice(1)}
                </TableHead>
              ))}
              {result.columns.map((col) => (
                <TableHead
                  key={col.key}
                  className="text-xs font-semibold text-center whitespace-nowrap bg-muted/50"
                >
                  {col.label}
                </TableHead>
              ))}
              {showTotals && (
                <TableHead className="text-xs font-bold text-center whitespace-nowrap bg-muted/70">
                  Total
                </TableHead>
              )}
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {result.rows.map((row, rowIdx) => (
            <TableRow key={rowIdx} className="hover:bg-accent/50">
              {rowDimKeys.map((dimKey) => (
                <TableCell
                  key={dimKey}
                  className="text-xs whitespace-nowrap font-medium sticky left-0 bg-background"
                >
                  {row.dimensionValues[dimKey]}
                </TableCell>
              ))}
              {result.columns.map((col) => {
                const cell = row.cells[col.key];
                return (
                  <TableCell
                    key={col.key}
                    className="text-xs text-center tabular-nums"
                  >
                    {cell?.formattedValue ?? "0"}
                    {cell?.percentage !== undefined && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({cell.percentage.toFixed(1)}%)
                      </span>
                    )}
                  </TableCell>
                );
              })}
              {showTotals && (
                <TableCell className="text-xs text-center font-semibold tabular-nums bg-muted/30">
                  {row.rowTotal.formattedValue}
                </TableCell>
              )}
            </TableRow>
          ))}

          {/* Totaux colonnes */}
          {showTotals && (
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell
                colSpan={rowDimKeys.length}
                className="text-xs font-bold sticky left-0 bg-muted/50"
              >
                Total
              </TableCell>
              {result.columns.map((col) => (
                <TableCell
                  key={col.key}
                  className="text-xs text-center tabular-nums font-bold"
                >
                  {result.columnTotals[col.key]?.formattedValue ?? "0"}
                </TableCell>
              ))}
              <TableCell className="text-xs text-center tabular-nums font-bold bg-muted/70">
                {result.grandTotal.formattedValue}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
