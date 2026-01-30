import { useEffect, useState } from "react";
import { ClientData, clientDataProps } from "../rapportPfActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Separator } from "../ui/separator";
import { FactureExamen, ResultatExamen } from "@prisma/client";
import ExcelJS from "exceljs";
// tableExport previously used; replaced by direct export logic below
import { Spinner } from "../ui/spinner";
import { Button } from "../ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type convertedType = clientDataProps & {
  pilule: boolean;
  spotting: boolean;
  noristera: boolean;
  injectable: boolean;
  implanonInsertion: boolean;
  implanonControle: boolean;
  implanonRetrait: boolean;
  jadelleInsertion: boolean;
  jadelleControle: boolean;
  jadelleRetrait: boolean;

  diuInsertion: boolean;
  diuControle: boolean;
  diuRetrait: boolean;
  preservatif: boolean;
  spermicide: boolean;
  urgence: boolean;

  depistageSansPtme: boolean;
  depistagePositifSansPtme: boolean;
  depistagePtme: boolean;
  depistagePtmePositif: boolean;
  initiationTtt: boolean;

  // SAA
  conSaa: boolean;
  pecAmiu: boolean;
  pecMisoprostol: boolean;
  saaSuivi: boolean;

  // Infertilité
  conInfertilite: boolean;
  pecTraitementMedical: boolean;
  pecTraitementHormonal: boolean;
  // IST
  conIst: boolean;
  pecSyndromique: boolean;
  pecEtiologique: boolean;
  depistageVihCasIst: boolean;

  // Gyneco
  conGyneco: boolean;
  depistageIva: boolean;
  ivaPositif: boolean;
  depistageCancerSein: boolean;
  depistageCancerSeinPositif: boolean;

  // CPN
  conCpn: boolean;
  cpn1: boolean;
  cpn2: boolean;
  cpn3: boolean;
  cpn4: boolean;
  cpn5: boolean;
  testGrossesse: boolean;

  // Pédiatrie
  conPediatrie: boolean;
  pecPaludismePediatrie: boolean;
  pecAutresPediatrie: boolean;

  // Médecine
  conMedecine: boolean;
  pecPaludismeMedecine: boolean;
  pecAutresMedecine: boolean;

  // Violence
  conViolence: boolean;
  casViolence: boolean;
  autresCasViolence: boolean;
};

const tabContraception = [
  { value: "pilule", label: "Consultation - Pilule" },
  { value: "spotting", label: "Consultation - Spotting pilule" },
  { value: "noristera", label: "Consultation - Injectable 2 mois" },
  { value: "injectable", label: "Consultation - Injectable 3 mois" },

  { value: "implanonInsertion", label: "Consultation - Implanon (insertion)" },
  { value: "implanonControle", label: "Consultation - Implanon (contrôle)" },
  { value: "implanonRetrait", label: "Consultation - Implanon (retrait)" },

  { value: "jadelleInsertion", label: "Consultation - Jadelle (insertion)" },
  { value: "jadelleControle", label: "Consultation - Jadelle (contrôle)" },
  { value: "jadelleRetrait", label: "Consultation - Jadelle (retrait)" },

  { value: "diuInsertion", label: "Consultation - DIU (insertion)" },
  { value: "diuControle", label: "Consultation - DIU (contrôle)" },
  { value: "diuRetrait", label: "Consultation - DIU (retrait)" },

  { value: "preservatif", label: "Consultation - Préservatif" },
  { value: "spermicide", label: "Consultation - Spermicide" },
  { value: "urgence", label: "Consultation - Méthode d'urgence" },
];
const tabVih = [
  {
    value: "depistageSansPtme",
    label: "Nombre de personnes dépistées pour le VIH (sans PTME)",
  },
  {
    value: "depistagePositifSansPtme",
    label: "Nombre de personnes dépistées VIH+ (sans PTME)",
  },
  {
    value: "depistagePtme",
    label: "Nombre de femmes enceintes dépistées pour le VIH",
  },
  {
    value: "depistagePtmePositif",
    label: "Nombre de femmes enceintes dépistées VIH+",
  },
  {
    value: "initiationTtt",
    label:
      "Nombre de personnes nouvellement dépistées positives et ayant initiées les ARV",
  },
];
const tabSaa = [
  {
    value: "conSaa",
    label: "consultation SAA",
  },
  {
    value: "pecAmiu",
    label: "Prise en charge AMIU",
  },
  {
    value: "pecMisoprostol",
    label: "Prise en charge Misoprostol",
  },
  {
    value: "saaSuivi",
    label: "Suivi post SAA",
  },
];
const tabInfertilite = [
  {
    value: "conInfertilite",
    label: "consultation Infertilité",
  },
  {
    value: "pecTraitementMedical",
    label: "PEC-médical Traitement médical",
  },
  {
    value: "pecTraitementHormonal",
    label: "PEC-médical Traitement hormonal/de l'ovulation",
  },
];
const tabIst = [
  {
    value: "conIst",
    label: "consultation IST",
  },
  {
    value: "pecSyndromique",
    label: "Prise en charge syndromique",
  },
  {
    value: "pecEtiologique",
    label: "Prise en charge étiologique",
  },
  {
    value: "depistageVihCasIst",
    label: "Dépistage VIH des cas IST",
  },
];
const tabGyneco = [
  {
    value: "conGyneco",
    label: "consultation Gynécologie",
  },
  {
    value: "depistageIva",
    label: "Dépistage IVA",
  },
  {
    value: "ivaPositif",
    label: "Dépistage IVA positif",
  },
  {
    value: "depistageCancerSein",
    label: "Dépistage Cancer du Sein",
  },
  {
    value: "depistageCancerSeinPositif",
    label: "Dépistage Cancer du Sein positif",
  },
];
const tabCpn = [
  {
    value: "conCpn",
    label: "consultation CPN",
  },
  {
    value: "cpn1",
    label: "Consultation CPN1",
  },
  {
    value: "cpn2",
    label: "Consultation CPN2",
  },
  {
    value: "cpn3",
    label: "Consultation CPN3",
  },
  {
    value: "cpn4",
    label: "Consultation CPN4",
  },
  {
    value: "cpn5",
    label: "Consultation CPN5 et plus",
  },
  {
    value: "testGrossesse",
    label: "Test de Grossesse",
  },
];
const tabPediatrie = [
  {
    value: "conPediatrie",
    label: "consultation Pédiatrie",
  },
  {
    value: "pecPaludismePediatrie",
    label: "Prise en charge Paludisme",
  },
  {
    value: "pecAutresPediatrie",
    label: "Prise en charge Autres",
  },
];
const tabMedecine = [
  {
    value: "conMedecine",
    label: "consultation Médecine",
  },
  {
    value: "pecPaludismeMedecine",
    label: "Prise en charge Paludisme",
  },
  {
    value: "pecAutresMedecine",
    label: "Prise en charge Autres",
  },
];
const tabViolence = [
  {
    value: "conViolence",
    label: "consultation Violence",
  },
  {
    value: "casViolence",
    label: "cas de Viol",
  },
  {
    value: "autresCasViolence",
    label: "autres cas de Violence",
  },
];

export default function TableRapportValidation({
  clientData,
  dataPrescripteur,
  tabExament,
  factureLaboratoire,
  resultatLaboratoire,
  clinic,
  dateDebut,
  dateFin,
}: {
  clientData: ClientData[];
  dataPrescripteur: { name: string; id: string }[];
  tabExament: string[];
  factureLaboratoire: FactureExamen[];
  resultatLaboratoire: (ResultatExamen & { libelleExamen?: string })[];
  clinic: string;
  dateDebut: string;
  dateFin: string;
}) {
  const [converted, setConverted] = useState<convertedType[]>([]);
  const [spinner, setSpinner] = useState(false);
  const [spinnerPdf, setSpinnerPdf] = useState(false);

  if (dataPrescripteur) console.log("dataPrescripteur :", dataPrescripteur);

  useEffect(() => {
    if (!clientData || clientData.length === 0) {
      setConverted([]);
    } else {
      const newConverted = clientData.map((item) => ({
        ...item,
        pilule: item.courtDuree === "pilule",
        spotting: item.courtDuree === "spotting",
        noristera: item.courtDuree === "noristera",
        injectable: item.courtDuree === "injectable",
        implanonInsertion: item.implanon === "insertion",
        implanonControle: item.implanon === "controle",
        implanonRetrait: item.implanon === "retrait",
        jadelleInsertion: item.jadelle === "insertion",
        jadelleControle: item.jadelle === "controle",
        jadelleRetrait: item.jadelle === "retrait",
        diuInsertion: item.sterilet === "insertion",
        diuControle: item.sterilet === "controle",
        diuRetrait: item.sterilet === "retrait",
        preservatif: item.courtDuree === "preservatif",
        spermicide: item.courtDuree === "spermicide",
        urgence: item.courtDuree === "urgence",

        depistageSansPtme:
          item.depistageVihConsultation === true &&
          item.depistageVihTypeClient !== "ptme",
        depistagePositifSansPtme:
          item.depistageVihConsultation === true &&
          item.depistageVihTypeClient !== "ptme" &&
          item.depistageVihResultat === "positif",
        depistagePtme:
          item.depistageVihConsultation === true &&
          item.depistageVihTypeClient === "ptme",
        depistagePtmePositif:
          item.depistageVihConsultation === true &&
          item.depistageVihTypeClient === "ptme" &&
          item.depistageVihResultat === "positif",
        initiationTtt:
          item.depistageVihConsultation === true &&
          item.depistageVihResultat === "positif" &&
          item.pecVihMoleculeArv !== null,

        // SAA
        conSaa: item.saaConsultation === true,
        pecAmiu: item.saaTypePec === "amiu",
        pecMisoprostol: item.saaTypePec === "misoprostol",
        saaSuivi: item.saaSuiviPostAvortement === true,
        // Infertilité
        conInfertilite: item.infertConsultation === true,
        pecTraitementMedical: item.infertTraitement === "medicale",
        pecTraitementHormonal: item.infertTraitement === "hormonale",
        // IST
        conIst: item.istCounsellingAvantDepitage === true,
        pecSyndromique: item.istTypePec === "syndromique",
        pecEtiologique: item.istTypePec === "etiologique",
        depistageVihCasIst:
          item.istCounsellingAvantDepitage === true &&
          item.depistageVihConsultation === true,

        // Gyneco
        conGyneco: item.consultationGyneco === true,
        depistageIva: item.counsellingAvantDepistage === true,
        ivaPositif: item.resultatIva === "positif",
        depistageCancerSein: item.counsellingCancerSein === true,
        depistageCancerSeinPositif: item.resultatCancerSein === "positif",

        // CPN
        conCpn: item.obstConsultation === true,
        cpn1: item.obstTypeVisite === "cpn1",
        cpn2: item.obstTypeVisite === "cpn2",
        cpn3: item.obstTypeVisite === "cpn3",
        cpn4: item.obstTypeVisite === "cpn4",
        cpn5: item.obstTypeVisite === "cpn5",
        testGrossesse: item.testConsultation === true,

        // Pédiatrie
        conPediatrie: item.mdgConsultation === true,
        pecPaludismePediatrie: item.mdgDiagnostic.includes("paludisme"),
        pecAutresPediatrie:
          !item.mdgDiagnostic.includes("paludisme") &&
          item.mdgConsultation === true,
        // Médecine
        conMedecine: item.mdgConsultation === true,
        pecPaludismeMedecine: item.mdgDiagnostic.includes("paludisme"),
        pecAutresMedecine:
          !item.mdgDiagnostic.includes("paludisme") &&
          item.mdgConsultation === true,

        // Violence
        conViolence: item.vbgConsultation === "pec",
        casViolence: item.vbgType === "viol" && item.vbgConsultation === "pec",
        autresCasViolence:
          item.vbgType === "agressionsSexuelles" ||
          item.vbgType === "agressionsPhysiques" ||
          item.vbgType === "mariageForce" ||
          item.vbgType === "deniRessources" ||
          item.vbgType === "maltraitancePsychologique",
      }));

      setConverted(newConverted);
    }
  }, [clientData]);

  if (converted.length === 0) {
    return <p className="text-center">Aucune donnée disponible.</p>;
  } else {
    console.log("converted :", converted);
  }

  const exportToExcel = async () => {
    setSpinner(true);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Validation Données");

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

    // Age ranges sont définis dans la page appelante; ici nous utilisons des filtres min/max inline

    // Itérer sur tous les tableaux définis dans ce composant et reproduire la table HTML
    let currentRow = 7;

    const tablesToExport = [
      { title: "Contraception", tab: tabContraception, minAge: 0, maxAge: 120 },
      { title: "VIH", tab: tabVih, minAge: 0, maxAge: 120 },
      { title: "SAA", tab: tabSaa, minAge: 0, maxAge: 120 },
      { title: "Infertilité", tab: tabInfertilite, minAge: 0, maxAge: 120 },
      { title: "IST", tab: tabIst, minAge: 0, maxAge: 120 },
      { title: "Gynécologie", tab: tabGyneco, minAge: 0, maxAge: 120 },
      { title: "CPN", tab: tabCpn, minAge: 0, maxAge: 120 },
      { title: "Pédiatrie", tab: tabPediatrie, minAge: 0, maxAge: 9 },
      { title: "Médecine générale", tab: tabMedecine, minAge: 10, maxAge: 120 },
      {
        title: "Violence basée sur le genre",
        tab: tabViolence,
        minAge: 0,
        maxAge: 120,
      },
    ];

    for (const t of tablesToExport) {
      // Titre
      worksheet.getCell(currentRow, 1).value = t.title;
      worksheet.getCell(currentRow, 1).font = { bold: true };
      currentRow += 1;

      // En-tête : Types de consultation | prescripteur... | Total
      const headerRow = currentRow;
      worksheet.getCell(headerRow, 1).value = "Types de consultation";
      // Prescripteurs
      const prescripteurs = Array.isArray(dataPrescripteur)
        ? dataPrescripteur
        : [];
      for (let i = 0; i < prescripteurs.length; i++) {
        worksheet.getCell(headerRow, 2 + i).value = prescripteurs[i].name;
      }
      // Colonne total
      const totalColIndex = 2 + prescripteurs.length;
      worksheet.getCell(headerRow, totalColIndex).value = "Total";
      // Style header
      for (let col = 1; col <= totalColIndex; col++) {
        const cell = worksheet.getCell(headerRow, col);
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" };
      }

      currentRow += 1;

      // Lignes : pour chaque indicateur
      for (const item of t.tab) {
        worksheet.getCell(currentRow, 1).value = item.label;
        // Valeurs par prescripteur
        for (let i = 0; i < prescripteurs.length; i++) {
          const pres = prescripteurs[i];
          const val = countClientByPrescripteur(
            converted,
            t.minAge,
            t.maxAge,
            item.value,
            true,
            pres.id
          );
          worksheet.getCell(currentRow, 2 + i).value = val;
        }
        // Total
        const total = countClientBoolean(
          converted,
          t.minAge,
          t.maxAge,
          item.value,
          true
        );
        worksheet.getCell(currentRow, totalColIndex).value = total;
        currentRow += 1;
      }

      // Petit espacement après chaque tableau
      currentRow += 2;
    }

    // === Données laboratoire ===
    if (Array.isArray(tabExament) && tabExament.length > 0) {
      // Ajouter un petit espacement
      currentRow += 1;
      worksheet.getCell(currentRow, 1).value = "Données laboratoire";
      worksheet.getCell(currentRow, 1).font = { bold: true };
      currentRow += 1;

      // En-tête colonnes
      worksheet.getCell(currentRow, 1).value = "Types d'examens";
      worksheet.getCell(currentRow, 2).value = "Caisse";
      worksheet.getCell(currentRow, 3).value = "Laboratoire";
      // Style header
      [1, 2, 3].forEach((col) => {
        const cell = worksheet.getCell(currentRow, col);
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" };
      });

      currentRow += 1;
      for (const examen of tabExament) {
        worksheet.getCell(currentRow, 1).value = examen;
        worksheet.getCell(currentRow, 2).value = countExamenFacture(
          factureLaboratoire,
          examen
        );
        worksheet.getCell(currentRow, 3).value = countExamenResultat(
          resultatLaboratoire,
          examen
        );
        currentRow += 1;
      }
    }

    // === Données répartition des consultations par prescripteur ===
    // (Optionnel : ajouter un petit espacement)
    currentRow += 2;
    worksheet.getCell(currentRow, 1).value =
      "Répartition des consultations par prescripteur";
    worksheet.getCell(currentRow, 1).font = { bold: true };
    currentRow += 1;
    // En-tête colonnes
    worksheet.getCell(currentRow, 1).value = "Prescripteur";
    worksheet.getCell(currentRow, 2).value = "Nombre de consultations";
    worksheet.getCell(currentRow, 3).value = "pourcentage";
    // Style header
    [1, 2, 3].forEach((col) => {
      const cell = worksheet.getCell(currentRow, col);
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
    });
    currentRow += 1;
    // total consultations for percentage base
    const totalConsultations = converted.length;
    for (const prescripteur of dataPrescripteur) {
      const countConsults = converted.filter(
        (item) => item.nomPrescripteur === prescripteur.name
      ).length;
      worksheet.getCell(currentRow, 1).value = prescripteur.name;
      worksheet.getCell(currentRow, 2).value = countConsults;
      // percentage on same row, format to 2 decimals
      const percentage =
        totalConsultations > 0 ? (countConsults / totalConsultations) * 100 : 0;
      const pctCell = worksheet.getCell(currentRow, 3);
      pctCell.value = Math.round(percentage * 100) / 100; // store numeric value
      pctCell.numFmt = "0.0%"; // Excel percent format (value expected as fraction)
      // since numFmt expects fraction (eg 1 = 100%), store as decimal
      pctCell.value =
        totalConsultations > 0 ? countConsults / totalConsultations : 0;

      currentRow += 1;
    }

    // Ligne Total
    worksheet.getCell(currentRow, 1).value = "Total";
    worksheet.getCell(currentRow, 1).font = { bold: true };
    const totalCell = worksheet.getCell(currentRow, 2);
    totalCell.value = totalConsultations;
    totalCell.font = { bold: true };
    const totalPctCell = worksheet.getCell(currentRow, 3);
    totalPctCell.value = 1; // 100% as fraction
    totalPctCell.numFmt = "0.0%";
    totalPctCell.font = { bold: true };
    currentRow += 1;

    // Appliquer styles de bordure/alignement sur les cellules remplies
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

    // Générer le fichier
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Rapport_Validation_${new Date().toLocaleDateString(
      "fr-FR"
    )}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);

    setSpinner(false);
  };

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
      const debut = new Date(dateDebut);
      const fin = new Date(dateFin);
      const isFullMonth =
        debut.getDate() === 1 &&
        fin.getDate() ===
          new Date(fin.getFullYear(), fin.getMonth() + 1, 0).getDate() &&
        debut.getMonth() === fin.getMonth() &&
        debut.getFullYear() === fin.getFullYear();

      let periodeText: string;
      if (isFullMonth) {
        const moisNoms = [
          "JANVIER", "FEVRIER", "MARS", "AVRIL", "MAI", "JUIN",
          "JUILLET", "AOUT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DECEMBRE",
        ];
        periodeText = `${moisNoms[debut.getMonth()]} ${debut.getFullYear()}`;
      } else {
        periodeText = `${debut.toLocaleDateString("fr-FR")} - ${fin.toLocaleDateString("fr-FR")}`;
      }

      // Titre et période
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Rapport Validation - ${clinic}`, pageWidth / 2, 35, {
        align: "center",
      });
      doc.setFontSize(11);
      doc.text(`Période: ${periodeText}`, pageWidth / 2, 42, {
        align: "center",
      });

      let currentY = 50;

      const prescripteurs = Array.isArray(dataPrescripteur) ? dataPrescripteur : [];

      // Tableaux à exporter
      const tablesToExport = [
        { title: "Contraception", tab: tabContraception, minAge: 0, maxAge: 120 },
        { title: "VIH", tab: tabVih, minAge: 0, maxAge: 120 },
        { title: "SAA", tab: tabSaa, minAge: 0, maxAge: 120 },
        { title: "Infertilité", tab: tabInfertilite, minAge: 0, maxAge: 120 },
        { title: "IST", tab: tabIst, minAge: 0, maxAge: 120 },
        { title: "Gynécologie", tab: tabGyneco, minAge: 0, maxAge: 120 },
        { title: "CPN", tab: tabCpn, minAge: 0, maxAge: 120 },
        { title: "Pédiatrie", tab: tabPediatrie, minAge: 0, maxAge: 9 },
        { title: "Médecine générale", tab: tabMedecine, minAge: 10, maxAge: 120 },
        { title: "Violence basée sur le genre", tab: tabViolence, minAge: 0, maxAge: 120 },
      ];

      for (const t of tablesToExport) {
        // Vérifier s'il faut une nouvelle page
        if (currentY > 180) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(t.title, 14, currentY);
        currentY += 5;

        // En-têtes
        const headers = [
          ["Types de consultation", ...prescripteurs.map((p) => p.name), "Total"],
        ];

        // Données
        const rows = t.tab.map((item) => {
          const row = [item.label];
          // Valeurs par prescripteur
          prescripteurs.forEach((pres) => {
            row.push(
              String(countClientByPrescripteur(converted, t.minAge, t.maxAge, item.value, true, pres.id))
            );
          });
          // Total
          row.push(String(countClientBoolean(converted, t.minAge, t.maxAge, item.value, true)));
          return row;
        });

        autoTable(doc, {
          startY: currentY,
          head: headers,
          body: rows,
          theme: "grid",
          styles: { fontSize: 7, cellPadding: 1 },
          headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
          columnStyles: { 0: { cellWidth: 60 } },
        });

        currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      // Tableau laboratoire
      if (Array.isArray(tabExament) && tabExament.length > 0) {
        if (currentY > 180) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Données laboratoire", 14, currentY);
        currentY += 5;

        const laboHeaders = [["Types d'examens", "Caisse", "Laboratoire"]];
        const laboRows = tabExament.map((examen) => [
          examen,
          String(countExamenFacture(factureLaboratoire, examen)),
          String(countExamenResultat(resultatLaboratoire, examen)),
        ]);

        autoTable(doc, {
          startY: currentY,
          head: laboHeaders,
          body: laboRows,
          theme: "grid",
          styles: { fontSize: 7, cellPadding: 1 },
          headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
        });

        currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      // Répartition des consultations par prescripteur
      if (currentY > 180) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Répartition des consultations par prescripteur", 14, currentY);
      currentY += 5;

      const totalConsultations = converted.length;
      const repartHeaders = [["Prescripteur", "Nombre de consultations", "Pourcentage"]];
      const repartRows = prescripteurs.map((pres) => {
        const countConsults = converted.filter((item) => item.nomPrescripteur === pres.name).length;
        const percentage = totalConsultations > 0 ? ((countConsults / totalConsultations) * 100).toFixed(1) : "0.0";
        return [pres.name, String(countConsults), `${percentage}%`];
      });
      // Ajouter ligne total
      repartRows.push(["Total", String(totalConsultations), "100.0%"]);

      autoTable(doc, {
        startY: currentY,
        head: repartHeaders,
        body: repartRows,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: "bold" },
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

      doc.save(`Rapport_Validation_${new Date().toLocaleDateString("fr-FR")}.pdf`);
    } catch (error) {
      console.error("Erreur export PDF:", error);
    } finally {
      setSpinnerPdf(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 bg-gray-50 opacity-90 p-4 rounded-sm mt-2 w-full overflow-x-auto">
      <div className="flex gap-2 justify-center">
        <Button
          onClick={exportToExcel}
          type="button"
          disabled={spinner}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          <Spinner
            show={spinner}
            size={"small"}
            className="text-white dark:text-slate-400"
          />
          Exporter Excel
        </Button>
        <Button
          onClick={exportToPdf}
          type="button"
          disabled={spinnerPdf}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
        >
          <Spinner
            show={spinnerPdf}
            size={"small"}
            className="text-white dark:text-slate-400"
          />
          Exporter PDF
        </Button>
      </div>
      <div className="flex flex-row gap-3">
        {/* Tableau des consultations par prescripteur */}
        <div>
          <h2 className="font-bold mb-2">
            Tableau : Validation des données de consultations de contraception
          </h2>
          <Table className="border">
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableCell
                  className="border border-l-gray-400 font-bold"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Types de consultation
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="border border-l-gray-400 font-bold text-center"
                  >
                    {prescripteur.name}
                  </TableCell>
                ))}
                <TableCell className="border border-l-gray-400 font-bold text-center">
                  Total
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabContraception.map((consultation) => (
                <TableRow key={consultation.value}>
                  <TableCell
                    className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                    style={{
                      width: "350px",
                      minWidth: "350px",
                      maxWidth: "350px",
                    }}
                  >
                    {consultation.label}
                  </TableCell>

                  {/* Colonnes pour chaque prescripteur */}
                  {dataPrescripteur.map((prescripteur) => (
                    <TableCell
                      key={prescripteur.id}
                      className="text-center border"
                    >
                      {countClientByPrescripteur(
                        converted,
                        0,
                        120,
                        consultation.value,
                        true,
                        prescripteur.id
                      )}
                    </TableCell>
                  ))}

                  {/* Colonne Total */}
                  <TableCell className="text-center border font-bold">
                    {countClientBoolean(
                      converted,
                      0,
                      120,
                      consultation.value,
                      true
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Ligne Total général */}
              <TableRow className="bg-gray-100">
                <TableCell
                  className="border border-l-gray-400 font-bold break-word whitespace-normal overflow-hidden"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Total général
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="text-center border font-bold"
                  >
                    {tabContraception.reduce((total, consultation) => {
                      return (
                        total +
                        countClientByPrescripteur(
                          converted,
                          0,
                          120,
                          consultation.value,
                          true,
                          prescripteur.id
                        )
                      );
                    }, 0)}
                  </TableCell>
                ))}
                <TableCell className="text-center border font-bold">
                  {tabContraception.reduce((total, consultation) => {
                    return (
                      total +
                      countClientBoolean(
                        converted,
                        0,
                        120,
                        consultation.value,
                        true
                      )
                    );
                  }, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Separator className="bg-green-300 my-2" />
          <h2 className="font-bold mx-auto px-auto">VIH</h2>
          <Table className="border">
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableCell
                  className="border border-l-gray-400 font-bold"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Types de consultation
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="border border-l-gray-400 font-bold text-center"
                  >
                    {prescripteur.name}
                  </TableCell>
                ))}
                <TableCell className="border border-l-gray-400 font-bold text-center">
                  Total
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabVih.map((consultation) => (
                <TableRow key={consultation.value}>
                  <TableCell
                    className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                    style={{
                      width: "350px",
                      minWidth: "350px",
                      maxWidth: "350px",
                    }}
                  >
                    {consultation.label}
                  </TableCell>

                  {/* Colonnes pour chaque prescripteur */}
                  {dataPrescripteur.map((prescripteur) => (
                    <TableCell
                      key={prescripteur.id}
                      className="text-center border"
                    >
                      {countClientByPrescripteur(
                        converted,
                        0,
                        120,
                        consultation.value,
                        true,
                        prescripteur.id
                      )}
                    </TableCell>
                  ))}

                  {/* Colonne Total */}
                  <TableCell className="text-center border font-bold">
                    {countClientBoolean(
                      converted,
                      0,
                      120,
                      consultation.value,
                      true
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Ligne Total général */}
              <TableRow className="bg-gray-100">
                <TableCell
                  className="border border-l-gray-400 font-bold break-word whitespace-normal overflow-hidden"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Total général
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="text-center border font-bold"
                  >
                    {tabVih.reduce((total, consultation) => {
                      return (
                        total +
                        countClientByPrescripteur(
                          converted,
                          0,
                          120,
                          consultation.value,
                          true,
                          prescripteur.id
                        )
                      );
                    }, 0)}
                  </TableCell>
                ))}
                <TableCell className="text-center border font-bold">
                  {tabVih.reduce((total, consultation) => {
                    return (
                      total +
                      countClientBoolean(
                        converted,
                        0,
                        120,
                        consultation.value,
                        true
                      )
                    );
                  }, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Separator className="bg-green-300 my-2" />
          <h2 className="font-bold mx-auto px-auto">SAA</h2>
          <Table className="border">
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableCell
                  className="border border-l-gray-400 font-bold"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Types de consultation
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="border border-l-gray-400 font-bold text-center"
                  >
                    {prescripteur.name}
                  </TableCell>
                ))}
                <TableCell className="border border-l-gray-400 font-bold text-center">
                  Total
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabSaa.map((consultation) => (
                <TableRow key={consultation.value}>
                  <TableCell
                    className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                    style={{
                      width: "350px",
                      minWidth: "350px",
                      maxWidth: "350px",
                    }}
                  >
                    {consultation.label}
                  </TableCell>

                  {/* Colonnes pour chaque prescripteur */}
                  {dataPrescripteur.map((prescripteur) => (
                    <TableCell
                      key={prescripteur.id}
                      className="text-center border"
                    >
                      {countClientByPrescripteur(
                        converted,
                        0,
                        120,
                        consultation.value,
                        true,
                        prescripteur.id
                      )}
                    </TableCell>
                  ))}

                  {/* Colonne Total */}
                  <TableCell className="text-center border font-bold">
                    {countClientBoolean(
                      converted,
                      0,
                      120,
                      consultation.value,
                      true
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Ligne Total général */}
              <TableRow className="bg-gray-100">
                <TableCell
                  className="border border-l-gray-400 font-bold break-word whitespace-normal overflow-hidden"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Total général
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="text-center border font-bold"
                  >
                    {tabSaa.reduce((total, consultation) => {
                      return (
                        total +
                        countClientByPrescripteur(
                          converted,
                          0,
                          120,
                          consultation.value,
                          true,
                          prescripteur.id
                        )
                      );
                    }, 0)}
                  </TableCell>
                ))}
                <TableCell className="text-center border font-bold">
                  {tabSaa.reduce((total, consultation) => {
                    return (
                      total +
                      countClientBoolean(
                        converted,
                        0,
                        120,
                        consultation.value,
                        true
                      )
                    );
                  }, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Separator className="bg-green-300 my-2" />
          <h2 className="font-bold mx-auto px-auto">Infertilité</h2>
          <Table className="border">
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableCell
                  className="border border-l-gray-400 font-bold"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Types de consultation
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="border border-l-gray-400 font-bold text-center"
                  >
                    {prescripteur.name}
                  </TableCell>
                ))}
                <TableCell className="border border-l-gray-400 font-bold text-center">
                  Total
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabInfertilite.map((consultation) => (
                <TableRow key={consultation.value}>
                  <TableCell
                    className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                    style={{
                      width: "350px",
                      minWidth: "350px",
                      maxWidth: "350px",
                    }}
                  >
                    {consultation.label}
                  </TableCell>

                  {/* Colonnes pour chaque prescripteur */}
                  {dataPrescripteur.map((prescripteur) => (
                    <TableCell
                      key={prescripteur.id}
                      className="text-center border"
                    >
                      {countClientByPrescripteur(
                        converted,
                        0,
                        120,
                        consultation.value,
                        true,
                        prescripteur.id
                      )}
                    </TableCell>
                  ))}

                  {/* Colonne Total */}
                  <TableCell className="text-center border font-bold">
                    {countClientBoolean(
                      converted,
                      0,
                      120,
                      consultation.value,
                      true
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Ligne Total général */}
              <TableRow className="bg-gray-100">
                <TableCell
                  className="border border-l-gray-400 font-bold break-word whitespace-normal overflow-hidden"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Total général
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="text-center border font-bold"
                  >
                    {tabInfertilite.reduce((total, consultation) => {
                      return (
                        total +
                        countClientByPrescripteur(
                          converted,
                          0,
                          120,
                          consultation.value,
                          true,
                          prescripteur.id
                        )
                      );
                    }, 0)}
                  </TableCell>
                ))}
                <TableCell className="text-center border font-bold">
                  {tabInfertilite.reduce((total, consultation) => {
                    return (
                      total +
                      countClientBoolean(
                        converted,
                        0,
                        120,
                        consultation.value,
                        true
                      )
                    );
                  }, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Separator className="bg-green-300 my-2" />
          <h2 className="font-bold mx-auto px-auto">IST</h2>
          <Table className="border">
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableCell
                  className="border border-l-gray-400 font-bold"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Types de consultation
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="border border-l-gray-400 font-bold text-center"
                  >
                    {prescripteur.name}
                  </TableCell>
                ))}
                <TableCell className="border border-l-gray-400 font-bold text-center">
                  Total
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabIst.map((consultation) => (
                <TableRow key={consultation.value}>
                  <TableCell
                    className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                    style={{
                      width: "350px",
                      minWidth: "350px",
                      maxWidth: "350px",
                    }}
                  >
                    {consultation.label}
                  </TableCell>

                  {/* Colonnes pour chaque prescripteur */}
                  {dataPrescripteur.map((prescripteur) => (
                    <TableCell
                      key={prescripteur.id}
                      className="text-center border"
                    >
                      {countClientByPrescripteur(
                        converted,
                        0,
                        120,
                        consultation.value,
                        true,
                        prescripteur.id
                      )}
                    </TableCell>
                  ))}

                  {/* Colonne Total */}
                  <TableCell className="text-center border font-bold">
                    {countClientBoolean(
                      converted,
                      0,
                      120,
                      consultation.value,
                      true
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Ligne Total général */}
              <TableRow className="bg-gray-100">
                <TableCell
                  className="border border-l-gray-400 font-bold break-word whitespace-normal overflow-hidden"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Total général
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="text-center border font-bold"
                  >
                    {tabIst.reduce((total, consultation) => {
                      return (
                        total +
                        countClientByPrescripteur(
                          converted,
                          0,
                          120,
                          consultation.value,
                          true,
                          prescripteur.id
                        )
                      );
                    }, 0)}
                  </TableCell>
                ))}
                <TableCell className="text-center border font-bold">
                  {tabIst.reduce((total, consultation) => {
                    return (
                      total +
                      countClientBoolean(
                        converted,
                        0,
                        120,
                        consultation.value,
                        true
                      )
                    );
                  }, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Separator className="bg-green-300 my-2" />
          <h2 className="font-bold mx-auto px-auto">Gynécologie</h2>
          <Table className="border">
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableCell
                  className="border border-l-gray-400 font-bold"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Types de consultation
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="border border-l-gray-400 font-bold text-center"
                  >
                    {prescripteur.name}
                  </TableCell>
                ))}
                <TableCell className="border border-l-gray-400 font-bold text-center">
                  Total
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabGyneco.map((consultation) => (
                <TableRow key={consultation.value}>
                  <TableCell
                    className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                    style={{
                      width: "350px",
                      minWidth: "350px",
                      maxWidth: "350px",
                    }}
                  >
                    {consultation.label}
                  </TableCell>

                  {/* Colonnes pour chaque prescripteur */}
                  {dataPrescripteur.map((prescripteur) => (
                    <TableCell
                      key={prescripteur.id}
                      className="text-center border"
                    >
                      {countClientByPrescripteur(
                        converted,
                        0,
                        120,
                        consultation.value,
                        true,
                        prescripteur.id
                      )}
                    </TableCell>
                  ))}

                  {/* Colonne Total */}
                  <TableCell className="text-center border font-bold">
                    {countClientBoolean(
                      converted,
                      0,
                      120,
                      consultation.value,
                      true
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Ligne Total général */}
              <TableRow className="bg-gray-100">
                <TableCell
                  className="border border-l-gray-400 font-bold break-word whitespace-normal overflow-hidden"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Total général
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="text-center border font-bold"
                  >
                    {tabGyneco.reduce((total, consultation) => {
                      return (
                        total +
                        countClientByPrescripteur(
                          converted,
                          0,
                          120,
                          consultation.value,
                          true,
                          prescripteur.id
                        )
                      );
                    }, 0)}
                  </TableCell>
                ))}
                <TableCell className="text-center border font-bold">
                  {tabGyneco.reduce((total, consultation) => {
                    return (
                      total +
                      countClientBoolean(
                        converted,
                        0,
                        120,
                        consultation.value,
                        true
                      )
                    );
                  }, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Separator className="bg-green-300 my-2" />
          <h2 className="font-bold mx-auto px-auto">Obstétrique</h2>
          <Table className="border">
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableCell
                  className="border border-l-gray-400 font-bold"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Types de consultation
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="border border-l-gray-400 font-bold text-center"
                  >
                    {prescripteur.name}
                  </TableCell>
                ))}
                <TableCell className="border border-l-gray-400 font-bold text-center">
                  Total
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabCpn.map((consultation) => (
                <TableRow key={consultation.value}>
                  <TableCell
                    className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                    style={{
                      width: "350px",
                      minWidth: "350px",
                      maxWidth: "350px",
                    }}
                  >
                    {consultation.label}
                  </TableCell>

                  {/* Colonnes pour chaque prescripteur */}
                  {dataPrescripteur.map((prescripteur) => (
                    <TableCell
                      key={prescripteur.id}
                      className="text-center border"
                    >
                      {countClientByPrescripteur(
                        converted,
                        0,
                        120,
                        consultation.value,
                        true,
                        prescripteur.id
                      )}
                    </TableCell>
                  ))}

                  {/* Colonne Total */}
                  <TableCell className="text-center border font-bold">
                    {countClientBoolean(
                      converted,
                      0,
                      120,
                      consultation.value,
                      true
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Ligne Total général */}
              <TableRow className="bg-gray-100">
                <TableCell
                  className="border border-l-gray-400 font-bold break-word whitespace-normal overflow-hidden"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Total général
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="text-center border font-bold"
                  >
                    {tabCpn.reduce((total, consultation) => {
                      return (
                        total +
                        countClientByPrescripteur(
                          converted,
                          0,
                          120,
                          consultation.value,
                          true,
                          prescripteur.id
                        )
                      );
                    }, 0)}
                  </TableCell>
                ))}
                <TableCell className="text-center border font-bold">
                  {tabCpn.reduce((total, consultation) => {
                    return (
                      total +
                      countClientBoolean(
                        converted,
                        0,
                        120,
                        consultation.value,
                        true
                      )
                    );
                  }, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Separator className="bg-green-300 my-2" />
          <h2 className="font-bold mx-auto px-auto">Pédiatrie</h2>
          <Table className="border">
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableCell
                  className="border border-l-gray-400 font-bold"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Types de consultation
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="border border-l-gray-400 font-bold text-center"
                  >
                    {prescripteur.name}
                  </TableCell>
                ))}
                <TableCell className="border border-l-gray-400 font-bold text-center">
                  Total
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabPediatrie.map((consultation) => (
                <TableRow key={consultation.value}>
                  <TableCell
                    className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                    style={{
                      width: "350px",
                      minWidth: "350px",
                      maxWidth: "350px",
                    }}
                  >
                    {consultation.label}
                  </TableCell>

                  {/* Colonnes pour chaque prescripteur */}
                  {dataPrescripteur.map((prescripteur) => (
                    <TableCell
                      key={prescripteur.id}
                      className="text-center border"
                    >
                      {countClientByPrescripteur(
                        converted,
                        0,
                        9,
                        consultation.value,
                        true,
                        prescripteur.id
                      )}
                    </TableCell>
                  ))}

                  {/* Colonne Total */}
                  <TableCell className="text-center border font-bold">
                    {countClientBoolean(
                      converted,
                      0,
                      9,
                      consultation.value,
                      true
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Ligne Total général */}
              <TableRow className="bg-gray-100">
                <TableCell
                  className="border border-l-gray-400 font-bold break-word whitespace-normal overflow-hidden"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Total général
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="text-center border font-bold"
                  >
                    {tabPediatrie.reduce((total, consultation) => {
                      return (
                        total +
                        countClientByPrescripteur(
                          converted,
                          0,
                          9,
                          consultation.value,
                          true,
                          prescripteur.id
                        )
                      );
                    }, 0)}
                  </TableCell>
                ))}
                <TableCell className="text-center border font-bold">
                  {tabPediatrie.reduce((total, consultation) => {
                    return (
                      total +
                      countClientBoolean(
                        converted,
                        0,
                        9,
                        consultation.value,
                        true
                      )
                    );
                  }, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Separator className="bg-green-300 my-2" />
          <h2 className="font-bold mx-auto px-auto">Médecine générale</h2>
          <Table className="border">
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableCell
                  className="border border-l-gray-400 font-bold"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Types de consultation
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="border border-l-gray-400 font-bold text-center"
                  >
                    {prescripteur.name}
                  </TableCell>
                ))}
                <TableCell className="border border-l-gray-400 font-bold text-center">
                  Total
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabMedecine.map((consultation) => (
                <TableRow key={consultation.value}>
                  <TableCell
                    className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                    style={{
                      width: "350px",
                      minWidth: "350px",
                      maxWidth: "350px",
                    }}
                  >
                    {consultation.label}
                  </TableCell>

                  {/* Colonnes pour chaque prescripteur */}
                  {dataPrescripteur.map((prescripteur) => (
                    <TableCell
                      key={prescripteur.id}
                      className="text-center border"
                    >
                      {countClientByPrescripteur(
                        converted,
                        10,
                        120,
                        consultation.value,
                        true,
                        prescripteur.id
                      )}
                    </TableCell>
                  ))}

                  {/* Colonne Total */}
                  <TableCell className="text-center border font-bold">
                    {countClientBoolean(
                      converted,
                      10,
                      120,
                      consultation.value,
                      true
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Ligne Total général */}
              <TableRow className="bg-gray-100">
                <TableCell
                  className="border border-l-gray-400 font-bold break-word whitespace-normal overflow-hidden"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Total général
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="text-center border font-bold"
                  >
                    {tabMedecine.reduce((total, consultation) => {
                      return (
                        total +
                        countClientByPrescripteur(
                          converted,
                          10,
                          120,
                          consultation.value,
                          true,
                          prescripteur.id
                        )
                      );
                    }, 0)}
                  </TableCell>
                ))}
                <TableCell className="text-center border font-bold">
                  {tabMedecine.reduce((total, consultation) => {
                    return (
                      total +
                      countClientBoolean(
                        converted,
                        10,
                        120,
                        consultation.value,
                        true
                      )
                    );
                  }, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Separator className="bg-green-300 my-2" />
          <h2 className="font-bold mx-auto px-auto">
            Violence basée sur le genre
          </h2>
          <Table className="border">
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableCell
                  className="border border-l-gray-400 font-bold"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Types de consultation
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="border border-l-gray-400 font-bold text-center"
                  >
                    {prescripteur.name}
                  </TableCell>
                ))}
                <TableCell className="border border-l-gray-400 font-bold text-center">
                  Total
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabViolence.map((consultation) => (
                <TableRow key={consultation.value}>
                  <TableCell
                    className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                    style={{
                      width: "350px",
                      minWidth: "350px",
                      maxWidth: "350px",
                    }}
                  >
                    {consultation.label}
                  </TableCell>

                  {/* Colonnes pour chaque prescripteur */}
                  {dataPrescripteur.map((prescripteur) => (
                    <TableCell
                      key={prescripteur.id}
                      className="text-center border"
                    >
                      {countClientByPrescripteur(
                        converted,
                        0,
                        120,
                        consultation.value,
                        true,
                        prescripteur.id
                      )}
                    </TableCell>
                  ))}

                  {/* Colonne Total */}
                  <TableCell className="text-center border font-bold">
                    {countClientBoolean(
                      converted,
                      0,
                      120,
                      consultation.value,
                      true
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Ligne Total général */}
              <TableRow className="bg-gray-100">
                <TableCell
                  className="border border-l-gray-400 font-bold break-word whitespace-normal overflow-hidden"
                  style={{
                    width: "350px",
                    minWidth: "350px",
                    maxWidth: "350px",
                  }}
                >
                  Total général
                </TableCell>
                {dataPrescripteur.map((prescripteur) => (
                  <TableCell
                    key={prescripteur.id}
                    className="text-center border font-bold"
                  >
                    {tabViolence.reduce((total, consultation) => {
                      return (
                        total +
                        countClientByPrescripteur(
                          converted,
                          0,
                          120,
                          consultation.value,
                          true,
                          prescripteur.id
                        )
                      );
                    }, 0)}
                  </TableCell>
                ))}
                <TableCell className="text-center border font-bold">
                  {tabViolence.reduce((total, consultation) => {
                    return (
                      total +
                      countClientBoolean(
                        converted,
                        0,
                        120,
                        consultation.value,
                        true
                      )
                    );
                  }, 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Separator className="bg-green-300 my-2" />
          <h2 className="font-bold mx-auto px-auto">Données laboratoire</h2>
          <Table className="border">
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableCell
                  className="border border-l-gray-400 font-bold"
                  style={{ minWidth: "200px", maxWidth: "200px" }}
                >
                  Types {"d'examens"}
                </TableCell>
                <TableCell
                  className="border border-l-gray-400 font-bold"
                  style={{ minWidth: "200px", maxWidth: "200px" }}
                >
                  Caisse
                </TableCell>
                <TableCell
                  className="border border-l-gray-400 font-bold"
                  style={{ minWidth: "200px", maxWidth: "200px" }}
                >
                  Laboratoire
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabExament.map((examen) => (
                <TableRow key={examen}>
                  <TableCell
                    className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                    style={{ minWidth: "200px", maxWidth: "200px" }}
                  >
                    {examen}
                  </TableCell>
                  <TableCell
                    className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                    style={{ minWidth: "200px", maxWidth: "200px" }}
                  >
                    {countExamenFacture(factureLaboratoire, examen)}
                  </TableCell>
                  <TableCell
                    className="border border-l-gray-400 break-word whitespace-normal overflow-hidden"
                    style={{ minWidth: "200px", maxWidth: "200px" }}
                  >
                    {countExamenResultat(resultatLaboratoire, examen)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* table de repartion des client par prescripteur */}

          <Separator className="bg-green-300 my-2" />
          <h2 className="font-bold mx-auto px-auto">
            Repartition des consultations par prescripteur{" "}
          </h2>
          <Table className="border">
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableCell className="border border-l-gray-400 font-bold">
                  Prescripteur
                </TableCell>
                <TableCell className="border border-l-gray-400 font-bold">
                  Nombre de clients
                </TableCell>
                <TableCell className="border border-l-gray-400 font-bold">
                  Pourcentage
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataPrescripteur.map((prescripteur) => (
                <TableRow key={prescripteur.id}>
                  <TableCell className="border border-l-gray-400">
                    {prescripteur.name}
                  </TableCell>
                  <TableCell className="border border-l-gray-400">
                    {getClientCountByPrescripteur(converted, prescripteur.name)}
                  </TableCell>
                  <TableCell className="border border-l-gray-400">
                    {(
                      (getClientCountByPrescripteur(
                        converted,
                        prescripteur.name
                      ) /
                        converted.length) *
                      100
                    ).toFixed(1)}
                    %
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-gray-100">
                <TableCell className="border border-l-gray-400 font-bold">
                  Total général
                </TableCell>
                <TableCell className="border border-l-gray-400">
                  {dataPrescripteur.reduce(
                    (acc, prescripteur) =>
                      acc +
                      getClientCountByPrescripteur(
                        converted,
                        prescripteur.name
                      ),
                    0
                  )}
                </TableCell>
                <TableCell className="border border-l-gray-400">
                  {(
                    (dataPrescripteur.reduce(
                      (acc, prescripteur) =>
                        acc +
                        getClientCountByPrescripteur(
                          converted,
                          prescripteur.name
                        ),
                      0
                    ) /
                      converted.length) *
                    100
                  ).toFixed(1)}
                  %
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
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

// Nouvelle fonction pour compter par prescripteur
export const countClientByPrescripteur = (
  clientData: convertedType[],
  minAge: number,
  maxAge: number,
  propriete: string,
  indicateur: boolean,
  prescripteurId: string
): number => {
  if (!Array.isArray(clientData) || clientData.length === 0) return 0;

  return clientData.reduce((acc, client) => {
    const ageCondition = client.age >= minAge && client.age <= maxAge;
    const proprieteCondition =
      client[propriete as keyof convertedType] === indicateur;
    const prescripteurCondition = client.idPrescripteur === prescripteurId;

    return ageCondition && proprieteCondition && prescripteurCondition
      ? acc + 1
      : acc;
  }, 0);
};

// créer la fonction countExamen
export const countExamenFacture = (
  facture: FactureExamen[],
  examenId: string
): number => {
  if (!Array.isArray(facture) || facture.length === 0) return 0;

  return facture.reduce((acc, client) => {
    const examenCondition = client.libelleExamen === examenId;
    return examenCondition ? acc + 1 : acc;
  }, 0);
};

// créer la fonction countExamen
export const countExamenResultat = (
  resultat: (ResultatExamen & { libelleExamen?: string })[],
  examenId: string
): number => {
  if (!Array.isArray(resultat) || resultat.length === 0) return 0;

  return resultat.reduce((acc, client) => {
    const examenCondition = client.libelleExamen === examenId;
    return examenCondition ? acc + 1 : acc;
  }, 0);
};

// fonction qui prend en paramètre clientData et nomPrescripteur et retourne le nombre de client associé à ce prescripteur
export const getClientCountByPrescripteur = (
  clientData: convertedType[],
  nomPrescripteur: string
): number => {
  if (!Array.isArray(clientData) || clientData.length === 0) return 0;

  return clientData.reduce((acc, client) => {
    const prescripteurCondition = client.nomPrescripteur === nomPrescripteur;
    return prescripteurCondition ? acc + 1 : acc;
  }, 0);
};
