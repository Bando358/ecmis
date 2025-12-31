"use client";
import { ClientData } from "@/components/rapportPfActions";
import { useState } from "react";
import ExcelJS from "exceljs";

interface ListeAllDataProps {
  clients: ClientData[];
}

export default function ListeAllData({ clients }: ListeAllDataProps) {
  const [visibleSections, setVisibleSections] = useState<
    Record<string, boolean>
  >({});

  const toggleSection = (title: string) => {
    setVisibleSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleExportExcel = async () => {
    // Préparer les données avec les mêmes colonnes que la table visible
    // (nous construirons l'objet `excelData` plus bas en utilisant des clés
    // uniques pour éviter les collisions de titres)

    // Créer les en-têtes pour Excel en respectant les sections visibles
    const headers: string[] = [];
    const sectionStyles: Array<{
      section: string;
      startCol: number;
      endCol: number;
      color: string;
    }> = [];

    let currentColumnIndex = 0;

    // Préparer les en-têtes et les styles de section
    tabData.forEach((section) => {
      if (visibleSections[section.title] !== false) {
        const colSpan = section.dataValue.length;
        const startCol = currentColumnIndex;
        const endCol = currentColumnIndex + colSpan - 1;

        // Enregistrer les informations de section pour la fusion
        sectionStyles.push({
          section: section.title,
          startCol,
          endCol,
          color: section.color,
        });

        // Ajouter les en-têtes de colonnes
        section.dataValue.forEach((column) => {
          headers.push(column.colTitle);
        });

        currentColumnIndex += colSpan;
      }
    });

    // Préparer les données pour l'export avec la structure complète
    // Utiliser des clés uniques (col0, col1, ...) pour éviter les collisions
    // lorsque plusieurs colonnes ont le même titre affiché.
    const excelData: Record<string, unknown>[] = [];

    // Construire les tableaux d'en-têtes et de propriétés sources (mêmes
    // ordres que l'affichage) — on conserve les labels pour l'affichage
    // et on génère des clés uniques pour les objets.
    const headerLabels: string[] = [];
    const sourceProps: string[] = [];
    tabData.forEach((section) => {
      if (visibleSections[section.title] !== false) {
        section.dataValue.forEach((column) => {
          headerLabels.push(column.colTitle);
          sourceProps.push(column.propriete as string);
        });
      }
    });

    const headerKeys = headerLabels.map((_, i) => `col${i}`);

    // Première ligne : titres des sections fusionnés (utilise keys uniques)
    const sectionRow: Record<string, unknown> = {};
    sectionStyles.forEach((sectionStyle) => {
      const { section, startCol, endCol } = sectionStyle;
      for (let i = startCol; i <= endCol; i++) {
        const key = headerKeys[i] ?? `col${i}`;
        sectionRow[key] = i === startCol ? section : "";
      }
    });
    excelData.push(sectionRow);

    // Deuxième ligne : en-têtes de colonnes
    const headerRow: Record<string, unknown> = {};
    headerKeys.forEach((key, idx) => {
      headerRow[key] = headerLabels[idx] ?? key;
    });
    excelData.push(headerRow);

    // utilitaire pour récupérer une propriété potentiellement imbriquée
    // Comportement :
    // 1) supporte chemin imbriqué 'a.b.c'
    // 2) accès direct (ex.: 'consultation')
    // 3) fallback case-insensitive exact
    // 4) fallback: key endsWith(prop) (ex. 'vbgConsultation' pour 'consultation')
    // 5) fallback: key includes(prop) (moins strict, dernier recours)
    const getPropValue = (obj: Record<string, unknown>, prop: string) => {
      if (!prop) return undefined;

      // supporte chemin imbriqué 'a.b.c'
      if (prop.includes(".")) {
        return prop.split(".").reduce<unknown>((acc, key) => {
          if (acc && typeof acc === "object") {
            const o = acc as Record<string, unknown>;
            if (key in o) return o[key];
          }
          return undefined;
        }, obj as unknown);
      }

      // accès direct
      if (prop in obj) return obj[prop];

      const lower = prop.toLowerCase();

      // fallback case-insensitive exact
      const foundExact = Object.keys(obj).find(
        (k) => k.toLowerCase() === lower
      );
      if (foundExact) return obj[foundExact];

      // fallback: key endsWith(prop) (utile pour préfixes comme 'vbgConsultation')
      const foundEnds = Object.keys(obj).find((k) =>
        k.toLowerCase().endsWith(lower)
      );
      if (foundEnds) return obj[foundEnds];

      // fallback: key includes(prop) (moins strict)
      const foundIncludes = Object.keys(obj).find((k) =>
        k.toLowerCase().includes(lower)
      );
      if (foundIncludes) return obj[foundIncludes];

      return undefined;
    };

    // Lignes de données (valeurs brutes provenant de `clients`)
    // NOTE: ajout de logs de debug pour la propriété `consultation` afin
    // d'identifier pourquoi la colonne est vide (limité aux 5 premières lignes).
    clients.forEach((client, rowIndex) => {
      const obj: Record<string, unknown> = {};
      headerKeys.forEach((key, idx) => {
        const prop = sourceProps[idx];
        const value = getPropValue(client as Record<string, unknown>, prop);

        // Normaliser la valeur pour l'export :
        // - tableaux -> chaîne 'a, b, c' (pas de crochets [])
        // - chaîne vide / null / undefined -> null (cellule vide dans Excel)
        // - dates/nombres/booleans laissés tels quels
        const normalize = (v: unknown) => {
          if (v === null || v === undefined) return null;
          if (Array.isArray(v)) {
            return v.length === 0 ? null : v.map((x) => String(x)).join(", ");
          }
          if (typeof v === "string") {
            // si c'est une chaîne vide, retourner null pour éviter "" dans Excel
            return v.trim() === "" ? null : v;
          }
          return v;
        };

        // Debug: si on cherche la colonne 'consultation', afficher quelques infos
        // pour les 5 premières lignes afin d'inspecter la source des valeurs.
        if (prop === "consultation" && rowIndex < 5) {
          const direct = (client as Record<string, unknown>)[prop as string];
          const foundKey = Object.keys(client).find(
            (k) => k.toLowerCase() === String(prop).toLowerCase()
          );
          // Afficher uniquement en debug pour ne pas polluer la console en prod
          // (console.debug est ignoré si niveau de log n'est pas activé)
          console.debug("[export-debug] consultation lookup", {
            rowIndex,
            prop,
            direct,
            foundKey,
            resolved: value,
            // limiter l'affichage de l'objet client pour lisibilité
            clientKeys: Object.keys(client).slice(0, 30),
          });
        }

        obj[key] = normalize(value);
      });
      excelData.push(obj);
    });

    // Configuration des merges et styles personnalisés
    const merges = sectionStyles.map((sectionStyle) => ({
      start: { row: 0, column: sectionStyle.startCol },
      end: { row: 0, column: sectionStyle.endCol },
    }));

    // utilitaire pour convertir un index 1-based en lettre(s) Excel (1 -> A, 27 -> AA)
    const indexToColumnLetter = (index: number) => {
      let col = index;
      let str = "";
      while (col > 0) {
        const rem = (col - 1) % 26;
        str = String.fromCharCode(65 + rem) + str;
        col = Math.floor((col - 1) / 26);
      }
      return str;
    };

    const customStyles = [
      // Style pour la ligne des sections (première ligne)
      {
        cells: `A1:${indexToColumnLetter(headers.length)}1`,
        style: {
          fill: {
            type: "pattern" as const,
            pattern: "solid" as const,
            fgColor: { argb: "FFFFFFFF" }, // Fond blanc par défaut, sera remplacé par section
          },
          font: { bold: true, color: { argb: "FFFFFFFF" }, size: 12 },
          alignment: {
            horizontal: "center" as const,
            vertical: "middle" as const,
          },
        },
      },
      // Style pour la ligne des en-têtes de colonnes (deuxième ligne)
      {
        cells: `A2:${indexToColumnLetter(headers.length)}2`,
        style: {
          fill: {
            type: "pattern" as const,
            pattern: "solid" as const,
            fgColor: { argb: "FFE5E7EB" }, // Gris clair pour les en-têtes de colonnes
          },
          font: { bold: true, color: { argb: "FF374151" }, size: 10 },
          alignment: {
            horizontal: "center" as const,
            vertical: "middle" as const,
          },
          border: {
            top: { style: "thin" as const, color: { argb: "FF000000" } },
            left: { style: "thin" as const, color: { argb: "FF000000" } },
            bottom: { style: "thin" as const, color: { argb: "FF000000" } },
            right: { style: "thin" as const, color: { argb: "FF000000" } },
          },
        },
      },
    ];

    // Appliquer les couleurs spécifiques à chaque section
    sectionStyles.forEach((sectionStyle) => {
      const startColChar = indexToColumnLetter(sectionStyle.startCol + 1);
      const endColChar = indexToColumnLetter(sectionStyle.endCol + 1);

      customStyles.push({
        cells: `${startColChar}1:${endColChar}1`,
        style: {
          fill: {
            type: "pattern" as const,
            pattern: "solid" as const,
            fgColor: { argb: `FF${sectionStyle.color.replace("#", "")}` },
          },
          font: { bold: true, color: { argb: "FFFFFFFF" }, size: 12 },
          alignment: {
            horizontal: "center" as const,
            vertical: "middle" as const,
          },
          border: {
            top: { style: "thin" as const, color: { argb: "FF000000" } },
            left: { style: "thin" as const, color: { argb: "FF000000" } },
            bottom: { style: "thin" as const, color: { argb: "FF000000" } },
            right: { style: "thin" as const, color: { argb: "FF000000" } },
          },
        },
      });
    });

    await exportToExcelAllData(excelData, "liste_complete_donnees", {
      sheetName: "Données Complètes",
      headerStyle: {
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE5E7EB" },
        },
        font: { bold: true, color: { argb: "FF374151" }, size: 10 },
        alignment: { horizontal: "center", vertical: "middle" },
      },
      columnWidths: headers.map(() => 15),
      autoFilter: true,
      freezeHeaders: true,
      // We already build a section row (row 1) and a header row (row 2),
      // so prevent the exporter from auto-inserting an extra header row.
      skipAutoHeader: true,
      merges,
      customStyles,
    });
  };

  const tabData = [
    {
      title: "Informations personnelles",
      colspan: "dataValue.length",
      color: "#22c55e",
      dataValue: [
        { colTitle: "Code", propriete: "code" },
        { colTitle: "Nom", propriete: "nom" },
        { colTitle: "Prénom", propriete: "prenom" },
        { colTitle: "Âge", propriete: "age" },
        { colTitle: "Sexe", propriete: "sexe" },
        { colTitle: "Ethnie", propriete: "ethnie" },
        { colTitle: "Source d'information", propriete: "sourceInformation" },
        { colTitle: "Sérologie", propriete: "serologie" },
        { colTitle: "Quartier", propriete: "quartier" },
        { colTitle: "Clinique", propriete: "clinique" },
      ],
    },
    {
      title: "Visite",
      colspan: "dataValue.length",
      color: "#3b82f6",
      dataValue: [
        { colTitle: "Date visite", propriete: "dateVisite" },
        { colTitle: "Motif visite", propriete: "motifVisite" },
        { colTitle: "Activité", propriete: "activite" },
        { colTitle: "Lieu", propriete: "lieuActivite" },
      ],
    },
    {
      title: "Contraception",
      colspan: "dataValue.length",
      color: "#f59e0b",
      dataValue: [
        // nouvel ajout est consultation
        { colTitle: "Consultation", propriete: "consultationPf" },
        { colTitle: "Méthode Prise", propriete: "methodePrise" },
        { colTitle: "Type Contraception", propriete: "typeContraception" },
        { colTitle: "Motif visite PF", propriete: "motifVisitePf" },
        { colTitle: "Statut", propriete: "statut" },
        { colTitle: "Counseling", propriete: "counsellingPf" },
        { colTitle: "Courte Durée", propriete: "courtDuree" },
        { colTitle: "Implanon", propriete: "implanon" },
        { colTitle: "Retrait Implanon", propriete: "retraitImplanon" },
        { colTitle: "Jadelle", propriete: "jadelle" },
        { colTitle: "Retrait Jadelle", propriete: "retraitJadelle" },
        { colTitle: "stérilet", propriete: "sterilet" },
        { colTitle: "Retrait stérilet", propriete: "retraitSterilet" },
        { colTitle: "Raison Retrait", propriete: "raisonRetrait" },
        {
          colTitle: "Raison Effet Secondaire",
          propriete: "raisonEffetSecondaire",
        },
        {
          colTitle: "RDV PF",
          propriete: "rdvPf",
        },
      ],
    },
    {
      title: "IST",
      colspan: "dataValue.length",
      color: "#ef4444",
      dataValue: [
        {
          colTitle: "Counseling Avant Dépistage",
          propriete: "istCounsellingAvantDepitage",
        },
        {
          colTitle: "Counseling Après Dépistage",
          propriete: "istCounsellingApresDepitage",
        },
        {
          colTitle: "Counseling Réduction Risque",
          propriete: "istCounselingReductionRisque",
        },
        {
          colTitle: "Examen Physique",
          propriete: "istExamenPhysique",
        },
        {
          colTitle: "Type Client IST",
          propriete: "istTypeClient",
        },
        {
          colTitle: "Type PEC IST",
          propriete: "istTypePec",
        },
        {
          colTitle: "PEC Étiologique",
          propriete: "istPecEtiologique",
        },
      ],
    },
    {
      title: "Infertilité",
      colspan: "dataValue.length",
      color: "#8b5cf6",
      dataValue: [
        { colTitle: "Consultation", propriete: "infertConsultation" },
        { colTitle: "Counseling", propriete: "infertCounselling" },
        { colTitle: "Examen Physique", propriete: "infertExamenPhysique" },
        { colTitle: "Traitement", propriete: "infertTraitement" },
      ],
    },
    {
      title: "VBG",
      colspan: "dataValue.length",
      color: "#10b981",
      dataValue: [
        { colTitle: "Consultation", propriete: "vbgConsultation" },
        {
          colTitle: "Counseling relation",
          propriete: "vbgCounsellingRelation",
        },
        {
          colTitle: "Type Violence",
          propriete: "vbgType",
        },
        {
          colTitle: "Durée",
          propriete: "vbgDuree",
        },
        {
          colTitle: "Counseling Violence Sexuel",
          propriete: "vbgCounsellingViolenceSexuel",
        },
        {
          colTitle: "Counseling Violence Physique",
          propriete: "vbgCounsellingViolencePhysique",
        },
        {
          colTitle: "Counseling Sexualité",
          propriete: "vbgCounsellingSexuelite",
        },
        {
          colTitle: "Prévention Violence Sexuelle",
          propriete: "vbgPreventionViolenceSexuelle",
        },
        {
          colTitle: "Prévention Violence Physique",
          propriete: "vbgPreventionViolencePhysique",
        },
      ],
    },
    {
      title: "Dépistage VIH",
      colspan: "dataValue.length",
      color: "#06b6d4",
      dataValue: [
        { colTitle: "Consultation", propriete: "depistageVihConsultation" },
        { colTitle: "Counseling", propriete: "depistageVihCounsellingPreTest" },
        {
          colTitle: "Investigation Test Rapide",
          propriete: "depistageVihInvestigationTestRapide",
        },
        { colTitle: "Résultat", propriete: "depistageVihResultat" },
        {
          colTitle: "Counseling Après Dépistage",
          propriete: "depistageVihCounsellingPostTest",
        },
        {
          colTitle: "Counseling Réduction Risque",
          propriete: "depistageVihCounsellingReductionRisque",
        },
        {
          colTitle: "Mis Sous ARV",
          propriete: "depistageVihResultatPositifMisSousArv",
        },
      ],
    },
    {
      title: "PEC VIH",
      colspan: "dataValue.length",
      color: "#84cc16",
      dataValue: [
        { colTitle: "Consultation", propriete: "pecVihCounselling" },
        { colTitle: "Counseling", propriete: "pecVihCounselling" },
        { colTitle: "Type Client", propriete: "pecVihTypeclient" },
        { colTitle: "Molécule", propriete: "pecVihMoleculeArv" },
        { colTitle: "AES sous ARV", propriete: "pecVihAesArv" },
        { colTitle: "Cotrimoxazole", propriete: "pecVihCotrimo" },
        { colTitle: "SPDP", propriete: "pecVihSpdp" },
        { colTitle: "Paludisme", propriete: "pecVihIoPaludisme" },
        { colTitle: "Tuberculose", propriete: "pecVihIoTuberculose" },
        { colTitle: "Autres IO", propriete: "pecVihIoAutre" },
        {
          colTitle: "Soutien Psychosocial",
          propriete: "pecVihSoutienPsychoSocial",
        },
      ],
    },
    {
      title: "SAA",
      colspan: "dataValue.length",
      color: "#f97316",
      dataValue: [
        { colTitle: "Consultation", propriete: "saaConsultation" },
        { colTitle: "Counseling pré Abortum", propriete: "saaCounsellingPre" },
        { colTitle: "Motif Demande", propriete: "saaMotifDemande" },
        {
          colTitle: "Counseling Post Abortum",
          propriete: "saaCounsellingPost",
        },
        {
          colTitle: "Type PEC",
          propriete: "saaTypePec",
        },
        {
          colTitle: "Traitement Complication",
          propriete: "saaTraitementComplication",
        },
      ],
    },
    {
      title: "Gynécologie",
      colspan: "dataValue.length",
      color: "#ec4899",
      dataValue: [
        { colTitle: "Consultation", propriete: "consultationGyneco" },
        { colTitle: "Motif Consultation", propriete: "motifVisiteGyneco" },
        {
          colTitle: "Counseling Avant Dépistage",
          propriete: "counsellingAvantDepistage",
        },
        {
          colTitle: "Counseling Après Dépistage",
          propriete: "counsellingApresDepistage",
        },
        {
          colTitle: "Résultat IVA",
          propriete: "resultatIva",
        },
        {
          colTitle: "Eligible Traitement IVA",
          propriete: "eligibleTraitementIva",
        },
        {
          colTitle: "Type Traitement",
          propriete: "typeTraitementIva",
        },
        {
          colTitle: "Counseling Cancer Sein",
          propriete: "counsellingCancerSein",
        },
        {
          colTitle: "resultatCancerSein",
          propriete: "resultatCancerSein",
        },
        {
          colTitle: "Counseling Autre Problème",
          propriete: "counsellingAutreProbleme",
        },
        {
          colTitle: "Examen Physique",
          propriete: "examenPhysique",
        },
        {
          colTitle: "Examen Palpation Sein",
          propriete: "examenPalpationSein",
        },
        {
          colTitle: "Touche Vaginale",
          propriete: "toucheeVaginale",
        },
        {
          colTitle: "Règle Irrégulière",
          propriete: "regleIrreguliere",
        },
        {
          colTitle: "Régularisation Menstruelle",
          propriete: "regularisationMenstruelle",
        },
        {
          colTitle: "Régularisation Menstruelle",
          propriete: "autreProblemeGyneco",
        },
      ],
    },
    {
      title: "Obstétrique",
      colspan: "dataValue.length",
      color: "#14b8a6",
      dataValue: [
        { colTitle: "HTA", propriete: "grossesseHta" },
        { colTitle: "Diabète", propriete: "grossesseDiabete" },
        { colTitle: "Gestité", propriete: "grossesseGestite" },
        { colTitle: "Parité", propriete: "grossesseParite" },
        { colTitle: "Âge d'aménorrhée", propriete: "grossesseAge" },
        { colTitle: "Date de Dernière Règle", propriete: "grossesseDdr" },
        { colTitle: "Terme Prévu", propriete: "termePrevu" },
        { colTitle: "Interruption", propriete: "grossesseInterruption" },
        {
          colTitle: "Motif Interruption",
          propriete: "grossesseMotifInterruption",
        },
        { colTitle: "Consultation", propriete: "obstConsultation" },
        { colTitle: "Counseling", propriete: "obstCounselling" },
        { colTitle: "État Nutritionnel", propriete: "obstEtatNutritionnel" },
        { colTitle: "État Grossesse", propriete: "obstEtatGrossesse" },
        { colTitle: "Num CPN", propriete: "obstTypeVisite" },
        { colTitle: "VAT", propriete: "obstVat" },
        { colTitle: "SP", propriete: "obstSp" },
        { colTitle: "FER", propriete: "obstFer" },
        { colTitle: "Folate", propriete: "obstFolate" },
        { colTitle: "Déparasitant", propriete: "obstDeparasitant" },
        { colTitle: "MILDA", propriete: "obstMilda" },
        { colTitle: "Investigations", propriete: "obstInvestigations" },
        { colTitle: "PFPPI", propriete: "obstPfppi" },
        { colTitle: "Albumine Sucre", propriete: "obstAlbuminieSucre" },
        { colTitle: "Anémie", propriete: "obstAnemie" },
        { colTitle: "Syphilis", propriete: "obstSyphilis" },
        { colTitle: "AgHBs", propriete: "obstAghbs" },
        { colTitle: "Rendez-vous", propriete: "obstRdv" },
        { colTitle: "test Grossesse", propriete: "testResultat" },
      ],
    },
    {
      title: "CPON",
      colspan: "dataValue.length",
      color: "#0ea5e9",
      dataValue: [
        { colTitle: "Consultation", propriete: "cponConsultation" },
        { colTitle: "Counseling", propriete: "cponCounselling" },
        { colTitle: "Examen Physique", propriete: "cponInvestigationPhysique" },
        { colTitle: "Durée", propriete: "cponDuree" },
      ],
    },
    {
      title: "Médecine Générale",
      colspan: "dataValue.length",
      color: "#9333ea",
      dataValue: [
        { colTitle: "Consultation", propriete: "mdgConsultation" },
        { colTitle: "Counseling", propriete: "mdgCounselling" },
        { colTitle: "Femme Enceinte", propriete: "mdgEtatFemme" },
        { colTitle: "Motif Consultation", propriete: "mdgMotifConsultation" },
        { colTitle: "Type de Visite", propriete: "mdgTypeVisite" },
        { colTitle: "Examen Physique", propriete: "mdgExamenPhysique" },
        { colTitle: "Suspicion Paludisme", propriete: "mdgSuspicionPalu" },
        { colTitle: "Diagnostic", propriete: "mdgDiagnostic" },
        { colTitle: "Autre Diagnostic", propriete: "mdgAutreDiagnostic" },
        { colTitle: "Soins", propriete: "mdgSoins" },
        { colTitle: "PEC Affection", propriete: "mdgPecAffection" },
        { colTitle: "Type Affection", propriete: "mdgTypeAffection" },
        { colTitle: "Traitement", propriete: "mdgTraitement" },
        { colTitle: "test rapide paludisme", propriete: "mdgTestRapidePalu" },
        { colTitle: "mise en observation", propriete: "mdgMiseEnObservation" },
        { colTitle: "Durée Observation", propriete: "mdgDureeObservation" },
      ],
    },
    {
      title: "ECHOGRAPHIE",
      colspan: "dataValue.length",
      color: "#eab308",
      dataValue: [{ colTitle: "Échographie", propriete: "echographie" }],
    },
    {
      title: "Examen Laboratoire",
      colspan: "dataValue.length",
      color: "#fb7185",
      dataValue: [
        { colTitle: "IST", propriete: "laboIst" },
        { colTitle: "Gynécologie", propriete: "laboGyneco" },
        { colTitle: "Obstétrique", propriete: "laboObstetrique" },
        { colTitle: "Médecine", propriete: "laboMedecine" },
      ],
    },
    {
      title: "Facture et prescripteur",
      colspan: "dataValue.length",
      color: "#0891b2",
      dataValue: [
        { colTitle: "Couverture", propriete: "couverture" },
        {
          colTitle: "Montant Total Paiement",
          propriete: "montantTotalPaiement",
        },
        { colTitle: "Nom Prescripteur", propriete: "nomPrescripteur" },
      ],
    },
  ];

  const formatValue = (value: unknown): string => {
    if (typeof value === "boolean") {
      return value ? "Oui" : "Non";
    }
    if (Array.isArray(value)) {
      return (value as unknown[]).map((v) => String(v)).join(", ");
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    if (value === null || value === undefined) {
      return "";
    }
    return String(value);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col gap-3 items-center mb-6">
        <h2 className="text-xl font-bold">Liste de toutes les données</h2>
        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-900"
        >
          Télécharger toutes les données
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-300 rounded-lg hidden">
        <table className="min-w-full border-collapse">
          <thead>
            {/* En-têtes de section */}
            <tr>
              {tabData.map((section, sectionIndex) => (
                <th
                  key={sectionIndex}
                  colSpan={section.dataValue.length}
                  className="border border-gray-300 px-4 py-3 text-white font-bold text-center cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: section.color }}
                  onClick={() => toggleSection(section.title)}
                >
                  <div className="flex items-center justify-between">
                    <span>{section.title}</span>
                    <span className="text-sm">
                      {visibleSections[section.title] ? "▲" : "▼"}
                    </span>
                  </div>
                </th>
              ))}
            </tr>

            {/* En-têtes de colonnes */}
            <tr className="bg-gray-100">
              {tabData.map(
                (section) =>
                  visibleSections[section.title] !== false &&
                  section.dataValue.map((column, colIndex) => (
                    <th
                      key={`${section.title}-${colIndex}`}
                      className="border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 text-center"
                    >
                      {column.colTitle}
                    </th>
                  ))
              )}
            </tr>
          </thead>

          <tbody>
            {clients.map((client, rowIndex) => (
              <tr
                key={rowIndex}
                className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                {tabData.map(
                  (section) =>
                    visibleSections[section.title] !== false &&
                    section.dataValue.map((column, colIndex) => {
                      const value =
                        client[column.propriete as keyof ClientData];
                      return (
                        <td
                          key={`${section.title}-${colIndex}`}
                          className="border border-gray-300 px-4 py-2 text-sm"
                        >
                          {formatValue(value)}
                        </td>
                      );
                    })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {clients.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Aucune donnée à afficher
        </div>
      )}
    </div>
  );
}

const exportToExcelAllData = async <T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  options?: {
    sheetName?: string;
    headerStyle?: Partial<ExcelJS.Style>;
    dataStyle?: Partial<ExcelJS.Style>;
    columnWidths?: number[];
    autoFilter?: boolean;
    freezeHeaders?: boolean;
    // If true, do not auto-insert a header row (useful when the data already
    // contains a custom header row like a section title row followed by a
    // column header row). When skipAutoHeader is true, the export will not
    // call worksheet.addRow(headers) automatically.
    skipAutoHeader?: boolean;
    // Optional merges for Excel (start/end indices are 0-based in our code),
    // but ExcelJS expects 1-based row/column indices when applying merges.
    merges?: Array<{
      start: { row: number; column: number };
      end: { row: number; column: number };
    }>;
    // Custom styles applied to cell ranges. `style` should be a partial
    // ExcelJS.Style object describing formatting for the given cells range.
    customStyles?: Array<{ cells: string; style: Partial<ExcelJS.Style> }>;
  }
) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Système de Rapport";
    workbook.lastModifiedBy = "Système de Rapport";
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet(options?.sheetName || "Sheet1");

    // Styles par défaut
    const defaultHeaderStyle: Partial<ExcelJS.Style> = {
      font: {
        name: "Arial",
        size: 12,
        bold: true,
        color: { argb: "FFFFFFFF" },
      },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2E75B6" },
      },
      alignment: {
        vertical: "middle",
        horizontal: "center",
      },
      border: {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      },
    };

    const defaultDataStyle: Partial<ExcelJS.Style> = {
      font: {
        name: "Arial",
        size: 10,
        color: { argb: "FF000000" },
      },
      alignment: {
        vertical: "middle",
        horizontal: "left",
      },
      border: {
        top: { style: "thin", color: { argb: "FFD0D0D0" } },
        left: { style: "thin", color: { argb: "FFD0D0D0" } },
        bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
        right: { style: "thin", color: { argb: "FFD0D0D0" } },
      },
    };

    const headerStyle = { ...defaultHeaderStyle, ...options?.headerStyle };
    const dataStyle = { ...defaultDataStyle, ...options?.dataStyle };

    // Obtenir les en-têtes (à partir des clés du premier objet)
    const headers = data.length > 0 ? Object.keys(data[0]) : [];

    if (headers.length === 0) {
      console.warn("Aucune donnée à exporter");
      return;
    }

    // Ajouter les en-têtes automatiquement à moins que l'appelant ait
    // demandé de gérer manuellement l'entête (skipAutoHeader). When
    // skipAutoHeader is true we assume the caller will provide explicit
    // header/data rows (for example: section row then header row then data).
    const skipAutoHeader = options?.skipAutoHeader === true;
    if (!skipAutoHeader) {
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell, colNumber) => {
        cell.style = headerStyle;
        cell.value = headers[colNumber - 1];
      });
    }

    // Appliquer la largeur des colonnes
    headers.forEach((header, index) => {
      const width =
        options?.columnWidths?.[index] || Math.max(header.length * 1.3, 12); // Largeur basée sur la longueur du texte
      worksheet.getColumn(index + 1).width = width;
    });

    // Nombre de lignes d'en-têtes présentes au début des `data`.
    // Si skipAutoHeader=true, on s'attend à ce que l'appelant ait fourni
    // une ligne de section puis une ligne d'en-têtes (2 lignes). Sinon
    // on considère qu'il y a 1 ligne d'en-tête (la ligne ajoutée automatiquement
    // par cet exporteur lorsqu'il n'y a pas skipAutoHeader).
    const headerRowsCount = skipAutoHeader ? 2 : 1;

    // Petite utilitaire pour convertir une lettre de colonne Excel en indice (A->1, B->2, ...)
    const colLetterToNumber = (letters: string) => {
      let number = 0;
      for (let i = 0; i < letters.length; i++) {
        number = number * 26 + (letters.charCodeAt(i) - 64);
      }
      return number;
    };

    // Ajouter les données avec mise en forme conditionnelle
    data.forEach((row, rowIndex) => {
      const dataRow = worksheet.addRow(Object.values(row));

      dataRow.eachCell((cell, colNumber) => {
        const value = row[headers[colNumber - 1]];

        // Style de base
        cell.style = { ...dataStyle };

        // Mise en forme conditionnelle basée sur le type de données
        if (typeof value === "number") {
          cell.style.alignment = { horizontal: "center" };
          cell.style.numFmt = "#,##0";

          // Coloration pour les valeurs numériques importantes
          if (Number(value) > 1000) {
            cell.style.font = {
              ...cell.style.font,
              bold: true,
              color: { argb: "FF006600" },
            };
          }
        } else if (typeof value === "boolean") {
          cell.value = value ? "Oui" : "Non";
          cell.style.alignment = { horizontal: "center" };
          cell.style.font = {
            ...cell.style.font,
            color: { argb: value ? "FF006600" : "FFCC0000" },
          };
        } else if (value instanceof Date) {
          cell.value = value;
          cell.style.numFmt = "dd/mm/yyyy";
          cell.style.alignment = { horizontal: "center" };
        } else if (
          typeof value === "string" &&
          value.match(/^\d{2}\/\d{2}\/\d{4}$/)
        ) {
          // Si c'est une chaîne qui ressemble à une date
          cell.style.alignment = { horizontal: "center" };
        }

        // Alternance des couleurs de ligne
        if (rowIndex % 2 === 0) {
          cell.style.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF2F2F2" },
          };
        } else {
          cell.style.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFFFFF" },
          };
        }

        // Mise en forme spéciale pour les valeurs vides — n'appliquer que
        // pour les lignes de données (ne pas remplacer les cellules vides
        // des lignes d'en-tête/section, car celles-ci sont utilisées pour
        // les merges et doivent rester vides si besoin).
        if (rowIndex >= headerRowsCount) {
          if (value === null || value === undefined || value === "") {
            cell.value = "N/A";
            cell.style.font = {
              ...cell.style.font,
              italic: true,
              color: { argb: "FF999999" },
            };
          }
        }
      });
    });

    // Appliquer les merges fournis (les merges sont fournis en 0-based dans
    // le code appelant ; ExcelJS utilise des indices 1-based)
    if (options?.merges && Array.isArray(options.merges)) {
      options.merges.forEach((m) => {
        const startRow = m.start.row + 1;
        const startCol = m.start.column + 1;
        const endRow = m.end.row + 1;
        const endCol = m.end.column + 1;

        try {
          worksheet.mergeCells(startRow, startCol, endRow, endCol);

          // Appliquer le style de header à la cellule supérieure gauche de la zone fusionnée
          const topLeft = worksheet.getCell(startRow, startCol);
          topLeft.style = {
            ...(topLeft.style as Partial<ExcelJS.Style>),
            ...headerStyle,
          } as Partial<ExcelJS.Style>;
          topLeft.alignment = {
            vertical: "middle",
            horizontal: "center",
          } as Partial<ExcelJS.Alignment>;
        } catch (err) {
          // Ne pas planter l'export si un merge est invalide
          console.warn("Impossible d'appliquer un merge Excel", m, err);
        }
      });
    }

    // Appliquer les styles personnalisés (format: { cells: "A1:D1", style })
    if (options?.customStyles && Array.isArray(options.customStyles)) {
      options.customStyles.forEach(({ cells, style }) => {
        // Parsing simple de la plage "A1:D1"
        const parts = cells.split(":");
        if (parts.length === 2) {
          const start = parts[0].match(/^([A-Z]+)(\d+)$/i);
          const end = parts[1].match(/^([A-Z]+)(\d+)$/i);
          if (start && end) {
            const startCol = colLetterToNumber(start[1].toUpperCase());
            const startRow = parseInt(start[2], 10);
            const endCol = colLetterToNumber(end[1].toUpperCase());
            const endRow = parseInt(end[2], 10);

            for (let r = startRow; r <= endRow; r++) {
              for (let c = startCol; c <= endCol; c++) {
                const cell = worksheet.getCell(r, c);
                cell.style = {
                  ...(cell.style as Partial<ExcelJS.Style>),
                  ...(style as Partial<ExcelJS.Style>),
                } as Partial<ExcelJS.Style>;
              }
            }
          }
        }
      });
    }
    // Appliquer le filtre automatique
    if (options?.autoFilter !== false) {
      const headerRowIndex = options?.skipAutoHeader ? 2 : 1;
      worksheet.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: data.length + (headerRowIndex - 1), column: headers.length },
      };
    }

    // Figer les en-têtes
    if (options?.freezeHeaders !== false) {
      const headerRowIndex = options?.skipAutoHeader ? 2 : 1;
      worksheet.views = [
        {
          state: "frozen",
          xSplit: 0,
          ySplit: headerRowIndex,
          activeCell: headerRowIndex === 1 ? "A2" : "A3",
          showGridLines: true,
        },
      ];
    }

    // Générer le fichier Excel
    const buffer = await workbook.xlsx.writeBuffer();

    // Télécharger le fichier
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${filename}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Libérer l'URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error("Erreur lors de l'export Excel:", error);
    throw new Error("Échec de l'export Excel");
  }
};
