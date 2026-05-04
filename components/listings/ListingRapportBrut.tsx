"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClientData } from "@/components/rapportPfActions";
import {
  EchoServiceItem,
} from "@/lib/actions/rapportEchoActions";
import { exportReportToExcel } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Search,
  FileSpreadsheet,
  ListChecks,
  Filter,
  X,
  ChevronDown,
} from "lucide-react";
import { FactureExamen, ResultatExamen, Visite } from "@prisma/client";

// ---- Types entrants ----------------------------------------------------------

type LaboTypeExamen = "MEDECIN" | "GYNECOLOGIE" | "OBSTETRIQUE" | "VIH" | "IST";

type ClientLaboShape = {
  nomClient: string;
  prenomClient: string;
  sexeClient: string;
  dateNaissanceClient: Date | null;
  ageClient: number | null;
  typeExamen: LaboTypeExamen;
  visites: Visite[];
  resultatsExamens: { typeExamen: string; libelleExamen: string }[];
};

interface Props {
  rapportType: string;
  clientData: ClientData[];
  clientLaboData: Record<string, ClientLaboShape[]>;
  clientEchoData: EchoServiceItem[];
  factureLaboratoire: FactureExamen[];
  resultatLaboratoire: ResultatExamen[];
  dateDebut: string;
  dateFin: string;
  clinic: string;
}

// ---- Helpers -----------------------------------------------------------------

const yn = (v: boolean | null | undefined) => (v ? "Oui" : "Non");
const fmtDate = (d: Date | string | null | undefined) => {
  if (!d) return "";
  // Si la valeur est déjà une chaîne formatée (ex: "31/12/2025" arrivant
  // d'un toLocaleDateString côté serveur), on la renvoie telle quelle plutôt
  // que de la repasser dans new Date(...) qui produirait "Invalid Date".
  if (typeof d === "string") {
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(d.trim())) return d.trim();
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return d;
    return parsed.toLocaleDateString("fr-FR");
  }
  try {
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString("fr-FR");
  } catch {
    return "";
  }
};

type Row = Record<string, string | number>;

// ---- Configuration par type de rapport ---------------------------------------
//
// Pour chaque type on définit :
//   filter  : prédicat sur ClientData pour ne garder que les visites concernées
//   columns : liste de colonnes (en-tête + accesseur)
// Les rapports "spéciaux" (laboratoire, echographie, validation) sont gérés
// séparément car ils utilisent une autre source de données.
//
// Colonnes communes à la plupart des rapports basés sur ClientData.
type ColumnDef = { label: string; get: (c: ClientData) => string | number };

const baseColumns: ColumnDef[] = [
  { label: "Date", get: (c) => fmtDate(c.dateVisite) },
  { label: "Code", get: (c) => c.code },
  { label: "Nom", get: (c) => c.nom },
  { label: "Prénom", get: (c) => c.prenom },
  { label: "Âge", get: (c) => c.age },
  { label: "Sexe", get: (c) => c.sexe },
  { label: "Clinique", get: (c) => c.clinique },
  { label: "Activité", get: (c) => c.activite || "" },
  { label: "Lieu", get: (c) => c.lieuActivite || "" },
  { label: "Prescripteur", get: (c) => c.nomPrescripteur || "" },
];

type ClientDataConfig = {
  filter: (c: ClientData) => boolean;
  columns: ColumnDef[];
};

const CONFIGS: Record<string, ClientDataConfig> = {
  consultation: {
    filter: () => true,
    columns: [...baseColumns, { label: "Motif", get: (c) => c.motifVisite }],
  },
  nutrition: {
    filter: (c) =>
      !!c.obstEtatNutritionnel && c.obstEtatNutritionnel.trim().length > 0,
    columns: [
      ...baseColumns,
      { label: "Type visite", get: (c) => c.obstTypeVisite || "" },
      { label: "État nutritionnel", get: (c) => c.obstEtatNutritionnel || "" },
    ],
  },
  planning: {
    filter: (c) => c.consultationPf === true || c.methodePrise === true,
    columns: [
      ...baseColumns,
      { label: "Statut", get: (c) => c.statut || "" },
      { label: "Type contraception", get: (c) => c.typeContraception || "" },
      { label: "Méthode prise", get: (c) => yn(c.methodePrise) },
      { label: "Counselling PF", get: (c) => yn(c.counsellingPf) },
      { label: "Court durée", get: (c) => c.courtDuree || "" },
      { label: "Implanon", get: (c) => c.implanon || "" },
      { label: "Jadelle", get: (c) => c.jadelle || "" },
      { label: "Stérilet", get: (c) => c.sterilet || "" },
      { label: "Retrait Implanon", get: (c) => yn(c.retraitImplanon) },
      { label: "Retrait Jadelle", get: (c) => yn(c.retraitJadelle) },
      { label: "Retrait Stérilet", get: (c) => yn(c.retraitSterilet) },
      { label: "RDV PF", get: (c) => fmtDate(c.rdvPf) },
    ],
  },
  gynecologique: {
    filter: (c) => c.consultationGyneco === true,
    columns: [
      ...baseColumns,
      { label: "Motif Gyneco", get: (c) => c.motifVisiteGyneco || "" },
      {
        label: "Counselling avant dépistage",
        get: (c) => yn(c.counsellingAvantDepistage),
      },
      { label: "Résultat IVA", get: (c) => c.resultatIva || "" },
      {
        label: "Eligible traitement IVA",
        get: (c) => yn(c.eligibleTraitementIva),
      },
      {
        label: "Type traitement IVA",
        get: (c) => c.typeTraitementIva || "",
      },
      {
        label: "Counselling cancer sein",
        get: (c) => yn(c.counsellingCancerSein),
      },
      { label: "Résultat cancer sein", get: (c) => c.resultatCancerSein || "" },
      {
        label: "Examen palpation sein",
        get: (c) => yn(c.examenPalpationSein),
      },
      { label: "Touchée vaginale", get: (c) => yn(c.toucheeVaginale) },
    ],
  },
  obstetrique: {
    filter: (c) => c.obstConsultation === true || !!c.obstTypeVisite,
    columns: [
      ...baseColumns,
      { label: "Type CPN", get: (c) => c.obstTypeVisite || "" },
      { label: "Âge grossesse (SA)", get: (c) => c.grossesseAge ?? 0 },
      { label: "Gestité", get: (c) => c.grossesseGestite ?? 0 },
      { label: "Parité", get: (c) => c.grossesseParite ?? 0 },
      { label: "DDR", get: (c) => fmtDate(c.grossesseDdr) },
      { label: "Terme prévu", get: (c) => fmtDate(c.termePrevu) },
      { label: "État grossesse", get: (c) => c.obstEtatGrossesse || "" },
      { label: "État nutritionnel", get: (c) => c.obstEtatNutritionnel || "" },
      { label: "VAT", get: (c) => c.obstVat || "" },
      { label: "SP", get: (c) => c.obstSp || "" },
      { label: "Fer", get: (c) => yn(c.obstFer) },
      { label: "Folate", get: (c) => yn(c.obstFolate) },
      { label: "Déparasitant", get: (c) => yn(c.obstDeparasitant) },
      { label: "MILDA", get: (c) => yn(c.obstMilda) },
      { label: "Anémie", get: (c) => c.obstAnemie || "" },
      { label: "Syphilis", get: (c) => c.obstSyphilis || "" },
      { label: "AgHBs", get: (c) => c.obstAghbs || "" },
      { label: "PFPPI", get: (c) => yn(c.obstPfppi) },
    ],
  },
  ist: {
    filter: (c) => !!c.istType || !!c.istTypePec,
    columns: [
      ...baseColumns,
      { label: "Type IST", get: (c) => c.istType || "" },
      { label: "Type PEC", get: (c) => c.istTypePec || "" },
      { label: "Type client", get: (c) => c.istTypeClient || "" },
      { label: "PEC étiologique", get: (c) => c.istPecEtiologique || "" },
      { label: "Examen physique", get: (c) => yn(c.istExamenPhysique) },
    ],
  },
  autre: {
    // SSR : Infertilité + VBG
    filter: (c) => c.infertConsultation === true || !!c.vbgType,
    columns: [
      ...baseColumns,
      {
        label: "Module",
        get: (c) =>
          c.infertConsultation
            ? "Infertilité"
            : c.vbgType
              ? "VBG"
              : "",
      },
      { label: "VBG type", get: (c) => c.vbgType || "" },
      { label: "VBG durée", get: (c) => c.vbgDuree ?? 0 },
      { label: "VBG consultation", get: (c) => c.vbgConsultation || "" },
      {
        label: "Infertilité counselling",
        get: (c) => yn(c.infertCounselling),
      },
      {
        label: "Infertilité examen physique",
        get: (c) => yn(c.infertExamenPhysique),
      },
      { label: "Traitement infertilité", get: (c) => c.infertTraitement || "" },
    ],
  },
  medecine: {
    filter: (c) => c.mdgConsultation === true,
    columns: [
      ...baseColumns,
      { label: "Motif", get: (c) => c.mdgMotifConsultation || "" },
      { label: "Type visite", get: (c) => c.mdgTypeVisite || "" },
      { label: "État femme", get: (c) => c.mdgEtatFemme || "" },
      { label: "Suspicion palu", get: (c) => c.mdgSuspicionPalu || "" },
      {
        label: "Test rapide palu",
        get: (c) => yn(c.mdgTestRapidePalu),
      },
      {
        label: "Diagnostic",
        get: (c) =>
          Array.isArray(c.mdgDiagnostic) ? c.mdgDiagnostic.join(", ") : "",
      },
      { label: "Type affection", get: (c) => c.mdgTypeAffection || "" },
      {
        label: "Traitement",
        get: (c) =>
          Array.isArray(c.mdgTraitement) ? c.mdgTraitement.join(", ") : "",
      },
      {
        label: "Mise en observation",
        get: (c) => yn(c.mdgMiseEnObservation),
      },
    ],
  },
  pediatrie: {
    filter: (c) => c.mdgConsultation === true && c.age != null && c.age <= 9,
    columns: [
      ...baseColumns,
      { label: "Motif", get: (c) => c.mdgMotifConsultation || "" },
      { label: "Type visite", get: (c) => c.mdgTypeVisite || "" },
      { label: "Suspicion palu", get: (c) => c.mdgSuspicionPalu || "" },
      {
        label: "Diagnostic",
        get: (c) =>
          Array.isArray(c.mdgDiagnostic) ? c.mdgDiagnostic.join(", ") : "",
      },
    ],
  },
  saa: {
    filter: (c) => c.saaConsultation === true,
    columns: [
      ...baseColumns,
      { label: "Type avortement", get: (c) => c.saaTypeAvortement || "" },
      {
        label: "Méthode avortement",
        get: (c) => c.saaMethodeAvortement || "",
      },
      { label: "Type PEC", get: (c) => c.saaTypePec || "" },
      {
        label: "Suivi post-avortement",
        get: (c) => yn(c.saaSuiviPostAvortement),
      },
      {
        label: "Counselling pré",
        get: (c) => yn(c.saaCounsellingPre),
      },
      {
        label: "Counselling post",
        get: (c) => yn(c.saaCounsellingPost),
      },
      { label: "Motif demande", get: (c) => c.saaMotifDemande || "" },
      {
        label: "Traitement complication",
        get: (c) => c.saaTraitementComplication || "",
      },
    ],
  },
  depistageVih: {
    filter: (c) => c.depistageVihConsultation === true,
    columns: [
      ...baseColumns,
      { label: "Type client", get: (c) => c.depistageVihTypeClient || "" },
      { label: "Résultat", get: (c) => c.depistageVihResultat || "" },
      {
        label: "Counselling pré",
        get: (c) => yn(c.depistageVihCounsellingPreTest),
      },
      {
        label: "Counselling post",
        get: (c) => yn(c.depistageVihCounsellingPostTest),
      },
      {
        label: "Mis sous ARV",
        get: (c) => yn(c.depistageVihResultatPositifMisSousArv),
      },
    ],
  },
  pecVih: {
    filter: (c) => !!c.pecVihTypeclient || c.pecVihCounselling === true,
    columns: [
      ...baseColumns,
      { label: "Type client", get: (c) => c.pecVihTypeclient || "" },
      { label: "Molécule ARV", get: (c) => c.pecVihMoleculeArv || "" },
      { label: "AES ARV", get: (c) => yn(c.pecVihAesArv) },
      { label: "Cotrimo", get: (c) => yn(c.pecVihCotrimo) },
      { label: "SPDP", get: (c) => yn(c.pecVihSpdp) },
      { label: "IO Paludisme", get: (c) => yn(c.pecVihIoPaludisme) },
      { label: "IO Tuberculose", get: (c) => yn(c.pecVihIoTuberculose) },
      { label: "IO Autre", get: (c) => yn(c.pecVihIoAutre) },
      {
        label: "Soutien psycho-social",
        get: (c) => yn(c.pecVihSoutienPsychoSocial),
      },
    ],
  },
  // Variantes SIG : mêmes données, colonnes adaptées
  sigMedecine: {
    filter: (c) => c.mdgConsultation === true,
    columns: [
      ...baseColumns,
      { label: "Type visite", get: (c) => c.mdgTypeVisite || "" },
      { label: "Motif", get: (c) => c.mdgMotifConsultation || "" },
      { label: "Suspicion palu", get: (c) => c.mdgSuspicionPalu || "" },
      {
        label: "Test rapide palu",
        get: (c) => yn(c.mdgTestRapidePalu),
      },
      {
        label: "Diagnostic",
        get: (c) =>
          Array.isArray(c.mdgDiagnostic) ? c.mdgDiagnostic.join(", ") : "",
      },
    ],
  },
  sigObstetrique: {
    // Inclut aussi les visites de dépistage VIH chez la femme enceinte/allaitante
    // (PTME) et les accouchements, car le rapport SIG : Obstétrique agrège ces
    // colonnes (Maternité + Post-natal en plus du volet CPN).
    filter: (c) =>
      c.obstConsultation === true ||
      !!c.obstTypeVisite ||
      c.accouchementConsultation === true ||
      c.depistageVihTypeClient === "ptme",
    columns: [
      ...baseColumns,
      { label: "Type CPN", get: (c) => c.obstTypeVisite || "" },
      { label: "Âge grossesse (SA)", get: (c) => c.grossesseAge ?? 0 },
      { label: "État grossesse", get: (c) => c.obstEtatGrossesse || "" },
      { label: "État nutritionnel", get: (c) => c.obstEtatNutritionnel || "" },
      { label: "Anémie", get: (c) => c.obstAnemie || "" },
      { label: "Syphilis", get: (c) => c.obstSyphilis || "" },
      { label: "AgHBs", get: (c) => c.obstAghbs || "" },
      { label: "MILDA", get: (c) => yn(c.obstMilda) },
      { label: "Fer", get: (c) => yn(c.obstFer) },
      { label: "Folate", get: (c) => yn(c.obstFolate) },
      { label: "Déparasitant", get: (c) => yn(c.obstDeparasitant) },
      { label: "PFPPI", get: (c) => yn(c.obstPfppi) },
      { label: "VAT", get: (c) => c.obstVat || "" },
      { label: "SP", get: (c) => c.obstSp || "" },
      // ------- Volet dépistage VIH (PTME / Maternité / Post-natal) ----------
      {
        label: "Volet VIH",
        get: (c) =>
          c.obstConsultation
            ? "CPN"
            : c.accouchementConsultation
              ? "Maternité"
              : c.depistageVihTypeClient === "ptme"
                ? "PTME"
                : "",
      },
      {
        label: "Dépistage VIH consultation",
        get: (c) => yn(c.depistageVihConsultation),
      },
      {
        label: "Type client VIH",
        get: (c) => c.depistageVihTypeClient || "",
      },
      {
        label: "Résultat VIH",
        get: (c) => c.depistageVihResultat || "",
      },
      {
        label: "Counselling pré-test",
        get: (c) => yn(c.depistageVihCounsellingPreTest),
      },
      {
        label: "Counselling post-test",
        get: (c) => yn(c.depistageVihCounsellingPostTest),
      },
      {
        label: "Mis sous ARV",
        get: (c) => yn(c.depistageVihResultatPositifMisSousArv),
      },
    ],
  },
  sigAccouchement: {
    filter: (c) => c.accouchementConsultation === true,
    columns: [
      ...baseColumns,
      { label: "Lieu accouchement", get: (c) => c.accouchementLieu || "" },
      { label: "Statut VAT", get: (c) => c.accouchementStatutVat || "" },
      { label: "État naissance", get: (c) => c.accouchementEtatNaissance || "" },
      { label: "Multiple", get: (c) => c.accouchementMultiple || "" },
      {
        label: "Enfants vivants",
        get: (c) => c.accouchementEnfantVivant ?? 0,
      },
      {
        label: "Mort-nés frais",
        get: (c) => c.accouchementEnfantMortNeFrais ?? 0,
      },
      {
        label: "Mort-nés macérés",
        get: (c) => c.accouchementEnfantMortNeMacere ?? 0,
      },
      {
        label: "Poids < 2500g",
        get: (c) => c.accouchementNbPoidsEfantVivant ?? 0,
      },
      {
        label: "Type évacuation",
        get: (c) => c.accouchementTypeEvacuation || "",
      },
      {
        label: "Évacuation mère",
        get: (c) => c.accouchementEvacuationMere || "",
      },
      {
        label: "Évacuation enfant",
        get: (c) => c.accouchementEvacuationEnfant || "",
      },
      { label: "Complications", get: (c) => c.accouchementComplications || "" },
    ],
  },
  sigIst: {
    // Toutes les fiches IST où un type a été renseigné — même filtre que
    // le rapport SIG : IST.
    filter: (c) => !!c.istType,
    columns: [
      ...baseColumns,
      { label: "Type IST", get: (c) => c.istType || "" },
      { label: "Type client", get: (c) => c.istTypeClient || "" },
      { label: "Type PEC", get: (c) => c.istTypePec || "" },
      { label: "PEC étiologique", get: (c) => c.istPecEtiologique || "" },
      { label: "Examen physique", get: (c) => yn(c.istExamenPhysique) },
      {
        label: "Counselling avant",
        get: (c) => yn(c.istCounsellingAvantDepitage),
      },
      {
        label: "Counselling après",
        get: (c) => yn(c.istCounsellingApresDepitage),
      },
      {
        label: "Counselling réduction risque",
        get: (c) => yn(c.istCounselingReductionRisque),
      },
    ],
  },
  // ----- Sous-sections du rapport "Validation" --------------------------------
  // Le rapport de validation est composé de 11 tableaux. Chaque sous-section
  // a son propre listing dérivé des configs ci-dessus.
  "validation:contraception": {
    filter: (c) => c.consultationPf === true || c.methodePrise === true,
    columns: [
      ...baseColumns,
      { label: "Statut", get: (c) => c.statut || "" },
      { label: "Type contraception", get: (c) => c.typeContraception || "" },
      { label: "Méthode prise", get: (c) => yn(c.methodePrise) },
      { label: "Counselling PF", get: (c) => yn(c.counsellingPf) },
      { label: "Court durée", get: (c) => c.courtDuree || "" },
      { label: "Implanon", get: (c) => c.implanon || "" },
      { label: "Jadelle", get: (c) => c.jadelle || "" },
      { label: "Stérilet", get: (c) => c.sterilet || "" },
      { label: "Retrait Implanon", get: (c) => yn(c.retraitImplanon) },
      { label: "Retrait Jadelle", get: (c) => yn(c.retraitJadelle) },
      { label: "Retrait Stérilet", get: (c) => yn(c.retraitSterilet) },
    ],
  },
  "validation:vih": {
    // Combinaison Dépistage VIH + PEC VIH
    filter: (c) =>
      c.depistageVihConsultation === true ||
      c.pecVihCounselling === true ||
      !!c.pecVihTypeclient,
    columns: [
      ...baseColumns,
      {
        label: "Volet",
        get: (c) =>
          c.depistageVihConsultation && (c.pecVihCounselling || c.pecVihTypeclient)
            ? "Dépistage + PEC"
            : c.depistageVihConsultation
              ? "Dépistage"
              : "PEC VIH",
      },
      { label: "Type client dépistage", get: (c) => c.depistageVihTypeClient || "" },
      { label: "Résultat VIH", get: (c) => c.depistageVihResultat || "" },
      {
        label: "Mis sous ARV",
        get: (c) => yn(c.depistageVihResultatPositifMisSousArv),
      },
      { label: "Type client PEC", get: (c) => c.pecVihTypeclient || "" },
      { label: "Molécule ARV", get: (c) => c.pecVihMoleculeArv || "" },
      { label: "Cotrimo", get: (c) => yn(c.pecVihCotrimo) },
      { label: "IO Paludisme", get: (c) => yn(c.pecVihIoPaludisme) },
      { label: "IO Tuberculose", get: (c) => yn(c.pecVihIoTuberculose) },
    ],
  },
  "validation:saa": {
    filter: (c) => c.saaConsultation === true,
    columns: [
      ...baseColumns,
      { label: "Type avortement", get: (c) => c.saaTypeAvortement || "" },
      { label: "Méthode avortement", get: (c) => c.saaMethodeAvortement || "" },
      { label: "Type PEC", get: (c) => c.saaTypePec || "" },
      { label: "Suivi post-avortement", get: (c) => yn(c.saaSuiviPostAvortement) },
      { label: "Counselling pré", get: (c) => yn(c.saaCounsellingPre) },
      { label: "Counselling post", get: (c) => yn(c.saaCounsellingPost) },
      {
        label: "Traitement complication",
        get: (c) => c.saaTraitementComplication || "",
      },
    ],
  },
  "validation:infertilite": {
    filter: (c) => c.infertConsultation === true,
    columns: [
      ...baseColumns,
      { label: "Counselling", get: (c) => yn(c.infertCounselling) },
      { label: "Examen physique", get: (c) => yn(c.infertExamenPhysique) },
      { label: "Traitement", get: (c) => c.infertTraitement || "" },
    ],
  },
  "validation:ist": {
    filter: (c) => !!c.istType || !!c.istTypePec,
    columns: [
      ...baseColumns,
      { label: "Type IST", get: (c) => c.istType || "" },
      { label: "Type PEC", get: (c) => c.istTypePec || "" },
      { label: "Type client", get: (c) => c.istTypeClient || "" },
      { label: "PEC étiologique", get: (c) => c.istPecEtiologique || "" },
    ],
  },
  "validation:gyneco": {
    filter: (c) => c.consultationGyneco === true,
    columns: [
      ...baseColumns,
      { label: "Motif", get: (c) => c.motifVisiteGyneco || "" },
      { label: "Résultat IVA", get: (c) => c.resultatIva || "" },
      { label: "Eligible traitement IVA", get: (c) => yn(c.eligibleTraitementIva) },
      { label: "Type traitement IVA", get: (c) => c.typeTraitementIva || "" },
      { label: "Résultat cancer sein", get: (c) => c.resultatCancerSein || "" },
    ],
  },
  "validation:obstetrique": {
    filter: (c) => c.obstConsultation === true || !!c.obstTypeVisite,
    columns: [
      ...baseColumns,
      { label: "Type CPN", get: (c) => c.obstTypeVisite || "" },
      { label: "Âge grossesse (SA)", get: (c) => c.grossesseAge ?? 0 },
      { label: "État grossesse", get: (c) => c.obstEtatGrossesse || "" },
      { label: "VAT", get: (c) => c.obstVat || "" },
      { label: "SP", get: (c) => c.obstSp || "" },
      { label: "Anémie", get: (c) => c.obstAnemie || "" },
      { label: "Syphilis", get: (c) => c.obstSyphilis || "" },
      { label: "AgHBs", get: (c) => c.obstAghbs || "" },
    ],
  },
  "validation:pediatrie": {
    filter: (c) => c.mdgConsultation === true && c.age != null && c.age <= 9,
    columns: [
      ...baseColumns,
      { label: "Motif", get: (c) => c.mdgMotifConsultation || "" },
      { label: "Type visite", get: (c) => c.mdgTypeVisite || "" },
      { label: "Suspicion palu", get: (c) => c.mdgSuspicionPalu || "" },
      {
        label: "Diagnostic",
        get: (c) =>
          Array.isArray(c.mdgDiagnostic) ? c.mdgDiagnostic.join(", ") : "",
      },
    ],
  },
  "validation:medecine": {
    filter: (c) => c.mdgConsultation === true && c.age != null && c.age > 9,
    columns: [
      ...baseColumns,
      { label: "Motif", get: (c) => c.mdgMotifConsultation || "" },
      { label: "Type visite", get: (c) => c.mdgTypeVisite || "" },
      { label: "État femme", get: (c) => c.mdgEtatFemme || "" },
      { label: "Suspicion palu", get: (c) => c.mdgSuspicionPalu || "" },
      {
        label: "Diagnostic",
        get: (c) =>
          Array.isArray(c.mdgDiagnostic) ? c.mdgDiagnostic.join(", ") : "",
      },
      { label: "Type affection", get: (c) => c.mdgTypeAffection || "" },
    ],
  },
  "validation:vbg": {
    filter: (c) => !!c.vbgType,
    columns: [
      ...baseColumns,
      { label: "Type VBG", get: (c) => c.vbgType || "" },
      { label: "Durée", get: (c) => c.vbgDuree ?? 0 },
      { label: "Consultation", get: (c) => c.vbgConsultation || "" },
      {
        label: "Counselling relation",
        get: (c) => yn(c.vbgCounsellingRelation),
      },
      {
        label: "Counselling violence sexuelle",
        get: (c) => yn(c.vbgCounsellingViolenceSexuel),
      },
      {
        label: "Counselling violence physique",
        get: (c) => yn(c.vbgCounsellingViolencePhysique),
      },
    ],
  },
};

// Sections (onglets) du rapport de validation, dans l'ordre du rapport.
const VALIDATION_SECTIONS: { key: string; label: string }[] = [
  { key: "validation:contraception", label: "Contraception" },
  { key: "validation:vih", label: "VIH" },
  { key: "validation:saa", label: "SAA" },
  { key: "validation:infertilite", label: "Infertilité" },
  { key: "validation:ist", label: "IST" },
  { key: "validation:gyneco", label: "Gynécologie" },
  { key: "validation:obstetrique", label: "Obstétrique" },
  { key: "validation:pediatrie", label: "Pédiatrie" },
  { key: "validation:medecine", label: "Médecine générale" },
  { key: "validation:vbg", label: "VBG" },
  { key: "validation:laboratoire", label: "Laboratoire" },
];

// ---- Composant ---------------------------------------------------------------

export default function ListingRapportBrut({
  rapportType,
  clientData,
  clientLaboData,
  clientEchoData,
  factureLaboratoire,
  resultatLaboratoire,
  dateDebut,
  dateFin,
  clinic,
}: Props) {
  const [search, setSearch] = useState("");
  // Sous-section sélectionnée pour le rapport de validation (onglets)
  const [validationSection, setValidationSection] = useState<string>(
    VALIDATION_SECTIONS[0].key,
  );

  // Quand le rapport est "validation", la section active devient le rapportType
  // effectif utilisé pour construire les lignes.
  const effectiveRapportType =
    rapportType === "validation" ? validationSection : rapportType;

  // Construction des lignes selon le type de rapport
  const { headers, rows, title } = useMemo(() => {
    if (effectiveRapportType === "laboratoire") {
      return buildLaboRows(clientLaboData);
    }
    if (effectiveRapportType === "echographie") {
      return buildEchoRows(clientEchoData);
    }
    if (effectiveRapportType === "validation:laboratoire") {
      // Croisement factures examen / résultats examens du rapport de validation
      return buildValidationRows(factureLaboratoire, resultatLaboratoire);
    }
    const config = CONFIGS[effectiveRapportType];
    if (!config) {
      return {
        headers: [] as string[],
        rows: [] as Row[],
        title: "Listing brut",
      };
    }
    const headers = config.columns.map((col) => col.label);
    const rows = clientData.filter(config.filter).map((c) => {
      const r: Row = {};
      config.columns.forEach((col) => {
        r[col.label] = col.get(c);
      });
      return r;
    });
    return {
      headers,
      rows,
      title: `Listing brut — ${rapportTypeLabel(effectiveRapportType)}`,
    };
  }, [
    effectiveRapportType,
    clientData,
    clientLaboData,
    clientEchoData,
    factureLaboratoire,
    resultatLaboratoire,
  ]);

  // -------- Filtres par colonne --------------------------------------------
  // Pour chaque colonne, on calcule les valeurs uniques. Une colonne est
  // "filtrable" si son nombre de valeurs distinctes non-vides est ≤ 30
  // (sinon ce serait une colonne libre type "Nom" qui ne se prête pas à un
  // filtre par valeur).
  const FILTRABLE_THRESHOLD = 30;

  type ColumnFilterInfo = {
    label: string;
    values: string[];
    filtrable: boolean;
  };

  const columnsInfo: ColumnFilterInfo[] = useMemo(() => {
    return headers.map((h) => {
      const set = new Set<string>();
      for (const r of rows) {
        const v = r[h];
        if (v === undefined || v === null || v === "") continue;
        set.add(String(v));
        if (set.size > FILTRABLE_THRESHOLD) break;
      }
      const vals = Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
      return {
        label: h,
        values: vals,
        filtrable: vals.length > 0 && vals.length <= FILTRABLE_THRESHOLD,
      };
    });
  }, [headers, rows]);

  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>(
    {},
  );

  // Réinitialiser les filtres quand le type de rapport (ou la sous-section
  // de validation) change.
  useEffect(() => {
    setColumnFilters({});
    setSearch("");
  }, [effectiveRapportType]);

  // Si on quitte/entre dans le rapport "validation", remettre la sous-section
  // sur le 1er onglet pour éviter de garder une section orpheline.
  useEffect(() => {
    if (rapportType === "validation") {
      setValidationSection(VALIDATION_SECTIONS[0].key);
    }
  }, [rapportType]);

  const toggleFilterValue = (col: string, val: string) => {
    setColumnFilters((prev) => {
      const cur = prev[col] || [];
      const next = cur.includes(val)
        ? cur.filter((v) => v !== val)
        : [...cur, val];
      const out = { ...prev };
      if (next.length === 0) delete out[col];
      else out[col] = next;
      return out;
    });
  };

  const clearColumnFilter = (col: string) => {
    setColumnFilters((prev) => {
      const out = { ...prev };
      delete out[col];
      return out;
    });
  };

  const clearAllFilters = () => {
    setColumnFilters({});
    setSearch("");
  };

  const activeFilterCount = Object.keys(columnFilters).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      // Filtres par colonne (AND entre colonnes, OR entre valeurs d'une même colonne)
      for (const [col, vals] of Object.entries(columnFilters)) {
        if (vals.length === 0) continue;
        if (!vals.includes(String(r[col] ?? ""))) return false;
      }
      // Recherche globale
      if (!q) return true;
      return Object.values(r).some((v) =>
        String(v).toLowerCase().includes(q),
      );
    });
  }, [rows, search, columnFilters]);

  const handleExport = async () => {
    if (filtered.length === 0) return;
    const namePart = effectiveRapportType.replace(/[:\s]/g, "_");
    await exportReportToExcel.medical(
      filtered,
      `listing_${namePart}_${dateDebut}_${dateFin}`,
    );
  };

  return (
    <div className="p-4 sm:p-6 border rounded-md bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            {title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {clinic} — du {fmtDate(dateDebut)} au {fmtDate(dateFin)}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white text-sm rounded-md hover:bg-green-900 disabled:opacity-50"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Excel
        </button>
      </div>

      {/* Onglets des sous-sections du rapport de validation */}
      {rapportType === "validation" && (
        <div className="mb-4 flex flex-wrap gap-1 border-b border-gray-200">
          {VALIDATION_SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setValidationSection(s.key)}
              className={`px-3 py-1.5 text-sm rounded-t-md border-b-2 transition ${
                validationSection === s.key
                  ? "border-blue-600 text-blue-700 font-semibold bg-blue-50/40"
                  : "border-transparent text-gray-600 hover:text-blue-700 hover:bg-gray-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans le listing..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        {(activeFilterCount > 0 || search.trim()) && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
          >
            <X className="h-3 w-3" />
            Réinitialiser les filtres
            {activeFilterCount > 0 && ` (${activeFilterCount})`}
          </button>
        )}
        <div className="text-sm text-muted-foreground sm:ml-auto">
          {filtered.length} ligne(s)
          {filtered.length !== rows.length && ` (sur ${rows.length})`}
        </div>
      </div>

      {/* Badges des filtres actifs */}
      {activeFilterCount > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {Object.entries(columnFilters).map(([col, vals]) => (
            <span
              key={col}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-800 border border-blue-200 rounded-md"
            >
              <Filter className="h-3 w-3" />
              <strong>{col}</strong> : {vals.join(", ")}
              <button
                type="button"
                onClick={() => clearColumnFilter(col)}
                className="ml-1 hover:bg-blue-100 rounded p-0.5"
                aria-label={`Retirer le filtre sur ${col}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Aucune ligne pour ce rapport sur la période sélectionnée.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 sticky top-0 z-10">
              <tr>
                {columnsInfo.map((info) => (
                  <th
                    key={info.label}
                    className="px-3 py-2 text-left border-b whitespace-nowrap font-semibold text-gray-700"
                  >
                    <ColumnHeader
                      info={info}
                      activeValues={columnFilters[info.label] || []}
                      onToggle={(v) => toggleFilterValue(info.label, v)}
                      onClear={() => clearColumnFilter(info.label)}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="px-3 py-6 text-center text-sm text-muted-foreground"
                  >
                    Aucune ligne ne correspond aux filtres actifs.
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b hover:bg-slate-50 even:bg-slate-50/30"
                  >
                    {headers.map((h) => (
                      <td
                        key={h}
                        className="px-3 py-1.5 align-top whitespace-nowrap"
                      >
                        {String(row[h] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sous-composant : en-tête de colonne avec menu de filtre par valeur
// -----------------------------------------------------------------------------
type ColumnFilterInfo2 = {
  label: string;
  values: string[];
  filtrable: boolean;
};

function ColumnHeader({
  info,
  activeValues,
  onToggle,
  onClear,
}: {
  info: ColumnFilterInfo2;
  activeValues: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!info.filtrable) {
    return <span>{info.label}</span>;
  }

  const isActive = activeValues.length > 0;

  return (
    <div className="relative inline-flex items-center gap-1" ref={ref}>
      <span>{info.label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`p-0.5 rounded hover:bg-slate-200 transition ${
          isActive ? "text-blue-600" : "text-gray-400"
        }`}
        aria-label={`Filtrer ${info.label}`}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {isActive && (
        <span className="ml-0.5 text-[10px] bg-blue-600 text-white rounded-full px-1.5 py-0.5">
          {activeValues.length}
        </span>
      )}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 min-w-48 max-w-72 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg p-2 font-normal">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-700">
              Filtrer par {info.label}
            </span>
            {isActive && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Effacer
              </button>
            )}
          </div>
          <div className="space-y-1">
            {info.values.map((v) => {
              const checked = activeValues.includes(v);
              return (
                <label
                  key={v}
                  className="flex items-center gap-1.5 text-xs px-1.5 py-1 rounded hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(v)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="truncate">{v}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Helpers de construction de lignes pour les rapports spéciaux -----------

function buildLaboRows(
  clientLaboData: Record<string, ClientLaboShape[]>,
): { headers: string[]; rows: Row[]; title: string } {
  const headers = [
    "Type examen (catégorie)",
    "Date visite",
    "Code",
    "Nom",
    "Prénom",
    "Sexe",
    "Âge",
    "Examens facturés",
  ];
  const rows: Row[] = [];
  Object.entries(clientLaboData || {}).forEach(([cat, list]) => {
    (list || []).forEach((cl) => {
      const visiteDate = cl.visites?.[0]?.dateVisite;
      const examens = (cl.resultatsExamens || [])
        .map((e) => e.libelleExamen)
        .filter(Boolean)
        .join(", ");
      rows.push({
        "Type examen (catégorie)": cat,
        "Date visite": fmtDate(visiteDate ?? null),
        Code: "",
        Nom: cl.nomClient,
        Prénom: cl.prenomClient,
        Sexe: cl.sexeClient,
        Âge: cl.ageClient ?? 0,
        "Examens facturés": examens,
      });
    });
  });
  return { headers, rows, title: "Listing brut — Laboratoire" };
}

function buildEchoRows(
  clientEchoData: EchoServiceItem[],
): { headers: string[]; rows: Row[]; title: string } {
  const headers = ["Nom", "Prénom", "Sexe", "Âge", "Service", "Libellé"];
  const rows: Row[] = (clientEchoData || []).map((e) => ({
    Nom: e.nomClient,
    Prénom: e.prenomClient,
    Sexe: e.sexeClient,
    Âge: e.ageClient ?? 0,
    Service: e.serviceEchographie || "",
    Libellé: e.libelleEchographie || "",
  }));
  return { headers, rows, title: "Listing brut — Échographie" };
}

function buildValidationRows(
  facture: FactureExamen[],
  resultat: ResultatExamen[],
): { headers: string[]; rows: Row[]; title: string } {
  const headers = [
    "ID Visite",
    "Libellé examen",
    "Prix",
    "Remise",
    "Réduction",
    "Sous-traitance",
    "Résultat saisi ?",
  ];
  const idResultatSet = new Set(
    (resultat || []).map((r) => r.idFactureExamen).filter(Boolean),
  );
  const rows: Row[] = (facture || []).map((f) => ({
    "ID Visite": f.idVisite,
    "Libellé examen": f.libelleExamen || "",
    Prix: f.prixExamen ?? 0,
    Remise: f.remiseExamen ?? 0,
    Réduction: f.reductionExamen ?? 0,
    "Sous-traitance": f.soustraitanceExamen ? "Oui" : "Non",
    "Résultat saisi ?": idResultatSet.has(f.id) ? "Oui" : "Non",
  }));
  return { headers, rows, title: "Listing brut — Validation laboratoire" };
}

function rapportTypeLabel(t: string): string {
  const labels: Record<string, string> = {
    consultation: "Consultation",
    nutrition: "État nutritionnel",
    planning: "Planification familiale",
    gynecologique: "Gynécologie",
    obstetrique: "Obstétrique",
    ist: "IST",
    autre: "Autre SSR (Infertilité / VBG)",
    medecine: "Médecine générale",
    pediatrie: "Pédiatrie",
    saa: "SAA",
    depistageVih: "Dépistage VIH",
    pecVih: "PEC VIH",
    sigMedecine: "SIG : Médecine générale",
    sigObstetrique: "SIG : Obstétrique",
    sigAccouchement: "SIG : Accouchement",
    sigIst: "SIG : IST",
    "validation:contraception": "Validation : Contraception",
    "validation:vih": "Validation : VIH (Dépistage + PEC)",
    "validation:saa": "Validation : SAA",
    "validation:infertilite": "Validation : Infertilité",
    "validation:ist": "Validation : IST",
    "validation:gyneco": "Validation : Gynécologie",
    "validation:obstetrique": "Validation : Obstétrique",
    "validation:pediatrie": "Validation : Pédiatrie",
    "validation:medecine": "Validation : Médecine générale",
    "validation:vbg": "Validation : VBG",
    "validation:laboratoire": "Validation : Laboratoire (factures vs résultats)",
  };
  return labels[t] ?? t;
}
