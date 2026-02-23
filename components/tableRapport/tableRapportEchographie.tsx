"use client";

import React, { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { Worksheet } from "exceljs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Spinner } from "../ui/spinner";
import { Button } from "../ui/button";
import { EchoServiceItem } from "@/lib/actions/rapportEchoActions";
import { Echographie } from "@prisma/client";
import { getAllEchographies } from "@/lib/actions/echographieActions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type AgeRange = { min: number; max: number };
type DateType = string | Date;

interface TableRapportEchoProps {
  ageRanges: AgeRange[];
  echoData: EchoServiceItem[];
  dateDebut: DateType;
  dateFin: DateType;
  clinic: string;
}

// Configuration des types de service échographie
const serviceTypesConfig = [
  {
    key: "GYNECOLOGIE",
    label: "Nombre de personnes reçues pour échographie gynécologique",
    shortCode: "GYN",
  },
  {
    key: "OBSTETRIQUE",
    label: "Nombre de personnes reçues pour échographie obstétricale",
    shortCode: "OBS",
  },
  {
    key: "INFERTILITE",
    label: "Nombre de personnes reçues pour échographie pour infertilité",
    shortCode: "INF",
  },
  {
    key: "MEDECINE_GENERALE",
    label: "Nombre de personnes reçues pour échographie pour MG",
    shortCode: "MG",
  },
];

// TypeEchographie → shortCode pour le préfixe "SRV - ECHO - ..."
const typeEchoShortCode: Record<string, string> = {
  GYN: "GYN",
  OBST: "OBS",
  INF: "INF",
  MDG: "MG",
  CAR: "CAR",
};

// TypeEchographie → ServiceEchographie (pour grouper)
const typeEchoToService: Record<string, string> = {
  GYN: "GYNECOLOGIE",
  OBST: "OBSTETRIQUE",
  INF: "INFERTILITE",
  MDG: "MEDECINE_GENERALE",
  CAR: "MEDECINE_GENERALE",
};

// Styles
const labelCellStyle: React.CSSProperties = {
  maxWidth: "450px",
  width: "450px",
  minWidth: "150px",
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "break-word",
};
const displayValue = (v: number) => (v === 0 ? "-" : v);
const dataCellClass = "text-center border border-gray-200 px-2 py-1";
const totalCellClass =
  "text-center border border-gray-200 px-2 py-1 font-semibold";
const headerCellClass = "font-semibold text-center border border-gray-300";
const sectionHeaderClass =
  "font-bold bg-blue-50 text-blue-900 border border-gray-300";
const subTotalRowClass = "bg-amber-50 font-semibold";

// --- Fonctions de comptage ---

/** Compte les clients uniques par sexe, âge et type de service */
const countUniqueClients = (
  data: EchoServiceItem[],
  serviceType: string,
  minAge: number,
  maxAge: number,
  sexe: string,
): number => {
  const uniqueClients = new Set<string>();
  data.forEach((item) => {
    if (
      item.serviceEchographie === serviceType &&
      item.ageClient !== null &&
      item.ageClient >= minAge &&
      item.ageClient <= maxAge &&
      item.sexeClient === sexe
    ) {
      uniqueClients.add(item.idClient);
    }
  });
  return uniqueClients.size;
};

/** Compte les services par nom d'échographie, sexe et âge */
const countServicesByName = (
  data: EchoServiceItem[],
  nomEchographie: string,
  minAge: number,
  maxAge: number,
  sexe: string,
): number => {
  const target = nomEchographie.trim().toLowerCase();
  return data.filter((item) => {
    const name = item.libelleEchographie.trim().toLowerCase();
    return (
      (name === target ||
        name.includes(target) ||
        target.includes(name)) &&
      item.ageClient !== null &&
      item.ageClient >= minAge &&
      item.ageClient <= maxAge &&
      item.sexeClient === sexe
    );
  }).length;
};

/** Compte les services par type de service, sexe et âge */
const countServicesByType = (
  data: EchoServiceItem[],
  serviceType: string,
  minAge: number,
  maxAge: number,
  sexe: string,
): number => {
  return data.filter(
    (item) =>
      item.serviceEchographie === serviceType &&
      item.ageClient !== null &&
      item.ageClient >= minAge &&
      item.ageClient <= maxAge &&
      item.sexeClient === sexe,
  ).length;
};

export default function TableRapportEchographie({
  ageRanges,
  echoData,
  dateDebut,
  dateFin,
  clinic,
}: TableRapportEchoProps) {
  const [echographies, setEchographies] = useState<Echographie[]>([]);
  const [spinner, setSpinner] = useState(false);
  const [spinnerPdf, setSpinnerPdf] = useState(false);

  useEffect(() => {
    getAllEchographies().then(setEchographies).catch(console.error);
  }, []);

  // Grouper les échographies par typeEchographie
  const echosByType: Record<string, Echographie[]> = {};
  echographies.forEach((echo) => {
    const type = echo.typeEchographie;
    if (!echosByType[type]) echosByType[type] = [];
    echosByType[type].push(echo);
  });

  // Ordre des groupes pour la section "Services Offerts"
  const serviceGroups = [
    { typeEcho: "GYN", label: "GYNÉCOLOGIE", serviceKey: "GYNECOLOGIE" },
    { typeEcho: "OBST", label: "OBSTÉTRIQUE", serviceKey: "OBSTETRIQUE" },
    { typeEcho: "INF", label: "INFERTILITÉ", serviceKey: "INFERTILITE" },
    {
      typeEcho: "MDG",
      label: "MÉDECINE GÉNÉRALE",
      serviceKey: "MEDECINE_GENERALE",
    },
  ];

  const totalColSpan = 2 + ageRanges.length * 2;

  // --- Calculs pour les sous-totaux et le grand total (Services) ---
  const computeServiceGroupSums = (serviceKey: string, typeEcho: string) => {
    const echos = echosByType[typeEcho] || [];
    return ageRanges.map((range) => {
      let m = 0,
        f = 0;
      echos.forEach((echo) => {
        m += countServicesByName(
          echoData,
          echo.nomEchographie,
          range.min,
          range.max,
          "Masculin",
        );
        f += countServicesByName(
          echoData,
          echo.nomEchographie,
          range.min,
          range.max,
          "Féminin",
        );
      });
      return { masculin: m, feminin: f };
    });
  };

  const allGroupSums = serviceGroups.map((g) =>
    computeServiceGroupSums(g.serviceKey, g.typeEcho),
  );
  const grandTotalResults = ageRanges.map((_, i) => {
    let m = 0,
      f = 0;
    allGroupSums.forEach((gs) => {
      m += gs[i].masculin;
      f += gs[i].feminin;
    });
    return { masculin: m, feminin: f };
  });
  const grandTotal = grandTotalResults.reduce(
    (s, r) => s + r.masculin + r.feminin,
    0,
  );

  // --- Calculs pour les totaux Section 1 (Clients Reçus) ---
  const clientsTotalResults = ageRanges.map((range) => {
    let m = 0,
      f = 0;
    serviceTypesConfig.forEach((svc) => {
      m += countUniqueClients(
        echoData,
        svc.key,
        range.min,
        range.max,
        "Masculin",
      );
      f += countUniqueClients(
        echoData,
        svc.key,
        range.min,
        range.max,
        "Féminin",
      );
    });
    return { masculin: m, feminin: f };
  });
  const clientsGrandTotal = clientsTotalResults.reduce(
    (s, r) => s + r.masculin + r.feminin,
    0,
  );

  // --- Render helpers ---
  const renderServiceSection = (
    typeEcho: string,
    label: string,
    serviceKey: string,
  ) => {
    const echos = echosByType[typeEcho] || [];
    const shortCode = typeEchoShortCode[typeEcho] || typeEcho;

    const echoResults = echos.map((echo) =>
      ageRanges.map((range) => ({
        masculin: countServicesByName(
          echoData,
          echo.nomEchographie,
          range.min,
          range.max,
          "Masculin",
        ),
        feminin: countServicesByName(
          echoData,
          echo.nomEchographie,
          range.min,
          range.max,
          "Féminin",
        ),
      })),
    );

    // Sous-total = somme colonne par colonne
    const columnSums = ageRanges.map((_, i) => {
      let m = 0,
        f = 0;
      echoResults.forEach((er) => {
        m += er[i].masculin;
        f += er[i].feminin;
      });
      return { masculin: m, feminin: f };
    });
    const subTotal = columnSums.reduce(
      (s, r) => s + r.masculin + r.feminin,
      0,
    );

    return (
      <React.Fragment key={serviceKey}>
        {/* Header de section */}
        <TableRow>
          <TableCell colSpan={totalColSpan} className={sectionHeaderClass}>
            {label}
          </TableCell>
        </TableRow>
        {/* Lignes détaillées */}
        {echos.map((echo, idx) => {
          const results = echoResults[idx];
          const total = results.reduce(
            (s, r) => s + r.masculin + r.feminin,
            0,
          );
          return (
            <TableRow
              key={echo.id}
              className={
                idx % 2 === 0
                  ? "bg-white hover:bg-gray-50"
                  : "bg-gray-50/50 hover:bg-gray-100"
              }
            >
              <TableCell
                className="font-medium pl-4 border border-gray-200"
                style={labelCellStyle}
              >
                {`SRV - ECHO - ${shortCode} - ${echo.nomEchographie}`}
              </TableCell>
              {results.map((r, i) => (
                <TableCell key={`m-${echo.id}-${i}`} className={dataCellClass}>
                  {displayValue(r.masculin)}
                </TableCell>
              ))}
              {results.map((r, i) => (
                <TableCell key={`f-${echo.id}-${i}`} className={dataCellClass}>
                  {displayValue(r.feminin)}
                </TableCell>
              ))}
              <TableCell className={totalCellClass}>
                {displayValue(total)}
              </TableCell>
            </TableRow>
          );
        })}
        {/* Sous-total */}
        <TableRow className={subTotalRowClass}>
          <TableCell
            className="font-semibold border border-gray-200 pl-4"
            style={labelCellStyle}
          >
            Sous-total {label}
          </TableCell>
          {columnSums.map((r, i) => (
            <TableCell key={`st-m-${serviceKey}-${i}`} className={totalCellClass}>
              {displayValue(r.masculin)}
            </TableCell>
          ))}
          {columnSums.map((r, i) => (
            <TableCell key={`st-f-${serviceKey}-${i}`} className={totalCellClass}>
              {displayValue(r.feminin)}
            </TableCell>
          ))}
          <TableCell className="text-center border border-gray-200 px-2 py-1 font-bold">
            {displayValue(subTotal)}
          </TableCell>
        </TableRow>
      </React.Fragment>
    );
  };

  // --- Export Excel ---
  const exportToExcel = async () => {
    setSpinner(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "ecmis";
      workbook.created = new Date();
      const ws = workbook.addWorksheet("Rapport_Echographie");

      // Logo
      try {
        const logoBase64 = await fetch("/LOGO_AIBEF_IPPF.png")
          .then((r) => r.blob())
          .then(
            (blob) =>
              new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              }),
          );
        const imageId = workbook.addImage({
          base64: logoBase64,
          extension: "png",
        });
        ws.addImage(imageId, "B1:H2");
      } catch {
        // ignore
      }

      // En-tête
      ws.getCell("A3").value = "Période";
      ws.getCell("B3").value = new Date(dateDebut).toLocaleDateString("fr-FR");
      ws.getCell("B4").value = new Date(dateFin).toLocaleDateString("fr-FR");
      ws.getCell("D3").value = clinic;
      ws.mergeCells("A3:A4");
      ws.mergeCells("B3:C3");
      ws.mergeCells("B4:C4");
      ws.mergeCells("D3:J4");
      ws.getColumn(1).width = 55;
      ["A3", "B3", "B4", "D3"].forEach((ref) => {
        const cell = ws.getCell(ref);
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { bold: true, size: ref === "A3" || ref === "D3" ? 14 : 12 };
      });

      const pdfVal = (v: number): string | number => (v === 0 ? "-" : v);

      const writeHeader = (startRow: number) => {
        ws.mergeCells(startRow, 1, startRow + 1, 1);
        ws.getCell(startRow, 1).value = "Rubriques";

        ws.mergeCells(
          startRow,
          2,
          startRow,
          1 + ageRanges.length,
        );
        ws.getCell(startRow, 2).value = "Masculin";

        const femStart = 2 + ageRanges.length;
        ws.mergeCells(startRow, femStart, startRow, femStart + ageRanges.length - 1);
        ws.getCell(startRow, femStart).value = "Féminin";

        const totalCol = femStart + ageRanges.length;
        ws.mergeCells(startRow, totalCol, startRow + 1, totalCol);
        ws.getCell(startRow, totalCol).value = "Totaux";

        const row2 = ws.getRow(startRow + 1);
        ageRanges.forEach((range, i) => {
          const label =
            range.max < 120
              ? `${range.min}-${range.max} ans`
              : `${range.min} ans et +`;
          row2.getCell(2 + i).value = label;
          row2.getCell(femStart + i).value = label;
        });

        // Styles
        [startRow, startRow + 1].forEach((r) => {
          for (let c = 1; c <= totalCol; c++) {
            const cell = ws.getCell(r, c);
            cell.font = { bold: true };
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
          }
        });
      };

      const applyBorders = (
        startR: number,
        endR: number,
        colCount: number,
      ) => {
        for (let r = startR; r <= endR; r++) {
          for (let c = 1; c <= colCount; c++) {
            const cell = ws.getCell(r, c);
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
          }
        }
      };

      const colCount = 2 + ageRanges.length * 2;
      let currentRow = 6;

      // === Section 1: Nombre de Clients Reçus ===
      ws.getCell(currentRow, 1).value =
        "Nombre de Clients Reçus";
      ws.getCell(currentRow, 1).font = { bold: true, size: 12 };
      currentRow += 1;
      const headerStart1 = currentRow;
      writeHeader(currentRow);
      currentRow += 2;

      serviceTypesConfig.forEach((svc) => {
        ws.getCell(currentRow, 1).value = svc.label;
        let col = 2;
        let rowTotal = 0;
        ageRanges.forEach((range) => {
          const v = countUniqueClients(
            echoData,
            svc.key,
            range.min,
            range.max,
            "Masculin",
          );
          rowTotal += v;
          ws.getCell(currentRow, col++).value = pdfVal(v);
        });
        ageRanges.forEach((range) => {
          const v = countUniqueClients(
            echoData,
            svc.key,
            range.min,
            range.max,
            "Féminin",
          );
          rowTotal += v;
          ws.getCell(currentRow, col++).value = pdfVal(v);
        });
        ws.getCell(currentRow, col).value = pdfVal(rowTotal);
        currentRow++;
      });

      applyBorders(headerStart1, currentRow - 1, colCount);
      currentRow += 2;

      // === Section 2: Nombre de Services Offerts ===
      ws.getCell(currentRow, 1).value = "Nombre de Services Offerts";
      ws.getCell(currentRow, 1).font = { bold: true, size: 12 };
      currentRow += 1;
      const headerStart2 = currentRow;
      writeHeader(currentRow);
      currentRow += 2;

      serviceGroups.forEach((group) => {
        const echos = echosByType[group.typeEcho] || [];
        const shortCode = typeEchoShortCode[group.typeEcho] || group.typeEcho;

        echos.forEach((echo) => {
          ws.getCell(
            currentRow,
            1,
          ).value = `SRV - ECHO - ${shortCode} - ${echo.nomEchographie}`;
          let col = 2;
          let rowTotal = 0;
          ageRanges.forEach((range) => {
            const v = countServicesByName(
              echoData,
              echo.nomEchographie,
              range.min,
              range.max,
              "Masculin",
            );
            rowTotal += v;
            ws.getCell(currentRow, col++).value = pdfVal(v);
          });
          ageRanges.forEach((range) => {
            const v = countServicesByName(
              echoData,
              echo.nomEchographie,
              range.min,
              range.max,
              "Féminin",
            );
            rowTotal += v;
            ws.getCell(currentRow, col++).value = pdfVal(v);
          });
          ws.getCell(currentRow, col).value = pdfVal(rowTotal);
          currentRow++;
        });
      });

      // Totaux ligne
      ws.getCell(currentRow, 1).value = "TOTAUX";
      ws.getCell(currentRow, 1).font = { bold: true, size: 12 };
      let gtCol = 2;
      let gtAll = 0;
      ageRanges.forEach((_, i) => {
        const v = grandTotalResults[i].masculin;
        gtAll += v;
        const cell = ws.getCell(currentRow, gtCol++);
        cell.value = pdfVal(v);
        cell.font = { bold: true };
      });
      ageRanges.forEach((_, i) => {
        const v = grandTotalResults[i].feminin;
        gtAll += v;
        const cell = ws.getCell(currentRow, gtCol++);
        cell.value = pdfVal(v);
        cell.font = { bold: true };
      });
      const gtCell = ws.getCell(currentRow, gtCol);
      gtCell.value = pdfVal(gtAll);
      gtCell.font = { bold: true, size: 12 };

      // Style total général
      for (let c = 1; c <= gtCol; c++) {
        const cell = ws.getCell(currentRow, c);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF334155" },
        };
        cell.font = {
          ...cell.font,
          color: { argb: "FFFFFFFF" },
          bold: true,
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }

      applyBorders(headerStart2, currentRow - 1, colCount);

      // Téléchargement
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Rapport_Echographie_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Erreur export Excel:", error);
    } finally {
      setSpinner(false);
    }
  };

  // --- Export PDF ---
  const exportToPdf = async () => {
    setSpinnerPdf(true);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Logo
      let logoBase64 = "";
      try {
        const resp = await fetch("/LOGO_AIBEF_IPPF.png");
        const blob = await resp.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch {
        // ignore
      }
      if (logoBase64) {
        const logoWidth = pageWidth * 0.6;
        doc.addImage(
          logoBase64,
          "PNG",
          (pageWidth - logoWidth) / 2,
          10,
          logoWidth,
          20,
        );
      }

      // Période
      const debut = new Date(dateDebut);
      const fin = new Date(dateFin);
      const isFullMonth =
        debut.getDate() === 1 &&
        fin.getDate() ===
          new Date(fin.getFullYear(), fin.getMonth() + 1, 0).getDate() &&
        debut.getMonth() === fin.getMonth() &&
        debut.getFullYear() === fin.getFullYear();
      const moisNoms = [
        "JANVIER",
        "FEVRIER",
        "MARS",
        "AVRIL",
        "MAI",
        "JUIN",
        "JUILLET",
        "AOUT",
        "SEPTEMBRE",
        "OCTOBRE",
        "NOVEMBRE",
        "DECEMBRE",
      ];
      const periodeText = isFullMonth
        ? `${moisNoms[debut.getMonth()]} ${debut.getFullYear()}`
        : `${debut.toLocaleDateString("fr-FR")} - ${fin.toLocaleDateString("fr-FR")}`;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Rapport Mensuel de Prestation des services d'Imagerie Médicale`,
        pageWidth / 2,
        35,
        { align: "center" },
      );
      doc.setFontSize(11);
      doc.text(`${clinic} - ${periodeText}`, pageWidth / 2, 42, {
        align: "center",
      });

      let currentY = 50;
      const pVal = (v: number) => (v === 0 ? "-" : String(v));

      const genHeaders = () => [
        [
          { content: "Rubriques", rowSpan: 2 },
          { content: "Masculin", colSpan: ageRanges.length },
          { content: "Féminin", colSpan: ageRanges.length },
          { content: "Totaux", rowSpan: 2 },
        ],
        [
          ...ageRanges.map((r) =>
            r.max < 120 ? `${r.min}-${r.max}` : `${r.min}+`,
          ),
          ...ageRanges.map((r) =>
            r.max < 120 ? `${r.min}-${r.max}` : `${r.min}+`,
          ),
        ],
      ];

      // --- PDF Section 1: Nombre de Clients Reçus ---
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Nombre de Clients Reçus", 14, currentY);
      currentY += 5;

      const clientRows = serviceTypesConfig.map((svc) => {
        const row = [svc.label];
        let total = 0;
        ageRanges.forEach((r) => {
          const v = countUniqueClients(
            echoData,
            svc.key,
            r.min,
            r.max,
            "Masculin",
          );
          total += v;
          row.push(pVal(v));
        });
        ageRanges.forEach((r) => {
          const v = countUniqueClients(
            echoData,
            svc.key,
            r.min,
            r.max,
            "Féminin",
          );
          total += v;
          row.push(pVal(v));
        });
        row.push(pVal(total));
        return row;
      });

      autoTable(doc, {
        startY: currentY,
        head: genHeaders(),
        body: clientRows,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: 0,
          fontStyle: "bold",
        },
        columnStyles: { 0: { cellWidth: 65 } },
      });
      currentY =
        (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 10;

      // --- PDF Section 2: Nombre de Services Offerts ---
      if (currentY > 170) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Nombre de Services Offerts", 14, currentY);
      currentY += 5;

      const serviceRows: string[][] = [];
      serviceGroups.forEach((group) => {
        const echos = echosByType[group.typeEcho] || [];
        const shortCode = typeEchoShortCode[group.typeEcho] || group.typeEcho;

        echos.forEach((echo) => {
          const row = [`SRV - ECHO - ${shortCode} - ${echo.nomEchographie}`];
          let total = 0;
          ageRanges.forEach((r) => {
            const v = countServicesByName(
              echoData,
              echo.nomEchographie,
              r.min,
              r.max,
              "Masculin",
            );
            total += v;
            row.push(pVal(v));
          });
          ageRanges.forEach((r) => {
            const v = countServicesByName(
              echoData,
              echo.nomEchographie,
              r.min,
              r.max,
              "Féminin",
            );
            total += v;
            row.push(pVal(v));
          });
          row.push(pVal(total));
          serviceRows.push(row);
        });
      });

      // Ligne totaux
      const totauxRow = ["Totaux"];
      let totauxAll = 0;
      ageRanges.forEach((_, i) => {
        totauxAll += grandTotalResults[i].masculin;
        totauxRow.push(pVal(grandTotalResults[i].masculin));
      });
      ageRanges.forEach((_, i) => {
        totauxAll += grandTotalResults[i].feminin;
        totauxRow.push(pVal(grandTotalResults[i].feminin));
      });
      totauxRow.push(pVal(totauxAll));
      serviceRows.push(totauxRow);

      autoTable(doc, {
        startY: currentY,
        head: genHeaders(),
        body: serviceRows,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: 0,
          fontStyle: "bold",
        },
        columnStyles: { 0: { cellWidth: 65 } },
        didParseCell: (data) => {
          // Dernière ligne (Totaux) en gras
          if (data.row.index === serviceRows.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [51, 65, 85];
            data.cell.styles.textColor = 255;
          }
        },
      });
      currentY =
        (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 20;

      // Signature
      if (currentY > 180) {
        doc.addPage();
        currentY = 30;
      }
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Réalisé par: ____________________________", 14, currentY);
      doc.text(
        "Signature: ____________________________",
        pageWidth - 100,
        currentY,
      );

      doc.save(
        `Rapport_Echographie_${new Date().toLocaleDateString("fr-FR")}.pdf`,
      );
    } catch (error) {
      console.error("Erreur export PDF:", error);
    } finally {
      setSpinnerPdf(false);
    }
  };

  // --- Rendu JSX ---
  return (
    <div className="flex flex-col gap-4 bg-gray-50 opacity-90 p-4 rounded-sm mt-2 w-full overflow-x-auto">
      {/* Boutons export */}
      <div className="flex gap-2 justify-center">
        <Button
          onClick={exportToExcel}
          type="button"
          disabled={spinner}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          <Spinner
            show={spinner}
            size="small"
            className="text-white dark:text-slate-400"
          />
          Exporter Excel
        </Button>
        <Button
          onClick={exportToPdf}
          type="button"
          disabled={spinnerPdf}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
        >
          <Spinner
            show={spinnerPdf}
            size="small"
            className="text-white dark:text-slate-400"
          />
          Exporter PDF
        </Button>
      </div>

      <h2 className="font-bold text-lg">
        Rapport Mensuel de Prestation des services d&apos;Imagerie Médicale
      </h2>

      {/* ===== TABLE UNIFIÉE ===== */}
      <Table className="border border-gray-300">
        <TableHeader className="bg-slate-100 sticky top-0 z-10">
          <TableRow>
            <TableHead
              rowSpan={2}
              className={`${headerCellClass} min-w-[250px]`}
              style={labelCellStyle}
            >
              Rubriques
            </TableHead>
            <TableHead
              colSpan={ageRanges.length}
              className={`${headerCellClass} bg-blue-50`}
            >
              Masculin
            </TableHead>
            <TableHead
              colSpan={ageRanges.length}
              className={`${headerCellClass} bg-pink-50`}
            >
              Féminin
            </TableHead>
            <TableHead
              rowSpan={2}
              className={`${headerCellClass} min-w-[60px]`}
            >
              Totaux
            </TableHead>
          </TableRow>
          <TableRow className="bg-slate-200 text-center">
            {ageRanges.map((range, index) => (
              <TableHead
                key={`m-h-${index}`}
                className={`${headerCellClass} bg-blue-50/50 text-xs min-w-[55px]`}
              >
                {range.max < 120
                  ? `${range.min}-${range.max}`
                  : `${range.min}+`}
              </TableHead>
            ))}
            {ageRanges.map((range, index) => (
              <TableHead
                key={`f-h-${index}`}
                className={`${headerCellClass} bg-pink-50/50 text-xs min-w-[55px]`}
              >
                {range.max < 120
                  ? `${range.min}-${range.max}`
                  : `${range.min}+`}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {/* ===== Section 1: Nombre de Clients Reçus ===== */}
          <TableRow>
            <TableCell
              colSpan={totalColSpan}
              className="font-bold bg-slate-200 text-slate-800 border border-gray-300 text-center"
            >
              Nombre de Clients Reçus
            </TableCell>
          </TableRow>
          {serviceTypesConfig.map((svc, idx) => {
            const results = ageRanges.map((range) => ({
              masculin: countUniqueClients(
                echoData,
                svc.key,
                range.min,
                range.max,
                "Masculin",
              ),
              feminin: countUniqueClients(
                echoData,
                svc.key,
                range.min,
                range.max,
                "Féminin",
              ),
            }));
            const total = results.reduce(
              (s, r) => s + r.masculin + r.feminin,
              0,
            );
            return (
              <TableRow
                key={svc.key}
                className={
                  idx % 2 === 0
                    ? "bg-white hover:bg-gray-50"
                    : "bg-gray-50/50 hover:bg-gray-100"
                }
              >
                <TableCell
                  className="font-medium border border-gray-200"
                  style={labelCellStyle}
                >
                  {svc.label}
                </TableCell>
                {results.map((r, i) => (
                  <TableCell
                    key={`c-m-${svc.key}-${i}`}
                    className={dataCellClass}
                  >
                    {displayValue(r.masculin)}
                  </TableCell>
                ))}
                {results.map((r, i) => (
                  <TableCell
                    key={`c-f-${svc.key}-${i}`}
                    className={dataCellClass}
                  >
                    {displayValue(r.feminin)}
                  </TableCell>
                ))}
                <TableCell className={totalCellClass}>
                  {displayValue(total)}
                </TableCell>
              </TableRow>
            );
          })}
          {/* Total clients reçus */}
          <TableRow className={subTotalRowClass}>
            <TableCell
              className="font-semibold border border-gray-200 pl-4"
              style={labelCellStyle}
            >
              Total Clients Reçus
            </TableCell>
            {clientsTotalResults.map((r, i) => (
              <TableCell key={`ct-m-${i}`} className={totalCellClass}>
                {displayValue(r.masculin)}
              </TableCell>
            ))}
            {clientsTotalResults.map((r, i) => (
              <TableCell key={`ct-f-${i}`} className={totalCellClass}>
                {displayValue(r.feminin)}
              </TableCell>
            ))}
            <TableCell className="text-center border border-gray-200 px-2 py-1 font-bold">
              {displayValue(clientsGrandTotal)}
            </TableCell>
          </TableRow>

          {/* ===== Section 2: Nombre de Services Offerts ===== */}
          <TableRow>
            <TableCell
              colSpan={totalColSpan}
              className="font-bold bg-slate-200 text-slate-800 border border-gray-300 text-center"
            >
              Nombre de Services Offerts
            </TableCell>
          </TableRow>
          {serviceGroups.map((group) =>
            renderServiceSection(
              group.typeEcho,
              group.label,
              group.serviceKey,
            ),
          )}

          {/* ===== Total Général ===== */}
          <TableRow className="bg-slate-800 text-white">
            <TableCell
              className="font-bold border border-gray-400 pl-4"
              style={labelCellStyle}
            >
              TOTAL GÉNÉRAL
            </TableCell>
            {grandTotalResults.map((r, i) => (
              <TableCell
                key={`gt-m-${i}`}
                className="text-center border border-gray-400 px-2 py-1 font-bold"
              >
                {displayValue(r.masculin)}
              </TableCell>
            ))}
            {grandTotalResults.map((r, i) => (
              <TableCell
                key={`gt-f-${i}`}
                className="text-center border border-gray-400 px-2 py-1 font-bold"
              >
                {displayValue(r.feminin)}
              </TableCell>
            ))}
            <TableCell className="text-center border border-gray-400 px-2 py-1 font-bold text-lg">
              {displayValue(grandTotal)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
