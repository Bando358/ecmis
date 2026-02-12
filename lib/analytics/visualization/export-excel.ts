import ExcelJS from "exceljs";
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
 * Genere un fichier Excel a partir d'un AnalysisResult.
 * Retourne un Buffer pour telechargement cote client.
 */
export async function generateExcelExport(
  result: AnalysisResult,
  config: AnalysisConfig,
  excelSettings?: ExportSettings["excel"],
  indicatorRegistry?: IndicatorDefinition[]
): Promise<Buffer> {
  const es = excelSettings ?? DEFAULT_ANALYTICS_SETTINGS.export.excel;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ECMIS - Analyser & Visualiser";
  workbook.created = new Date();

  const rowDimKeys =
    result.rows.length > 0 ? Object.keys(result.rows[0].dimensionValues) : [];

  const multiHeaders = buildHeaderRows(result.columns);
  const useMultiHeaders = multiHeaders.length > 0;
  const headerRowCount = useMultiHeaders ? multiHeaders.length : 1;

  const sheet = workbook.addWorksheet("Analyse", {
    views: [{ state: "frozen", ySplit: 2 + headerRowCount, xSplit: rowDimKeys.length }],
  });

  // --- Ligne 1 : Titre ---
  const titleRow = sheet.addRow([
    `Analyse ECMIS - ${resolveIndicatorNames(config.indicators, indicatorRegistry)}`,
  ]);
  titleRow.font = { bold: true, size: es.titleFontSize };
  titleRow.height = 24;

  // --- Ligne 2 : Metadata ---
  const meta = result.metadata;
  const metaRow = sheet.addRow([
    `Periode: ${meta.period.start.slice(0, 10)} au ${meta.period.end.slice(0, 10)} | ${meta.rowCount} lignes | ${meta.executionTimeMs}ms`,
  ]);
  metaRow.font = { italic: true, size: 10, color: { argb: "FF666666" } };

  // --- En-tetes ---
  if (useMultiHeaders) {
    const headerStartRow = sheet.rowCount + 1;

    for (let level = 0; level < multiHeaders.length; level++) {
      const cells = multiHeaders[level];
      const isLastLevel = level === multiHeaders.length - 1;

      const rowValues: string[] = [];

      // Row dimension labels (first row only, merged vertically later)
      if (level === 0) {
        rowValues.push(...rowDimKeys.map((k) => k.charAt(0).toUpperCase() + k.slice(1)));
      } else {
        rowValues.push(...Array(rowDimKeys.length).fill(""));
      }

      // Column headers (expand colSpan into individual cells)
      for (const cell of cells) {
        rowValues.push(cell.label);
        for (let j = 1; j < cell.colSpan; j++) {
          rowValues.push("");
        }
      }

      // Total column (first row only, merged vertically later)
      rowValues.push(level === 0 ? "Total" : "");

      const excelRow = sheet.addRow(rowValues);
      excelRow.font = { bold: true, size: 10 };

      // Style all cells
      for (let c = 1; c <= rowValues.length; c++) {
        const cell = excelRow.getCell(c);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isLastLevel ? es.headerBackgroundColor : "FFE8EDF5" },
        };
        cell.border = {
          bottom: { style: "thin", color: { argb: es.headerBorderColor } },
          right: { style: "thin", color: { argb: es.headerBorderColor } },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    }

    const headerEndRow = sheet.rowCount;

    // Merge row dim headers vertically across all header rows
    if (multiHeaders.length > 1) {
      for (let c = 1; c <= rowDimKeys.length; c++) {
        sheet.mergeCells(headerStartRow, c, headerEndRow, c);
      }
      // Merge Total column vertically
      const totalCol = rowDimKeys.length + result.columns.length + 1;
      sheet.mergeCells(headerStartRow, totalCol, headerEndRow, totalCol);
    }

    // Merge column headers horizontally for colSpan > 1
    for (let level = 0; level < multiHeaders.length; level++) {
      const cells = multiHeaders[level];
      const rowNum = headerStartRow + level;
      let colOffset = rowDimKeys.length + 1;

      for (const cell of cells) {
        if (cell.colSpan > 1) {
          sheet.mergeCells(rowNum, colOffset, rowNum, colOffset + cell.colSpan - 1);
        }
        colOffset += cell.colSpan;
      }
    }
  } else {
    // Single-level header (original behavior)
    const headers = [
      ...rowDimKeys.map((k) => k.charAt(0).toUpperCase() + k.slice(1)),
      ...result.columns.map((c) => c.label),
      "Total",
    ];
    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true, size: 10 };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: es.headerBackgroundColor },
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: es.headerBorderColor } },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
  }

  // --- Lignes de donnees ---
  for (const row of result.rows) {
    const values = [
      ...rowDimKeys.map((k) => row.dimensionValues[k] ?? ""),
      ...result.columns.map((col) => row.cells[col.key]?.value ?? 0),
      row.rowTotal.value,
    ];
    const dataRow = sheet.addRow(values);
    dataRow.font = { size: 10 };

    dataRow.eachCell((cell, colNumber) => {
      if (colNumber > rowDimKeys.length) {
        cell.alignment = { horizontal: "center" };
        cell.numFmt = es.numberFormat;
      }
    });
  }

  // --- Ligne totaux ---
  const totalValues = [
    "Total",
    ...Array(Math.max(0, rowDimKeys.length - 1)).fill(""),
    ...result.columns.map((col) => result.columnTotals[col.key]?.value ?? 0),
    result.grandTotal.value,
  ];
  const totalRow = sheet.addRow(totalValues);
  totalRow.font = { bold: true, size: 10 };
  totalRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: es.totalRowBackground },
    };
    cell.border = {
      top: { style: "thin", color: { argb: es.headerBorderColor } },
    };
  });

  // --- Auto-fit colonnes ---
  sheet.columns.forEach((col) => {
    col.width = es.defaultColumnWidth;
  });
  if (sheet.columns[0]) sheet.columns[0].width = es.firstColumnWidth;

  // Generer le buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
