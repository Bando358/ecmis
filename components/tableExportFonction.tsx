import { Worksheet } from "exceljs";
import { ClientData } from "./rapportPfActions";

export function tableExport(
  tableTitle: string,
  worksheet: Worksheet,
  startRow: number,
  colSpan: number,
  tabClientGyneco: { label: string; value: string }[],
  ageRanges: { min: number; max: number }[],
  clientData: ClientData[],
  countClientBoolean: (
    data: ClientData[],
    min: number,
    max: number,
    field: string,
    value: boolean
  ) => number
) {
  // Titre du tableau doit commencer à startRow - 1 (au-dessus de l'en-tête) et doit être en gras
  worksheet.getCell(startRow - 1, 1).value = tableTitle;
  worksheet.getCell(startRow - 1, 1).font = { bold: true };

  // === En-tête du tableau ===
  // "Indicateurs" fusionne colSpan colonnes
  worksheet.mergeCells(startRow, 1, startRow + 1, colSpan);
  worksheet.getCell(startRow, 1).value = "Indicateurs";

  // "Femmes" fusionne autant de colonnes que ageRanges
  worksheet.mergeCells(
    startRow,
    colSpan + 1,
    startRow,
    colSpan + ageRanges.length
  );
  worksheet.getCell(startRow, colSpan + 1).value = "Femmes";

  // "Total" fusionne 1 cellule
  const totalColIndex = colSpan + ageRanges.length + 1;
  worksheet.mergeCells(startRow, totalColIndex, startRow + 1, totalColIndex);
  worksheet.getCell(startRow, totalColIndex).value = "Total";

  // === Deuxième ligne : tranches d’âge ===
  const headerRow2 = worksheet.getRow(startRow + 1);
  ageRanges.forEach((range, index) => {
    headerRow2.getCell(colSpan + 1 + index).value =
      range.max < 120
        ? `${range.min}-${range.max} ans`
        : `${range.min} ans et +`;
  });

  // === Données ===
  let currentRow = startRow + 2;
  tabClientGyneco.forEach((item) => {
    const row = worksheet.getRow(currentRow);

    // libellé indicateur (fusion sur colSpan colonnes)
    worksheet.mergeCells(currentRow, 1, currentRow, colSpan);
    row.getCell(1).value = item.label;

    // colonnes par tranche
    ageRanges.forEach((range, index) => {
      row.getCell(colSpan + 1 + index).value = countClientBoolean(
        clientData,
        range.min,
        range.max,
        item.value,
        true
      );
    });

    // total
    const total = ageRanges.reduce(
      (sum, range) =>
        sum +
        countClientBoolean(clientData, range.min, range.max, item.value, true),
      0
    );
    row.getCell(totalColIndex).value = total;

    currentRow++;
  });

  // === Styles basiques ===
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell((cell) => {
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });
}

// Fonction d'export avec sexe
export function tableExportWithSexe(
  tableTitle: string,
  worksheet: Worksheet,
  startRow: number,
  colSpan: number,
  tabClient: { label: string; value: string }[],
  ageRanges: { min: number; max: number }[],
  clientData: ClientData[],
  countClientBooleanBySexe: (
    data: ClientData[],
    min: number,
    max: number,
    field: string,
    value: boolean,
    sexe: "Masculin" | "Féminin"
  ) => number
) {
  // === Titre du tableau ===
  worksheet.getCell(startRow - 1, 1).value = tableTitle;
  worksheet.getCell(startRow - 1, 1).font = { bold: true };

  // === En-tête du tableau ===
  // "Indicateurs" fusionne colSpan colonnes
  worksheet.mergeCells(startRow, 1, startRow + 1, colSpan);
  worksheet.getCell(startRow, 1).value = "Indicateurs";

  // Colonnes Masculin
  worksheet.mergeCells(
    startRow,
    colSpan + 1,
    startRow,
    colSpan + ageRanges.length
  );
  worksheet.getCell(startRow, colSpan + 1).value = "Masculin";

  // Colonnes Féminin
  const femininStart = colSpan + ageRanges.length + 1;
  const femininEnd = femininStart + ageRanges.length - 1;
  worksheet.mergeCells(startRow, femininStart, startRow, femininEnd);
  worksheet.getCell(startRow, femininStart).value = "Féminin";

  // Colonne Total
  const totalColIndex = femininEnd + 1;
  worksheet.mergeCells(startRow, totalColIndex, startRow + 1, totalColIndex);
  worksheet.getCell(startRow, totalColIndex).value = "Total";

  // === Deuxième ligne : tranches d’âge ===
  const headerRow2 = worksheet.getRow(startRow + 1);
  ageRanges.forEach((range, index) => {
    const label =
      range.max < 120
        ? `${range.min}-${range.max} ans`
        : `${range.min} ans et +`;
    headerRow2.getCell(colSpan + 1 + index).value = label; // Masculin
    headerRow2.getCell(femininStart + index).value = label; // Féminin
  });

  // === Données ===
  let currentRow = startRow + 2;
  tabClient.forEach((item) => {
    const row = worksheet.getRow(currentRow);

    // libellé indicateur
    worksheet.mergeCells(currentRow, 1, currentRow, colSpan);
    row.getCell(1).value = item.label;

    // Masculin
    ageRanges.forEach((range, index) => {
      row.getCell(colSpan + 1 + index).value = countClientBooleanBySexe(
        clientData,
        range.min,
        range.max,
        item.value,
        true,
        "Masculin"
      );
    });

    // Féminin
    ageRanges.forEach((range, index) => {
      row.getCell(femininStart + index).value = countClientBooleanBySexe(
        clientData,
        range.min,
        range.max,
        item.value,
        true,
        "Féminin"
      );
    });

    // Total (Masculin + Féminin sur toutes les tranches)
    const total = ageRanges.reduce(
      (sum, range) =>
        sum +
        countClientBooleanBySexe(
          clientData,
          range.min,
          range.max,
          item.value,
          true,
          "Masculin"
        ) +
        countClientBooleanBySexe(
          clientData,
          range.min,
          range.max,
          item.value,
          true,
          "Féminin"
        ),
      0
    );
    row.getCell(totalColIndex).value = total;

    currentRow++;
  });

  // === Styles basiques ===
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell((cell) => {
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });
}
