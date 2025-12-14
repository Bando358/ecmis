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

// types.ts ou en haut du fichier
type AgeRange = {
  min: number;
  max: number;
};
export type convertedType = clientDataProps & {
  mdgConsultant: boolean;
  mdgConsultation: boolean;
  mdgMo: boolean;
  mdgDuree: boolean;
  mdgCasRefere: boolean;
  mdgFichesContreReference: boolean;

  pansements: boolean;
  injections: boolean;
  perfusions: boolean;
  autresSoins: boolean;
  petiteChirurgieCirconcisionMasculine: boolean;
  petiteChirurgieSuturePlaieTraumatique: boolean;
  petiteChirurgieIncisionAbces: boolean;
  autresPetiteChirurgie: boolean;

  SuspicionsPaludismeSimple: boolean;
  SuspicionsPaludismeSimpleFemmeEnceinte: boolean;
  paludismeSimple: boolean;
  paludismeSimpleFemmeEnceinte: boolean;
  suspicionsPaludismeGrave: boolean;
  suspicionsPaludismeGraveFemmeEnceinte: boolean;

  diarrheeSansDeshydratation: boolean;
  diarrheeAvecSigneDeshydratation: boolean;
  diarrheeAvecDeshydratationSevere: boolean;
  pneumonieSimple: boolean;
  pneumonieGrave: boolean;
  bronchoPneumonie: boolean;
  otitesMoyenneAiguE: boolean;
  rhinopharyngite: boolean;
  angine: boolean;
  sinusite: boolean;
  laryngite: boolean;
  pian: boolean;
  bilharzioseUrinaire: boolean;
  trichiasiseTrachomateux: boolean;
  hydrocele: boolean;
  lymphoedeme: boolean;
  tetanos: boolean;
  coqueluche: boolean;
  fievreTyphoide: boolean;
  fievreJaune: boolean;
  cholera: boolean;
  tuberculose: boolean;
  ulcere: boolean;
  varicelle: boolean;
  dermatose: boolean;
  zona: boolean;

  hepatiteB: boolean;
  hepatiteC: boolean;
  autresMaladiesInfectieuses: boolean;

  paludismeSimpleCta: boolean;
  paludismeSimpleCtaFemmeEnceinte: boolean;
  paludismeSimpleQuinineFemmeEnceinte: boolean;
  paludismePresumeCta: boolean;
  paludismePresumeCtaFemmeEnceinte: boolean;
  enfantMoins5AnsAvecPneumonieEtPrescriptionAntibiotique: boolean;
  enfantMoins5AnsAvecDiarrheeEtPrescriptionSroEtZinc: boolean;
};

type DateType = string | Date;
interface TableRapportGynecoProps {
  ageRanges: AgeRange[];
  clientData: ClientData[];
  dateDebut: DateType;
  dateFin: DateType;
  clinic: string;
}

const tabMaladiesInfectieuses = [
  { value: "hepatiteB", label: "Hépatite B" },
  { value: "hepatiteC", label: "Hépatite C" },
  {
    value: "autresMaladiesInfectieuses",
    label: "Autres Maladies Infectieuses",
  },
];
const tabTraitementPaludisme = [
  {
    value: "paludismeSimpleCta",
    label:
      "Paludisme Simple avec prescription de CTA (y compris femme enceinte)",
  },
  {
    value: "paludismeSimpleCtaFemmeEnceinte",
    label: "Paludisme Simple chez la femme enceinte avec prescription de CTA",
  },
  {
    value: "paludismeSimpleQuinineFemmeEnceinte",
    label:
      "Paludisme Simple chez la femme enceinte avec prescription de Quinine comprimé",
  },
  {
    value: "paludismePresumeCta",
    label: (
      <>
        Cas suspect de paludisme <span className="font-bold">présumé</span> avec
        prescription de CTA (y compris femme enceinte)
      </>
    ),
  },
  {
    value: "paludismePresumeCtaFemmeEnceinte",
    label: (
      <>
        Cas suspect de paludisme <span className="font-bold">présumé</span> chez
        la femme enceinte avec prescription de CTA
      </>
    ),
  },
  {
    value: "enfantMoins5AnsAvecPneumonieEtPrescriptionAntibiotique",
    label: `Nombre d'enfants de moins de 5 ans atteints de la pneumonie et ayant reçu une prescription d'antibiotiques`,
  },
  {
    value: "enfantMoins5AnsAvecDiarrheeEtPrescriptionSroEtZinc",
    label: `Nombre d'enfants de moins de 5 ans atteints de la diarrhée et ayant reçu une prescription de SRO + Zinc`,
  },
];

const tabDiagnosticOptions = [
  {
    value: "diarrheeSansDeshydratation",
    label: "Diarrhée Aiguë Sans Déshydratation",
  },
  {
    value: "diarrheeAvecSigneDeshydratation",
    label: "Diarrhée Aiguë Avec signe de Déshydratation",
  },
  {
    value: "diarrheeAvecDeshydratationSevere",
    label: "Diarrhée Aiguë Avec Déshydratation sévère",
  },
  { value: "pneumonieSimple", label: "Pneumonie Simple (IRA basse)" },
  { value: "pneumonieGrave", label: "Pneumonie Grave (IRA basse)" },
  { value: "bronchoPneumonie", label: "Broncho-Pneumonie (IRA basse)" },
  { value: "otitesMoyenneAiguE", label: "Otites Moyenne Aiguë (IRA haute)" },
  { value: "rhinopharyngite", label: "Rhinopharyngite (IRA haute)" },
  { value: "angine", label: "Angine (IRA haute)" },
  { value: "sinusite", label: "Sinusite (IRA haute)" },
  { value: "laryngite", label: "Laryngite (IRA haute)" },
  { value: "pian", label: "Pian" },
  {
    value: "bilharzioseUrinaire",
    label: "Cas suspect de bilharziose urinaire",
  },
  {
    value: "trichiasiseTrachomateux",
    label: "Cas suspect de trichiasis trachomateux",
  },
  { value: "hydrocele", label: "Cas suspect d'hydrocèle" },
  { value: "lymphoedeme", label: "Cas suspect de lymphoedème" },
  { value: "tetanos", label: "Tétanos" },
  { value: "coqueluche", label: "Coqueluche" },
  { value: "fievreTyphoide", label: "Fièvre Typhoïde" },
  { value: "fievreJaune", label: "Fièvre Jaune" },
  { value: "cholera", label: "Choléra" },
  { value: "tuberculose", label: "Tuberculose (CS)" },
  { value: "ulcere", label: "Ulcère de burili (CS)" },
  { value: "varicelle", label: "Varicelle" },
  { value: "dermatose", label: "Dermatose" },
  { value: "zona", label: "Zona" },
];

const tabSuspicionsPaludisme = [
  {
    label: "Cas suspect de paludisme simple (y compris femme enceinte)",
    value: "SuspicionsPaludismeSimple",
  },
  {
    label: "Cas suspect de paludisme simple chez la femme enceinte",
    value: "SuspicionsPaludismeSimpleFemmeEnceinte",
  },
  {
    label: "Cas de paludisme simple (y compris femme enceinte)",
    value: "paludismeSimple",
  },
  {
    label: "Cas de paludisme simple chez la femme enceinte",
    value: "paludismeSimpleFemmeEnceinte",
  },
  {
    label: "Cas suspect de paludisme grave (y compris femme enceinte)",
    value: "suspicionsPaludismeGrave",
  },
  {
    label: "Cas suspect de paludisme grave chez la femme enceinte",
    value: "suspicionsPaludismeGraveFemmeEnceinte",
  },
];

const tabSoinsCuratif = [
  {
    label: "Nombre de consultants",
    value: "mdgConsultant",
  },
  {
    label: "Nombre de consultations",
    value: "mdgConsultation",
  },
  {
    label: "Nombre de MO",
    value: "mdgMo",
  },
  {
    label: "Durée totale des MO (en heures)",
    value: "mdgDureeMo",
  },
  {
    label: "Nombre de cas référés vers une autre structure sanitaire",
    value: "mdgCasRefere",
  },
  {
    label: "Nombre de fiches de contre référence reçues",
    value: "mdgFichesContreReference",
  },
];
const tabSoinsInfirmier = [
  { label: "Pansements", value: "pansements" },
  {
    label: "Injections",
    value: "injections",
  },
  {
    label: "Perfusions",
    value: "perfusions",
  },
  {
    label: "Autres soins",
    value: "autresSoins",
  },
  {
    label: "Petite chirurgie,Circoncision masculine",
    value: "petiteChirurgieCirconcisionMasculine",
  },
  {
    label: "Petite chirurgie,suture de plaie traumatique",
    value: "petiteChirurgieSuturePlaieTraumatique",
  },
  {
    label: "Petite chirurgie,incision d'une abcès",
    value: "petiteChirurgieIncisionAbces",
  },
  {
    label: "Autres petite chirurgie",
    value: "autresPetiteChirurgie",
  },
];
export default function TableRapportSigMedecine({
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
        // consultationIst: item.dateVisite === true, // ⚡
        mdgConsultation: item.mdgConsultation === true,
        mdgConsultant: item.mdgConsultation === true,
        mdgMo: item.mdgMiseEnObservation === true,
        mdgDuree: item.mdgDureeObservation > 0,
        mdgCasRefere: item.mdgTypeVisite === "refere",
        mdgFichesContreReference: item.mdgTypeVisite === "refere",
        pansements: item.mdgSoins === "pansements",
        injections: item.mdgSoins === "injections",
        perfusions: item.mdgSoins === "perfusions",
        autresSoins: item.mdgSoins === "autreSoins",
        petiteChirurgieCirconcisionMasculine: item.mdgSoins === "circoncision",
        petiteChirurgieSuturePlaieTraumatique: item.mdgSoins === "suture",
        petiteChirurgieIncisionAbces: item.mdgSoins === "incision",
        autresPetiteChirurgie: item.mdgSoins === "autres",

        SuspicionsPaludismeSimple: item.mdgSuspicionPalu === "simple",
        SuspicionsPaludismeSimpleFemmeEnceinte:
          item.mdgEtatFemme === "oui" && item.mdgSuspicionPalu === "simple",
        paludismeSimple:
          item.mdgSuspicionPalu === "simple" &&
          item.mdgDiagnostic.includes("paludisme"),
        paludismeSimpleFemmeEnceinte:
          item.mdgEtatFemme === "oui" &&
          item.mdgSuspicionPalu === "simple" &&
          item.mdgDiagnostic.includes("paludisme"),
        suspicionsPaludismeGrave: item.mdgSuspicionPalu === "grave",
        suspicionsPaludismeGraveFemmeEnceinte:
          item.mdgEtatFemme === "oui" && item.mdgSuspicionPalu === "grave",

        diarrheeSansDeshydratation: item.mdgDiagnostic.includes(
          "diarrheeSansDeshydratation"
        ),
        diarrheeAvecSigneDeshydratation: item.mdgDiagnostic.includes(
          "diarrheeAvecSigneDeshydratation"
        ),
        diarrheeAvecDeshydratationSevere: item.mdgDiagnostic.includes(
          "diarrheeAvecDeshydratationSevere"
        ),
        pneumonieSimple: item.mdgDiagnostic.includes("pneumonieSimple"),
        pneumonieGrave: item.mdgDiagnostic.includes("pneumonieGrave"),
        bronchoPneumonie: item.mdgDiagnostic.includes("bronchoPneumonie"),
        otitesMoyenneAiguE: item.mdgDiagnostic.includes("otitesMoyenneAiguE"),
        rhinopharyngite: item.mdgDiagnostic.includes("rhinopharyngite"),
        angine: item.mdgDiagnostic.includes("angine"),
        sinusite: item.mdgDiagnostic.includes("sinusite"),
        laryngite: item.mdgDiagnostic.includes("laryngite"),
        pian: item.mdgDiagnostic.includes("pian"),
        bilharzioseUrinaire: item.mdgDiagnostic.includes("bilharzioseUrinaire"),
        trichiasiseTrachomateux: item.mdgDiagnostic.includes(
          "trichiasiseTrachomateux"
        ),
        hydrocele: item.mdgDiagnostic.includes("hydrocele"),
        lymphoedeme: item.mdgDiagnostic.includes("lymphoedeme"),
        tetanos: item.mdgDiagnostic.includes("tetanos"),
        coqueluche: item.mdgDiagnostic.includes("coqueluche"),
        fievreTyphoide: item.mdgDiagnostic.includes("fievreTyphoide"),
        fievreJaune: item.mdgDiagnostic.includes("fievreJaune"),
        cholera: item.mdgDiagnostic.includes("cholera"),
        tuberculose: item.mdgDiagnostic.includes("tuberculose"),
        ulcere: item.mdgDiagnostic.includes("ulcere"),
        varicelle: item.mdgDiagnostic.includes("varicelle"),
        dermatose: item.mdgDiagnostic.includes("dermatose"),
        zona: item.mdgDiagnostic.includes("zona"),
        hepatiteB: item.mdgDiagnostic.includes("hepatiteB"),
        hepatiteC: item.mdgDiagnostic.includes("hepatiteC"),
        autresMaladiesInfectieuses: item.pecVihCounselling && item.pecVihSpdp,
        paludismeSimpleCta:
          item.mdgTraitement.includes("cta") && item.mdgTestRapidePalu === true,
        paludismeSimpleCtaFemmeEnceinte:
          item.mdgTraitement.includes("cta") &&
          item.mdgEtatFemme === "oui" &&
          item.mdgTestRapidePalu === true,
        paludismeSimpleQuinineFemmeEnceinte:
          item.mdgTraitement.includes("quinine") &&
          item.mdgEtatFemme === "oui" &&
          item.mdgTestRapidePalu === true,
        paludismePresumeCta:
          item.mdgTraitement.includes("cta") &&
          item.mdgTestRapidePalu === false,
        paludismePresumeCtaFemmeEnceinte:
          item.mdgTraitement.includes("cta") &&
          item.mdgTestRapidePalu === false &&
          item.mdgEtatFemme === "oui",
        enfantMoins5AnsAvecPneumonieEtPrescriptionAntibiotique:
          (item.mdgDiagnostic.includes("pneumonieSimple") ||
            item.mdgDiagnostic.includes("pneumonieGrave")) &&
          item.age < 5,
        enfantMoins5AnsAvecDiarrheeEtPrescriptionSroEtZinc:
          (item.mdgDiagnostic.includes("diarrheeSansDeshydratation") ||
            item.mdgDiagnostic.includes("diarrheeAvecSigneDeshydratation") ||
            item.mdgDiagnostic.includes("diarrheeAvecDeshydratationSevere")) &&
          item.age < 5 &&
          item.mdgTraitement.includes("sro+zinc"),
      }));

      // Remove duplicate mdgConsultant within the same month per mdgIdClient
      const deduped = eliminerDoublonsConsultantsParMois(newConverted);
      if (deduped.length > 0) console.log("deduped ", deduped);
      if (deduped.length > 0) console.log("newConverted ", newConverted);
      setConverted(deduped);
    }
  }, [clientData]);

  // Garder mdgConsultant=true uniquement pour la première visite du même mdgIdClient dans un même mois
  function eliminerDoublonsConsultantsParMois(
    records: convertedType[]
  ): convertedType[] {
    // Map clé => moisAnnée => boolean (seen)
    const seen = new Map<string, Set<string>>();

    return records
      .map((r) => ({ ...r }))
      .sort(
        (a, b) =>
          new Date(a.dateVisite).getTime() - new Date(b.dateVisite).getTime()
      )
      .map((r) => {
        const clientKey = r.mdgIdClient || r.id || "";
        const date = new Date(r.dateVisite);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

        if (!seen.has(clientKey)) seen.set(clientKey, new Set());
        const months = seen.get(clientKey)!;

        if (months.has(monthKey)) {
          // Déjà vu ce client ce mois => forcer mdgConsultant à false
          r.mdgConsultant = false;
        } else {
          // Première occurrence pour ce mois
          months.add(monthKey);
          // garder la valeur telle quelle (probablement true si consultation)
        }

        return r;
      });
  }

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
    const worksheet = workbook.addWorksheet("Médecine");

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
      "Rapport clients Reçus Médecine Générale",
      worksheet,
      7, // Ligne de départ du tableau (ex : ligne 6)
      4, // Colspan
      tabSoinsCuratif,
      ageRanges,
      converted,
      countClientBoolean
    );
    setCellAlignment(worksheet, ["A"], 9, 18, "left");
    // Tableau des services Médecine Générale
    tableExportWithSexe(
      "Rapport services Médecine Générale",
      worksheet,
      20, // Ligne de départ du tableau (ex : ligne 6)
      4, // Colspan
      tabSoinsInfirmier,
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
    link.download = `Rapport_Medecine_${new Date().toLocaleDateString(
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
      <h2 className="font-bold">Tableau 1 : Activités de soins curatifs</h2>
      <Table className="border">
        <TableHeader className="bg-gray-200">
          <TableRow>
            <TableCell rowSpan={2} className="font-bold">
              Indicateurs
            </TableCell>
            <TableCell
              colSpan={7}
              className="font-bold text-center border border-r-gray-400 border-l-gray-400"
            >
              Tranche d’âge
            </TableCell>
            <TableCell rowSpan={2} className="font-bold">
              Total
            </TableCell>
          </TableRow>
          <TableRow className="bg-gray-300 text-center">
            {ageRanges.map((range) => {
              const label =
                range.max < 120
                  ? `${range.min}-${range.max} ans`
                  : `${range.min} ans et +`;
              return <TableCell key={label}>{label}</TableCell>;
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tabSoinsCuratif.map((client) => (
            <TableRow key={client.label}>
              <TableCell>{client.label}</TableCell>
              {/* Colonnes "Féminin" */}
              {ageRanges.map((range, index) => (
                <TableCell
                  key={`feminin-${client.label}-${index}`}
                  className="text-center"
                >
                  {countClientBoolean(
                    converted,
                    range.min,
                    range.max,
                    client.value,
                    true
                  )}
                </TableCell>
              ))}

              {/* Colonne Total */}
              <TableCell className="text-center font-semibold">
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientBoolean(
                      converted,
                      range.min,
                      range.max,
                      client.value,
                      true
                    ) +
                    0,
                  0
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Separator className="bg-green-300" />
      <h2 className="font-bold">
        Tableau 2 : Activités de soins infirmiers et petite chirurgie
      </h2>
      <Table className="border">
        <TableHeader className="bg-gray-200">
          <TableRow>
            <TableCell rowSpan={2} className="font-bold">
              Indicateurs
            </TableCell>
            <TableCell
              colSpan={7}
              className="font-bold text-center border border-r-gray-400 border-l-gray-400"
            >
              Tranche d’âge
            </TableCell>
            <TableCell rowSpan={2} className="font-bold">
              Total
            </TableCell>
          </TableRow>
          <TableRow className="bg-gray-300 text-center">
            {ageRanges.map((range) => {
              const label =
                range.max < 120
                  ? `${range.min}-${range.max} ans`
                  : `${range.min} ans et +`;
              return <TableCell key={label}>{label}</TableCell>;
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tabSoinsInfirmier.map((client) => (
            <TableRow key={client.label}>
              {/* Nom du produit */}
              <TableCell>{client.label}</TableCell>

              {/* Colonnes "Masculin" */}
              {ageRanges.map((range, index) => (
                <TableCell
                  key={`feminin-${client.label}-${index}`}
                  className="text-center"
                >
                  {countClientBoolean(
                    converted,
                    range.min,
                    range.max,
                    client.value,
                    true
                  )}
                </TableCell>
              ))}

              {/* Colonne Total */}
              <TableCell className="text-center font-semibold">
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientBoolean(
                      converted,
                      range.min,
                      range.max,
                      client.value,
                      true
                    ) +
                    0,
                  0
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Separator className="bg-green-300" />
      <h2 className="font-bold">Tableau 31 : Maladies infectieuses </h2>
      <Table className="border">
        <TableHeader className="bg-gray-200">
          <TableRow>
            <TableCell
              rowSpan={2}
              className="font-bold"
              style={{ width: "350px", minWidth: "350px", maxWidth: "350px" }}
            >
              Indicateurs
            </TableCell>
            <TableCell
              colSpan={7}
              className="font-bold text-center border border-r-gray-400 border-l-gray-400"
            >
              Tranche d’âge
            </TableCell>
            <TableCell rowSpan={2} className="font-bold">
              Total
            </TableCell>
          </TableRow>
          <TableRow className="bg-gray-300 text-center">
            {ageRanges.map((range) => {
              const label =
                range.max < 120
                  ? `${range.min}-${range.max} ans`
                  : `${range.min} ans et +`;
              return <TableCell key={label}>{label}</TableCell>;
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tabSuspicionsPaludisme.map((client) => (
            <TableRow key={client.label}>
              {/* Nom du produit */}
              <TableCell
                className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                style={{ width: "350px", minWidth: "350px", maxWidth: "350px" }}
              >
                {client.label}
              </TableCell>

              {/* Colonnes "Masculin" */}
              {ageRanges.map((range, index) => (
                <TableCell
                  key={`feminin-${client.label}-${index}`}
                  className="text-center"
                >
                  {countClientBoolean(
                    converted,
                    range.min,
                    range.max,
                    client.value,
                    true
                  )}
                </TableCell>
              ))}

              {/* Colonne Total */}
              <TableCell className="text-center font-semibold">
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientBoolean(
                      converted,
                      range.min,
                      range.max,
                      client.value,
                      true
                    ) +
                    0,
                  0
                )}
              </TableCell>
            </TableRow>
          ))}
          {tabDiagnosticOptions.map((client) => (
            <TableRow key={client.label}>
              {/* Nom du produit */}
              <TableCell>{client.label}</TableCell>

              {/* Colonnes "Masculin" */}
              {ageRanges.map((range, index) => (
                <TableCell
                  key={`feminin-${client.label}-${index}`}
                  className="text-center"
                >
                  {countClientBoolean(
                    converted,
                    range.min,
                    range.max,
                    client.value,
                    true
                  )}
                </TableCell>
              ))}

              {/* Colonne Total */}
              <TableCell className="text-center font-semibold">
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientBoolean(
                      converted,
                      range.min,
                      range.max,
                      client.value,
                      true
                    ) +
                    0,
                  0
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Separator className="bg-green-300" />
      <h2 className="font-bold">Tableau 31.1 : Autes maladies infectieuses </h2>
      <Table className="border">
        <TableHeader className="bg-gray-200">
          <TableRow>
            <TableCell
              rowSpan={2}
              className="font-bold"
              style={{ width: "350px", minWidth: "350px", maxWidth: "350px" }}
            >
              Indicateurs
            </TableCell>
            <TableCell
              colSpan={7}
              className="font-bold text-center border border-r-gray-400 border-l-gray-400"
            >
              Tranche d’âge
            </TableCell>
            <TableCell rowSpan={2} className="font-bold">
              Total
            </TableCell>
          </TableRow>
          <TableRow className="bg-gray-300 text-center">
            {ageRanges.map((range) => {
              const label =
                range.max < 120
                  ? `${range.min}-${range.max} ans`
                  : `${range.min} ans et +`;
              return <TableCell key={label}>{label}</TableCell>;
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tabMaladiesInfectieuses.map((client) => (
            <TableRow key={client.label}>
              {/* Nom du produit */}
              <TableCell
                className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                style={{ width: "350px", minWidth: "350px", maxWidth: "350px" }}
              >
                {client.label}
              </TableCell>

              {/* Colonnes "Masculin" */}
              {ageRanges.map((range, index) => (
                <TableCell
                  key={`feminin-${client.label}-${index}`}
                  className="text-center"
                >
                  {countClientBoolean(
                    converted,
                    range.min,
                    range.max,
                    client.value,
                    true
                  )}
                </TableCell>
              ))}

              {/* Colonne Total */}
              <TableCell className="text-center font-semibold">
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientBoolean(
                      converted,
                      range.min,
                      range.max,
                      client.value,
                      true
                    ) +
                    0,
                  0
                )}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-slate-900 border border-gray-400">
            <TableCell colSpan={9}></TableCell>
          </TableRow>
          {tabTraitementPaludisme.map((client) => (
            <TableRow key={client.value}>
              {/* Nom du produit */}
              <TableCell
                className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                style={{ width: "350px", minWidth: "350px", maxWidth: "350px" }}
              >
                {client.label}
              </TableCell>

              {/* Colonnes "Masculin" */}
              {ageRanges.map((range, index) => (
                <TableCell
                  key={`feminin-${client.label}-${index}`}
                  className="text-center"
                >
                  {countClientBoolean(
                    converted,
                    range.min,
                    range.max,
                    client.value,
                    true
                  )}
                </TableCell>
              ))}

              {/* Colonne Total */}
              <TableCell className="text-center font-semibold">
                {ageRanges.reduce(
                  (sum, range) =>
                    sum +
                    countClientBoolean(
                      converted,
                      range.min,
                      range.max,
                      client.value,
                      true
                    ) +
                    0,
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
  countClientBoolean: (
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
      row.getCell(colSpan + 1 + index).value = countClientBoolean(
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
      row.getCell(femininStart + index).value = countClientBoolean(
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
        countClientBoolean(
          clientData,
          range.min,
          range.max,
          item.value,
          true,
          "Masculin"
        ) +
        countClientBoolean(
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

export const countClientBoolean = (
  clientData: convertedType[], // ⚡ on utilise convertedType
  minAge: number,
  maxAge: number,
  propriete: string, // ⚡ propriété booléenne définie dans ton type
  indicateur: boolean
): number => {
  if (!Array.isArray(clientData) || clientData.length === 0) return 0;

  return clientData.reduce((acc, client) => {
    const ageCondition = client.age >= minAge && client.age <= maxAge;
    const proprieteCondition =
      client[propriete as keyof convertedType] === indicateur;

    return ageCondition && proprieteCondition ? acc + 1 : acc;
  }, 0);
};
