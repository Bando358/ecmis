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

type AgeRange = {
  min: number;
  max: number;
};

export type convertedType = clientDataProps & {
  recu: boolean;
  consultation: boolean;
};

type DateType = string | Date;

interface TableRapportConsultationProps {
  ageRanges: AgeRange[];
  clientData: ClientData[];
  dateDebut: DateType;
  dateFin: DateType;
  clinic: string;
}

const tabIndicateurs = [
  { label: "Nombre total de personne reçu", value: "recu" },
  {
    label: "Nombre total de personne reçu pour une consultation",
    value: "consultation",
  },
];

const countByBooleanAndSexe = (
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

export default function TableRapportConsultation({
  ageRanges,
  clientData,
  dateDebut,
  dateFin,
  clinic,
}: TableRapportConsultationProps) {
  const [converted, setConverted] = useState<convertedType[]>([]);
  const [spinnerPdf, setSpinnerPdf] = useState(false);
  const [spinnerExcel, setSpinnerExcel] = useState(false);

  useEffect(() => {
    if (!clientData || clientData.length === 0) {
      setConverted([]);
    } else {
      const newConverted = clientData.map((item) => {
        const aConsultation =
          item.consultationPf === true ||
          item.consultationGyneco === true ||
          item.mdgConsultation === true ||
          item.obstConsultation === true ||
          item.cponConsultation === true ||
          item.testConsultation === true ||
          item.accouchementConsultation === true ||
          item.saaConsultation === true ||
          item.depistageVihConsultation === true ||
          item.examenPvVihConsultation === true ||
          item.infertConsultation === true;

        return {
          ...item,
          recu: true,
          consultation: aConsultation,
        };
      });
      setConverted(newConverted);
    }
  }, [clientData]);

  if (converted.length === 0) {
    return <p className="text-center">Aucune donnée disponible.</p>;
  }

  const exportToExcel = async () => {
    setSpinnerExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Consultation");

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

      worksheet.getColumn(1).width = 50;
      for (let i = 2; i <= 2 + ageRanges.length * 2 + 1; i++) {
        worksheet.getColumn(i).width = 12;
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

      // Titre du tableau
      const startRow = 6;
      worksheet.getCell(`A${startRow}`).value = "Rapport Consultation";
      worksheet.getCell(`A${startRow}`).font = { bold: true, size: 14 };

      // En-tête ligne 1 : Indicateurs / Masculin / Féminin / Total
      const headerRow1 = startRow + 2;
      const headerRow2 = startRow + 3;
      const mascStart = 2;
      const femStart = mascStart + ageRanges.length;
      const totalCol = femStart + ageRanges.length;

      worksheet.mergeCells(headerRow1, 1, headerRow2, 1);
      worksheet.getCell(headerRow1, 1).value = "Indicateurs";

      worksheet.mergeCells(
        headerRow1,
        mascStart,
        headerRow1,
        mascStart + ageRanges.length - 1,
      );
      worksheet.getCell(headerRow1, mascStart).value = "Masculin";

      worksheet.mergeCells(
        headerRow1,
        femStart,
        headerRow1,
        femStart + ageRanges.length - 1,
      );
      worksheet.getCell(headerRow1, femStart).value = "Féminin";

      worksheet.mergeCells(headerRow1, totalCol, headerRow2, totalCol);
      worksheet.getCell(headerRow1, totalCol).value = "Total";

      // En-tête ligne 2 : tranches d'âge
      ageRanges.forEach((r, idx) => {
        const label =
          r.max < 120 ? `${r.min}-${r.max} ans` : `${r.min} ans et +`;
        worksheet.getCell(headerRow2, mascStart + idx).value = label;
        worksheet.getCell(headerRow2, femStart + idx).value = label;
      });

      // Données
      let currentRow = headerRow2 + 1;
      tabIndicateurs.forEach((ind) => {
        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = ind.label;

        let total = 0;
        ageRanges.forEach((r, idx) => {
          const m = countByBooleanAndSexe(
            converted,
            r.min,
            r.max,
            ind.value,
            "Masculin",
          );
          const f = countByBooleanAndSexe(
            converted,
            r.min,
            r.max,
            ind.value,
            "Féminin",
          );
          row.getCell(mascStart + idx).value = m;
          row.getCell(femStart + idx).value = f;
          total += m + f;
        });
        row.getCell(totalCol).value = total;

        currentRow++;
      });

      // Styles: bordures et alignement pour l'en-tête et les données
      for (let r = headerRow1; r < currentRow; r++) {
        for (let c = 1; c <= totalCol; c++) {
          const cell = worksheet.getCell(r, c);
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
          if (r <= headerRow2) {
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
      link.download = `Rapport_Consultation_${new Date().toLocaleDateString(
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
      doc.text(`Rapport Consultation - ${clinic}`, pageWidth / 2, 35, {
        align: "center",
      });
      doc.setFontSize(11);
      doc.text(`Période: ${periodeText}`, pageWidth / 2, 42, {
        align: "center",
      });

      const ageLabels = ageRanges.map((r) =>
        r.max >= 120 ? `${r.min}+` : `${r.min}-${r.max}`,
      );

      const headers = [
        [
          { content: "Indicateurs", rowSpan: 2 },
          { content: "Masculin", colSpan: ageRanges.length },
          { content: "Féminin", colSpan: ageRanges.length },
          { content: "Total", rowSpan: 2 },
        ],
        [...ageLabels, ...ageLabels],
      ];

      const body = tabIndicateurs.map((ind) => {
        const masc = ageRanges.map((r) =>
          countByBooleanAndSexe(converted, r.min, r.max, ind.value, "Masculin"),
        );
        const fem = ageRanges.map((r) =>
          countByBooleanAndSexe(converted, r.min, r.max, ind.value, "Féminin"),
        );
        const total =
          masc.reduce((a, b) => a + b, 0) + fem.reduce((a, b) => a + b, 0);
        return [ind.label, ...masc, ...fem, total];
      });

      autoTable(doc, {
        startY: 50,
        head: headers,
        body,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2, halign: "center" },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: 0,
          fontStyle: "bold",
        },
        columnStyles: { 0: { halign: "left", cellWidth: 100 } },
      });

      doc.save(
        `Rapport_Consultation_${new Date().toLocaleDateString("fr-FR")}.pdf`,
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

      <div>
        <h2 className="font-bold mb-2">Rapport Consultation</h2>
        <Table className="border">
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead rowSpan={2} className="border border-gray-300 font-semibold align-middle">
                Indicateurs
              </TableHead>
              <TableHead colSpan={ageRanges.length} className="border border-gray-300 font-semibold text-center">
                Masculin
              </TableHead>
              <TableHead colSpan={ageRanges.length} className="border border-gray-300 font-semibold text-center">
                Féminin
              </TableHead>
              <TableHead rowSpan={2} className="border border-gray-300 font-semibold align-middle text-center">
                Total
              </TableHead>
            </TableRow>
            <TableRow>
              {ageRanges.map((r, idx) => (
                <TableHead
                  key={`m-${idx}`}
                  className="border border-gray-300 font-semibold text-center"
                >
                  {r.max >= 120 ? `${r.min}+` : `${r.min}-${r.max}`}
                </TableHead>
              ))}
              {ageRanges.map((r, idx) => (
                <TableHead
                  key={`f-${idx}`}
                  className="border border-gray-300 font-semibold text-center"
                >
                  {r.max >= 120 ? `${r.min}+` : `${r.min}-${r.max}`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tabIndicateurs.map((ind) => {
              const masc = ageRanges.map((r) =>
                countByBooleanAndSexe(
                  converted,
                  r.min,
                  r.max,
                  ind.value,
                  "Masculin",
                ),
              );
              const fem = ageRanges.map((r) =>
                countByBooleanAndSexe(
                  converted,
                  r.min,
                  r.max,
                  ind.value,
                  "Féminin",
                ),
              );
              const total =
                masc.reduce((a, b) => a + b, 0) +
                fem.reduce((a, b) => a + b, 0);
              return (
                <TableRow key={ind.value}>
                  <TableCell className="border border-gray-300 break-word whitespace-normal overflow-hidden w-[350px] min-w-[350px] max-w-[350px]">
                    {ind.label}
                  </TableCell>
                  {masc.map((v, i) => (
                    <TableCell
                      key={`m-${i}`}
                      className="text-center border"
                    >
                      {v}
                    </TableCell>
                  ))}
                  {fem.map((v, i) => (
                    <TableCell
                      key={`f-${i}`}
                      className="text-center border"
                    >
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
    </div>
  );
}
