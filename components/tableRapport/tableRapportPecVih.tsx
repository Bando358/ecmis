// import { countClientPfRetrait } from "../rapport/pf/pf";
import { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { Worksheet } from "exceljs";
// import { tableExportWithSexe } from "../tableExportFonction";
import { ClientData } from "../rapportPfActions";
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

// types.ts ou en haut du fichier
type AgeRange = {
  min: number;
  max: number;
};
export type convertedType = Omit<
  ClientData,
  | "pecVihCounselling"
  | "pecVihMoleculeArv"
  | "pecVihIoPaludisme"
  | "pecVihIoTuberculose"
  | "pecVihIoAutre"
  | "pecVihAesArv"
  | "pecVihCotrimo"
  | "pecVihSoutienPsychoSocial"
  | "pecVihSpdp"
> & {
  pecVihCounselling: boolean;
  pecVihMoleculeArv: boolean;
  pecVihIoPaludisme: boolean;
  pecVihIoTuberculose: boolean;
  pecVihIoAutre: boolean;
  pecVihAesArv: boolean;
  pecVihCotrimo: boolean;
  pecVihSoutienPsychoSocial: boolean;
  pecVihSpdp: boolean;
};

type DateType = string | Date;
interface TableRapportGynecoProps {
  ageRanges: AgeRange[];
  clientData: ClientData[];
  dateDebut: DateType;
  dateFin: DateType;
  clinic: string;
}

const tabClientPecVih = [
  {
    label: "Nombre de PVVIH reçues",
    value: "pecVihCounselling",
  },
  {
    label: "Nombre de PVVIH et mis sous ARV",
    value: "pecVihMoleculeArv",
  },
];
const tabServicePecVih = [
  { label: "SRV - PVVIH - Consultation", value: "pecVihCounselling" },
  {
    label: "SRV - PVVIH - Counseling",
    value: "pecVihCounselling",
  },
  {
    label: "SRV - PVVIH - PEC - ARV",
    value: "pecVihMoleculeArv",
  },
  {
    label: "SRV - PVVIH - PEC -  Médicale IO - Paludisme",
    value: "pecVihIoPaludisme",
  },
  {
    label: "SRV - PVVIH - PEC -  Médicale IO - Tuberculose",
    value: "pecVihIoTuberculose",
  },
  {
    label: "SRV - PVVIH - PEC -  Médicale IO - Autres",
    value: "pecVihIoAutre",
  },
  {
    label: "SRV - PVVIH - Prévention - Prophylaxie - ARV/AES",
    value: "pecVihAesArv",
  },
  {
    label: "SRV - PVVIH - Prévention - Prophylaxie - Cotrimoxazole",
    value: "pecVihCotrimo",
  },
  {
    label: "SRV - PVVIH - Counseling - Soutien Psychosocial",
    value: "pecVihSoutienPsychoSocial",
  },
  {
    label: "SRV - PVVIH - SPDP",
    value: "pecVihSpdp",
  },
];
export default function TableRapportPecVih({
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
        // consultationIst: item.counsellingAvantDepistage === true, // ⚡

        pecVihCounselling: Boolean(
          item.pecVihCounselling && item.pecVihCounselling === true
        ), // ⚡
        pecVihMoleculeArv: Boolean(
          item.pecVihMoleculeArv && item.pecVihMoleculeArv !== null
        ), // ⚡
        pecVihIoPaludisme: Boolean(
          item.pecVihIoPaludisme && item.pecVihIoPaludisme !== null
        ), // ⚡
        pecVihIoTuberculose: Boolean(
          item.pecVihIoTuberculose && item.pecVihIoTuberculose === true
        ), // ⚡
        pecVihIoAutre: Boolean(
          item.pecVihIoAutre && item.pecVihIoAutre === true
        ), // ⚡
        pecVihAesArv: Boolean(item.pecVihAesArv && item.pecVihAesArv === true), // ⚡
        pecVihCotrimo: Boolean(
          item.pecVihCotrimo && item.pecVihCotrimo === true
        ), // ⚡
        pecVihSoutienPsychoSocial: Boolean(
          item.pecVihSoutienPsychoSocial &&
            item.pecVihSoutienPsychoSocial === true
        ), // ⚡
        pecVihSpdp: Boolean(item.pecVihSpdp && item.pecVihSpdp === true), // ⚡
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
    const worksheet = workbook.addWorksheet("PEC VIH");

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
      "Rapport clients Reçus PVVIH",
      worksheet,
      7, // Ligne de départ du tableau (ex : ligne 6)
      4, // Colspan
      tabClientPecVih,
      ageRanges,
      converted,
      countClientBooleanBySexe
    );
    setCellAlignment(worksheet, ["A"], 9, 18, "left");
    // Tableau des services PVVIH
    tableExportWithSexe(
      "Rapport services PVVIH",
      worksheet,
      13, // Ligne de départ du tableau (ex : ligne 6)
      4, // Colspan
      tabServicePecVih,
      ageRanges,
      converted,
      countClientBooleanBySexe
    );
    setCellAlignment(worksheet, ["A"], 15, 24, "left");
    // Générer le fichier
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Rapport_PEC_VIH_${new Date().toLocaleDateString(
      "fr-FR"
    )}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);

    setSpinner(false);
  };

  return (
    <div className="flex flex-col gap-4 bg-gray-50 opacity-90 p-4 rounded-sm mt-2 w-full overflow-x-auto">
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
      <h2 className="font-bold">Rapport clients PVVIH </h2>
      <Table className="border">
        <TableHeader className="bg-gray-200">
          <TableRow>
            <TableCell rowSpan={2} className="font-bold">
              Indicateurs
            </TableCell>
            <TableCell
              colSpan={5}
              className="font-bold text-center border border-r-gray-400 border-l-gray-400"
            >
              Masculin
            </TableCell>
            <TableCell colSpan={5} className="font-bold text-center">
              Féminin
            </TableCell>
            <TableCell rowSpan={2} className="font-bold">
              Total
            </TableCell>
          </TableRow>
          <TableRow className="bg-gray-300 text-center">
            <TableCell className="border border-l-gray-400">-10 ans</TableCell>
            <TableCell>10-14 ans</TableCell>
            <TableCell>15-19 ans</TableCell>
            <TableCell>20-24 ans</TableCell>
            <TableCell className="border border-r-gray-400">
              25 ans et +
            </TableCell>
            <TableCell>-10 ans</TableCell>
            <TableCell>10-14 ans</TableCell>
            <TableCell>15-19 ans</TableCell>
            <TableCell>20-24 ans</TableCell>
            <TableCell className="border border-r-gray-400">
              25 ans et +
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tabClientPecVih.map((client) => (
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
      <h2 className="font-bold">Rapport services PVVIH</h2>
      <Table className="border">
        <TableHeader className="bg-gray-200">
          <TableRow>
            <TableCell rowSpan={2} className="font-bold">
              Indicateurs
            </TableCell>
            <TableCell
              colSpan={5}
              className="font-bold text-center border border-r-gray-400 border-l-gray-400"
            >
              Masculin
            </TableCell>
            <TableCell colSpan={5} className="font-bold text-center">
              Féminin
            </TableCell>
            <TableCell rowSpan={2} className="font-bold">
              Total
            </TableCell>
          </TableRow>
          <TableRow className="bg-gray-300 text-center">
            <TableCell className="border border-l-gray-400">-10 ans</TableCell>
            <TableCell>10-14 ans</TableCell>
            <TableCell>15-19 ans</TableCell>
            <TableCell>20-24 ans</TableCell>
            <TableCell className="border border-r-gray-400">
              25 ans et +
            </TableCell>
            <TableCell>-10 ans</TableCell>
            <TableCell>10-14 ans</TableCell>
            <TableCell>15-19 ans</TableCell>
            <TableCell>20-24 ans</TableCell>
            <TableCell className="border border-r-gray-400">
              25 ans et +
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tabServicePecVih.map((client) => (
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
