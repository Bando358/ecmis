// import { countClientPfRetrait } from "../rapport/pf/pf";
import { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { Worksheet } from "exceljs";
// import { tableExportWithSexe } from "../tableExportFonction";
import { ClientData, clientDataProps } from "../rapportPfActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Spinner } from "../ui/spinner";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// types.ts ou en haut du fichier
type AgeRange = {
  min: number;
  max: number;
};
export type convertedType = clientDataProps & {
  mdgTraite: boolean;
  mdgTraitePaludisme: boolean;
  mdgTraiteHta: boolean;
  mdgTraiteAnemie: boolean;
  mdgCasRefere: boolean;

  mdgPecPaludisme: boolean;
  mdgPecDermatose: boolean;
  mdgPecAffectionsDigestives: boolean;
  mdgPecAffectionsOrl: boolean;
  mdgPecAffectionsPulmonaires: boolean;
  mdgPecAffectionsBuccales: boolean;
  mdgPecAffectionsCardiaques: boolean;
  mdgPecAffectionsOculaires: boolean;
  mdgPecAffectionsAutres: boolean;
  mdgPecSoinsInfirmiers: boolean;
};

type DateType = string | Date;
interface TableRapportGynecoProps {
  ageRanges: AgeRange[];
  clientData: ClientData[];
  dateDebut: DateType;
  dateFin: DateType;
  clinic: string;
}

const tabClientAutre = [
  {
    label: "Nombre de personnes reçues",
    value: "mdgConsultation",
  },
  {
    label: "Nombre de personnes - traitées",
    value: "mdgTraite",
  },
  {
    label: "Nombre de personnes - traitées - Paludisme",
    value: "mdgTraitePaludisme",
  },
  {
    label: "Nombre de personnes - traitées - HTA",
    value: "mdgTraiteHta",
  },
  {
    label: "Nombre de personnes - traitées - Anémie",
    value: "mdgTraiteAnemie",
  },
  {
    label: "Nombre de personnes référées pour Infertilités",
    value: "mdgCasRefere",
  },
];
const tabServiceAutre = [
  { label: "SRV - MG - Consultation", value: "mdgConsultation" },
  {
    label: "SRV - MG - Counseling",
    value: "mdgConsultation",
  },
  {
    label: "SRV - MG - Investigation Examen",
    value: "mdgExamenPhysique",
  },
  {
    label: "SRV - MG - PEC - Paludisme",
    value: "mdgPecPaludisme",
  },
  {
    label: "SRV - MG - PEC - Dermatose",
    value: "mdgPecDermatose",
  },
  {
    label: "SRV - MG - PEC - Affections Digestives",
    value: "mdgPecAffectionsDigestives",
  },
  {
    label: "SRV - MG - PEC - Affections ORL",
    value: "mdgPecAffectionsOrl",
  },
  {
    label: "SRV - MG - PEC - Affections Pulmonaires",
    value: "mdgPecAffectionsPulmonaires",
  },
  {
    label: "SRV - MG - PEC - Affections Buccales",
    value: "mdgPecAffectionsBuccales",
  },
  {
    label: "SRV - MG - PEC - Affections Cardiaques",
    value: "mdgPecAffectionsCardiaques",
  },
  {
    label: "SRV - MG - PEC - Affections Oculaires",
    value: "mdgPecAffectionsOculaires",
  },
  {
    label: "SRV - MG - PEC - Affections Autres",
    value: "mdgPecAffectionsAutres",
  },
  {
    label: "SRV - MG - PEC - Soins Infirmiers",
    value: "mdgPecSoinsInfirmiers",
  },
];
export default function TableRapportPediatrie({
  ageRanges,
  clientData,
  dateDebut,
  dateFin,
  clinic,
}: TableRapportGynecoProps) {
  const [converted, setConverted] = useState<convertedType[]>([]);
  const [spinner, setSpinner] = useState(false);
  const [spinnerPdf, setSpinnerPdf] = useState(false);

  useEffect(() => {
    if (!clientData || clientData.length === 0) {
      setConverted([]);
    } else {
      const newConverted = clientData.map((item) => ({
        ...item,
        // consultationIst: item.counsellingAvantDepistage === true, // ⚡
        mdgTraite: item.mdgTypeVisite === "traite",
        mdgTraitePaludisme: item.mdgDiagnostic.includes("paludisme"),
        mdgTraiteHta: item.mdgDiagnostic.includes("hta"),
        mdgTraiteAnemie: item.mdgDiagnostic.includes("anemie"),
        mdgCasRefere: item.mdgTypeVisite === "refere",

        mdgPecPaludisme: item.mdgDiagnostic.includes("paludisme"),
        mdgPecDermatose: item.mdgDiagnostic.includes("dermatose"),
        mdgPecAffectionsDigestives: item.mdgTypeAffection.includes(
          "affection_digestives"
        ),
        mdgPecAffectionsOrl: item.mdgTypeAffection.includes("affection_orl"),
        mdgPecAffectionsPulmonaires: item.mdgTypeAffection.includes(
          "affection_pulmonaires"
        ),
        mdgPecAffectionsBuccales:
          item.mdgTypeAffection.includes("affection_buccales"),
        mdgPecAffectionsCardiaques: item.mdgTypeAffection.includes(
          "affection_cardiaques"
        ),
        mdgPecAffectionsOculaires: item.mdgTypeAffection.includes(
          "affection_oculaires"
        ),
        mdgPecAffectionsAutres:
          item.mdgTypeAffection.includes("affection_autres"),
        mdgPecSoinsInfirmiers:
          item.mdgSoins !== undefined &&
          item.mdgSoins !== null &&
          item.mdgSoins !== "",
      }));

      setConverted(newConverted);
    }
  }, [clientData]);

  if (converted.length === 0) {
    return <p className="text-center">Aucune donnée disponible.</p>;
  } else {
    console.log("converted", converted);
  }
  if (clientData) {
    console.log("clientData", clientData);
  }

  const exportToExcel = async () => {
    setSpinner(true);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Pédiatrie");

    // AJOUTER UN LOGO A LA LIGNE DU HAUT
    // le logo se trouve dans le fichier public
    const logoBase64 = await fetch("/LOGO_AIBEF_IPPF.png")
      .then((res) => res.blob())
      .then((blob) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      });
    const imageId = workbook.addImage({
      base64: logoBase64 as string,
      extension: "png",
    });
    worksheet.addImage(imageId, "B1:H2");

    // === En-tête période ===
    worksheet.getCell("A3").value = "Période";
    worksheet.getCell("B3").value = new Date(dateDebut).toLocaleDateString(
      "fr-FR"
    );
    worksheet.getCell("B4").value = new Date(dateFin).toLocaleDateString(
      "fr-FR"
    );
    worksheet.getCell("D3").value = clinic;

    worksheet.mergeCells("A3:A4");
    worksheet.mergeCells("B3:C3");
    worksheet.mergeCells("B4:C4");
    worksheet.mergeCells("D3:J4");

    // Largeur de colonne A
    worksheet.getColumn(1).width = 40;

    // Style entête
    ["A3", "B3", "B4", "D3"].forEach((cellRef) => {
      const cell = worksheet.getCell(cellRef);
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.font = {
        bold: true,
        size: cellRef === "A3" || cellRef === "D3" ? 16 : 12,
      };
    });

    // Bordure
    for (let row = 3; row <= 4; row++) {
      for (let col = 1; col <= 6; col++) {
        worksheet.getCell(row, col).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }
    function setCellAlignment(
      worksheet: Worksheet,
      columns: string[],
      startRow: number,
      endRow: number,
      alignment: "left" | "center" | "right"
    ): void {
      for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
        for (const col of columns) {
          const cell = worksheet.getCell(`${col}${rowIndex}`);
          // Si la cellule fait partie d'une fusion, appliquer l'align sur la cellule principale
          const masterCell = cell.master || cell;
          masterCell.alignment = { horizontal: alignment };
        }
      }
    }

    // === Intégration du tableau réutilisable ===
    // Tableau des clients Reçus
    tableExportWithSexe(
      "Rapport clients Reçus Pédiatrie",
      worksheet,
      7, // Ligne de départ du tableau (ex : ligne 6)
      4, // Colspan
      tabClientAutre,
      ageRanges,
      converted,
      countClientBooleanBySexe
    );
    setCellAlignment(worksheet, ["A"], 9, 18, "left");
    // Tableau des services Pédiatrie
    tableExportWithSexe(
      "Rapport services Pédiatrie",
      worksheet,
      20, // Ligne de départ du tableau (ex : ligne 6)
      4, // Colspan
      tabServiceAutre,
      ageRanges,
      converted,
      countClientBooleanBySexe
    );
    setCellAlignment(worksheet, ["A"], 22, 36, "left");
    // Générer le fichier
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Rapport_Pediatrie_${new Date().toLocaleDateString(
      "fr-FR"
    )}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);

    setSpinner(false);
  };

  // Export to PDF using jsPDF
  const exportToPdf = async () => {
    setSpinnerPdf(true);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Charger le logo
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

      // Ajouter le logo (60% de la largeur, centré)
      if (logoBase64) {
        const logoWidth = pageWidth * 0.6;
        const logoHeight = 20;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(logoBase64, "PNG", logoX, 10, logoWidth, logoHeight);
      }

      // Détection du mois complet
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

      // Titre et période
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Rapport Pédiatrie - ${clinic}`, pageWidth / 2, 35, {
        align: "center",
      });
      doc.setFontSize(11);
      doc.text(`Période: ${periodeText}`, pageWidth / 2, 42, {
        align: "center",
      });

      let currentY = 50;

      // Génération des en-têtes pour les tableaux avec sexe
      const generateHeaders = () => {
        const headers = [
          [
            { content: "Indicateurs", rowSpan: 2 },
            { content: "Masculin", colSpan: ageRanges.length },
            { content: "Féminin", colSpan: ageRanges.length },
            { content: "Total", rowSpan: 2 },
          ],
          [
            ...ageRanges.map((r) =>
              r.max < 120 ? `${r.min}-${r.max}` : `${r.min}+`
            ),
            ...ageRanges.map((r) =>
              r.max < 120 ? `${r.min}-${r.max}` : `${r.min}+`
            ),
          ],
        ];
        return headers;
      };

      // Tableau 1: Clients Pédiatrie
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Rapport clients Pédiatrie", 14, currentY);
      currentY += 5;

      const clientRows = tabClientAutre.map((item) => {
        const row = [item.label];
        // Masculin
        ageRanges.forEach((range) => {
          row.push(
            String(countClientBooleanBySexe(converted, range.min, range.max, item.value, true, "Masculin"))
          );
        });
        // Féminin
        ageRanges.forEach((range) => {
          row.push(
            String(countClientBooleanBySexe(converted, range.min, range.max, item.value, true, "Féminin"))
          );
        });
        // Total
        const total = ageRanges.reduce(
          (sum, range) =>
            sum +
            countClientBooleanBySexe(converted, range.min, range.max, item.value, true, "Masculin") +
            countClientBooleanBySexe(converted, range.min, range.max, item.value, true, "Féminin"),
          0
        );
        row.push(String(total));
        return row;
      });

      autoTable(doc, {
        startY: currentY,
        head: generateHeaders(),
        body: clientRows,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 70 } },
      });

      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

      // Tableau 2: Services Pédiatrie
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Rapport services Pédiatrie", 14, currentY);
      currentY += 5;

      const serviceRows = tabServiceAutre.map((item) => {
        const row = [item.label];
        // Masculin
        ageRanges.forEach((range) => {
          row.push(
            String(countClientBooleanBySexe(converted, range.min, range.max, item.value, true, "Masculin"))
          );
        });
        // Féminin
        ageRanges.forEach((range) => {
          row.push(
            String(countClientBooleanBySexe(converted, range.min, range.max, item.value, true, "Féminin"))
          );
        });
        // Total
        const total = ageRanges.reduce(
          (sum, range) =>
            sum +
            countClientBooleanBySexe(converted, range.min, range.max, item.value, true, "Masculin") +
            countClientBooleanBySexe(converted, range.min, range.max, item.value, true, "Féminin"),
          0
        );
        row.push(String(total));
        return row;
      });

      autoTable(doc, {
        startY: currentY,
        head: generateHeaders(),
        body: serviceRows,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 70 } },
      });

      // Section signature (même page que le dernier tableau)
      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Réalisé par: ____________________________", 14, currentY);
      doc.text("Signature: ____________________________", pageWidth - 100, currentY);

      doc.save(`Rapport_Pediatrie_${new Date().toLocaleDateString("fr-FR")}.pdf`);
    } catch (error) {
      console.error("Erreur export PDF:", error);
    } finally {
      setSpinnerPdf(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-gray-50 opacity-90 p-4 rounded-sm mt-2 w-full overflow-x-auto">
      <div className="flex gap-2 justify-center">
        <Button
          onClick={exportToExcel}
          type="button"
          disabled={spinner}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          <Spinner
            show={spinner}
            size={"small"}
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
            size={"small"}
            className="text-white dark:text-slate-400"
          />
          Exporter PDF
        </Button>
      </div>
      <h2 className="font-bold">Rapport clients Pédiatrie -</h2>
      <Table className="border">
        <TableHeader className="bg-gray-200">
          <TableRow>
            <TableCell rowSpan={2} className="font-bold">
              Indicateurs
            </TableCell>
            <TableCell
              colSpan={2}
              className="font-bold text-center border border-r-gray-400 border-l-gray-400"
            >
              Masculin
            </TableCell>
            <TableCell colSpan={2} className="font-bold text-center">
              Féminin
            </TableCell>
            <TableCell rowSpan={2} className="font-bold">
              Total
            </TableCell>
          </TableRow>
          <TableRow className="bg-gray-300 text-center">
            {ageRanges.map((range, index) => {
              return (
                <>
                  <TableCell
                    key={`masculin-${range.min}-${range.max}-${index}`}
                  >
                    {range.min}-{range.max} ans
                  </TableCell>
                </>
              );
            })}
            {ageRanges.map((range, index) => {
              return (
                <>
                  <TableCell key={`feminin-${range.min}-${range.max}-${index}`}>
                    {range.min}-{range.max} ans
                  </TableCell>
                </>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tabClientAutre.map((client) => (
            <TableRow key={client.label}>
              {/* Nom du produit */}
              <TableCell>{client.label}</TableCell>

              {/* Colonnes "Masculin" */}
              {ageRanges.map((range, index) => (
                <TableCell
                  key={`masculin-${client.label}-${index}`}
                  className="text-center"
                >
                  {countClientBooleanBySexe(
                    converted,
                    range.min,
                    range.max,
                    client.value,
                    true,
                    "Masculin"
                  )}
                </TableCell>
              ))}

              {/* Colonnes "Féminin" */}
              {ageRanges.map((range, index) => (
                <TableCell
                  key={`feminin-${client.label}-${index}`}
                  className="text-center"
                >
                  {countClientBooleanBySexe(
                    converted,
                    range.min,
                    range.max,
                    client.value,
                    true,
                    "Féminin"
                  )}
                </TableCell>
              ))}

              {/* Colonne Total */}
              <TableCell className="text-center font-semibold">
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientBooleanBySexe(
                      converted,
                      range.min,
                      range.max,
                      client.value,
                      true,
                      "Masculin"
                    ) +
                    countClientBooleanBySexe(
                      converted,
                      range.min,
                      range.max,
                      client.value,
                      true,
                      "Féminin"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Separator className="bg-green-300"></Separator>
      <h2 className="font-bold">Rapport services Pédiatrie -</h2>
      <Table className="border">
        <TableHeader className="bg-gray-200">
          <TableRow>
            <TableCell rowSpan={2} className="font-bold">
              Indicateurs
            </TableCell>
            <TableCell
              colSpan={2}
              className="font-bold text-center border border-r-gray-400 border-l-gray-400"
            >
              Masculin
            </TableCell>
            <TableCell colSpan={2} className="font-bold text-center">
              Féminin
            </TableCell>
            <TableCell rowSpan={2} className="font-bold">
              Total
            </TableCell>
          </TableRow>
          <TableRow className="bg-gray-300 text-center">
            {ageRanges.map((range, index) => {
              return (
                <>
                  <TableCell
                    key={`masculin-${range.min}-${range.max}-${index}`}
                  >
                    {range.min}-{range.max} ans
                  </TableCell>
                </>
              );
            })}
            {ageRanges.map((range, index) => {
              return (
                <>
                  <TableCell key={`feminin-${range.min}-${range.max}-${index}`}>
                    {range.min}-{range.max} ans
                  </TableCell>
                </>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tabServiceAutre.map((client) => (
            <TableRow key={client.label}>
              {/* Nom du produit */}
              <TableCell>{client.label}</TableCell>

              {/* Colonnes "Masculin" */}
              {ageRanges.map((range, index) => (
                <TableCell
                  key={`masculin-${client.label}-${index}`}
                  className="text-center"
                >
                  {countClientBooleanBySexe(
                    converted,
                    range.min,
                    range.max,
                    client.value,
                    true,
                    "Masculin"
                  )}
                </TableCell>
              ))}

              {/* Colonnes "Féminin" */}
              {ageRanges.map((range, index) => (
                <TableCell
                  key={`feminin-${client.label}-${index}`}
                  className="text-center"
                >
                  {countClientBooleanBySexe(
                    converted,
                    range.min,
                    range.max,
                    client.value,
                    true,
                    "Féminin"
                  )}
                </TableCell>
              ))}

              {/* Colonne Total */}
              <TableCell className="text-center font-semibold">
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientBooleanBySexe(
                      converted,
                      range.min,
                      range.max,
                      client.value,
                      true,
                      "Masculin"
                    ) +
                    countClientBooleanBySexe(
                      converted,
                      range.min,
                      range.max,
                      client.value,
                      true,
                      "Féminin"
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Fonction d'export avec sexe
function tableExportWithSexe(
  tableTitle: string,
  worksheet: Worksheet,
  startRow: number,
  colSpan: number,
  tabClient: { label: string; value: string }[],
  ageRanges: { min: number; max: number }[],
  clientData: convertedType[],
  countClientBooleanBySexe: (
    data: convertedType[],
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

export const countClientBooleanBySexe = (
  clientData: convertedType[], // ⚡ on utilise convertedType
  minAge: number,
  maxAge: number,
  propriete: string, // ⚡ propriété booléenne définie dans ton type
  indicateur: boolean,
  sexe: "Masculin" | "Féminin"
): number => {
  if (!Array.isArray(clientData) || clientData.length === 0) return 0;

  return clientData.reduce((acc, client) => {
    const ageCondition = client.age >= minAge && client.age <= maxAge;
    const sexeCondition = client.sexe === sexe;
    const proprieteCondition =
      client[propriete as keyof convertedType] === indicateur;

    return ageCondition && sexeCondition && proprieteCondition ? acc + 1 : acc;
  }, 0);
};
