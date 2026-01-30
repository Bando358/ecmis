import { useEffect, useState } from "react";
import { ClientData, clientDataProps } from "../rapportPfActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { weeksBetween } from "@/lib/dateUtils";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type convertedType = clientDataProps & {
  sp1: boolean;
  sp2: boolean;
  sp3: boolean;
  sp4: boolean;
  sp5EtPlus: boolean;
  femmeEnceinteMilda: boolean;
  femmeEnceinteFerFolate: boolean;
  femmeEnceinteDeparasitée: boolean;
  femmeEnceinteCounselingPFPPI: boolean;

  cpn1premierTrimestre: boolean;
  cpn1AutreTrimestre: boolean;
  totalCpn1: boolean;

  cpn2: boolean;
  cpn3: boolean;
  cpn4AuNeuviemeMois: boolean;
  cpn4AutreTrimestre: boolean;
  Cpn5EtPlus: boolean;
  totalCpn: boolean;

  aRisqueCpn1: boolean;
  femmeEnceinteMalnutrieEnCpn: boolean;
  femmeEnceinteAnemieeEnCpn: boolean;
  femmeEnceintePositiveSyphilisEnCpn: boolean;
  femmeEnceintePositiveAghbs: boolean;

  // femmeEnceinteDejaSeroPositiveEnCpn1: boolean;
  // femmeEnceinteDejaSousTraitementARVEnCpn1: boolean;
  femmeEnceinteConseilleeEtTesteePourVIHEnCpn1: boolean;
  femmeEnceinteOuAllaitanteConseilleeEtTesteePourVIHEnCpn1: boolean;
  // femmeEnceinteOuAllaitanteSeroNegativeEtRetesteePourVIHEnCpn: boolean;
  femmeEnceinteOuAllaitanteTesteePositiveAuVIHCpn: boolean;
  femmeEnceinteOuAllaitantePositiveAuVIHMiseSousARVCpn: boolean;
  femmeEnceinteChargeViraleControleeCpn: boolean;

  // femmeEnceinteDejaSeroPositiveEnMaternite: boolean;
  // femmeEnceinteDejaSousTraitementARVEnMaternite: boolean;
  // femmeEnceinteConseilleeEtTesteePourVIHEnMaternite: boolean;
  femmeEnceinteOuAllaitanteConseilleeEtTesteePourVIHEnMaternite: boolean;
  // femmeEnceinteOuAllaitanteSeroNegativeEtRetesteePourVIHEnMaternite: boolean;
  femmeEnceinteOuAllaitanteTesteePositiveAuVIHMaternite: boolean;
  femmeEnceinteOuAllaitantePositiveAuVIHMiseSousARVMaternite: boolean;
  // femmeEnceinteChargeViraleControleeMaternite: boolean;
  // femmeEnceinteDejaSeroPositiveEnPostNatal: boolean;
  // femmeEnceinteDejaSousTraitementARVPostNatal: boolean;
  // femmeEnceinteConseilleeEtTesteePourVIHEnPostNatal: boolean;

  // femmeEnceinteOuAllaitanteConseilleeEtTesteePourVIHEnPostNatal: boolean;
  // femmeEnceinteOuAllaitanteSeroNegativeEtRetesteePourVIHEnPostNatal: boolean;
  // femmeEnceinteOuAllaitanteTesteePositiveAuVIHPostNatal: boolean;
  // femmeEnceinteOuAllaitantePositiveAuVIHMiseSousARVPostNatal: boolean;
  // femmeEnceinteChargeViraleControleePostNatal: boolean;
};

const tabNumeroCpn1 = [
  { value: "cpn1premierTrimestre", label: "CPN 1 au cours du 1er trimestre" },
  {
    value: "cpn1AutreTrimestre",
    label: "CPN 1 au cours des autres trimestres",
  },
  { value: "totalCpn1", label: "Total CPN 1" },
];

const tabAutreCpn = [
  { value: "cpn2", label: "CPN 2" },
  { value: "cpn3", label: "CPN 3 " },
  { value: "cpn4AuNeuviemeMois", label: "CPN 4 au 9 ème mois de la grossesse" },
  {
    value: "cpn4AutreTrimestre",
    label: "CPN 4 autres trimestres de la grossesse",
  },
  { value: "Cpn5EtPlus", label: "CPN 5 et Plus" },
  { value: "totalCpn", label: "Total des CPN " },
];

const tabDepistageGrossesse = [
  { value: "aRisqueCpn1", label: "Grossesse à risque dépistées CPN 1" },
  {
    value: "femmeEnceinteMalnutrieEnCpn",
    label: "Femmes enceintes malnutries dépistées CPN",
  },
  {
    value: "femmeEnceinteAnemieeEnCpn",
    label: "Femmes enceintes anémiées dépistées CPN",
  },
  {
    value: "femmeEnceintePositiveSyphilisEnCpn",
    label: "Femmes enceintes dépistées positives à la syphilis en CPN",
  },
  {
    value: "femmeEnceintePositiveAghbs",
    label: "Femmes enceintes dépistées positives à l'AGHBs en CPN",
  },
];

const tabPreventionCpn = [
  {
    label: "Sulfadoxine pyrimétamine (1ère dose)",
    value: "sp1",
  },
  {
    label: "Sulfadoxine pyrimétamine (2ème dose)",
    value: "sp2",
  },
  {
    label: "Sulfadoxine pyrimétamine (3ème dose)",
    value: "sp3",
  },
  {
    label: "Sulfadoxine pyrimétamine (4ème dose)",
    value: "sp4",
  },
  {
    label: "Sulfadoxine pyrimétamine (5ème dose et plus)",
    value: "sp5EtPlus",
  },
  {
    label: "Nombre de femmes enceintes vues en CPN et ayant reçu une MILDA",
    value: "femmeEnceinteMilda",
  },
  {
    label:
      "Nombre de femmes enceintes vues en CPN et mise sous Fer + folate Cp",
    value: "femmeEnceinteFerFolate",
  },
  {
    label: "Femmes enceintes vues en CPN et déparasitées",
    value: "femmeEnceinteDeparasitée",
  },
  {
    label:
      "Nombre de femmes enceintes reçues en CPN qui ont bénéficié d'un counseling PFPPI et de conseils nutritionnels",
    value: "femmeEnceinteCounselingPFPPI",
  },
];

const tabConseilDepistage = [
  {
    label:
      "Nombre de femmes enceintes reçues en CPN1 et se connaissant déjà séropositives au VIH",
    valueCpn: "femmeEnceinteDejaSeroPositiveEnCpn1",
    valueMaternite: "femmeEnceinteDejaSeroPositiveEnMaternite",
    valuePostNatal: "femmeEnceinteDejaSeroPositiveEnPostNatal",
  },
  {
    label:
      "Nombre de femmes enceintes déjà sous traitement ARV et reçues en CPN1 ",
    valueCpn: "femmeEnceinteDejaSousTraitementARVEnCpn1",
    valueMaternite: "femmeEnceinteDejaSousTraitementARVEnMaternite",
    valuePostNatal: "femmeEnceinteDejaSousTraitementARVEnPostNatal",
  },
  {
    label:
      "Nombre de femmes enceintes conseillées et testées pour le VIH, qui ont reçu leur résultat du test VIH en CPN1 ",
    valueCpn: "femmeEnceinteConseilleeEtTesteePourVIHEnCpn1",
    valueMaternite: "femmeEnceinteConseilleeEtTesteePourVIHEnMaternite",
    valuePostNatal: "femmeEnceinteConseilleeEtTesteePourVIHEnPostNatal",
  },
  {
    label:
      "Nombre de femmes enceintes / allaitantes conseillées et testées pour le VIH, qui ont reçu leur résultat du test VIH en CPN1 ",
    valueCpn: "femmeEnceinteOuAllaitanteConseilleeEtTesteePourVIHEnCpn1",
    valueMaternite:
      "femmeEnceinteOuAllaitanteConseilleeEtTesteePourVIHEnMaternite",
    valuePostNatal:
      "femmeEnceinteOuAllaitanteConseilleeEtTesteePourVIHEnPostNatal",
  },
  {
    label:
      "Nombre de femmes enceintes séronégatives au VIH ayant bénéficié d'un « retesting »",
    valueCpn: "femmeEnceinteOuAllaitanteSeroNegativeEtRetesteePourVIHEnCpn",
    valueMaternite:
      "femmeEnceinteOuAllaitanteSeroNegativeEtRetesteePourVIHEnMaternite",
    valuePostNatal:
      "femmeEnceinteOuAllaitanteSeroNegativeEtRetesteePourVIHEnPostNatal",
  },
  {
    label:
      "Nombre de femmes enceintes / allaitantes dépistées positives au VIH ",
    valueCpn: "femmeEnceinteOuAllaitanteTesteePositiveAuVIHCpn",
    valueMaternite: "femmeEnceinteOuAllaitanteTesteePositiveAuVIHMaternite",
    valuePostNatal: "femmeEnceinteOuAllaitanteTesteePositiveAuVIHPostNatal",
  },
  {
    label:
      "Nombre de femmes enceintes / allaitantes séropositives au VIH nouvellement mises sous ARV",
    valueCpn: "femmeEnceinteOuAllaitantePositiveAuVIHMiseSousARVCpn",
    valueMaternite:
      "femmeEnceinteOuAllaitantePositiveAuVIHMiseSousARVMaternite",
    valuePostNatal:
      "femmeEnceinteOuAllaitantePositiveAuVIHMiseSousARVPostNatal",
  },
  {
    label:
      "Nombre de femmes enceintes séronégatives au VIH sous traitement ARV chez qui le résultat de la charge virale est ≤ 1000 copies/ml dans le dernier trimestre",
    valueCpn: "femmeEnceinteChargeViraleControleeCpn",
    valueMaternite: "femmeEnceinteChargeViraleControleeMaternite",
    valuePostNatal: "femmeEnceinteChargeViraleControleeMaternite",
  },
];

export default function TableRapportSigObstetrique({
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
        sp1: item.obstSp === "sp1",
        sp2: item.obstSp === "sp2",
        sp3: item.obstSp === "sp3",
        sp4: item.obstSp === "sp4",
        sp5EtPlus: item.obstSp === "cpn5",
        femmeEnceinteMilda: item.obstMilda === true,
        femmeEnceinteFerFolate:
          item.obstFer === true && item.obstFolate === true,
        femmeEnceinteDeparasitée: item.obstDeparasitant === true,
        femmeEnceinteCounselingPFPPI: item.obstPfppi === true,
        cpn1premierTrimestre:
          item.obstTypeVisite === "cpn1" &&
          weeksBetween(item.grossesseDdr, item.dateVisite) <= 12,
        cpn1AutreTrimestre:
          item.obstTypeVisite === "cpn1" &&
          weeksBetween(item.grossesseDdr, item.dateVisite) > 12,
        totalCpn1: item.obstTypeVisite === "cpn1",
        cpn2: item.obstTypeVisite === "cpn2",
        cpn3: item.obstTypeVisite === "cpn3",
        cpn4AuNeuviemeMois:
          item.obstTypeVisite === "cpn4" &&
          weeksBetween(item.grossesseDdr, item.dateVisite) <= 36,
        cpn4AutreTrimestre:
          item.obstTypeVisite === "cpn4" &&
          weeksBetween(item.grossesseDdr, item.dateVisite) > 36,
        Cpn5EtPlus: item.obstTypeVisite === "cpn5",
        totalCpn:
          item.obstTypeVisite === "cpn1" ||
          item.obstTypeVisite === "cpn2" ||
          item.obstTypeVisite === "cpn3" ||
          item.obstTypeVisite === "cpn4" ||
          item.obstTypeVisite === "cpn5",

        aRisqueCpn1:
          item.obstEtatGrossesse === "risque" && item.obstTypeVisite === "cpn1",
        femmeEnceinteMalnutrieEnCpn:
          (item.obstEtatNutritionnel === "Maigreur" ||
            item.obstEtatNutritionnel === "Surpoids" ||
            item.obstEtatNutritionnel === "Obésité") &&
          item.obstTypeVisite !== null,
        femmeEnceinteAnemieeEnCpn:
          item.obstAnemie === true && item.obstTypeVisite !== null,
        femmeEnceintePositiveSyphilisEnCpn:
          item.obstSyphilis === true && item.obstTypeVisite !== null,
        femmeEnceintePositiveAghbs:
          item.obstAghbs === true && item.obstTypeVisite !== null,

        femmeEnceinteConseilleeEtTesteePourVIHEnCpn1:
          item.obstTypeVisite === "cpn1" &&
          item.depistageVihConsultation === true,
        femmeEnceinteOuAllaitanteConseilleeEtTesteePourVIHEnCpn1:
          item.accouchementConsultation === false &&
          item.depistageVihTypeClient === "ptme",
        femmeEnceinteOuAllaitanteTesteePositiveAuVIHCpn:
          item.accouchementConsultation === false &&
          item.depistageVihTypeClient === "ptme" &&
          item.depistageVihResultat === "positif",
        femmeEnceinteOuAllaitantePositiveAuVIHMiseSousARVCpn:
          item.accouchementConsultation === false &&
          item.depistageVihTypeClient === "ptme" &&
          item.depistageVihResultat === "positif" &&
          item.pecVihCounselling === true,

        femmeEnceinteOuAllaitanteConseilleeEtTesteePourVIHEnMaternite:
          item.depistageVihConsultation === true &&
          item.accouchementConsultation === true,
        femmeEnceinteOuAllaitanteTesteePositiveAuVIHMaternite:
          item.accouchementConsultation === true &&
          item.depistageVihTypeClient === "ptme" &&
          item.depistageVihResultat === "positif",
        femmeEnceinteOuAllaitantePositiveAuVIHMiseSousARVMaternite:
          item.accouchementConsultation === true &&
          item.depistageVihTypeClient === "ptme" &&
          item.depistageVihResultat === "positif" &&
          item.pecVihCounselling === true,
        femmeEnceinteChargeViraleControleeCpn:
          item.grossesseFeChargViralIndetectable,
      }));

      setConverted(newConverted);
    }
  }, [clientData]);

  if (converted.length === 0) {
    return <p className="text-center">Aucune donnée disponible.</p>;
  }

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
      doc.text(`Rapport SIG Obstétrique${clinic ? ` - ${clinic}` : ""}`, pageWidth / 2, 35, {
        align: "center",
      });
      if (periodeText) {
        doc.setFontSize(11);
        doc.text(`Période: ${periodeText}`, pageWidth / 2, 42, {
          align: "center",
        });
      }

      let currentY = periodeText ? 50 : 45;

      // Tableau 1: Consultations prénatales
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Tableau 31.1 : Consultations prénatales", 14, currentY);
      currentY += 5;

      const cpnHeaders = [["Indicateurs", "Nombre"]];
      const cpnRows = [
        ...tabNumeroCpn1.map((item) => [
          item.label,
          String(countClientBoolean(converted, 0, 120, item.value, true)),
        ]),
        ...tabAutreCpn.map((item) => [
          item.label,
          String(countClientBoolean(converted, 0, 120, item.value, true)),
        ]),
      ];

      autoTable(doc, {
        startY: currentY,
        head: cpnHeaders,
        body: cpnRows,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 100 } },
      });

      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      // Tableau 2: Dépistage pendant la grossesse
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Tableau 31.2 : Dépistage pendant la grossesse", 14, currentY);
      currentY += 5;

      const depistageHeaders = [["Indicateurs", "Nombre"]];
      const depistageRows = tabDepistageGrossesse.map((item) => [
        item.label,
        String(countClientBoolean(converted, 0, 120, item.value, true)),
      ]);

      autoTable(doc, {
        startY: currentY,
        head: depistageHeaders,
        body: depistageRows,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 100 } },
      });

      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      // Tableau 3: Prévention en CPN
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Tableau 31.3 : Prévention en CPN", 14, currentY);
      currentY += 5;

      const preventionHeaders = [["Indicateurs", "Nombre"]];
      const preventionRows = tabPreventionCpn.map((item) => [
        item.label,
        String(countClientBoolean(converted, 0, 120, item.value, true)),
      ]);

      autoTable(doc, {
        startY: currentY,
        head: preventionHeaders,
        body: preventionRows,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 100 } },
      });

      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      // Vérifier si nouvelle page nécessaire
      if (currentY > 160) {
        doc.addPage();
        currentY = 20;
      }

      // Tableau 4: Conseil et Dépistage VIH
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Tableau 31.4 : Conseil et Dépistage VIH", 14, currentY);
      currentY += 5;

      const vihHeaders = [["Indicateurs", "CPN", "Maternité", "Post-Natal", "Total"]];
      const vihRows = tabConseilDepistage.map((item) => {
        const cpn = countClientBoolean(converted, 0, 120, item.valueCpn, true);
        const maternite = countClientBoolean(converted, 0, 120, item.valueMaternite, true);
        const postNatal = countClientBoolean(converted, 0, 120, item.valuePostNatal, true);
        return [
          item.label,
          String(cpn),
          String(maternite),
          String(postNatal),
          String(cpn + maternite + postNatal),
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: vihHeaders,
        body: vihRows,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 80 } },
      });

      // Section signature (même page que le dernier tableau)
      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
      if (currentY > 190) {
        doc.addPage();
        currentY = 30;
      }
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Réalisé par: ____________________________", 14, currentY);
      doc.text("Signature: ____________________________", pageWidth - 100, currentY);

      doc.save(`Rapport_SIG_Obstetrique_${new Date().toLocaleDateString("fr-FR")}.pdf`);
    } catch (error) {
      console.error("Erreur export PDF:", error);
    } finally {
      setSpinnerPdf(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 bg-gray-50 opacity-90 p-4 rounded-sm mt-2 w-full overflow-x-auto">
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
      <div className="flex flex-row gap-3">
        {/* Tableau 1: Numéro CPN1 */}
        <div>
          <h2 className="font-bold mb-2">
            Tableau 31.1 : Consultations prénatales
          </h2>
          <Table className="border">
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableCell className="border border-l-gray-400 font-bold">
                  Indicateurs
                </TableCell>
                <TableCell className="border border-l-gray-400 font-bold">
                  Nombre
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabNumeroCpn1.map((client) => (
                <TableRow key={client.value}>
                  <TableCell
                    className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                    style={{
                      width: "350px",
                      minWidth: "350px",
                      maxWidth: "350px",
                    }}
                  >
                    {client.label}
                  </TableCell>
                  <TableCell className="text-center border">
                    {countClientBoolean(converted, 0, 120, client.value, true)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-slate-900 border border-gray-400">
                <TableCell colSpan={2}></TableCell>
              </TableRow>
              {tabAutreCpn.map((client) => (
                <TableRow key={client.value}>
                  <TableCell
                    className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                    style={{
                      width: "350px",
                      minWidth: "350px",
                      maxWidth: "350px",
                    }}
                  >
                    {client.label}
                  </TableCell>
                  <TableCell className="text-center border">
                    {countClientBoolean(converted, 0, 120, client.value, true)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Tableau 2: Dépistage Grossesse */}
        <div className="max-w-125 mx-auto">
          <h2 className="font-bold mb-2">
            Tableau 31.2 : Dépistage pendant la grossesse
          </h2>
          <Table className="border max-w-full">
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableCell className="border border-l-gray-400 font-bold">
                  Indicateurs
                </TableCell>
                <TableCell className="border border-l-gray-400 font-bold">
                  Nombre
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabDepistageGrossesse.map((client) => (
                <TableRow key={client.value}>
                  <TableCell
                    className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                    style={{
                      width: "350px",
                      minWidth: "350px",
                      maxWidth: "350px",
                    }}
                  >
                    {client.label}
                  </TableCell>
                  <TableCell className="text-center border">
                    {countClientBoolean(converted, 0, 120, client.value, true)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {/* Tableau 3: Prévention CPN */}
      <div className="max-w-200 mx-auto">
        <h2 className="font-bold mb-2">Tableau 31.3 : Prévention en CPN</h2>
        <Table className="border max-w-full">
          <TableHeader className="bg-gray-200">
            <TableRow>
              <TableCell className="border border-l-gray-400 font-bold">
                Indicateurs
              </TableCell>
              <TableCell className="border border-l-gray-400 font-bold">
                Nombre
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tabPreventionCpn.map((client) => (
              <TableRow key={client.value}>
                <TableCell
                  className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  {client.label}
                </TableCell>
                <TableCell className="text-center border">
                  {countClientBoolean(converted, 0, 120, client.value, true)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Tableau 4: Conseil et Dépistage VIH */}
      <div className="max-w-200 mx-auto">
        <h2 className="font-bold mb-2">
          Tableau 31.4 : Conseil et Dépistage VIH
        </h2>
        <Table className="border max-w-full">
          <TableHeader className="bg-gray-200">
            <TableRow>
              <TableCell className="border border-l-gray-400 font-bold">
                Indicateurs
              </TableCell>
              <TableCell className="border border-l-gray-400 font-bold">
                CPN
              </TableCell>
              <TableCell className="border border-l-gray-400 font-bold">
                Maternité
              </TableCell>
              <TableCell className="border border-l-gray-400 font-bold">
                Post-Natal
              </TableCell>
              <TableCell className="border border-l-gray-400 font-bold">
                Total
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tabConseilDepistage.map((client, index) => (
              <TableRow key={index}>
                <TableCell
                  className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  {client.label}
                </TableCell>
                <TableCell className="text-center border">
                  {countClientBoolean(converted, 0, 120, client.valueCpn, true)}
                </TableCell>
                <TableCell className="text-center border">
                  {countClientBoolean(
                    converted,
                    0,
                    120,
                    client.valueMaternite,
                    true
                  )}
                </TableCell>
                <TableCell className="text-center border">
                  {countClientBoolean(
                    converted,
                    0,
                    120,
                    client.valuePostNatal,
                    true
                  )}
                </TableCell>
                <TableCell className="text-center border font-semibold">
                  {countClientBoolean(
                    converted,
                    0,
                    120,
                    client.valueCpn,
                    true
                  ) +
                    countClientBoolean(
                      converted,
                      0,
                      120,
                      client.valueMaternite,
                      true
                    ) +
                    countClientBoolean(
                      converted,
                      0,
                      120,
                      client.valuePostNatal,
                      true
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export const countClientBoolean = (
  clientData: convertedType[],
  minAge: number,
  maxAge: number,
  propriete: string,
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
