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
    const newConverted = clientData.map<convertedType>((item) => ({
      ...item,
      conjonctiviteNouveauNe: item.istType === "conjonctivite",
      ecoulementUretralMasculin: item.istType === "ecoulementUretral",
      ecoulementVaginal: item.istType === "ecoulementVaginal",
      ulcerationGenitaleBubon:
        item.istType === "ulceration" || item.istType === "bubon",
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

      const headerRow1 = worksheet.getRow(8);
      headerRow1.getCell(1).value = "Indicateurs";
      headerRow1.getCell(2).value = "Masculin";
      headerRow1.getCell(2 + ageRanges.length).value = "Féminin";
      headerRow1.getCell(2 + ageRanges.length * 2).value = "Total";

      const headerRow2 = worksheet.getRow(9);
      ageRanges.forEach((r, i) => {
        headerRow2.getCell(2 + i).value = ageLabel(r);
        headerRow2.getCell(2 + ageRanges.length + i).value = ageLabel(r);
      });
      headerRow2.eachCell((cell) => {
        cell.alignment = { horizontal: "center" };
        cell.font = { bold: true };
      });
      headerRow1.eachCell((cell) => {
        cell.alignment = { horizontal: "center" };
        cell.font = { bold: true };
      });

      let rowIdx = 10;
      INDICATEURS_SIG_IST.forEach((indicateur) => {
        const row = worksheet.getRow(rowIdx);
        row.getCell(1).value = indicateur.label;
        let total = 0;
        ageRanges.forEach((r, i) => {
          const m = countBySexe(indicateur.value, r, "Masculin");
          const f = countBySexe(indicateur.value, r, "Féminin");
          row.getCell(2 + i).value = m;
          row.getCell(2 + ageRanges.length + i).value = f;
          total += m + f;
        });
        row.getCell(2 + ageRanges.length * 2).value = total;
        row.getCell(2 + ageRanges.length * 2).font = { bold: true };
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

      const ageHeaders = ageRanges.map(ageLabel);
      const head = [
        [
          { content: "Indicateurs", rowSpan: 2 },
          { content: "Masculin", colSpan: ageRanges.length },
          { content: "Féminin", colSpan: ageRanges.length },
          { content: "Total", rowSpan: 2 },
        ],
        [...ageHeaders, ...ageHeaders],
      ];

      const body = INDICATEURS_SIG_IST.map((indicateur) => {
        const masc = ageRanges.map((r) =>
          countBySexe(indicateur.value, r, "Masculin"),
        );
        const fem = ageRanges.map((r) =>
          countBySexe(indicateur.value, r, "Féminin"),
        );
        const total =
          masc.reduce((a, b) => a + b, 0) + fem.reduce((a, b) => a + b, 0);
        return [
          indicateur.label,
          ...masc.map(String),
          ...fem.map(String),
          total.toString(),
        ];
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
          <TableRow>
            <TableHead rowSpan={2} className="font-semibold">
              Indicateurs
            </TableHead>
            <TableHead
              colSpan={ageRanges.length}
              className="font-semibold text-center border border-gray-300"
            >
              Masculin
            </TableHead>
            <TableHead
              colSpan={ageRanges.length}
              className="font-semibold text-center"
            >
              Féminin
            </TableHead>
            <TableHead rowSpan={2} className="font-semibold">
              Total
            </TableHead>
          </TableRow>
          <TableRow className="bg-slate-200 text-center">
            {ageRanges.map((r) => (
              <TableHead key={`m-${r.min}-${r.max}`}>{ageLabel(r)}</TableHead>
            ))}
            {ageRanges.map((r) => (
              <TableHead key={`f-${r.min}-${r.max}`}>{ageLabel(r)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {INDICATEURS_SIG_IST.map((indicateur) => {
            const masc = ageRanges.map((r) =>
              countBySexe(indicateur.value, r, "Masculin"),
            );
            const fem = ageRanges.map((r) =>
              countBySexe(indicateur.value, r, "Féminin"),
            );
            const total =
              masc.reduce((a, b) => a + b, 0) + fem.reduce((a, b) => a + b, 0);
            return (
              <TableRow key={String(indicateur.value)}>
                <TableCell>{indicateur.label}</TableCell>
                {masc.map((v, i) => (
                  <TableCell
                    key={`m-${String(indicateur.value)}-${i}`}
                    className="text-center"
                  >
                    {v}
                  </TableCell>
                ))}
                {fem.map((v, i) => (
                  <TableCell
                    key={`f-${String(indicateur.value)}-${i}`}
                    className="text-center"
                  >
                    {v}
                  </TableCell>
                ))}
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
