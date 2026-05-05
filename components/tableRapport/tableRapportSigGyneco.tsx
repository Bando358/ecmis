"use client";

import { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ClientData, clientDataProps } from "../rapportPfActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";

type AgeRange = { min: number; max: number };

/**
 * Indicateurs Tableau 29 : dépistage du cancer du col de l'utérus.
 *
 * Tous ces indicateurs ne s'appliquent qu'aux femmes (sexe = "Féminin")
 * et reposent sur les champs de la fiche Gynécologie (resultatIva,
 * eligibleTraitementIva, typeTraitementIva) et le statut VIH du client
 * sur la même visite (depistageVihResultat ou pecVihTypeclient renseigné).
 */
export type convertedType = clientDataProps & {
  ivaDepistee: boolean;
  ivaDepisteeVihPos: boolean;
  lesionPrecancereuse: boolean;
  lesionPrecancereuseVihPos: boolean;
  lesionPrecancereuseReferee: boolean;
  traitementChryotherapie: boolean;
  traitementThermocoagulation: boolean;
};

const INDICATEURS_T29: { value: keyof convertedType; label: string }[] = [
  {
    value: "ivaDepistee",
    label: "Femmes dépistées pour le cancer du col par IVA",
  },
  {
    value: "ivaDepisteeVihPos",
    label: "Femmes séropositives au VIH dépistées par IVA",
  },
  {
    value: "lesionPrecancereuse",
    label: "Femmes présentant des lésions précancéreuses",
  },
  {
    value: "lesionPrecancereuseVihPos",
    label: "Femmes séropositives présentant des lésions précancéreuses",
  },
  {
    value: "lesionPrecancereuseReferee",
    label:
      "Femmes avec lésions précancéreuses référées vers une autre structure",
  },
  {
    value: "traitementChryotherapie",
    label: "Femmes IVA positives ayant reçu un traitement de chryothérapie",
  },
  {
    value: "traitementThermocoagulation",
    label:
      "Femmes IVA positives ayant reçu un traitement de thermocoagulation",
  },
];

interface Props {
  ageRanges: AgeRange[];
  clientData: ClientData[];
  dateDebut: string | Date;
  dateFin: string | Date;
  clinic: string;
}

export default function TableRapportSigGyneco({
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

    // Heuristique "femme séropositive au VIH" : on regarde le statut VIH
    // sur la même visite (dépistage positif ou suivi PEC VIH actif).
    const isVihPos = (item: ClientData) =>
      item.depistageVihResultat === "positif" ||
      !!item.pecVihTypeclient ||
      item.depistageVihResultatPositifMisSousArv === true;

    const newConverted = clientData.map<convertedType>((item) => {
      const female = item.sexe === "Féminin";
      const ivaFait =
        female &&
        item.consultationGyneco === true &&
        !!item.resultatIva &&
        item.resultatIva.trim() !== "";
      const ivaPositif = ivaFait && item.resultatIva === "positif";
      // « Référée » : IVA positif avec lésion non éligible au traitement local
      // (le formulaire fixe eligibleTraitementIva=false dans ce cas).
      const referee = ivaPositif && item.eligibleTraitementIva === false;

      return {
        ...item,
        ivaDepistee: ivaFait,
        ivaDepisteeVihPos: ivaFait && isVihPos(item),
        lesionPrecancereuse: ivaPositif,
        lesionPrecancereuseVihPos: ivaPositif && isVihPos(item),
        lesionPrecancereuseReferee: referee,
        traitementChryotherapie:
          ivaPositif && item.typeTraitementIva === "chryotherapie",
        traitementThermocoagulation:
          ivaPositif && item.typeTraitementIva === "thermocoagulation",
      };
    });
    setConverted(newConverted);
  }, [clientData]);

  if (converted.length === 0) {
    return <p className="text-center">Aucune donnée disponible.</p>;
  }

  const countByAge = (
    propriete: keyof convertedType,
    range: AgeRange,
  ): number =>
    converted.reduce((acc, c) => {
      const ageOk = c.age >= range.min && c.age <= range.max;
      const valOk = c[propriete] === true;
      return ageOk && valOk ? acc + 1 : acc;
    }, 0);

  const ageLabel = (r: AgeRange) =>
    r.max < 120 ? `${r.min}-${r.max} ans` : `${r.min} ans et +`;

  // ---------------- Export Excel ----------------
  const exportToExcel = async () => {
    setSpinner(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("SIG Gyneco");

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
      worksheet.getCell("A6").value =
        "Tableau 29 : Dépistage du cancer du col de l'utérus";
      worksheet.getCell("A6").font = { bold: true };

      const headerRow = worksheet.getRow(8);
      headerRow.getCell(1).value = "Indicateurs";
      ageRanges.forEach((r, i) => {
        headerRow.getCell(2 + i).value = ageLabel(r);
      });
      headerRow.getCell(2 + ageRanges.length).value = "Total";
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      let rowIdx = 9;
      INDICATEURS_T29.forEach((indicateur) => {
        const row = worksheet.getRow(rowIdx);
        row.getCell(1).value = indicateur.label;
        let total = 0;
        ageRanges.forEach((r, i) => {
          const v = countByAge(indicateur.value, r);
          row.getCell(2 + i).value = v;
          total += v;
        });
        const totalCell = row.getCell(2 + ageRanges.length);
        totalCell.value = total;
        totalCell.font = { bold: true };
        rowIdx += 1;
      });

      worksheet.columns.forEach((col) => {
        col.width = 22;
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
      link.download = `Rapport_SIG_GYNECO_${new Date().toLocaleDateString("fr-FR")}.xlsx`;
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

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(
        "Tableau 29 : Dépistage du cancer du col de l'utérus",
        pageWidth / 2,
        14,
        { align: "center" },
      );

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Période : ${new Date(dateDebut).toLocaleDateString("fr-FR")} - ${new Date(dateFin).toLocaleDateString("fr-FR")}`,
        14,
        24,
      );
      doc.text(`Clinique : ${clinic}`, pageWidth - 14, 24, { align: "right" });

      const head = [
        ["Indicateurs", ...ageRanges.map(ageLabel), "Total"],
      ];
      const body = INDICATEURS_T29.map((indicateur) => {
        const cells = ageRanges.map((r) => countByAge(indicateur.value, r));
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
        columnStyles: { 0: { cellWidth: 95, halign: "left" } },
      });

      doc.save(
        `Rapport_SIG_GYNECO_${new Date().toLocaleDateString("fr-FR")}.pdf`,
      );
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

      <h2 className="font-bold">
        Tableau 29 : Dépistage du cancer du col de l&apos;utérus
      </h2>
      <Table className="border">
        <TableHeader className="bg-slate-100">
          <TableRow>
            <TableHead className="font-semibold">Indicateurs</TableHead>
            {ageRanges.map((r) => (
              <TableHead
                key={`age-${r.min}-${r.max}`}
                className="font-semibold text-center"
              >
                {ageLabel(r)}
              </TableHead>
            ))}
            <TableHead className="font-semibold text-center">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {INDICATEURS_T29.map((indicateur) => {
            const cells = ageRanges.map((r) =>
              countByAge(indicateur.value, r),
            );
            const total = cells.reduce((a, b) => a + b, 0);
            return (
              <TableRow key={String(indicateur.value)}>
                <TableCell>{indicateur.label}</TableCell>
                {cells.map((v, i) => (
                  <TableCell
                    key={`${String(indicateur.value)}-${i}`}
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
