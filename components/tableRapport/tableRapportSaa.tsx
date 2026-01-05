// import { countClientPfRetrait } from "../rapport/pf/pf";
import { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { Worksheet } from "exceljs";
import { tableExport } from "../tableExportFonction";
// import { countClientBoolean } from "../rapport/gyneco/gyneco";
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
  saaConsultationSaa: boolean;
  saaPECAMIU: boolean;
  saaPECMisoprostol: boolean;
  saaContraceptionPillule: boolean;
  saaContraceptionInjectable2mois: boolean;
  saaContraceptionInjectable3mois: boolean;
  saaContraceptionDIU: boolean;
  saaContraceptionImplant3ans: boolean;
  saaContraceptionImplant5ans: boolean;
};
type DateType = string | Date;
interface TableRapportGynecoProps {
  ageRanges: AgeRange[];
  clientData: clientDataProps[];
  dateDebut: DateType;
  dateFin: DateType;
  clinic: string;
}
const tabClientSaa = [
  { label: "Nombre de femmes réçues", value: "saaConsultationSaa" },
  {
    label: "Nombre de femmes pour le suivi post avortement -RDV",
    value: "saaSuiviPostAvortement",
  },
  {
    label: "Nombre de femmes pour le suivi post avortement - Auto-référée",
    value: "saaSuiviAutoRefere",
  },
  {
    label: "Nombre de PEC AMIU ",
    value: "saaPECAMIU",
  },
  {
    label: "Nombre de PEC Misoprostol",
    value: "saaPECMisoprostol",
  },
  {
    label:
      "Nombre de femmes reçues mise sous contraception Post Abortum - Pillule",
    value: "saaContraceptionPillule",
  },
  {
    label:
      "Nombre de femmes reçues mise sous contraception Post Abortum - injectable 2 mois",
    value: "saaContraceptionInjectable2mois",
  },
  {
    label:
      "Nombre de femmes reçues mise sous contraception Post Abortum - injectable 3 mois",
    value: "saaContraceptionInjectable3mois",
  },
  {
    label: "Nombre de femmes reçues mise sous contraception Post Abortum - DIU",
    value: "saaContraceptionDIU",
  },
  {
    label:
      "Nombre de femmes reçues mise sous contraception Post Abortum - Implant 3 ans",
    value: "saaContraceptionImplant3ans",
  },
  {
    label:
      "Nombre de femmes reçues mise sous contraception Post Abortum - Implant 5 ans",
    value: "saaContraceptionImplant5ans",
  },
];
const tabServiceSaa = [
  {
    label: "SRV - SAA Counseling - pré Avortement",
    value: "saaCounsellingPre",
  },
  {
    label: "SRV - SAA Counseling - post Avortement",
    value: "saaCounsellingPost",
  },
  {
    label: "SRV - SAA Consultation - post Avortement",
    value: "saaConsultationPost",
  },
  {
    label: "SRV - SAA PEC - AMIU",
    value: "saaPECAMIU",
  },
  {
    label: "SRV - SAA PEC - Médical - Misoprostol",
    value: "saaPECMisoprostol",
  },
  {
    label:
      "SRV - SAA PEC - Médical - des complications suite à une intervention Médicale",
    value: "intervention_medicamenteuse",
  },
  {
    label:
      "SRV - SAA PEC - Médical - des complications suite à une intervention Chirurgicale",
    value: "intervention_chirurgicale",
  },
  {
    label: "SRV - SAA PEC - Médical - Suivi Post Avortement",
    value: "saaSuiviPostAvortement",
  },
];
export default function TableRapportSaa({
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
        saaConsultationSaa: item.saaConsultation === true,
        saaSuiviPostAvortement: item.saaSuiviPostAvortement === true,
        saaSuiviAutoRefere: item.saaSuiviAutoRefere === true,
        saaPECAMIU: item.saaTypePec === "amiu",
        saaPECMisoprostol: item.saaTypePec === "misoprostol",
        saaContraceptionPillule:
          item.saaConsultation === true && item.courtDuree === "pilule",
        saaContraceptionInjectable2mois:
          item.saaConsultation === true && item.courtDuree === "noristerat",
        saaContraceptionInjectable3mois:
          item.saaConsultation === true && item.courtDuree === "injectable",
        saaContraceptionDIU:
          item.saaConsultation === true && item.sterilet === "insertion",
        saaContraceptionImplant3ans:
          item.saaConsultation === true && item.implanon === "insertion",
        saaContraceptionImplant5ans:
          item.saaConsultation === true && item.jadelle === "insertion",
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
    const worksheet = workbook.addWorksheet("Saa");

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
    // Tableau des clients SAA
    tableExport(
      "Rapport clients SAA",
      worksheet,
      7, // Ligne de départ du tableau (ex : ligne 6)
      4, // Colspan
      tabClientSaa,
      ageRanges,
      converted,
      countClientBoolean
    );
    setCellAlignment(worksheet, ["A"], 9, 18, "left");
    // Tableau des services SAA offerts
    tableExport(
      "Rapport services SAA offerts",
      worksheet,
      23, // Ligne de départ du tableau (ex : ligne 6)
      4, // Colspan
      tabServiceSaa,
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
    link.download = `Rapport_Saa_${new Date().toLocaleDateString(
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
      <h2 className="font-bold">Rapport clients SAA</h2>
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
          {tabClientSaa.map((item) => (
            <TableRow key={item.label}>
              <TableCell
                className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
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

      <h2 className="font-bold">Rapport services SAA offerts</h2>
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
          {tabServiceSaa.map((item) => (
            <TableRow key={item.label}>
              <TableCell
                className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
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

export const countClientBoolean = (
  clientData: clientDataProps[],
  minAge: number,
  maxAge: number,
  propriete: string,
  indicateur: boolean
): number => {
  // Vérification initiale des données
  if (!Array.isArray(clientData) || clientData.length === 0) {
    console.warn("La liste des clients est vide ou invalide.");
    return 0;
  }

  // Comptage des clients répondant aux critères
  const count = clientData.reduce((acc, client) => {
    // Vérification de l'âge
    const ageCondition = client.age >= minAge && client.age <= maxAge;

    // Vérification de la propriété et de sa valeur
    const proprieteCondition =
      client[propriete as keyof clientDataProps] === indicateur;

    return ageCondition && proprieteCondition ? acc + 1 : acc;
  }, 0);

  return count;
};
