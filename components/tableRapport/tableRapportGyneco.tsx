// import { countClientPfRetrait } from "../rapport/pf/pf";
import { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { Worksheet } from "exceljs";
import { tableExport } from "../tableExportFonction";
import { countClientBoolean } from "../rapport/gyneco/gyneco";
import { clientDataProps } from "../rapportPfActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Separator } from "../ui/separator";
import { Spinner } from "../ui/spinner";
import { Button } from "../ui/button";

// types.ts ou en haut du fichier
type AgeRange = {
  min: number;
  max: number;
};
type convertedType = clientDataProps & {
  ivaAndPf: boolean;
  resultatCancerSeinPos: boolean;
  resultatIvaPos: boolean;
  traitementChryo: boolean;
  traitementThermo: boolean;
};
type DateType = string | Date;
interface TableRapportGynecoProps {
  ageRanges: AgeRange[];
  clientData: clientDataProps[];
  dateDebut: DateType;
  dateFin: DateType;
  clinic: string;
}
const tabClientGyneco = [
  { label: "Nombre de femmes réçues", value: "consultationGyneco" },
  {
    label: "Nombre de femmes réçues en PF dépistées à l'IVA",
    value: "ivaAndPf",
  },
  {
    label:
      "Nombre de femmes réçues pour le dépistage précoce du cancer du col de l'utérus (Uniquement)",
    value: "counsellingAvantDepistage",
  },
  {
    label: "Nombre de femmes réçues pour le dépistage du cancer du sein ",
    value: "counsellingCancerSein",
  },
  {
    label: "Nombre de femmes dépistées positives à l'IVA",
    value: "resultatIvaPos",
  },
  {
    label:
      "Nombre de femmes dépistées positives à l'IVA et éligibles au traitement",
    value: "eligibleTraitementIva",
  },
  {
    label:
      "Nombre de femmes dépistées positives à l'IVA et traitées à la chryothérapie",
    value: "traitementChryo",
  },
  {
    label:
      "Nombre de femmes dépistées positives à l'IVA et traitées à la thermocoagulation",
    value: "traitementThermo",
  },
  {
    label:
      "Nombre de femmes dépistées positives pour le cancer du sein (présomption)",
    value: "resultatCancerSeinPos",
  },
];
const tabServiceGyneco = [
  { label: "SRV - GYN Consultation", value: "consultationGyneco" },
  {
    label: "SRV - GYN Counseling avant dépistage du cancer du col de l'utérus",
    value: "counsellingAvantDepistage",
  },
  { label: "SRV - GYN Dépistage à l'IVA", value: "counsellingAvantDepistage" },
  {
    label: "SRV - GYN Counseling après dépistage du cancer du col de l'utérus",
    value: "counsellingApresDepistage",
  },
  {
    label: "SRV - GYN Dépistage à l'IVA - Traité à la Chryothérapie",
    value: "traitementChryo",
  },
  {
    label: "SRV - GYN Dépistage à l'IVA - Traité à la Thermocoagulation",
    value: "traitementThermo",
  },
  {
    label: "SRV - GYN Counseling - Ordre général - Cancer de Sein",
    value: "counsellingCancerSein",
  },
  {
    label: "SRV - GYN Counseling - Ordre général - Autres",
    value: "counsellingAutreProbleme",
  },

  {
    label: "SRV - GYN Investigation Examen Manuelle des seins",
    value: "examenPalpationSein",
  },
  {
    label: "SRV - GYN Investigation Examen Pelvien Bimanuel",
    value: "toucheeVaginale",
  },
  {
    label: "SRV - GYN Investigation Examen Autres",
    value: "examenPhysique",
  },
  {
    label: "SRV - GYN PEC Médicale - Régulation Menstruelle",
    value: "regularisationMenstruelle",
  },
  {
    label: "SRV - GYN PEC Médicale - Règles Irrégulières",
    value: "reglesIrreguliere",
  },
  {
    label: "SRV - GYN PEC Médicale - Autres maladies gynécologiques",
    value: "autreProblemeGyneco",
  },
];
export default function TableRapportGyneco({
  ageRanges,
  clientData,
  dateDebut,
  dateFin,
  clinic,
}: TableRapportGynecoProps) {
  const [converted, setConverted] = useState<convertedType[]>([]);
  const [spinner, setSpinner] = useState(false);

  useEffect(() => {
    if (!clientData || clientData.length === 0) {
      setConverted([]);
    } else {
      const newConverted = clientData.map((item) => ({
        ...item,
        ivaAndPf: item.motifVisiteGyneco === "true",
        resultatCancerSeinPos: item.resultatCancerSein === "positif",
        resultatIvaPos: item.resultatIva === "positif",
        traitementChryo: item.typeTraitementIva === "chryotherapie",
        traitementThermo: item.typeTraitementIva === "thermocoagulation",
      }));
      setConverted(newConverted);
    }
  }, [clientData]);
  if (converted.length === 0) {
    return <p className="text-center">Aucune donnée disponible.</p>;
  } else {
    console.log("converted", converted);
  }

  const exportToExcel = async () => {
    setSpinner(true);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Gynécologie");

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
    // Tableau des clients Gynécologie
    tableExport(
      "Rapport clients Gynécologie",
      worksheet,
      7, // Ligne de départ du tableau (ex : ligne 6)
      4, // Colspan
      tabClientGyneco,
      ageRanges,
      converted,
      countClientBoolean
    );
    setCellAlignment(worksheet, ["A"], 9, 18, "left");
    // Tableau des services Gynécologie
    tableExport(
      "Rapport services Gynécologie",
      worksheet,
      20, // Ligne de départ du tableau (ex : ligne 6)
      4, // Colspan
      tabServiceGyneco,
      ageRanges,
      converted,
      countClientBoolean
    );
    setCellAlignment(worksheet, ["A"], 22, 36, "left");
    // Générer le fichier
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Rapport_Gyneco_${new Date().toLocaleDateString(
      "fr-FR"
    )}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);

    setSpinner(false);
  };

  return (
    <div className="flex flex-col gap-4 bg-gray-50 opacity-90 p-4 rounded-sm mt-2 w-full">
      <Button
        onClick={exportToExcel}
        type="button"
        disabled={spinner}
        className="bg-blue-500 mx-auto text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        <Spinner
          show={spinner}
          size={"small"}
          className="text-white dark:text-slate-400"
        />
        Exporter
      </Button>
      <h2 className="font-bold">Rapport clients Gynécologie</h2>
      <Table className="table-auto w-full">
        <TableHeader className="bg-gray-200  border border-gray-400">
          <TableRow>
            <TableCell
              rowSpan={2}
              className="font-bold"
              style={{ width: "500px", minWidth: "400px", maxWidth: "400px" }}
            >
              Indicateurs
            </TableCell>
            <TableCell colSpan={5} className="font-bold text-center">
              Femmes
            </TableCell>
            <TableCell rowSpan={2} className="font-bold">
              Total
            </TableCell>
          </TableRow>
          <TableRow className="bg-gray-300 text-center ">
            <TableCell className="border border-l-gray-400">-10 ans</TableCell>
            <TableCell>10-14 ans</TableCell>
            <TableCell>15-19 ans</TableCell>
            <TableCell>20-24 ans</TableCell>
            <TableCell className="border border-r-gray-400">
              25 ans et +
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tabClientGyneco.map((item) => (
            <TableRow key={item.label}>
              <TableCell
                className="border border-l-gray-400 wrap-break-word whitespace-normal overflow-hidden"
                style={{ width: "400px", minWidth: "400px", maxWidth: "400px" }}
              >
                {item.label}
              </TableCell>
              {ageRanges.map((range, index) => (
                <TableCell
                  key={`nu-${item.label}-${index}`}
                  className="text-center border border-l-gray-400 border-r-gray-400"
                >
                  {countClientBoolean(
                    converted,
                    range.min,
                    range.max,
                    item.value,
                    true
                  )}
                </TableCell>
              ))}
              <TableCell className="text-center border font-semibold border-l-gray-400 border-r-gray-400">
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientBoolean(
                      converted,
                      range.min,
                      range.max,
                      item.value,
                      true
                    ),
                  0
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Separator className="bg-green-300"></Separator>

      <h2 className="font-bold">Rapport services gynécologiques offerts</h2>
      <Table className="table-auto w-full">
        <TableHeader className="bg-gray-200  border border-gray-400">
          <TableRow>
            <TableCell
              rowSpan={2}
              className="font-bold"
              style={{ width: "500px", minWidth: "400px", maxWidth: "400px" }}
            >
              Indicateurs
            </TableCell>
            <TableCell colSpan={5} className="font-bold text-center">
              Femmes
            </TableCell>
            <TableCell rowSpan={2} className="font-bold">
              Total
            </TableCell>
          </TableRow>
          <TableRow className="bg-gray-300 text-center ">
            <TableCell className="border border-l-gray-400">-10 ans</TableCell>
            <TableCell>10-14 ans</TableCell>
            <TableCell>15-19 ans</TableCell>
            <TableCell>20-24 ans</TableCell>
            <TableCell className="border border-r-gray-400">
              25 ans et +
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tabServiceGyneco.map((item) => (
            <TableRow key={item.label}>
              <TableCell
                className="border border-l-gray-400 wrap-break-word whitespace-normal overflow-hidden"
                style={{ width: "400px", minWidth: "400px", maxWidth: "400px" }}
              >
                {item.label}
              </TableCell>
              {ageRanges.map((range, index) => (
                <TableCell
                  key={`nu-${item.label}-${index}`}
                  className="text-center border border-l-gray-400 border-r-gray-400"
                >
                  {countClientBoolean(
                    converted,
                    range.min,
                    range.max,
                    item.value,
                    true
                  )}
                </TableCell>
              ))}
              <TableCell className="text-center border font-semibold border-l-gray-400 border-r-gray-400">
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientBoolean(
                      converted,
                      range.min,
                      range.max,
                      item.value,
                      true
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
