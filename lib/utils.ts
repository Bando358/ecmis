import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import ExcelJS from "exceljs";
import { GestionVisite } from "@prisma/client";

export const exportToExcel = async <T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  options?: {
    sheetName?: string;
    headerStyle?: Partial<ExcelJS.Style>;
    dataStyle?: Partial<ExcelJS.Style>;
    columnWidths?: number[];
    autoFilter?: boolean;
    freezeHeaders?: boolean;
    // If true, do not auto-insert a header row (useful when the data already
    // contains a custom header row like a section title row followed by a
    // column header row). When skipAutoHeader is true, the export will not
    // call worksheet.addRow(headers) automatically.
    skipAutoHeader?: boolean;
    // Optional merges for Excel (start/end indices are 0-based in our code),
    // but ExcelJS expects 1-based row/column indices when applying merges.
    merges?: Array<{
      start: { row: number; column: number };
      end: { row: number; column: number };
    }>;
    // Custom styles applied to cell ranges. `style` should be a partial
    // ExcelJS.Style object describing formatting for the given cells range.
    customStyles?: Array<{ cells: string; style: Partial<ExcelJS.Style> }>;
  }
) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Système de Rapport";
    workbook.lastModifiedBy = "Système de Rapport";
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet(options?.sheetName || "Sheet1");

    // Styles par défaut
    const defaultHeaderStyle: Partial<ExcelJS.Style> = {
      font: {
        name: "Arial",
        size: 12,
        bold: true,
        color: { argb: "FFFFFFFF" },
      },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2E75B6" },
      },
      alignment: {
        vertical: "middle",
        horizontal: "center",
      },
      border: {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      },
    };

    const defaultDataStyle: Partial<ExcelJS.Style> = {
      font: {
        name: "Arial",
        size: 10,
        color: { argb: "FF000000" },
      },
      alignment: {
        vertical: "middle",
        horizontal: "left",
      },
      border: {
        top: { style: "thin", color: { argb: "FFD0D0D0" } },
        left: { style: "thin", color: { argb: "FFD0D0D0" } },
        bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
        right: { style: "thin", color: { argb: "FFD0D0D0" } },
      },
    };

    const headerStyle = { ...defaultHeaderStyle, ...options?.headerStyle };
    const dataStyle = { ...defaultDataStyle, ...options?.dataStyle };

    // Obtenir les en-têtes (à partir des clés du premier objet)
    const headers = data.length > 0 ? Object.keys(data[0]) : [];

    if (headers.length === 0) {
      console.warn("Aucune donnée à exporter");
      return;
    }

    // Ajouter les en-têtes automatiquement à moins que l'appelant ait
    // demandé de gérer manuellement l'entête (skipAutoHeader). When
    // skipAutoHeader is true we assume the caller will provide explicit
    // header/data rows (for example: section row then header row then data).
    const skipAutoHeader = options?.skipAutoHeader === true;
    if (!skipAutoHeader) {
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell, colNumber) => {
        cell.style = headerStyle;
        cell.value = headers[colNumber - 1];
      });
    }

    // Appliquer la largeur des colonnes
    headers.forEach((header, index) => {
      const width =
        options?.columnWidths?.[index] || Math.max(header.length * 1.3, 12); // Largeur basée sur la longueur du texte
      worksheet.getColumn(index + 1).width = width;
    });

    // Nombre de lignes d'en-têtes présentes au début des `data`.
    // Si skipAutoHeader=true, on s'attend à ce que l'appelant ait fourni
    // une ligne de section puis une ligne d'en-têtes (2 lignes). Sinon
    // on considère qu'il y a 1 ligne d'en-tête (la ligne ajoutée automatiquement
    // par cet exporteur lorsqu'il n'y a pas skipAutoHeader).
    const headerRowsCount = skipAutoHeader ? 2 : 1;

    // Petite utilitaire pour convertir une lettre de colonne Excel en indice (A->1, B->2, ...)
    const colLetterToNumber = (letters: string) => {
      let number = 0;
      for (let i = 0; i < letters.length; i++) {
        number = number * 26 + (letters.charCodeAt(i) - 64);
      }
      return number;
    };

    // Ajouter les données avec mise en forme conditionnelle
    data.forEach((row, rowIndex) => {
      const dataRow = worksheet.addRow(Object.values(row));

      dataRow.eachCell((cell, colNumber) => {
        const value = row[headers[colNumber - 1]];

        // Style de base
        cell.style = { ...dataStyle };

        // Mise en forme conditionnelle basée sur le type de données
        if (typeof value === "number") {
          cell.style.alignment = { horizontal: "right" };
          cell.style.numFmt = "#,##0.00";

          // Coloration pour les valeurs numériques importantes
          if (Number(value) > 1000) {
            cell.style.font = {
              ...cell.style.font,
              bold: true,
              color: { argb: "FF006600" },
            };
          }
        } else if (typeof value === "boolean") {
          cell.value = value ? "Oui" : "Non";
          cell.style.alignment = { horizontal: "center" };
          cell.style.font = {
            ...cell.style.font,
            color: { argb: value ? "FF006600" : "FFCC0000" },
          };
        } else if (value instanceof Date) {
          cell.value = value;
          cell.style.numFmt = "dd/mm/yyyy";
          cell.style.alignment = { horizontal: "center" };
        } else if (
          typeof value === "string" &&
          value.match(/^\d{2}\/\d{2}\/\d{4}$/)
        ) {
          // Si c'est une chaîne qui ressemble à une date
          cell.style.alignment = { horizontal: "center" };
        }

        // Alternance des couleurs de ligne
        if (rowIndex % 2 === 0) {
          cell.style.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF2F2F2" },
          };
        } else {
          cell.style.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFFFFF" },
          };
        }

        // Mise en forme spéciale pour les valeurs vides — n'appliquer que
        // pour les lignes de données (ne pas remplacer les cellules vides
        // des lignes d'en-tête/section, car celles-ci sont utilisées pour
        // les merges et doivent rester vides si besoin).
        if (rowIndex >= headerRowsCount) {
          if (value === null || value === undefined || value === "") {
            cell.value = "N/A";
            cell.style.font = {
              ...cell.style.font,
              italic: true,
              color: { argb: "FF999999" },
            };
          }
        }
      });
    });

    // Appliquer les merges fournis (les merges sont fournis en 0-based dans
    // le code appelant ; ExcelJS utilise des indices 1-based)
    if (options?.merges && Array.isArray(options.merges)) {
      options.merges.forEach((m) => {
        const startRow = m.start.row + 1;
        const startCol = m.start.column + 1;
        const endRow = m.end.row + 1;
        const endCol = m.end.column + 1;

        try {
          worksheet.mergeCells(startRow, startCol, endRow, endCol);

          // Appliquer le style de header à la cellule supérieure gauche de la zone fusionnée
          const topLeft = worksheet.getCell(startRow, startCol);
          topLeft.style = {
            ...(topLeft.style as Partial<ExcelJS.Style>),
            ...headerStyle,
          } as Partial<ExcelJS.Style>;
          topLeft.alignment = {
            vertical: "middle",
            horizontal: "center",
          } as Partial<ExcelJS.Alignment>;
        } catch (err) {
          // Ne pas planter l'export si un merge est invalide
          console.warn("Impossible d'appliquer un merge Excel", m, err);
        }
      });
    }

    // Appliquer les styles personnalisés (format: { cells: "A1:D1", style })
    if (options?.customStyles && Array.isArray(options.customStyles)) {
      options.customStyles.forEach(({ cells, style }) => {
        // Parsing simple de la plage "A1:D1"
        const parts = cells.split(":");
        if (parts.length === 2) {
          const start = parts[0].match(/^([A-Z]+)(\d+)$/i);
          const end = parts[1].match(/^([A-Z]+)(\d+)$/i);
          if (start && end) {
            const startCol = colLetterToNumber(start[1].toUpperCase());
            const startRow = parseInt(start[2], 10);
            const endCol = colLetterToNumber(end[1].toUpperCase());
            const endRow = parseInt(end[2], 10);

            for (let r = startRow; r <= endRow; r++) {
              for (let c = startCol; c <= endCol; c++) {
                const cell = worksheet.getCell(r, c);
                cell.style = {
                  ...(cell.style as Partial<ExcelJS.Style>),
                  ...(style as Partial<ExcelJS.Style>),
                } as Partial<ExcelJS.Style>;
              }
            }
          }
        }
      });
    }
    // Appliquer le filtre automatique
    if (options?.autoFilter !== false) {
      const headerRowIndex = options?.skipAutoHeader ? 2 : 1;
      worksheet.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: data.length + (headerRowIndex - 1), column: headers.length },
      };
    }

    // Figer les en-têtes
    if (options?.freezeHeaders !== false) {
      const headerRowIndex = options?.skipAutoHeader ? 2 : 1;
      worksheet.views = [
        {
          state: "frozen",
          xSplit: 0,
          ySplit: headerRowIndex,
          activeCell: headerRowIndex === 1 ? "A2" : "A3",
          showGridLines: true,
        },
      ];
    }

    // Générer le fichier Excel
    const buffer = await workbook.xlsx.writeBuffer();

    // Télécharger le fichier
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${filename}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Libérer l'URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error("Erreur lors de l'export Excel:", error);
    throw new Error("Échec de l'export Excel");
  }
};

// Version simplifiée avec des options prédéfinies pour différents types de rapports
export const exportReportToExcel = {
  // Pour les rapports médicaux avec mise en forme spécifique
  medical: <T extends Record<string, unknown>>(data: T[], filename: string) => {
    return exportToExcel(data, filename, {
      sheetName: "Rapport Médical",
      headerStyle: {
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2E75B6" },
        },
        font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
      },
      columnWidths: [
        15, 20, 20, 10, 10, 15, 20, 15, 15, 15, 15, 15, 15, 15, 15,
      ],
      autoFilter: true,
      freezeHeaders: true,
    });
  },

  // Pour les rapports statistiques
  statistical: <T extends Record<string, unknown>>(
    data: T[],
    filename: string
  ) => {
    return exportToExcel(data, filename, {
      sheetName: "Statistiques",
      headerStyle: {
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF7030A0" },
        },
        font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
      },
      dataStyle: {
        alignment: { horizontal: "center" },
      },
      autoFilter: true,
      freezeHeaders: true,
    });
  },

  // Pour les listes simples
  simple: <T extends Record<string, unknown>>(data: T[], filename: string) => {
    return exportToExcel(data, filename, {
      sheetName: "Liste",
      headerStyle: {
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0070C0" },
        },
        font: { bold: true, color: { argb: "FFFFFFFF" } },
      },
      autoFilter: true,
      freezeHeaders: true,
    });
  },
};

// lib/utils.ts

export interface ExportData {
  // Données communes
  nom: string;
  prenom: string;
  age: number;
  telephone?: string;
  clinique: string;
  dateVisite: string;
  idVisite?: string;

  // Champs spécifiques selon le type de données
  [key: string]: unknown;
}

export interface ExportConfig {
  data: ExportData[];
  columns: {
    accessorKey: string;
    header: string;
  }[];
  gestionVisites: GestionVisite[];
  fileName: string;
}

export async function exportToExcelRdv(config: ExportConfig): Promise<void> {
  const { data, columns, gestionVisites, fileName } = config;

  // Créer un nouveau classeur
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Rendez-vous");

  // Définir les styles
  const headerStyle = {
    font: { bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E86AB" } },
    border: {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    },
    alignment: { vertical: "middle", horizontal: "center" },
  };

  const cellStyle = {
    border: {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    },
    alignment: { vertical: "middle", horizontal: "left" },
  };

  // Préparer les en-têtes
  const headers = [
    ...columns.map((col) => col.header),
    "Nombre Action",
    "Liste Action",
  ];

  // Ajouter les en-têtes
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.style = headerStyle as Partial<ExcelJS.Style>;
  });

  // Ajouter les données
  data.forEach((rowData) => {
    const rowValues: (string | number | boolean | Date | null | undefined)[] =
      [];

    // Ajouter les valeurs des colonnes standard
    columns.forEach((col) => {
      const value = rowData[col.accessorKey as keyof ExportData];
      // caster la valeur inconnue vers les types autorisés avant de l'ajouter
      rowValues.push(
        value !== undefined
          ? (value as string | number | boolean | Date | null)
          : ""
      );
    });

    // Récupérer les actions pour cette ligne
    const actionsForRow = gestionVisites.filter(
      (gestion) => gestion.idVisite === rowData.idVisite
    );

    // Ajouter le nombre d'actions
    rowValues.push(actionsForRow.length);

    // Formater la liste des actions
    const actionsList = actionsForRow
      .map((action) => {
        const date = action.createdAt
          ? new Date(action.createdAt).toLocaleDateString()
          : "Date inconnue";
        const nextDate = action.prochaineDate
          ? new Date(action.prochaineDate).toLocaleDateString()
          : "Non programmée";
        return `${date}: ${action.action} (Reprog: ${nextDate})${
          action.commentaire ? ` - ${action.commentaire}` : ""
        }`;
      })
      .join(";\n");

    rowValues.push(actionsList);

    // Ajouter la ligne
    const dataRow = worksheet.addRow(rowValues);

    // Appliquer le style aux cellules
    dataRow.eachCell((cell, colNumber) => {
      cell.style = cellStyle as Partial<ExcelJS.Style>;

      // Si c'est la colonne "Liste Action", permettre le retour à la ligne
      if (colNumber === headers.length) {
        cell.alignment = {
          ...(cell.style.alignment as Partial<ExcelJS.Alignment>),
          wrapText: true,
        } as Partial<ExcelJS.Alignment>;
      }
    });
  });

  // Ajuster la largeur des colonnes automatiquement
  worksheet.columns.forEach((column, index) => {
    let maxLength = 0;

    // Pour l'en-tête
    const header = headers[index];
    if (header && header.length > maxLength) {
      maxLength = header.length;
    }

    // Pour les données
    worksheet.getColumn(index + 1).eachCell({ includeEmpty: true }, (cell) => {
      const cellLength = cell.value ? cell.value.toString().length : 0;
      if (cellLength > maxLength) {
        maxLength = cellLength;
      }
    });

    // Limiter la largeur maximale pour éviter les colonnes trop larges
    column.width = Math.min(maxLength + 2, 50);
  });

  // Geler la première ligne (en-têtes)
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  // Générer le fichier Excel
  const buffer = await workbook.xlsx.writeBuffer();

  // Télécharger le fichier
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
