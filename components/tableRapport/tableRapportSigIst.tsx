import { useEffect, useState } from "react";
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type AgeRange = { min: number; max: number };

/**
 * Indicateurs SIG : IST.
 * Chaque indicateur est dérivé directement du champ `istType` saisi
 * dans la fiche IST.
 */
export type convertedType = clientDataProps & {
  conjonctiviteNouveauNe: boolean;
  ecoulementUretralMasculin: boolean;
  ecoulementVaginal: boolean;
  ulcerationGenitaleBubon: boolean;
  douleursTesticulaires: boolean;
  douleursAbdominalesPelviennes: boolean;
  condylomes: boolean;
};

const INDICATEURS_SIG_IST: { value: keyof convertedType; label: string }[] = [
  {
    value: "conjonctiviteNouveauNe",
    label: "Conjonctivite du nouveau-né",
  },
  {
    value: "ecoulementUretralMasculin",
    label:
      "Écoulement urétral masculin et/ou douleur et/ou prurit et/ou gêne intra-urétrale",
  },
  {
    value: "ecoulementVaginal",
    label:
      "Écoulement vaginal et/ou brûlure ou prurit et/ou mauvaise odeur vaginale",
  },
  {
    value: "ulcerationGenitaleBubon",
    label: "Ulcération génitale et/ou bubon",
  },
  { value: "douleursTesticulaires", label: "Douleurs testiculaires" },
  {
    value: "douleursAbdominalesPelviennes",
    label: "Douleurs abdominales basses (pelviennes) chez la femme",
  },
  {
    value: "condylomes",
    label: "Condylomes (végétations vénériennes / crêtes de coq)",
  },
];

interface Props {
  ageRanges: AgeRange[];
  clientData: ClientData[];
  dateDebut: string | Date;
  dateFin: string | Date;
  clinic: string;
}

export default function TableRapportSigIst({
  ageRanges,
  clientData,
  dateDebut,
  dateFin,
  clinic,
}: Props) {
  const [converted, setConverted] = useState<convertedType[]>([]);
  const [spinner, setSpinner] = useState(false);
  const [spinnerPdf, setSpinnerPdf] = useState(false);

  useEffect(() => {
    if (!clientData || clientData.length === 0) {
      setConverted([]);
      return;
    }
    // Couverture exhaustive des 12 valeurs possibles d'istType pour que la
    // somme des indicateurs égale le nombre total de cas IST.
    //   - syndrome vaginal regroupé : ecoulementVaginal + cervicite +
    //     brulureOuPrurit + malOdeurVaginal (cohérent avec le libellé
    //     « Écoulement vaginal et/ou brûlure ou prurit et/ou mauvaise
    //     odeur vaginale »)
    //   - ulceration + bubon + autres (cas non-spécifiques regroupés
    //     selon la règle métier validée)
    const newConverted = clientData.map<convertedType>((item) => ({
      ...item,
      conjonctiviteNouveauNe: item.istType === "conjonctivite",
      ecoulementUretralMasculin: item.istType === "ecoulementUretral",
      ecoulementVaginal:
        item.istType === "ecoulementVaginal" ||
        item.istType === "cervicite" ||
        item.istType === "brulureOuPrurit" ||
        item.istType === "malOdeurVaginal",
      ulcerationGenitaleBubon:
        item.istType === "ulceration" ||
        item.istType === "bubon" ||
        item.istType === "autres",
      douleursTesticulaires: item.istType === "douleursTesticulaires",
      douleursAbdominalesPelviennes: item.istType === "douleursAbdominales",
      condylomes: item.istType === "condylome",
    }));
    setConverted(newConverted);
  }, [clientData]);

  if (converted.length === 0) {
    return <p className="text-center">Aucune donnée disponible.</p>;
  }

  // ---------------- Helpers de comptage ----------------
  const countBySexe = (
    propriete: keyof convertedType,
    range: AgeRange,
    sexe: "Masculin" | "Féminin",
  ) =>
    converted.reduce((acc, c) => {
      const ageOk = c.age >= range.min && c.age <= range.max;
      const sexeOk = c.sexe === sexe;
      const valOk = c[propriete] === true;
      return ageOk && sexeOk && valOk ? acc + 1 : acc;
    }, 0);

  const ageLabel = (r: AgeRange) =>
    r.max < 120 ? `${r.min}-${r.max} ans` : `${r.min} ans et +`;

  // ---------------- Export Excel ----------------
  const exportToExcel = async () => {
    setSpinner(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("SIG IST");

      try {
        const logoBase64 = await fetch("/LOGO_AIBEF_IPPF.png")
          .then((res) => res.blob())
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
        worksheet.addImage(imageId, "B1:H2");
      } catch {
        // logo facultatif
      }

      worksheet.getCell("A3").value = "Période";
      worksheet.getCell("B3").value = new Date(dateDebut).toLocaleDateString(
        "fr-FR",
      );
      worksheet.getCell("B4").value = new Date(dateFin).toLocaleDateString(
        "fr-FR",
      );
      worksheet.getCell("D3").value = clinic;
      worksheet.getCell("A6").value = "Rapport SIG : IST";
      worksheet.getCell("A6").font = { bold: true };

      // En-tête niveau 1 : "Indicateurs" | <âge> (colSpan 2) ... | Total
      const headerRow1 = worksheet.getRow(8);
      headerRow1.getCell(1).value = "Indicateurs";
      ageRanges.forEach((r, i) => {
        const startCol = 2 + i * 2;
        headerRow1.getCell(startCol).value = ageLabel(r);
        worksheet.mergeCells(8, startCol, 8, startCol + 1);
      });
      const totalCol = 2 + ageRanges.length * 2;
      headerRow1.getCell(totalCol).value = "Total";
      worksheet.mergeCells(8, 1, 9, 1); // Indicateurs sur 2 lignes
      worksheet.mergeCells(8, totalCol, 9, totalCol); // Total sur 2 lignes

      // En-tête niveau 2 : M / F sous chaque âge
      const headerRow2 = worksheet.getRow(9);
      ageRanges.forEach((_, i) => {
        const startCol = 2 + i * 2;
        headerRow2.getCell(startCol).value = "M";
        headerRow2.getCell(startCol + 1).value = "F";
      });

      [headerRow1, headerRow2].forEach((row) => {
        row.eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.font = { bold: true };
        });
      });

      let rowIdx = 10;
      INDICATEURS_SIG_IST.forEach((indicateur) => {
        const row = worksheet.getRow(rowIdx);
        row.getCell(1).value = indicateur.label;
        let total = 0;
        ageRanges.forEach((r, i) => {
          const m = countBySexe(indicateur.value, r, "Masculin");
          const f = countBySexe(indicateur.value, r, "Féminin");
          const startCol = 2 + i * 2;
          row.getCell(startCol).value = m;
          row.getCell(startCol + 1).value = f;
          total += m + f;
        });
        row.getCell(totalCol).value = total;
        row.getCell(totalCol).font = { bold: true };
        rowIdx += 1;
      });

      worksheet.columns.forEach((col) => {
        col.width = 18;
      });
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Rapport_SIG_IST_${new Date().toLocaleDateString("fr-FR")}.xlsx`;
      link.click();
    } finally {
      setSpinner(false);
    }
  };

  // ---------------- Export PDF ----------------
  const exportToPdf = async () => {
    setSpinnerPdf(true);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Rapport SIG : IST", pageWidth / 2, 14, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Période : ${new Date(dateDebut).toLocaleDateString("fr-FR")} - ${new Date(
          dateFin,
        ).toLocaleDateString("fr-FR")}`,
        14,
        24,
      );
      doc.text(`Clinique : ${clinic}`, pageWidth - 14, 24, { align: "right" });

      // En-tête niveau 1 : Indicateurs | <âge> (colSpan 2 par tranche) | Total
      // En-tête niveau 2 : M / F sous chaque tranche
      const head = [
        [
          { content: "Indicateurs", rowSpan: 2 },
          ...ageRanges.map((r) => ({
            content: ageLabel(r),
            colSpan: 2,
            styles: { halign: "center" as const },
          })),
          { content: "Total", rowSpan: 2 },
        ],
        ageRanges.flatMap(() => ["M", "F"]),
      ];

      const body = INDICATEURS_SIG_IST.map((indicateur) => {
        const cells = ageRanges.flatMap((r) => [
          countBySexe(indicateur.value, r, "Masculin"),
          countBySexe(indicateur.value, r, "Féminin"),
        ]);
        const total = cells.reduce((a, b) => a + b, 0);
        return [indicateur.label, ...cells.map(String), total.toString()];
      });

      autoTable(doc, {
        startY: 30,
        head,
        body,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: { 0: { cellWidth: 80, halign: "left" } },
      });

      doc.save(`Rapport_SIG_IST_${new Date().toLocaleDateString("fr-FR")}.pdf`);
    } finally {
      setSpinnerPdf(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-gray-50 opacity-90 p-4 rounded-sm mt-2 w-full overflow-x-auto">
      <div className="flex gap-2 mx-auto">
        <Button
          onClick={exportToExcel}
          type="button"
          disabled={spinner}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          <Spinner show={spinner} size="small" className="text-white" />
          Exporter Excel
        </Button>
        <Button
          onClick={exportToPdf}
          type="button"
          disabled={spinnerPdf}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
        >
          <Spinner show={spinnerPdf} size="small" className="text-white" />
          Exporter PDF
        </Button>
      </div>

      <h2 className="font-bold">Rapport SIG : IST</h2>
      <Table className="border">
        <TableHeader className="bg-slate-100">
          {/* En-tête niveau 1 : une cellule fusionnée par tranche d'âge */}
          <TableRow>
            <TableHead rowSpan={2} className="font-semibold align-middle">
              Indicateurs
            </TableHead>
            {ageRanges.map((r) => (
              <TableHead
                key={`age-${r.min}-${r.max}`}
                colSpan={2}
                className="font-semibold text-center border border-gray-300"
              >
                {ageLabel(r)}
              </TableHead>
            ))}
            <TableHead rowSpan={2} className="font-semibold align-middle">
              Total
            </TableHead>
          </TableRow>
          {/* En-tête niveau 2 : M et F sous chaque tranche d'âge */}
          <TableRow className="bg-slate-200 text-center">
            {ageRanges.flatMap((r) => [
              <TableHead key={`m-${r.min}-${r.max}`} className="text-xs">
                M
              </TableHead>,
              <TableHead key={`f-${r.min}-${r.max}`} className="text-xs">
                F
              </TableHead>,
            ])}
          </TableRow>
        </TableHeader>
        <TableBody>
          {INDICATEURS_SIG_IST.map((indicateur) => {
            const cellsByAge = ageRanges.map((r) => ({
              m: countBySexe(indicateur.value, r, "Masculin"),
              f: countBySexe(indicateur.value, r, "Féminin"),
            }));
            const total = cellsByAge.reduce((s, c) => s + c.m + c.f, 0);
            return (
              <TableRow key={String(indicateur.value)}>
                <TableCell>{indicateur.label}</TableCell>
                {cellsByAge.flatMap((c, i) => [
                  <TableCell
                    key={`m-${String(indicateur.value)}-${i}`}
                    className="text-center"
                  >
                    {c.m}
                  </TableCell>,
                  <TableCell
                    key={`f-${String(indicateur.value)}-${i}`}
                    className="text-center"
                  >
                    {c.f}
                  </TableCell>,
                ])}
                <TableCell className="text-center font-semibold">
                  {total}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
