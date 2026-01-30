// import { countClientPfRetrait } from "../rapport/pf/pf";
import { useEffect, useState } from "react";
// import { countClientBoolean } from "../rapport/gyneco/gyneco";
import { ClientData, clientDataProps } from "../rapportPfActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// types.ts ou en haut du fichier
// ageRanges removed: tables will show totals only
type convertedType = clientDataProps & {
  // Tableau Lieu d'accouchement
  accouchementLieuEtablissement: boolean;
  accouchementLieuDomicile: boolean;
  accouchementTotal: boolean;
  // tabVaccination
  vaccinationComplete: boolean;
  vaccinationIncomplete: boolean;
  nonVaccines: boolean;
  // tabNaissance
  naissanceVivante: number;
  mortNeFrais: number;
  mortNeMacere: number;
  enfantsNesVivantsPoidsInf2500: number;
  prematures: number;

  nouveauNesProtegesTetanos: number;
  accouchementMultiple: boolean;
  avortementSpontane: boolean;
  avortementProvoque: boolean;
  // tabEvacuation
  accouchementTypeEvacuationAvant: boolean;
  accouchementTypeEvacuationPendant: boolean;
  accouchementTypeEvacuationApres: boolean;
  evacuationNouveauNe: boolean;
  // tabComplications
  complicationCO: boolean;
  complicationCOEvacuees: boolean;
};
// Removed unused types related to age ranges

const ageRanges = [
  { min: 8, max: 14 },
  { min: 15, max: 19 },
  { min: 20, max: 24 },
  { min: 25, max: 49 },
  { min: 50, max: 120 },
];

const tabLieuAccouchement = [
  {
    label: "Accouchement dans l'établissement",
    value: "accouchementLieuEtablissement",
  },
  { label: "Accouchement à domicile", value: "accouchementLieuDomicile" },
  { label: "Total Accouchements", value: "accouchementTotal" },
];

const tabVaccination = [
  { label: "Femmes correctement vaccinées", value: "vaccinationComplete" },
  { label: "Femmes Incomplètement vaccinées", value: "vaccinationIncomplete" },
  { label: "Femmes Non vaccinées", value: "nonVaccines" },
];

const tabNaissance = [
  { label: "Naissances vivantes", value: "naissanceVivante" },
  { label: "Mort-nés frais", value: "mortNeFrais" },
  { label: "Mort-nés macérés", value: "mortNeMacere" },
  {
    label: "Enfants nés vivants dont le poids de naissance < 2500g",
    value: "enfantsNesVivantsPoidsInf2500",
  },
  { label: "Prématurés", value: "prematures" },
  {
    label: "Nouveau nés protégés à la naissance contre le tétanos",
    value: "nouveauNesProtegesTetanos",
  },
];
// additional naissance indicators (kept as optional fields on convertedType)
const tabNaissanceAdditional = [
  {
    label: "Accouchement multiple",
    value: "accouchementMultiple",
  },
  {
    label: "Avortements spontanés",
    value: "avortementSpontane",
  },
  {
    label: "Avortements provoqués",
    value: "avortementProvoque",
  },
];

const tabEvacuation = [
  {
    label: "Evacuation des mères avant l'accouchement",
    value: "accouchementTypeEvacuationAvant",
  },
  {
    label: "Evacuation des mères pendant l'accouchement",
    value: "accouchementTypeEvacuationPendant",
  },
  {
    label: "Evacuation des mères après l'accouchement",
    value: "accouchementTypeEvacuationApres",
  },
  { label: "Evacuation des nouveau-nés", value: "evacuationNouveauNe" },
];

const tabComplications = [
  { label: "Nombre de femmes ayant présenté une CO*", value: "complicationCO" },
  {
    label:
      "Nombre de femmes présentant une CO* référées vers une autre structure sanitaire ",
    value: "complicationCOEvacuees",
  },
];
// CO : Complications obstétricales

export default function TableRapportSigAccouchement({
  clientData,
  dateDebut,
  dateFin,
  clinic,
}: {
  clientData: ClientData[];
  dateDebut?: string;
  dateFin?: string;
  clinic?: string;
}) {
  const [converted, setConverted] = useState<convertedType[]>([]);
  const [spinnerPdf, setSpinnerPdf] = useState(false);

  useEffect(() => {
    if (!clientData || clientData.length === 0) {
      setConverted([]);
    } else {
      const newConverted = clientData.map((item) => ({
        ...item,
        accouchementTypeEvacuationAvant:
          item.accouchementTypeEvacuation === "avant",
        accouchementTypeEvacuationPendant:
          item.accouchementTypeEvacuation === "pendant",
        accouchementTypeEvacuationApres:
          item.accouchementTypeEvacuation === "apres",
        evacuationNouveauNe: item.accouchementEvacuationEnfant === "oui",

        complicationCO: item.accouchementComplications === "oui",
        complicationCOEvacuees:
          item.accouchementComplications === "oui" &&
          item.accouchementEvacuationEnfant === "oui",

        naissanceVivante:
          item.accouchementEnfantVivant > 0 ? item.accouchementEnfantVivant : 0,

        mortNeFrais:
          item.accouchementEnfantMortNeFrais > 0
            ? item.accouchementEnfantMortNeFrais
            : 0,
        mortNeMacere:
          item.accouchementEnfantMortNeMacere > 0
            ? item.accouchementEnfantMortNeMacere
            : 0,
        enfantsNesVivantsPoidsInf2500:
          item.accouchementNbPoidsEfantVivant > 0
            ? item.accouchementNbPoidsEfantVivant
            : 0,
        prematures:
          item.accouchementEtatNaissance === "premature"
            ? item.accouchementEnfantVivant
            : 0,
        nouveauNesProtegesTetanos: item.accouchementStatutVat === "complet",
        accouchementLieuEtablissement:
          item.accouchementLieu === "etablissement",
        accouchementLieuDomicile: item.accouchementLieu === "domicile",
        accouchementTotal:
          item.accouchementLieu === "domicile" ||
          item.accouchementLieu === "etablissement",

        vaccinationComplete: item.accouchementStatutVat === "complet",
        vaccinationIncomplete: item.accouchementStatutVat === "incomplet",
        nonVaccines: item.accouchementStatutVat === "non",

        accouchementMultiple: item.accouchementMultiple === "oui",
        avortementSpontane:
          item.saaConsultation === true &&
          item.saaTypeAvortement === "spontanee",
        avortementProvoque:
          item.saaConsultation === true &&
          item.saaTypeAvortement === "provoquee",
      }));

      // Cast to the expected convertedType[] to avoid conflicting inference from the spread
      setConverted(newConverted as unknown as convertedType[]);
    }
  }, [clientData]);
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
      let periodeText = "";
      if (dateDebut && dateFin) {
        const debut = new Date(dateDebut);
        const fin = new Date(dateFin);
        const isFullMonth =
          debut.getDate() === 1 &&
          fin.getDate() ===
            new Date(fin.getFullYear(), fin.getMonth() + 1, 0).getDate() &&
          debut.getMonth() === fin.getMonth() &&
          debut.getFullYear() === fin.getFullYear();

        if (isFullMonth) {
          const moisNoms = [
            "JANVIER", "FEVRIER", "MARS", "AVRIL", "MAI", "JUIN",
            "JUILLET", "AOUT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DECEMBRE",
          ];
          periodeText = `${moisNoms[debut.getMonth()]} ${debut.getFullYear()}`;
        } else {
          periodeText = `${debut.toLocaleDateString("fr-FR")} - ${fin.toLocaleDateString("fr-FR")}`;
        }
      }

      // Titre et période
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Rapport SIG Accouchement${clinic ? ` - ${clinic}` : ""}`, pageWidth / 2, 35, {
        align: "center",
      });
      if (periodeText) {
        doc.setFontSize(11);
        doc.text(`Période: ${periodeText}`, pageWidth / 2, 42, {
          align: "center",
        });
      }

      let currentY = periodeText ? 50 : 45;

      // Tableau 1: Lieu d'accouchement
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Tableau 6 : Lieu d'accouchement", 14, currentY);
      currentY += 5;

      const lieuHeaders = [
        ["Indicateurs", ...ageRanges.map((r) => r.max < 120 ? `${r.min}-${r.max} ans` : `${r.min} ans et +`), "Total"],
      ];
      const lieuRows = tabLieuAccouchement.map((item) => {
        const row = [item.label];
        ageRanges.forEach((range) => {
          row.push(String(countClientBoolean(converted, range.min, range.max, item.value, true)));
        });
        row.push(String(countClientBoolean(converted, 0, 200, item.value, true)));
        return row;
      });

      autoTable(doc, {
        startY: currentY,
        head: lieuHeaders,
        body: lieuRows,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 70 } },
      });

      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      // Tableau 2: Vaccination
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Tableau 7 : Statut vaccinal au VAT à l'accouchement", 14, currentY);
      currentY += 5;

      const vaccHeaders = [["Indicateurs", "Total"]];
      const vaccRows = tabVaccination.map((item) => [
        item.label,
        String(countClientBoolean(converted, 0, 200, item.value, true)),
      ]);

      autoTable(doc, {
        startY: currentY,
        head: vaccHeaders,
        body: vaccRows,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 100 } },
      });

      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      // Tableau 3: Issue de la grossesse
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Tableau 8 : Issue de la grossesse", 14, currentY);
      currentY += 5;

      const naissHeaders = [["Indicateurs", "Valeur"]];
      const totals = computeNaissanceValues(converted);
      const naissRows = [
        ...tabNaissance.map((item) => {
          let value = 0;
          switch (item.value) {
            case "naissanceVivante": value = totals.naissanceVivante; break;
            case "mortNeFrais": value = totals.mortNeFrais; break;
            case "mortNeMacere": value = totals.mortNeMacere; break;
            case "enfantsNesVivantsPoidsInf2500": value = totals.enfantsNesVivantsPoidsInf2500; break;
            case "prematures": value = totals.prematures; break;
            case "nouveauNesProtegesTetanos": value = totals.nouveauNesProtegesTetanos; break;
          }
          return [item.label, String(value)];
        }),
        ...tabNaissanceAdditional.map((item) => [
          item.label,
          String(countClientBoolean(converted, 0, 200, item.value, true)),
        ]),
      ];

      autoTable(doc, {
        startY: currentY,
        head: naissHeaders,
        body: naissRows,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 120 } },
      });

      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      // Tableau 4: Evacuation
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Tableau 9 : Evacuation de la mère et du nouveau-né", 14, currentY);
      currentY += 5;

      const evacHeaders = [["Indicateurs", "Valeur"]];
      const evacRows = tabEvacuation.map((item) => [
        item.label,
        String(countClientBoolean(converted, 0, 200, item.value, true)),
      ]);

      autoTable(doc, {
        startY: currentY,
        head: evacHeaders,
        body: evacRows,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 120 } },
      });

      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      // Tableau 5: Complications
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Complications", 14, currentY);
      currentY += 5;

      const compHeaders = [["Indicateurs", "Valeur"]];
      const compRows = tabComplications.map((item) => [
        item.label,
        String(countClientBoolean(converted, 0, 200, item.value, true)),
      ]);

      autoTable(doc, {
        startY: currentY,
        head: compHeaders,
        body: compRows,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 150 } },
      });

      // Section signature (même page que le dernier tableau)
      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Réalisé par: ____________________________", 14, currentY);
      doc.text("Signature: ____________________________", pageWidth - 100, currentY);

      doc.save(`Rapport_SIG_Accouchement_${new Date().toLocaleDateString("fr-FR")}.pdf`);
    } catch (error) {
      console.error("Erreur export PDF:", error);
    } finally {
      setSpinnerPdf(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-gray-50 opacity-90 p-4 rounded-sm mt-2 w-full">
      <Button
        onClick={exportToPdf}
        type="button"
        disabled={spinnerPdf}
        className="bg-red-500 mx-auto text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
      >
        <Spinner
          show={spinnerPdf}
          size={"small"}
          className="text-white dark:text-slate-400"
        />
        Exporter PDF
      </Button>
      <Separator className="bg-green-300"></Separator>
      {/* Nouveaux tableaux : Lieu d'accouchement, Vaccination, Naissances, Evacuations, Complications */}
      <h2 className="font-bold">Tableau 6 : {"Lieu d'accouchement"}</h2>
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

            {/* Header: one cell per age range + Total */}
            {ageRanges.map((range) => {
              const label =
                range.max < 120
                  ? `${range.min}-${range.max} ans`
                  : `${range.min} ans et +`;
              return (
                <TableCell
                  key={label}
                  className="font-bold text-center  border border-gray-400"
                >
                  {label}
                </TableCell>
              );
            })}
            <TableCell className="font-bold text-center">Total</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tabLieuAccouchement.map((item) => (
            <TableRow key={item.label}>
              <TableCell
                className=" border border-gray-400 break-word whitespace-normal overflow-hidden"
                style={{ width: "400px", minWidth: "400px", maxWidth: "400px" }}
              >
                {item.label}
              </TableCell>
              {ageRanges.map((range, index) => (
                <TableCell
                  key={`feminin-${item.label}-${index}`}
                  className="text-center   border border-gray-400"
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
              <TableCell className="text-center  font-semibold  border border-gray-400">
                {countClientBoolean(converted, 0, 200, item.value, true)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Separator className="bg-green-300"></Separator>
      <div className="flex flex-col gap-2 max-w-125 mx-auto">
        <h2 className="font-bold">
          Tableau 7 : Statut vaccinal au VAT à {"l'accouchement"}{" "}
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
              <TableCell className="font-bold text-center">Total</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tabVaccination.map((item) => (
              <TableRow key={item.label}>
                <TableCell
                  className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                  style={{
                    width: "400px",
                    minWidth: "400px",
                    maxWidth: "400px",
                  }}
                >
                  {item.label}
                </TableCell>
                <TableCell className="text-center border font-semibold border-l-gray-400 border-r-gray-400">
                  {countClientBoolean(converted, 0, 200, item.value, true)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Separator className="bg-green-300"></Separator>

      <div className="flex flex-col gap-2 max-w-125 mx-auto">
        <h2 className="font-bold">Tableau 8 : Issue de la grossesse</h2>
        <Table className="table-auto w-full">
          <TableHeader className="bg-gray-200  border border-gray-400">
            <TableRow>
              <TableCell className="font-bold" style={{ width: "500px" }}>
                Indicateurs
              </TableCell>
              <TableCell className="font-bold text-center">Valeur</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              const totals = computeNaissanceValues(converted);
              return tabNaissance.map((item) => (
                <TableRow key={item.label}>
                  <TableCell className="border border-l-gray-400 break-word whitespace-normal overflow-hidden">
                    {item.label}
                  </TableCell>
                  <TableCell className="text-center border font-semibold border-l-gray-400 border-r-gray-400">
                    {/* Use the computed totals when available, fallback to 0 */}
                    {(() => {
                      switch (item.value) {
                        case "naissanceVivante":
                          return totals.naissanceVivante || 0;
                        case "mortNeFrais":
                          return totals.mortNeFrais || 0;
                        case "mortNeMacere":
                          return totals.mortNeMacere || 0;
                        case "enfantsNesVivantsPoidsInf2500":
                          return totals.enfantsNesVivantsPoidsInf2500 || 0;
                        case "prematures":
                          return totals.prematures || 0;
                        case "nouveauNesProtegesTetanos":
                          return totals.nouveauNesProtegesTetanos || 0;
                        default:
                          return 0;
                      }
                    })()}
                  </TableCell>
                </TableRow>
              ));
            })()}
            {tabNaissanceAdditional.map((item) => (
              <TableRow key={item.label}>
                <TableCell className="border border-l-gray-400 break-word whitespace-normal overflow-hidden">
                  {item.label}
                </TableCell>
                <TableCell className="text-center border font-semibold border-l-gray-400 border-r-gray-400">
                  {countClientBoolean(converted, 0, 200, item.value, true)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Separator className="bg-green-300"></Separator>

      <div className="flex flex-row gap-2">
        <div className="flex flex-col">
          <h2 className="font-bold">
            Tableau 9 : Evacuation de la mère et du nouveau-né
          </h2>
          <Table className="table-auto w-full">
            <TableHeader className="bg-gray-200  border border-gray-400">
              <TableRow>
                <TableCell className="font-bold" style={{ width: "500px" }}>
                  Indicateurs
                </TableCell>
                <TableCell className="font-bold text-center">Valeur</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabEvacuation.map((item) => (
                <TableRow key={item.label}>
                  <TableCell className="border border-l-gray-400 break-word whitespace-normal overflow-hidden">
                    {item.label}
                  </TableCell>
                  <TableCell className="text-center border font-semibold border-l-gray-400 border-r-gray-400">
                    {countClientBoolean(converted, 0, 200, item.value, true)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col">
          <h2 className="font-bold">{"Complications"}</h2>
          <Table className="table-auto w-full">
            <TableHeader className="bg-gray-200  border border-gray-400">
              <TableRow>
                <TableCell className="font-bold" style={{ width: "500px" }}>
                  Indicateurs
                </TableCell>
                <TableCell className="font-bold text-center">Valeur</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabComplications.map((item) => (
                <TableRow key={item.label}>
                  <TableCell className="border border-l-gray-400 break-word whitespace-normal overflow-hidden">
                    {item.label}
                  </TableCell>
                  <TableCell className="text-center border font-semibold border-l-gray-400 border-r-gray-400">
                    {countClientBoolean(converted, 0, 200, item.value, true)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
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

// --- Helper to compute totals for tabNaissance values ---
export type NaissanceTotals = {
  naissanceVivante: number;
  mortNeFrais: number;
  mortNeMacere: number;
  enfantsNesVivantsPoidsInf2500: number;
  prematures: number;
  nouveauNesProtegesTetanos: number;
};

/**
 * Calcule les totaux pour les indicateurs de naissance à partir des données converties.
 * Gère les champs numériques et booléens ; retourne 0 si champ absent.
 */
export function computeNaissanceValues(
  data: convertedType[] = []
): NaissanceTotals {
  const totals: NaissanceTotals = {
    naissanceVivante: 0,
    mortNeFrais: 0,
    mortNeMacere: 0,
    enfantsNesVivantsPoidsInf2500: 0,
    prematures: 0,
    nouveauNesProtegesTetanos: 0,
  };

  const toNumber = (v: unknown): number => {
    if (v == null) return 0;
    const n = Number(String(v));
    return Number.isFinite(n) ? n : 0;
  };

  for (const row of data) {
    const r: Partial<convertedType> & Record<string, unknown> = row;
    totals.naissanceVivante += toNumber(r["naissanceVivante"]);
    totals.mortNeFrais += toNumber(r["mortNeFrais"]);
    totals.mortNeMacere += toNumber(r["mortNeMacere"]);
    totals.enfantsNesVivantsPoidsInf2500 += toNumber(
      r["enfantsNesVivantsPoidsInf2500"]
    );
    totals.prematures += toNumber(r["prematures"]);
    totals.nouveauNesProtegesTetanos += toNumber(
      r["nouveauNesProtegesTetanos"]
    );
  }

  return totals;
}
