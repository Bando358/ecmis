import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { AnalysisResult, AnalysisConfig, ColumnDef, IndicatorDefinition } from "../types";
import { ExportSettings } from "../settings-types";
import { DEFAULT_ANALYTICS_SETTINGS } from "../settings-defaults";
import { INDICATOR_REGISTRY } from "../indicators/registry";

function resolveIndicatorNames(ids: string[], registry?: IndicatorDefinition[]): string {
  const reg = registry ?? INDICATOR_REGISTRY;
  return ids
    .map((id) => reg.find((i) => i.id === id)?.name ?? id)
    .join(", ");
}

/**
 * Construit les en-tetes multi-niveaux a partir des colonnes.
 * Meme logique que PivotTableView.buildHeaderRows.
 */
function buildHeaderRows(columns: ColumnDef[]): { label: string; colSpan: number }[][] {
  if (columns.length === 0) return [];
  const dimKeys = Object.keys(columns[0].dimensionValues);
  if (dimKeys.length <= 1) return [];

  const headerRows: { label: string; colSpan: number }[][] = [];

  for (let level = 0; level < dimKeys.length; level++) {
    const cells: { label: string; colSpan: number }[] = [];
    let i = 0;

    while (i < columns.length) {
      const value = columns[i].dimensionValues[dimKeys[level]] ?? "N/A";
      let span = 1;

      while (i + span < columns.length) {
        let sameGroup = true;
        for (let k = 0; k <= level; k++) {
          if (
            (columns[i + span].dimensionValues[dimKeys[k]] ?? "N/A") !==
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

    headerRows.push(cells);
  }

  return headerRows;
}

/**
 * Genere un fichier PDF a partir d'un AnalysisResult.
 * Retourne un Buffer (base64-compatible) pour telechargement.
 */
export function generatePdfExport(
  result: AnalysisResult,
  config: AnalysisConfig,
  pdfSettings?: ExportSettings["pdf"],
  indicatorRegistry?: IndicatorDefinition[]
): Uint8Array {
  const ps = pdfSettings ?? DEFAULT_ANALYTICS_SETTINGS.export.pdf;
  const doc = new jsPDF({ orientation: ps.pageOrientation, unit: "mm", format: ps.pageFormat as "a4" | "a3" | "letter" });

  // Titre
  doc.setFontSize(ps.titleFontSize);
  doc.text(`Analyse ECMIS - ${resolveIndicatorNames(config.indicators, indicatorRegistry)}`, 14, 15);

  // Metadata
  const meta = result.metadata;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Periode: ${meta.period.start.slice(0, 10)} au ${meta.period.end.slice(0, 10)} | ${meta.rowCount} lignes | ${meta.executionTimeMs}ms`,
    14,
    22
  );
  doc.setTextColor(0);

  // Construire les en-tetes
  const rowDimKeys =
    result.rows.length > 0 ? Object.keys(result.rows[0].dimensionValues) : [];

  const multiHeaders = buildHeaderRows(result.columns);
  const useMultiHeaders = multiHeaders.length > 0;

  // Construire les lignes de donnees
  const body = result.rows.map((row) => [
    ...rowDimKeys.map((k) => row.dimensionValues[k] ?? ""),
    ...result.columns.map((col) => {
      const val = row.cells[col.key]?.value ?? 0;
      return typeof val === "number" ? val.toLocaleString("fr-FR") : String(val);
    }),
    typeof row.rowTotal.value === "number"
      ? row.rowTotal.value.toLocaleString("fr-FR")
      : String(row.rowTotal.value),
  ]);

  // Ligne totaux
  const totalRow = [
    "Total",
    ...Array(Math.max(0, rowDimKeys.length - 1)).fill(""),
    ...result.columns.map((col) => {
      const val = result.columnTotals[col.key]?.value ?? 0;
      return typeof val === "number" ? val.toLocaleString("fr-FR") : String(val);
    }),
    typeof result.grandTotal.value === "number"
      ? result.grandTotal.value.toLocaleString("fr-FR")
      : String(result.grandTotal.value),
  ];

  // Construire le head (multi-niveaux ou simple)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let head: any[][];

  if (useMultiHeaders) {
    head = [];

    for (let level = 0; level < multiHeaders.length; level++) {
      const cells = multiHeaders[level];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const headRow: any[] = [];

      // Row dimension headers (first row with rowSpan spanning all header rows)
      if (level === 0) {
        for (const dimKey of rowDimKeys) {
          headRow.push({
            content: dimKey.charAt(0).toUpperCase() + dimKey.slice(1),
            rowSpan: multiHeaders.length,
          });
        }
      }

      // Column headers with colSpan
      for (const cell of cells) {
        if (cell.colSpan > 1) {
          headRow.push({ content: cell.label, colSpan: cell.colSpan });
        } else {
          headRow.push(cell.label);
        }
      }

      // Total (first row with rowSpan)
      if (level === 0) {
        headRow.push({
          content: "Total",
          rowSpan: multiHeaders.length,
        });
      }

      head.push(headRow);
    }
  } else {
    // Single-level header (original behavior)
    head = [[
      ...rowDimKeys.map((k) => k.charAt(0).toUpperCase() + k.slice(1)),
      ...result.columns.map((c) => c.label),
      "Total",
    ]];
  }

  autoTable(doc, {
    startY: 28,
    head,
    body: [...body, totalRow],
    styles: { fontSize: ps.tableFontSize, cellPadding: 2 },
    headStyles: {
      fillColor: ps.headerFillColor,
      textColor: ps.headerTextColor,
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [241, 245, 249],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: ps.alternateRowColor },
    didParseCell: (data) => {
      // Derniere ligne = totaux
      if (data.row.index === body.length) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // Pied de page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `ECMIS - Genere le ${new Date().toLocaleDateString("fr-FR")} - Page ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
