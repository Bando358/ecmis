import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { ClientData, clientDataProps } from "../rapportPfActions";
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

type AgeRange = { min: number; max: number };

export type convertedType = clientDataProps & {
  hasPoidsTaille: boolean;
  nutMaigreur: boolean;
  nutNormal: boolean;
  nutSurpoids: boolean;
  nutObesite: boolean;
  pfPilule: boolean;
  pfInjectable2mois: boolean;
  pfInjectable3mois: boolean;
  pfImplanon: boolean;
  pfJadelle: boolean;
  pfSterilet: boolean;
  pfPreservatif: boolean;
  pfUrgence: boolean;
  pfSpermicide: boolean;
  pfAucune: boolean;
};

type DateType = string | Date;

interface TableRapportNutritionProps {
  ageRanges: AgeRange[];
  clientData: ClientData[];
  dateDebut: DateType;
  dateFin: DateType;
  clinic: string;
}

const INDICATEURS_GLOBAL = [
  {
    label: "Nombre de personnes avec poids et taille",
    value: "hasPoidsTaille",
  },
  { label: "Maigreur", value: "nutMaigreur" },
  { label: "Poids normal", value: "nutNormal" },
  { label: "Surpoids", value: "nutSurpoids" },
  { label: "Obésité", value: "nutObesite" },
];

const METHODES_PF = [
  { label: "Pilules", value: "pfPilule" },
  { label: "Injectable 2 mois", value: "pfInjectable2mois" },
  { label: "Injectable 3 mois", value: "pfInjectable3mois" },
  { label: "Implant (Implanon)", value: "pfImplanon" },
  { label: "Implant (Jadelle)", value: "pfJadelle" },
  { label: "DIU", value: "pfSterilet" },
  { label: "Préservatif", value: "pfPreservatif" },
  { label: "Contraception d'urgence", value: "pfUrgence" },
  { label: "Spermicides", value: "pfSpermicide" },
  { label: "Aucune méthode", value: "pfAucune" },
];

const countByBooleanAndAge = (
  clientData: convertedType[],
  minAge: number,
  maxAge: number,
  propriete: string,
): number => {
  if (!Array.isArray(clientData) || clientData.length === 0) return 0;
  return clientData.reduce((acc, client) => {
    const ageOk = client.age >= minAge && client.age <= maxAge;
    const valueOk = client[propriete as keyof convertedType] === true;
    return ageOk && valueOk ? acc + 1 : acc;
  }, 0);
};

const countByBooleanAndAgeAndSexe = (
  clientData: convertedType[],
  minAge: number,
  maxAge: number,
  propriete: string,
  sexe: "Masculin" | "Féminin",
): number => {
  if (!Array.isArray(clientData) || clientData.length === 0) return 0;
  return clientData.reduce((acc, client) => {
    const ageOk = client.age >= minAge && client.age <= maxAge;
    const sexeOk = client.sexe === sexe;
    const valueOk = client[propriete as keyof convertedType] === true;
    return ageOk && sexeOk && valueOk ? acc + 1 : acc;
  }, 0);
};

const countByTwoBooleans = (
  clientData: convertedType[],
  prop1: string,
  prop2: string,
): number => {
  if (!Array.isArray(clientData) || clientData.length === 0) return 0;
  return clientData.reduce((acc, client) => {
    const ok1 = client[prop1 as keyof convertedType] === true;
    const ok2 = client[prop2 as keyof convertedType] === true;
    return ok1 && ok2 ? acc + 1 : acc;
  }, 0);
};

export default function TableRapportNutrition({
  ageRanges,
  clientData,
  dateDebut,
  dateFin,
  clinic,
}: TableRapportNutritionProps) {
  const [converted, setConverted] = useState<convertedType[]>([]);
  const [spinnerPdf, setSpinnerPdf] = useState(false);
  const [spinnerExcel, setSpinnerExcel] = useState(false);

  useEffect(() => {
    if (!clientData || clientData.length === 0) {
      setConverted([]);
      return;
    }
    const newConverted = clientData.map((item) => {
      const etat = (item.etatImc || "").trim();
      const hasMethod =
        item.methodePrise === true ||
        !!item.implanon ||
        !!item.jadelle ||
        !!item.sterilet ||
        !!item.courtDuree;
      const poidsOk = typeof item.poids === "number" && item.poids > 0;
      const tailleOk = typeof item.taille === "number" && item.taille > 0;
      return {
        ...item,
        hasPoidsTaille: poidsOk && tailleOk,
        nutMaigreur: etat === "Maigreur",
        nutNormal: etat === "Poids normal",
        nutSurpoids: etat === "Surpoids",
        nutObesite: etat === "Obésité",
        pfPilule: item.courtDuree === "pilule",
        pfInjectable2mois: item.courtDuree === "noristerat",
        pfInjectable3mois: item.courtDuree === "injectable",
        pfImplanon: !!item.implanon,
        pfJadelle: !!item.jadelle,
        pfSterilet: !!item.sterilet,
        pfPreservatif: item.courtDuree === "preservatif",
        pfUrgence: item.courtDuree === "urgence",
        pfSpermicide: item.courtDuree === "spermicide",
        pfAucune: !hasMethod,
      };
    });
    setConverted(newConverted);
  }, [clientData]);

  if (converted.length === 0) {
    return <p className="text-center">Aucune donnée disponible.</p>;
  }

  const buildGlobalTotals = (propValue: string) => {
    const values = ageRanges.map((r) =>
      countByBooleanAndAge(converted, r.min, r.max, propValue),
    );
    const total = values.reduce((a, b) => a + b, 0);
    return { values, total };
  };

  const buildGlobalTotalsBySexe = (propValue: string) => {
    const masc = ageRanges.map((r) =>
      countByBooleanAndAgeAndSexe(
        converted,
        r.min,
        r.max,
        propValue,
        "Masculin",
      ),
    );
    const fem = ageRanges.map((r) =>
      countByBooleanAndAgeAndSexe(converted, r.min, r.max, propValue, "Féminin"),
    );
    const total =
      masc.reduce((a, b) => a + b, 0) + fem.reduce((a, b) => a + b, 0);
    return { masc, fem, total };
  };

  const exportToExcel = async () => {
    setSpinnerExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Nutrition");

      const logoBase64 = await fetch("/LOGO_AIBEF_IPPF.png")
        .then((res) => res.blob())
        .then(
          (blob) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            }),
        )
        .catch(() => "");

      if (logoBase64) {
        const imageId = workbook.addImage({
          base64: logoBase64,
          extension: "png",
        });
        worksheet.addImage(imageId, "B1:H2");
      }

      worksheet.getCell("A3").value = "Période";
      worksheet.getCell("B3").value = new Date(dateDebut).toLocaleDateString(
        "fr-FR",
      );
      worksheet.getCell("B4").value = new Date(dateFin).toLocaleDateString(
        "fr-FR",
      );
      worksheet.getCell("D3").value = clinic;

      worksheet.mergeCells("A3:A4");
      worksheet.mergeCells("B3:C3");
      worksheet.mergeCells("B4:C4");
      worksheet.mergeCells("D3:J4");

      worksheet.getColumn(1).width = 35;
      for (let i = 2; i <= 30; i++) {
        worksheet.getColumn(i).width = 14;
      }

      ["A3", "B3", "B4", "D3"].forEach((cellRef) => {
        const cell = worksheet.getCell(cellRef);
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = {
          bold: true,
          size: cellRef === "A3" || cellRef === "D3" ? 16 : 12,
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // ===== Tableau 1 : Etat Nutritionnel Global =====
      let startRow = 6;
      worksheet.getCell(`A${startRow}`).value =
        "Tableau 1 : Etat Nutritionnel Global";
      worksheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };

      const hdr1 = startRow + 2;
      const ageStart = 2;
      const totalCol = ageStart + ageRanges.length;

      worksheet.getCell(hdr1, 1).value = "Indicateurs";
      ageRanges.forEach((r, idx) => {
        const label =
          r.max < 120 ? `${r.min}-${r.max} ans` : `${r.min} ans et +`;
        worksheet.getCell(hdr1, ageStart + idx).value = label;
      });
      worksheet.getCell(hdr1, totalCol).value = "Total";

      let currentRow = hdr1 + 1;
      INDICATEURS_GLOBAL.forEach((ind) => {
        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = ind.label;
        const { values, total } = buildGlobalTotals(ind.value);
        values.forEach((v, i) => {
          row.getCell(ageStart + i).value = v;
        });
        row.getCell(totalCol).value = total;
        currentRow++;
      });

      for (let r = hdr1; r < currentRow; r++) {
        for (let c = 1; c <= totalCol; c++) {
          const cell = worksheet.getCell(r, c);
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          if (r === hdr1) {
            cell.font = { bold: true };
            cell.alignment = {
              vertical: "middle",
              horizontal: "center",
              wrapText: true,
            };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE2E8F0" },
            };
          } else {
            cell.alignment = {
              vertical: "middle",
              horizontal: c === 1 ? "left" : "center",
              wrapText: true,
            };
          }
        }
      }

      // ===== Tableau 1.1 : Etat Nutritionnel Global par sexe =====
      startRow = currentRow + 3;
      worksheet.getCell(`A${startRow}`).value =
        "Tableau 1.1 : Etat Nutritionnel Global par sexe";
      worksheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };

      const sxHdr1 = startRow + 2;
      const sxHdr2 = startRow + 3;
      const sxMascStart = 2;
      const sxFemStart = sxMascStart + ageRanges.length;
      const sxTotalCol = sxFemStart + ageRanges.length;

      worksheet.mergeCells(sxHdr1, 1, sxHdr2, 1);
      worksheet.getCell(sxHdr1, 1).value = "Indicateurs";

      worksheet.mergeCells(
        sxHdr1,
        sxMascStart,
        sxHdr1,
        sxMascStart + ageRanges.length - 1,
      );
      worksheet.getCell(sxHdr1, sxMascStart).value = "Masculin";

      worksheet.mergeCells(
        sxHdr1,
        sxFemStart,
        sxHdr1,
        sxFemStart + ageRanges.length - 1,
      );
      worksheet.getCell(sxHdr1, sxFemStart).value = "Féminin";

      worksheet.mergeCells(sxHdr1, sxTotalCol, sxHdr2, sxTotalCol);
      worksheet.getCell(sxHdr1, sxTotalCol).value = "Total";

      ageRanges.forEach((r, idx) => {
        const label =
          r.max < 120 ? `${r.min}-${r.max} ans` : `${r.min} ans et +`;
        worksheet.getCell(sxHdr2, sxMascStart + idx).value = label;
        worksheet.getCell(sxHdr2, sxFemStart + idx).value = label;
      });

      currentRow = sxHdr2 + 1;
      INDICATEURS_GLOBAL.forEach((ind) => {
        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = ind.label;
        const { masc, fem, total } = buildGlobalTotalsBySexe(ind.value);
        masc.forEach((v, i) => {
          row.getCell(sxMascStart + i).value = v;
        });
        fem.forEach((v, i) => {
          row.getCell(sxFemStart + i).value = v;
        });
        row.getCell(sxTotalCol).value = total;
        currentRow++;
      });

      for (let r = sxHdr1; r < currentRow; r++) {
        for (let c = 1; c <= sxTotalCol; c++) {
          const cell = worksheet.getCell(r, c);
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          if (r <= sxHdr2) {
            cell.font = { bold: true };
            cell.alignment = {
              vertical: "middle",
              horizontal: "center",
              wrapText: true,
            };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE2E8F0" },
            };
          } else {
            cell.alignment = {
              vertical: "middle",
              horizontal: c === 1 ? "left" : "center",
              wrapText: true,
            };
          }
        }
      }

      // ===== Tableau 2 : Etat Nutritionnel par Méthode PF =====
      startRow = currentRow + 3;
      worksheet.getCell(`A${startRow}`).value =
        "Tableau 2 : Etat Nutritionnel par Méthode de Planification Familiale";
      worksheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };

      const pfHdr = startRow + 2;
      worksheet.getCell(pfHdr, 1).value = "Etat nutritionnel";
      METHODES_PF.forEach((m, idx) => {
        worksheet.getCell(pfHdr, 2 + idx).value = m.label;
      });
      const pfTotalCol = 2 + METHODES_PF.length;
      worksheet.getCell(pfHdr, pfTotalCol).value = "Total";

      currentRow = pfHdr + 1;
      INDICATEURS_GLOBAL.forEach((ind) => {
        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = ind.label;
        let totalRow = 0;
        METHODES_PF.forEach((m, idx) => {
          const v = countByTwoBooleans(converted, ind.value, m.value);
          row.getCell(2 + idx).value = v;
          totalRow += v;
        });
        row.getCell(pfTotalCol).value = totalRow;
        currentRow++;
      });

      for (let r = pfHdr; r < currentRow; r++) {
        for (let c = 1; c <= pfTotalCol; c++) {
          const cell = worksheet.getCell(r, c);
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          if (r === pfHdr) {
            cell.font = { bold: true };
            cell.alignment = {
              vertical: "middle",
              horizontal: "center",
              wrapText: true,
            };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE2E8F0" },
            };
          } else {
            cell.alignment = {
              vertical: "middle",
              horizontal: c === 1 ? "left" : "center",
              wrapText: true,
            };
          }
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Rapport_Nutrition_${new Date().toLocaleDateString(
        "fr-FR",
      )}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Erreur export Excel:", error);
    } finally {
      setSpinnerExcel(false);
    }
  };

  const exportToPdf = async () => {
    setSpinnerPdf(true);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();

      let logoBase64 = "";
      try {
        const logoResponse = await fetch("/LOGO_AIBEF_IPPF.png");
        const logoBlob = await logoResponse.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });
      } catch (err) {
        console.warn("Logo non trouvé:", err);
      }
      if (logoBase64) {
        const logoWidth = pageWidth * 0.6;
        const logoHeight = 20;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(logoBase64, "PNG", logoX, 10, logoWidth, logoHeight);
      }

      const debut = new Date(dateDebut);
      const fin = new Date(dateFin);
      const isFullMonth =
        debut.getDate() === 1 &&
        fin.getDate() ===
          new Date(fin.getFullYear(), fin.getMonth() + 1, 0).getDate() &&
        debut.getMonth() === fin.getMonth() &&
        debut.getFullYear() === fin.getFullYear();

      let periodeText: string;
      if (isFullMonth) {
        const moisNoms = [
          "JANVIER", "FEVRIER", "MARS", "AVRIL", "MAI", "JUIN",
          "JUILLET", "AOUT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DECEMBRE",
        ];
        periodeText = `${moisNoms[debut.getMonth()]} ${debut.getFullYear()}`;
      } else {
        periodeText = `${debut.toLocaleDateString("fr-FR")} - ${fin.toLocaleDateString("fr-FR")}`;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Rapport Etat Nutritionnel - ${clinic}`, pageWidth / 2, 35, {
        align: "center",
      });
      doc.setFontSize(11);
      doc.text(`Période: ${periodeText}`, pageWidth / 2, 42, { align: "center" });

      let currentY = 50;

      // Tableau 1 : Global
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Tableau 1 : Etat Nutritionnel Global", 14, currentY);
      currentY += 4;

      const ageLabels = ageRanges.map((r) =>
        r.max < 120 ? `${r.min}-${r.max}` : `${r.min}+`,
      );

      const globalHead = [["Indicateurs", ...ageLabels, "Total"]];
      const globalBody = INDICATEURS_GLOBAL.map((ind) => {
        const { values, total } = buildGlobalTotals(ind.value);
        return [ind.label, ...values, total];
      });

      autoTable(doc, {
        startY: currentY,
        head: globalHead,
        body: globalBody,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2, halign: "center" },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: 0,
          fontStyle: "bold",
        },
        columnStyles: { 0: { halign: "left", cellWidth: 70 } },
      });

      currentY =
        (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 10;

      // Tableau 1.1 : Global par sexe
      if (currentY > 160) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.text("Tableau 1.1 : Etat Nutritionnel Global par sexe", 14, currentY);
      currentY += 4;

      const sxHead = [
        [
          { content: "Indicateurs", rowSpan: 2 },
          { content: "Masculin", colSpan: ageRanges.length },
          { content: "Féminin", colSpan: ageRanges.length },
          { content: "Total", rowSpan: 2 },
        ],
        [...ageLabels, ...ageLabels],
      ];
      const sxBody = INDICATEURS_GLOBAL.map((ind) => {
        const { masc, fem, total } = buildGlobalTotalsBySexe(ind.value);
        return [ind.label, ...masc, ...fem, total];
      });

      autoTable(doc, {
        startY: currentY,
        head: sxHead,
        body: sxBody,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 1.5, halign: "center" },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: 0,
          fontStyle: "bold",
        },
        columnStyles: { 0: { halign: "left", cellWidth: 60 } },
      });

      currentY =
        (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 10;

      // Tableau 2 : Par Méthode PF
      if (currentY > 160) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.text(
        "Tableau 2 : Etat Nutritionnel par Méthode de Planification Familiale",
        14,
        currentY,
      );
      currentY += 4;

      const pfHead = [
        ["Indicateurs", ...METHODES_PF.map((m) => m.label), "Total"],
      ];
      const pfBody = INDICATEURS_GLOBAL.map((ind) => {
        let totalRow = 0;
        const cells = METHODES_PF.map((m) => {
          const v = countByTwoBooleans(converted, ind.value, m.value);
          totalRow += v;
          return v;
        });
        return [ind.label, ...cells, totalRow];
      });

      autoTable(doc, {
        startY: currentY,
        head: pfHead,
        body: pfBody,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1.5, halign: "center" },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: 0,
          fontStyle: "bold",
        },
        columnStyles: { 0: { halign: "left", cellWidth: 35 } },
      });

      doc.save(
        `Rapport_Nutrition_${new Date().toLocaleDateString("fr-FR")}.pdf`,
      );
    } catch (error) {
      console.error("Erreur export PDF:", error);
    } finally {
      setSpinnerPdf(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 bg-gray-50 opacity-90 p-4 rounded-sm mt-2 w-full overflow-x-auto">
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          onClick={exportToExcel}
          type="button"
          disabled={spinnerExcel}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          <Spinner
            show={spinnerExcel}
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

      {/* Tableau 1 : Etat Nutritionnel Global */}
      <div>
        <h2 className="font-bold mb-2">Tableau 1 : Etat Nutritionnel Global</h2>
        <Table className="border">
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead className="border border-gray-300 font-semibold">
                Indicateurs
              </TableHead>
              {ageRanges.map((r, idx) => (
                <TableHead
                  key={`a-${idx}`}
                  className="border border-gray-300 font-semibold text-center"
                >
                  {r.max < 120 ? `${r.min}-${r.max}` : `${r.min}+`}
                </TableHead>
              ))}
              <TableHead className="border border-gray-300 font-semibold text-center">
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {INDICATEURS_GLOBAL.map((ind) => {
              const { values, total } = buildGlobalTotals(ind.value);
              return (
                <TableRow key={ind.value}>
                  <TableCell className="border border-gray-300">
                    {ind.label}
                  </TableCell>
                  {values.map((v, i) => (
                    <TableCell key={i} className="text-center border">
                      {v}
                    </TableCell>
                  ))}
                  <TableCell className="text-center border font-semibold">
                    {total}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Tableau 1.1 : Global par sexe */}
      <div>
        <h2 className="font-bold mb-2">
          Tableau 1.1 : Etat Nutritionnel Global par sexe
        </h2>
        <Table className="border">
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead
                rowSpan={2}
                className="border border-gray-300 font-semibold align-middle"
              >
                Indicateurs
              </TableHead>
              <TableHead
                colSpan={ageRanges.length}
                className="border border-gray-300 font-semibold text-center"
              >
                Masculin
              </TableHead>
              <TableHead
                colSpan={ageRanges.length}
                className="border border-gray-300 font-semibold text-center"
              >
                Féminin
              </TableHead>
              <TableHead
                rowSpan={2}
                className="border border-gray-300 font-semibold align-middle text-center"
              >
                Total
              </TableHead>
            </TableRow>
            <TableRow>
              {ageRanges.map((r, idx) => (
                <TableHead
                  key={`m-${idx}`}
                  className="border border-gray-300 font-semibold text-center"
                >
                  {r.max < 120 ? `${r.min}-${r.max}` : `${r.min}+`}
                </TableHead>
              ))}
              {ageRanges.map((r, idx) => (
                <TableHead
                  key={`f-${idx}`}
                  className="border border-gray-300 font-semibold text-center"
                >
                  {r.max < 120 ? `${r.min}-${r.max}` : `${r.min}+`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {INDICATEURS_GLOBAL.map((ind) => {
              const { masc, fem, total } = buildGlobalTotalsBySexe(ind.value);
              return (
                <TableRow key={ind.value}>
                  <TableCell className="border border-gray-300">
                    {ind.label}
                  </TableCell>
                  {masc.map((v, i) => (
                    <TableCell key={`m-${i}`} className="text-center border">
                      {v}
                    </TableCell>
                  ))}
                  {fem.map((v, i) => (
                    <TableCell key={`f-${i}`} className="text-center border">
                      {v}
                    </TableCell>
                  ))}
                  <TableCell className="text-center border font-semibold">
                    {total}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Tableau 2 : Par méthode PF */}
      <div>
        <h2 className="font-bold mb-2">
          Tableau 2 : Etat Nutritionnel par Méthode de Planification Familiale
        </h2>
        <Table className="border">
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead className="border border-gray-300 font-semibold">
                Indicateurs
              </TableHead>
              {METHODES_PF.map((m) => (
                <TableHead
                  key={m.value}
                  className="border border-gray-300 font-semibold text-center"
                >
                  {m.label}
                </TableHead>
              ))}
              <TableHead className="border border-gray-300 font-semibold text-center">
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {INDICATEURS_GLOBAL.map((ind) => {
              let totalRow = 0;
              const cells = METHODES_PF.map((m) => {
                const v = countByTwoBooleans(converted, ind.value, m.value);
                totalRow += v;
                return { method: m.value, value: v };
              });
              return (
                <TableRow key={ind.value}>
                  <TableCell className="border border-gray-300">
                    {ind.label}
                  </TableCell>
                  {cells.map((c) => (
                    <TableCell
                      key={c.method}
                      className="text-center border"
                    >
                      {c.value}
                    </TableCell>
                  ))}
                  <TableCell className="text-center border font-semibold">
                    {totalRow}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
