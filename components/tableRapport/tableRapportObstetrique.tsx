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
  obstCpn1Trim1: boolean;
  obstCpn1Trim2: boolean;
  obstCpn1: boolean;
  obstCpn2: boolean;
  obstCpn3: boolean;
  obstCpn4Plus: boolean;
  obstEtatGrossesseRisqueCpn1: boolean;
  obstEtatNutritionnelMalnutri: boolean;
  obstVatCpn: boolean;
  cponDureeImmediat: boolean;
  cponDureeNonImmediat: boolean;
  accouchementTypeEvacuationAvant: boolean;
  accouchementTypeEvacuationPendant: boolean;
  accouchementTypeEvacuationApres: boolean;
  accouchementFemmeAyantEnfantVivant: boolean;
  accouchementFemmeAyantEnfantMortNeFrais: boolean;
  accouchementFemmeAyantEnfantMortNeMacere: boolean;
  accouchementSou: boolean;
};
type DateType = string | Date;
interface TableRapportGynecoProps {
  ageRanges: AgeRange[];
  clientData: clientDataProps[];
  dateDebut: DateType;
  dateFin: DateType;
  clinic: string;
}
const tabClientObstetrique = [
  { label: "Nombre de femmes réçues", value: "obstConsultation" },
  {
    label: "Nombre de femmes réçues en CPN 1",
    value: "obstCpn1",
  },
  {
    label: "Nombre de femmes réçues en CPN 1 au 1er trimestre",
    value: "obstCpn1Trim1",
  },
  {
    label: "Nombre de femmes réçues en CPN 1 autre trimestre",
    value: "obstCpn1Trim2",
  },
  {
    label: "Nombre de femmes réçues en CPN 2",
    value: "obstCpn2",
  },
  {
    label: "Nombre de femmes réçues en CPN 3",
    value: "obstCpn3",
  },
  {
    label: "Nombre de femmes réçues en CPN 4+",
    value: "obstCpn4Plus",
  },
  {
    label: "Nombre de grossesse à risque dépistée en CPN 1",
    value: "obstEtatGrossesseRisqueCpn1",
  },
  {
    label: "Nombre de femmes enceintes malnutries dépistée en CPN",
    value: "obstEtatNutritionnelMalnutri",
  },
  {
    label: "Nombre de femmes enceintes dépistée à la Syphilis en CPN",
    value: "obstSyphilis",
  },
  {
    label: "Nombre de femmes Vaccinées pendant la CPN",
    value: "obstVatCpn",
  },
  {
    label: "Nombre de femmes réçues en CPON",
    value: "cponConsultation",
  },
  {
    label: "Nombre de femmes réçues en CPON Post partum Immédiat",
    value: "cponDureeImmediat",
  },
  {
    label: "Nombre de femmes réçues en CPON Post partum",
    value: "cponDureeNonImmediat",
  },
];
const tabServiceObstetrique = [
  { label: "SRV - OBST Consultation Prénatale", value: "obstConsultation" },
  {
    label: "SRV - OBST Counseling Prénatale",
    value: "obstCounselling",
  },
  {
    label: "SRV - OBST Investigation Examen Prénatale",
    value: "obstInvestigations",
  },
  {
    label: "SRV - OBST Consultation Post Natale",
    value: "cponConsultation",
  },
  {
    label: "SRV - OBST Counseling Post Natale",
    value: "cponCounselling",
  },
  {
    label: "SRV - OBST Investigation Test de grossesse",
    value: "testConsultation",
  },
];
const tabClientMaternite = [
  {
    label: "Nombre de femmes réçues ayant accouché",
    value: "accouchementConsultation",
  },
  {
    label:
      "Nombre de femmes évacuées suite à de complications avant l'accouchement",
    value: "accouchementTypeEvacuationAvant",
  },
  {
    label:
      "Nombre de femmes évacuées suite à de complications pendant l'accouchement",
    value: "accouchementTypeEvacuationPendant",
  },
  {
    label:
      "Nombre de femmes évacuées suite à de complications après l'accouchement",
    value: "accouchementTypeEvacuationApres",
  },
  {
    label: "Nombre de femmes ayant leurs nouveaux nés vivants",
    value: "accouchementFemmeAyantEnfantVivant",
  },
  {
    label: "Nombre de femmes ayant perdu leurs nouveaux nés-Mort né frais",
    value: "accouchementFemmeAyantEnfantMortNeFrais",
  },
  {
    label: "Nombre de femmes ayant perdu leurs nouveaux nés-Mort né macéré",
    value: "accouchementFemmeAyantEnfantMortNeMacere",
  },
  {
    label: "Nombre de décès maternels enregistrés",
    value: "accouchementDecesMaternels",
  },
];
const tabServiceMaternite = [
  {
    label: "SRV - OBST - PEC Médical - Accouchement",
    value: "accouchementConsultation",
  },
  { label: "SRV - OBST - PEC Médical - SOU", value: "accouchementSou" },
];
export default function TableRapportObstetrique({
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
        obstEtatGrossesseRisqueCpn1:
          item.obstEtatGrossesse === "risque" && item.obstTypeVisite === "cpn1",
        obstCpn1: item.obstTypeVisite === "cpn1",
        obstCpn2: item.obstTypeVisite === "cpn2",
        obstCpn3: item.obstTypeVisite === "cpn3",
        obstCpn4Plus:
          item.obstTypeVisite === "cpn4" || item.obstTypeVisite === "cpn5",
        obstCpn1Trim1:
          item.grossesseDdr &&
          depasseUnTrimestre(item.grossesseDdr, new Date(dateFin)) &&
          item.grossesseAge < 13 &&
          item.obstTypeVisite === "cpn1",
        obstCpn1Trim2:
          item.grossesseDdr &&
          depasseUnTrimestre(item.grossesseDdr, new Date(dateFin)) &&
          item.grossesseAge > 12,
        // obstEtatGrossesseRisque: item.obstEtatGrossesse === "risque",
        obstEtatNutritionnelMalnutri:
          !!item.obstEtatNutritionnel &&
          item.obstEtatNutritionnel !== "Poids normal",

        obstVatCpn: item.obstVat !== null,
        cponDureeNonImmediat:
          item.cponConsultation === true && item.cponDuree !== "6_72",
        cponDureeImmediat:
          item.cponConsultation === true && item.cponDuree === "6_72",
        accouchementTypeEvacuationAvant:
          item.accouchementTypeEvacuation === "avant",
        accouchementTypeEvacuationPendant:
          item.accouchementTypeEvacuation === "pendant",
        accouchementTypeEvacuationApres:
          item.accouchementTypeEvacuation === "apres",
        accouchementFemmeAyantEnfantVivant:
          item.accouchementConsultation === true &&
          item.accouchementEnfantVivant > 0,
        accouchementFemmeAyantEnfantMortNeFrais:
          item.accouchementConsultation === true &&
          item.accouchementEnfantMortNeFrais > 0,
        accouchementFemmeAyantEnfantMortNeMacere:
          item.accouchementConsultation === true &&
          item.accouchementEnfantMortNeMacere > 0,
        accouchementSou:
          item.accouchementEvacuationMere === "non" &&
          item.accouchementEnfantVivant > 0,
      }));
      setConverted(newConverted);
    }
  }, [clientData, dateFin]);
  if (converted.length === 0) {
    return <p className="text-center">Aucune donnée disponible.</p>;
  } else {
    console.log("converted", converted);
  }
  function depasseUnTrimestre(date1: Date, date2: Date): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    const diffMois =
      (d2.getFullYear() - d1.getFullYear()) * 12 +
      (d2.getMonth() - d1.getMonth());

    // Si différence en mois > 3 → dépasse un trimestre
    // Si = 3 → vérifier les jours
    if (diffMois > 3) return true;
    if (diffMois < 3) return false;

    return d2.getDate() >= d1.getDate();
  }

  // Exemple
  console.log(
    depasseUnTrimestre(new Date("2025-01-01"), new Date("2025-04-01"))
  ); // true
  console.log(
    depasseUnTrimestre(new Date("2025-01-01"), new Date("2025-03-30"))
  ); // false

  const exportToExcel = async () => {
    setSpinner(true);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Obst_Cpon_Test_Mte");

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
    // Tableau des clients reçus Avant/Après l'accouchement
    tableExport(
      "Rapport clients reçus Avant/Après l'accouchement",
      worksheet,
      7, // Ligne de départ du tableau (ex : ligne 6)
      4, // Colspan
      tabClientObstetrique,
      ageRanges,
      converted,
      countClientBoolean
    );
    setCellAlignment(worksheet, ["A"], 9, 18, "left");
    // Tableau des services reçus Avant/Après l'accouchement
    tableExport(
      "Rapport services reçus Avant/Après l'accouchement",
      worksheet,
      25, // Ligne de départ du tableau (ex : ligne 6)
      4, // Colspan
      tabServiceObstetrique,
      ageRanges,
      converted,
      countClientBoolean
    );
    setCellAlignment(worksheet, ["A"], 22, 36, "left");
    // Tableau des Rapport Clients reçus Maternité
    tableExport(
      "Rapport Clients reçus Maternité",
      worksheet,
      38, // Ligne de départ du tableau (ex : ligne 6)
      4, // Colspan
      tabClientMaternite,
      ageRanges,
      converted,
      countClientBoolean
    );
    setCellAlignment(worksheet, ["A"], 38, 52, "left");
    // Tableau des Rapport Services offerts à la Maternité
    tableExport(
      "Rapport Services offerts à la Maternité",
      worksheet,
      53, // Ligne de départ du tableau (ex : ligne 6)
      4, // Colspan
      tabServiceMaternite,
      ageRanges,
      converted,
      countClientBoolean
    );
    setCellAlignment(worksheet, ["A"], 53, 67, "left");
    // Générer le fichier
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Rapport_Obstetrique_Cpon_Mte_${new Date().toLocaleDateString(
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
      <h2 className="font-bold">
        {"Rapport clients reçus Avant/Après l'accouchement"}
      </h2>
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
          {tabClientObstetrique.map((item) => (
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

      <h2 className="font-bold">
        {"Rapport services offerts Avant/Après l'accouchement"}
      </h2>
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
          {tabServiceObstetrique.map((item) => (
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

      <h2 className="font-bold">{"Rapport Clients reçus Maternité"}</h2>
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
          {tabClientMaternite.map((item) => (
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

      <h2 className="font-bold">{"Rapport Services offerts à la Maternité"}</h2>
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
          {tabServiceMaternite.map((item) => (
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
